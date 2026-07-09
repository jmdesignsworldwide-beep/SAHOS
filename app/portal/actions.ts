'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createSSRClient, getSessionUser } from '@/lib/supabase/ssr';
import { requireUser } from '@/lib/admin';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { isSiteImageSlot } from '@/lib/site-images';
import { env } from '@/lib/env';

const BUCKET = 'product-images';
// Site images live in the same bucket under this prefix (no new bucket needed).
const SITE_PREFIX = 'site';
const SIZES = ['XS', 'S', 'M', 'L'] as const;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface ActionState {
  error?: string;
  ok?: boolean;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    // strip combining diacritical marks (U+0300–U+036F)
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function str(v: FormDataEntryValue | null, max = 2000): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function revalidateStore(slug?: string) {
  revalidatePath('/');
  revalidatePath('/collection');
  if (slug) revalidatePath(`/product/${slug}`);
  revalidatePath('/portal/productos');
}

// --------------------------------------------------------------------------
// Auth
// --------------------------------------------------------------------------
export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ip = clientIp(headers());
  const limit = rateLimit(`login:${ip}`, 8, 60_000); // 8 attempts / minute / IP
  if (!limit.ok) return { error: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.' };

  const email = str(formData.get('email'), 254).toLowerCase();
  const password = str(formData.get('password'), 200);
  if (!email || !password) return { error: 'Ingresa tu correo y contraseña.' };

  const supabase = createSSRClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'Correo o contraseña incorrectos.' };

  redirect('/portal/dashboard');
}

export async function signOutAction() {
  const supabase = createSSRClient();
  await supabase.auth.signOut();
  redirect('/portal');
}

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user) return { error: 'No autorizado.' };

  const password = str(formData.get('password'), 200);
  const confirm = str(formData.get('confirm'), 200);
  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres.' };
  if (password !== confirm) return { error: 'Las contraseñas no coinciden.' };

  const supabase = createSSRClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: 'No se pudo actualizar la contraseña.' };
  return { ok: true };
}

// --------------------------------------------------------------------------
// Products
// --------------------------------------------------------------------------
export interface SaveResult extends ActionState {
  id?: string;
  isNew?: boolean;
}

// Called directly from the client (useTransition), NOT via useFormState, and it
// returns a result instead of redirect()-ing. The whole body is guarded so any
// failure surfaces as a clean inline message — never an uncaught throw that
// React renders as "Application error: a client-side exception".
export async function saveProductAction(formData: FormData): Promise<SaveResult> {
  try {
    await requireUser();
    const supabase = createSSRClient();

    const id = str(formData.get('id'), 64) || null;
    const name = str(formData.get('name'), 120);
    if (!name) return { error: 'El nombre es obligatorio.' };

    const subtitle = str(formData.get('subtitle'), 160);
    const description = str(formData.get('description'), 4000);
    const color = str(formData.get('color'), 60);
    const factoryRef = str(formData.get('factory_ref'), 60);
    const active = formData.get('active') === 'on';

    // price in dollars → cents; empty allowed (price on request)
    const priceRaw = str(formData.get('price'), 20);
    let priceCents: number | null = null;
    if (priceRaw) {
      const n = Number(priceRaw.replace(/[^0-9.]/g, ''));
      if (!Number.isFinite(n) || n < 0) return { error: 'Precio inválido.' };
      priceCents = Math.round(n * 100);
    }

    // estimated shipping weight in ounces (decimals allowed); empty allowed
    const weightRaw = str(formData.get('weight_oz'), 12);
    let weightOz: number | null = null;
    if (weightRaw) {
      const w = Number(weightRaw.replace(/[^0-9.]/g, ''));
      if (!Number.isFinite(w) || w < 0 || w > 100000) return { error: 'Peso inválido.' };
      weightOz = Math.round(w * 100) / 100;
    }

    const slug = (str(formData.get('slug'), 60) || slugify(name)) || `pieza-${Date.now()}`;
    const payload = {
      name,
      slug,
      subtitle,
      description,
      color,
      factory_ref: factoryRef,
      price_cents: priceCents,
      weight_oz: weightOz,
      active,
    };

    let productId = id;
    if (id) {
      const { error } = await supabase.from('products').update(payload).eq('id', id);
      if (error) return { error: `No se pudo guardar: ${error.message}` };
    } else {
      const { data, error } = await supabase
        .from('products')
        .insert({ ...payload, position: 999 })
        .select('id')
        .single();
      if (error) return { error: `No se pudo crear: ${error.message}` };
      productId = data.id;
    }

    // sizes: checkbox `size_XS` (available) + `stock_XS` (qty)
    for (const size of SIZES) {
      const available = formData.get(`size_${size}`) === 'on';
      const stock = Math.max(0, Number(str(formData.get(`stock_${size}`), 8)) || 0);
      if (available) {
        const { error } = await supabase
          .from('product_sizes')
          .upsert({ product_id: productId, size, stock }, { onConflict: 'product_id,size' });
        if (error) return { error: `No se pudieron guardar las tallas: ${error.message}` };
      } else {
        await supabase.from('product_sizes').delete().eq('product_id', productId).eq('size', size);
      }
    }

    revalidateStore(slug);
    return { ok: true, id: productId ?? undefined, isNew: !id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo guardar. Inténtalo de nuevo.' };
  }
}

export async function deleteProductAction(formData: FormData) {
  await requireUser();
  const id = str(formData.get('id'), 64);
  if (!id) return;
  const supabase = createSSRClient();

  // remove the product's stored images, then the row (cascades images/sizes)
  const { data: imgs } = await supabase.from('product_images').select('url').eq('product_id', id);
  const paths = (imgs ?? []).map((i: any) => storagePathFromUrl(i.url)).filter(Boolean) as string[];
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);

  await supabase.from('products').delete().eq('id', id);
  revalidateStore();
  redirect('/portal/dashboard');
}

