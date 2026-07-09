'use client';

/* eslint-disable @next/next/no-img-element */
import { useRef, useState, useTransition, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  uploadImageAction,
  deleteImageAction,
  reorderImagesAction,
} from '@/app/portal/actions';
import type { AdminImage } from '@/lib/admin';

type PhotoType = 'model' | 'garment_360';

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
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ordered = [...images].sort((a, b) => a.position - b.position);

  const uploadFiles = (files: FileList | File[]) => {
    setError(null);
    const list = Array.from(files);
    startTransition(async () => {
      for (const file of list) {
        const fd = new FormData();
        fd.set('product_id', productId);
        fd.set('type', type);
        fd.set('file', file);
        const res = await uploadImageAction(fd);
        if (res?.error) {
          setError(res.error);
          break;
        }
      }
      router.refresh();
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
          className={`pdrop ${dragOver ? 'is-over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple={type === 'model'}
            hidden
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          />
          <p>{pending ? 'Subiendo…' : 'Arrastra fotos aquí o toca para elegir'}</p>
          <span>JPG, PNG o WebP · máx 10MB</span>
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
