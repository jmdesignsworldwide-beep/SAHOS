'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createSSRClient, getSessionUser } from '@/lib/supabase/ssr';
import { requireUser } from '@/lib/admin';
import { rateLimit, clientIp } from '@/lib/rate-limit';

const BUCKET = 'product-images';
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

  redirect('/portal/productos');
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
export async function saveProductAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
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

  const slug = (str(formData.get('slug'), 60) || slugify(name)) || `pieza-${Date.now()}`;

  const payload = {
    name,
    slug,
    subtitle,
    description,
    color,
    factory_ref: factoryRef,
    price_cents: priceCents,
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
      await supabase.from('product_sizes').upsert(
        { product_id: productId, size, stock },
        { onConflict: 'product_id,size' }
      );
    } else {
      await supabase.from('product_sizes').delete().eq('product_id', productId).eq('size', size);
    }
  }

  revalidateStore(slug);
  redirect(`/portal/productos/${productId}?saved=1`);
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
  redirect('/portal/productos');
}

// --------------------------------------------------------------------------
// Photos
// --------------------------------------------------------------------------
export async function uploadImageAction(formData: FormData): Promise<ActionState> {
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