// --------------------------------------------------------------------------
// Orders — fulfillment only (payment status is owned by the Stripe webhook)
// --------------------------------------------------------------------------
const FULFILLMENT = ['new', 'preparing', 'shipped', 'delivered', 'cancelled'] as const;

export async function updateFulfillmentAction(formData: FormData): Promise<ActionState> {
  await requireUser();
  const supabase = createSSRClient();

  const id = str(formData.get('order_id'), 64);
  const status = str(formData.get('fulfillment_status'), 20) as (typeof FULFILLMENT)[number];
  if (!id) return { error: 'Falta el pedido.' };
  if (!FULFILLMENT.includes(status)) return { error: 'Estado inválido.' };

  const tracking = str(formData.get('tracking_number'), 120) || null;
  const courier = str(formData.get('courier'), 60) || null;

  const patch: Record<string, unknown> = {
    fulfillment_status: status,
    tracking_number: tracking,
    courier,
    updated_at: new Date().toISOString(),
  };
  if (status === 'shipped') patch.shipped_at = new Date().toISOString();

  const { error } = await supabase.from('orders').update(patch).eq('id', id);
  if (error) return { error: `No se pudo actualizar: ${error.message}` };

  revalidatePath('/portal/pedidos');
  revalidatePath(`/portal/pedidos/${id}`);
  revalidatePath('/portal/dashboard');
  return { ok: true };
}

// --------------------------------------------------------------------------
// Inventory (Tanda 3)
// --------------------------------------------------------------------------
export async function updateStockAction(formData: FormData): Promise<ActionState> {
  try {
    await requireUser();
    const supabase = createSSRClient();

    const productId = str(formData.get('product_id'), 64);
    const size = str(formData.get('size'), 4);
    const qtyRaw = str(formData.get('quantity'), 8);
    if (!productId) return { error: 'Falta el producto.' };
    if (!['XS', 'S', 'M', 'L'].includes(size)) return { error: 'Talla inválida.' };
    const qty = Number(qtyRaw);
    if (!Number.isInteger(qty) || qty < 0 || qty > 100000) return { error: 'Cantidad inválida.' };

    const { error } = await supabase
      .from('product_sizes')
      .update({ stock: qty })
      .eq('product_id', productId)
      .eq('size', size);
    if (error) return { error: `No se pudo actualizar: ${error.message}` };

    revalidatePath('/portal/inventario');
    revalidatePath('/portal/dashboard');
    // stock affects storefront availability — refresh the public pages too
    revalidatePath('/');
    revalidatePath('/collection');
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo actualizar el stock.' };
  }
}

