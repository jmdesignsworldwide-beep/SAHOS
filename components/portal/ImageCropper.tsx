'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// Free-form crop modal. The owner drags to draw a box and can move it or resize
// any edge (no forced aspect ratio) — e.g. to trim the bottom of a too-long
// garment shot. On apply it renders the selection to a canvas at the image's
// FULL native resolution (no quality loss beyond the crop) and returns a new
// File in the same format, ready for the existing signed-URL upload flow. If the
// owner cancels, nothing changes and the original file uploads as before.
export function ImageCropper({
  file,
  onCancel,
  onApply,
}: {
  file: File;
  onCancel: () => void;
  onApply: (cropped: File) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [src] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState<Crop>();
  const [completed, setCompleted] = useState<PixelCrop>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => URL.revokeObjectURL(src), [src]);

  // Default the selection to the whole image so "apply" with no drag is a no-op
  // crop, and the owner just pulls an edge in to trim.
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const full: PixelCrop = { unit: 'px', x: 0, y: 0, width, height };
    setCrop(full);
    setCompleted(full);
  };

  const apply = async () => {
    const image = imgRef.current;
    if (!image || !completed || completed.width < 4 || completed.height < 4) {
      setError('Selecciona un área un poco más grande.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Scale the on-screen selection up to the image's native pixels so the
      // crop keeps full resolution.
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(completed.width * scaleX));
      canvas.height = Math.max(1, Math.round(completed.height * scaleY));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas no disponible.');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        image,
        completed.x * scaleX,
        completed.y * scaleY,
        completed.width * scaleX,
        completed.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const outType =
        file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, outType, 0.92));
      if (!blob) throw new Error('No se pudo generar el recorte.');
      const ext = outType === 'image/png' ? 'png' : outType === 'image/webp' ? 'webp' : 'jpg';
      const base = file.name.replace(/\.[^.]+$/, '') || 'imagen';
      onApply(new File([blob], `${base}-recorte.${ext}`, { type: outType }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo recortar.');
      setBusy(false);
    }
  };

  return (
    <div className="cropper" role="dialog" aria-modal="true" aria-label="Recortar imagen">
      <div className="cropper__panel">
        <div className="cropper__head">
          <h3>Recortar imagen</h3>
          <p>
            Arrastra para dibujar el marco; muévelo o ajusta cualquier borde. Recorte libre, sin
            proporción fija. Lo que quede dentro del marco es lo que se guardará.
          </p>
        </div>

        <div className="cropper__stage">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompleted(c)}
            keepSelection
            ruleOfThirds
          >
            <img ref={imgRef} src={src} alt="" onLoad={onImageLoad} className="cropper__img" />
          </ReactCrop>
        </div>

        {error && <p className="pmsg pmsg--error">{error}</p>}

        <div className="cropper__foot">
          <button type="button" className="pbtn" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button type="button" className="pbtn pbtn--primary" onClick={apply} disabled={busy}>
            {busy ? 'Recortando…' : 'Aplicar recorte'}
          </button>
        </div>
      </div>
    </div>
  );
}
