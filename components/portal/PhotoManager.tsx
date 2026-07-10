'use client';

/* eslint-disable @next/next/no-img-element */
import { useRef, useState, useTransition, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  createProductImageUpload,
  saveProductImageMeta,
  deleteImageAction,
  reorderImagesAction,
} from '@/app/portal/actions';
import { getBrowserSupabase } from '@/lib/supabase/browser';
import type { AdminImage } from '@/lib/admin';

type PhotoType = 'model' | 'garment_360';

const BUCKET = 'product-images';
const IMAGE_MAX = 25 * 1024 * 1024; // 25MB — matches the Storage bucket limit
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Client-side gate so bad files fail LOUDLY and instantly (no silent failure).
function classify(file: File): { ok: true } | { error: string } {
  const name = file.name.toLowerCase();
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif');
  if (isHeic) {
    return {
      error:
        'Las fotos HEIC del iPhone no se ven en la web. En tu iPhone: Ajustes → Cámara → Formatos → «Más compatible», o exporta la foto como JPG, y vuelve a subirla.',
    };
  }
  if (!IMAGE_TYPES.includes(file.type)) return { error: 'Formato no soportado. Usa JPG, PNG o WebP.' };
  if (file.size === 0) return { error: 'El archivo está vacío.' };
  if (file.size > IMAGE_MAX)
    return { error: `La imagen es muy grande (${(file.size / 1048576).toFixed(1)}MB). Máx 25MB.` };
  return { ok: true };
}

type Phase = 'idle' | 'uploading' | 'saving';

function Section({
  productId,
  type,
  title,
  hint,
  images,
  max,
}: {
  productId: string;
  type: PhotoType;
  title: string;
  hint: string;
  images: AdminImage[];
  max: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ordered = [...images].sort((a, b) => a.position - b.position);

  // Upload one file straight to Storage via a server-issued signed URL, then
  // record it. Throws with a visible message on any failure.
  const uploadOne = async (file: File) => {
    const c = classify(file);
    if ('error' in c) throw new Error(c.error);

    const ticketFd = new FormData();
    ticketFd.set('product_id', productId);
    ticketFd.set('type', type);
    ticketFd.set('content_type', file.type);
    const ticket = await createProductImageUpload(ticketFd);
    if (ticket?.error || !ticket?.path || !ticket?.token || !ticket?.publicUrl) {
      throw new Error(ticket?.error || 'No se pudo iniciar la subida.');
    }

    const supa = getBrowserSupabase();
    if (!supa) throw new Error('Almacenamiento no configurado.');

    setPhase('uploading');
    const { error: upErr } = await supa.storage
      .from(BUCKET)
      .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
    if (upErr) throw new Error(`No se pudo subir: ${upErr.message}`);

    setPhase('saving');
    const metaFd = new FormData();
    metaFd.set('product_id', productId);
    metaFd.set('type', type);
    metaFd.set('image_url', ticket.publicUrl);
    const res = await saveProductImageMeta(metaFd);
    if (res?.error) throw new Error(res.error);
  };

  const uploadFiles = (files: FileList | File[]) => {
    setError(null);
    const list = Array.from(files);
    startTransition(async () => {
      try {
        for (const file of list) {
          await uploadOne(file);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al subir. Inténtalo de nuevo.');
      } finally {
        setPhase('idle');
        if (inputRef.current) inputRef.current.value = '';
        router.refresh();
      }
    });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  };

  const remove = (id: string) => {
    if (!confirm('¿Eliminar esta foto?')) return;
    const fd = new FormData();
    fd.set('image_id', id);
    startTransition(async () => {
      await deleteImageAction(fd);
      router.refresh();
    });
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= ordered.length) return;
    const ids = ordered.map((i) => i.id);
    [ids[index], ids[next]] = [ids[next], ids[index]];
    const fd = new FormData();
    fd.set('ordered', ids.join(','));
    startTransition(async () => {
      await reorderImagesAction(fd);
      router.refresh();
    });
  };

  const full = ordered.length >= max;
  const busyLabel = phase === 'saving' ? 'Guardando…' : 'Subiendo…';

  return (
    <div className="pphotos">
      <div className="pphotos__head">
        <h3>{title}</h3>
        <span className="pphotos__hint">{hint}</span>
      </div>

      <div className="pgallery">
        {ordered.map((img, i) => (
          <figure key={img.id} className="pthumb">
            <img src={img.url} alt="" />
            <figcaption className="pthumb__bar">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0 || pending} aria-label="Mover antes">
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === ordered.length - 1 || pending}
                aria-label="Mover después"
              >
                ↓
              </button>
              <button type="button" className="pthumb__del" onClick={() => remove(img.id)} disabled={pending}>
                Eliminar
              </button>
            </figcaption>
          </figure>
        ))}
      </div>

      {!full && (
        <div
          className={`pdrop ${dragOver ? 'is-over' : ''} ${pending ? 'is-busy' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !pending && inputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.heic,.heif"
            multiple={type === 'model'}
            hidden
            disabled={pending}
            onChange={(e) => e.target.files && e.target.files.length > 0 && uploadFiles(e.target.files)}
          />
          <p>{pending ? busyLabel : 'Arrastra fotos aquí o toca para elegir'}</p>
          <span>JPG, PNG o WebP · máx 25MB</span>
        </div>
      )}

      {error && <p className="pmsg pmsg--error">{error}</p>}
    </div>
  );
}

export function PhotoManager({ productId, images }: { productId: string; images: AdminImage[] }) {
  const model = images.filter((i) => i.type === 'model');
  const garment = images.filter((i) => i.type === 'garment_360');
  return (
    <div className="pphotos-wrap">
      <Section
        productId={productId}
        type="model"
        title="Fotos de modelo"
        hint="Galería del producto · hasta 10"
        images={model}
        max={10}
      />
      <Section
        productId={productId}
        type="garment_360"
        title="Fotos de prenda (detalle)"
        hint="Detalle de la prenda · frente · lado · espalda"
        images={garment}
        max={3}
      />
    </div>
  );
}