export async function setStockModeAction(formData: FormData): Promise<ActionState> {
  try {
    await requireUser();
    const supabase = createSSRClient();

    const productId = str(formData.get('product_id'), 64);
    const mode = str(formData.get('mode'), 12);
    if (!productId) return { error: 'Falta el producto.' };
    if (mode !== 'limited' && mode !== 'on_demand') return { error: 'Modo inválido.' };

    // mode is per-size in the schema; a piece toggle sets all its sizes.
    const { error } = await supabase.from('product_sizes').update({ mode }).eq('product_id', productId);
    if (error) return { error: `No se pudo cambiar el modo: ${error.message}` };

    revalidatePath('/portal/inventario');
    revalidatePath('/portal/dashboard');
    revalidatePath('/');
    revalidatePath('/collection');
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo cambiar el modo.' };
  }
}

// --------------------------------------------------------------------------
// Photos
// --------------------------------------------------------------------------
export async function uploadImageAction(formData: FormData): Promise<ActionState> {
  try {
    await requireUser();
    const supabase = createSSRClient();

    const productId = str(formData.get('product_id'), 64);
    const type = str(formData.get('type'), 20);
    const file = formData.get('file');
    if (!productId) return { error: 'Falta el producto.' };
    if (type !== 'model' && type !== 'garment_360') return { error: 'Tipo de foto inválido.' };
    if (!(file instanceof File) || file.size === 0) return { error: 'Selecciona una imagen.' };
    if (file.size > MAX_UPLOAD_BYTES) return { error: 'La imagen supera el máximo de 10MB.' };

    const ext = ALLOWED_MIME[file.type];
    if (!ext) return { error: 'Formato no permitido. Usa JPG, PNG o WebP.' };

    // model galleries cap at 10 photos
    const { count } = await supabase
      .from('product_images')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId)
      .eq('type', type);
    if (type === 'model' && (count ?? 0) >= 10) return { error: 'Máximo 10 fotos de modelo por pieza.' };

    const key = `${productId}/${type}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(key, file, { contentType: file.type, upsert: false });
    if (upErr) return { error: `No se pudo subir: ${upErr.message}` };

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(key);
    const position = (count ?? 0) + 1;
    const { error: insErr } = await supabase.from('product_images').insert({
      product_id: productId,
      url: pub.publicUrl,
      type,
      position,
      alt: '',
    });
    if (insErr) {
      await supabase.storage.from(BUCKET).remove([key]); // roll back the upload
      return { error: `No se pudo registrar la foto: ${insErr.message}` };
    }

    revalidateStore();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo subir la imagen.' };
  }
}

// --------------------------------------------------------------------------
// Contact messages — the owner marks new → read → replied
// --------------------------------------------------------------------------
const MESSAGE_STATUS = ['new', 'read', 'replied'] as const;

export async function updateMessageStatusAction(formData: FormData): Promise<ActionState> {
  try {
    await requireUser();
    const supabase = createSSRClient();

    const id = str(formData.get('id'), 64);
    const status = str(formData.get('status'), 12) as (typeof MESSAGE_STATUS)[number];
    if (!id) return { error: 'Falta el mensaje.' };
    if (!MESSAGE_STATUS.includes(status)) return { error: 'Estado inválido.' };

    const { error } = await supabase.from('contact_messages').update({ status }).eq('id', id);
    if (error) return { error: `No se pudo actualizar: ${error.message}` };

    revalidatePath('/portal/mensajes');
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo actualizar el mensaje.' };
  }
}

// --------------------------------------------------------------------------
// Site images (heros, campaign, packaging, Our Story) — one row per slot_key.
// Lets the owner replace ANY fixed site image without touching code.
//
// Upload flow (two steps) — the file NEVER passes through a Server Action /
// serverless function body (Next caps that at 1MB, Vercel at ~4.5MB, which was
// silently failing the owner's large hero photos). Instead:
//   1) createSiteImageUpload → the server (authenticated, RLS-governed) picks a
//      sanitized path and returns a short-lived SIGNED UPLOAD URL/token.
//   2) the browser uploads the bytes straight to Storage with that token.
//   3) saveSiteImageMeta → the server records the resulting public URL.
// service_role is never used or exposed; every step is whitelist-validated.
// --------------------------------------------------------------------------
export interface UploadTicket extends ActionState {
  path?: string;
  token?: string;
  publicUrl?: string;
}

export async function createSiteImageUpload(formData: FormData): Promise<UploadTicket> {
  try {
    await requireUser();
    const ip = clientIp(headers());
    const limit = rateLimit(`site-image:${ip}`, 30, 60_000);
    if (!limit.ok) return { error: 'Demasiadas solicitudes. Espera un momento.' };

    const slotKey = str(formData.get('slot_key'), 64);
    if (!isSiteImageSlot(slotKey)) return { error: 'Slot inválido.' };

    const contentType = str(formData.get('content_type'), 100);
    const ext = ALLOWED_MIME[contentType];
    if (!ext) return { error: 'Formato no soportado. Usa JPG, PNG o WebP (el HEIC del iPhone no sirve).' };

    // Server-controlled, sanitized, unguessable path: site/<slot>/<uuid>.<ext>.
    const key = `${SITE_PREFIX}/${slotKey}/${crypto.randomUUID()}.${ext}`;
    const supabase = createSSRClient(); // authenticated admin — RLS still applies
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(key);
    if (error || !data) {
      return { error: `No se pudo iniciar la subida: ${error?.message ?? 'inténtalo de nuevo'}` };
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(key);
    return { ok: true, path: data.path, token: data.token, publicUrl: pub.publicUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo iniciar la subida.' };
  }
}

export async function saveSiteImageMeta(formData: FormData): Promise<ActionState> {
  try {
    await requireUser();
    const ip = clientIp(headers());
    const limit = rateLimit(`site-image:${ip}`, 30, 60_000);
    if (!limit.ok) return { error: 'Demasiadas solicitudes. Espera un momento.' };

    const supabase = createSSRClient();

    const slotKey = str(formData.get('slot_key'), 64);
    if (!isSiteImageSlot(slotKey)) return { error: 'Slot inválido.' };
    const altText = str(formData.get('alt_text'), 300);

    // Optional new image URL — must be one of OUR public Storage URLs under the
    // site/ prefix, so a client can never point a slot at an arbitrary URL.
    const rawUrl = str(formData.get('image_url'), 600);
    let newUrl: string | null = null;
    if (rawUrl) {
      const validPrefix = `${env.supabaseUrl}/storage/v1/object/public/${BUCKET}/${SITE_PREFIX}/`;
      if (!rawUrl.startsWith(validPrefix)) return { error: 'URL de imagen inválida.' };
      newUrl = rawUrl;
    }

    const { data: existing } = await supabase
      .from('site_images')
      .select('image_url')
      .eq('slot_key', slotKey)
      .maybeSingle();

    // No new file → keep the current image (alt-only save).
    const finalUrl = newUrl ?? existing?.image_url ?? null;

    const { error: upsertErr } = await supabase.from('site_images').upsert(
      {
        slot_key: slotKey,
        image_url: finalUrl,
        alt_text: altText || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'slot_key' }
    );
    if (upsertErr) return { error: `No se pudo guardar: ${upsertErr.message}` };

    // Best-effort cleanup of the replaced file (only our own site/ objects).
    if (newUrl && existing?.image_url && existing.image_url !== newUrl) {
      const oldPath = storagePathFromUrl(existing.image_url);
      if (oldPath && oldPath.startsWith(`${SITE_PREFIX}/`)) {
        await supabase.storage.from(BUCKET).remove([oldPath]);
      }
    }

    // Reflect the change on the storefront (both pages are force-dynamic).
    revalidatePath('/');
    revalidatePath('/our-story');
    revalidatePath('/collection');
    revalidatePath('/portal/imagenes');
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo guardar la imagen.' };
  }
}

export async function deleteImageAction(formData: FormData) {
  await requireUser();
  const supabase = createSSRClient();
  const imageId = str(formData.get('image_id'), 64);
  if (!imageId) return;

  const { data: img } = await supabase.from('product_images').select('url').eq('id', imageId).maybeSingle();
  if (img) {
    const path = storagePathFromUrl(img.url);
    if (path) await supabase.storage.from(BUCKET).remove([path]);
  }
  await supabase.from('product_images').delete().eq('id', imageId);
  revalidateStore();
}

export async function reorderImagesAction(formData: FormData) {
  await requireUser();
  const supabase = createSSRClient();
  const ordered = str(formData.get('ordered'), 8000); // comma-separated image ids
  const ids = ordered.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 50);
  await Promise.all(ids.map((id, i) => supabase.from('product_images').update({ position: i + 1 }).eq('id', id)));
  revalidateStore();
}

/** Extract the object key from a Supabase public URL (…/object/public/<bucket>/<key>). */
function storagePathFromUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}
