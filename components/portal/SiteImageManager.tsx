'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createSiteImageUpload, saveSiteImageMeta } from '@/app/portal/actions';
import { getBrowserSupabase } from '@/lib/supabase/browser';

const BUCKET = 'product-images';
const IMAGE_MAX = 25 * 1024 * 1024; // 25MB
const VIDEO_MAX = 50 * 1024 * 1024; // 50MB
const VIDEO_MAX_SECONDS = 30; // keep loops short for performance
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm'];

type Kind = 'image' | 'video';

function classify(file: File): { kind: Kind } | { error: string } {
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
  if (IMAGE_TYPES.includes(file.type)) {
    if (file.size > IMAGE_MAX)
      return { error: `La imagen es muy grande (${(file.size / 1048576).toFixed(1)}MB). Máx 25MB.` };
    return { kind: 'image' };
  }
  if (VIDEO_TYPES.includes(file.type)) {
    if (file.size > VIDEO_MAX)
      return { error: `El video es muy grande (${(file.size / 1048576).toFixed(1)}MB). Máx 50MB.` };
    return { kind: 'video' };
  }
  return { error: 'Formato no soportado. Imagen: JPG, PNG, WebP · Video: MP4 o WebM.' };
}

// Read a video's duration from a local file.
function videoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    const url = URL.createObjectURL(file);
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(v.duration) ? v.duration : 0);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    v.src = url;
  });
}

// Capture the first frame of a video as a JPEG poster (best-effort — returns
// null if the browser blocks it). Gives the site an instant still while the
// clip loads, and a fallback under reduced-motion.
function makePoster(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.preload = 'auto';
    v.muted = true;
    v.playsInline = true;
    const url = URL.createObjectURL(file);
    let done = false;
    const finish = (blob: Blob | null) => {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    const grab = () => {
      try {
        const w = v.videoWidth;
        const h = v.videoHeight;
        if (!w || !h) return finish(null);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return finish(null);
        ctx.drawImage(v, 0, 0, w, h);
        canvas.toBlob((b) => finish(b), 'image/jpeg', 0.82);
      } catch {
        finish(null);
      }
    };
    v.onloadeddata = () => {
      // seek a hair in so we don't capture a black first frame
      try {
        v.currentTime = Math.min(0.1, (v.duration || 1) / 2);
      } catch {
        grab();
      }
    };
    v.onseeked = grab;
    v.onerror = () => finish(null);
    setTimeout(() => finish(null), 5000); // never hang the save
    v.src = url;
  });
}

export interface SiteImageItem {
  key: string;
  group: string;
  label: string;
  /** current media to show (uploaded one, or the /public fallback image) */
  currentSrc: string;
  /** 'image' | 'video' — how the slot currently renders */
  mediaType: Kind;
  /** poster/fallback still for a current video */
  posterSrc: string;
  alt: string;
  hasCustom: boolean;
}

type Phase = 'idle' | 'uploading' | 'saving';

function SlotCard({ item }: { item: SiteImageItem }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileKind, setFileKind] = useState<Kind>('image');
  const [preview, setPreview] = useState<string | null>(null);
  const [alt, setAlt] = useState(item.alt);
  const [phase, setPhase] = useState<Phase>('idle');
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const altChanged = alt.trim() !== item.alt.trim();
  const canSave = (Boolean(file) || altChanged) && !pending;

  const pickFile = async (f: File | null) => {
    setMsg(null);
    if (preview) URL.revokeObjectURL(preview);
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    const res = classify(f);
    if ('error' in res) {
      setFile(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = '';
      setMsg({ text: res.error });
      return;
    }
    if (res.kind === 'video') {
      const dur = await videoDuration(f);
      if (dur > VIDEO_MAX_SECONDS) {
        setFile(null);
        setPreview(null);
        if (inputRef.current) inputRef.current.value = '';
        setMsg({
          text: `El video dura ${dur.toFixed(0)}s. Usa un clip corto (máx ${VIDEO_MAX_SECONDS}s) para el loop.`,
        });
        return;
      }
    }
    setFile(f);
    setFileKind(res.kind);
    setPreview(URL.createObjectURL(f));
  };

  const reset = () => {
    void pickFile(null);
    setAlt(item.alt);
    setMsg(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  // Upload one file straight to Storage via a server-issued signed URL. Returns
  // the public URL, or throws with a visible message.
  const uploadOne = async (f: File): Promise<string> => {
    const ticketFd = new FormData();
    ticketFd.set('slot_key', item.key);
    ticketFd.set('content_type', f.type);
    const ticket = await createSiteImageUpload(ticketFd);
    if (ticket?.error || !ticket?.path || !ticket?.token || !ticket?.publicUrl) {
      throw new Error(ticket?.error || 'No se pudo iniciar la subida.');
    }
    const supa = getBrowserSupabase();
    if (!supa) throw new Error('Almacenamiento no configurado.');
    const { error } = await supa.storage
      .from(BUCKET)
      .uploadToSignedUrl(ticket.path, ticket.token, f, { contentType: f.type });
    if (error) throw new Error(`No se pudo subir: ${error.message}`);
    return ticket.publicUrl;
  };

  const save = () => {
    if (!canSave) return;
    setMsg(null);
    startTransition(async () => {
      try {
        let mediaUrl: string | undefined;
        let posterUrl: string | undefined;
        const kind: Kind = file ? fileKind : item.mediaType;

        if (file) {
          setPhase('uploading');
          // For video, capture a poster first (best-effort) so the site has a
          // still frame while the clip loads / under reduced-motion.
          if (fileKind === 'video') {
            const posterBlob = await makePoster(file);
            if (posterBlob) {
              const posterFile = new File([posterBlob], 'poster.jpg', { type: 'image/jpeg' });
              posterUrl = await uploadOne(posterFile);
            }
          }
          mediaUrl = await uploadOne(file);
        }

        setPhase('saving');
        const metaFd = new FormData();
        metaFd.set('slot_key', item.key);
        metaFd.set('alt_text', alt);
        metaFd.set('media_type', kind);
        if (mediaUrl) metaFd.set('image_url', mediaUrl);
        if (posterUrl) metaFd.set('poster_url', posterUrl);
        const res = await saveSiteImageMeta(metaFd);
        if (res?.error) {
          setPhase('idle');
          setMsg({ text: res.error });
          return;
        }

        if (preview) URL.revokeObjectURL(preview);
        setFile(null);
        setPreview(null);
        if (inputRef.current) inputRef.current.value = '';
        setPhase('idle');
        setMsg({ ok: true, text: 'Guardado' });
        router.refresh();
      } catch (e) {
        setPhase('idle');
        setMsg({
          text: e instanceof Error ? e.message : 'Error inesperado al subir. Inténtalo de nuevo.',
        });
      }
    });
  };

  const btnLabel = !pending ? 'Guardar' : phase === 'uploading' ? 'Subiendo…' : 'Guardando…';

  // What to show in the thumbnail: a fresh selection, else the current media.
  const showPreviewVideo = preview && fileKind === 'video';
  const showCurrentVideo = !preview && item.mediaType === 'video' && item.currentSrc;
  const shownImg = preview ?? item.currentSrc;

  return (
    <div className="simg-card">
      <div className="simg-card__media">
        {showPreviewVideo ? (
          <video src={preview!} muted loop autoPlay playsInline />
        ) : showCurrentVideo ? (
          <video src={item.currentSrc} poster={item.posterSrc || undefined} muted loop autoPlay playsInline />
        ) : shownImg ? (
          <img src={shownImg} alt={item.alt || item.label} loading="lazy" />
        ) : (
          <span className="simg-card__empty">—</span>
        )}

        {pending && <span className="simg-card__tag simg-card__tag--busy">{btnLabel}</span>}
        {!pending && preview && (
          <span className="simg-card__tag simg-card__tag--preview">
            Vista previa{fileKind === 'video' ? ' · video' : ''}
          </span>
        )}
        {!pending && !preview && (
          <span className={`simg-card__tag ${item.hasCustom ? 'is-custom' : 'is-default'}`}>
            {item.hasCustom ? (item.mediaType === 'video' ? 'Video' : 'Personalizada') : 'Por defecto'}
          </span>
        )}
      </div>

      <div className="simg-card__body">
        <span className="simg-card__label">{item.label}</span>

        <label className="simg-card__field">
          <span>Texto alternativo</span>
          <input
            type="text"
            value={alt}
            maxLength={300}
            placeholder="Descripción para accesibilidad / SEO"
            onChange={(e) => setAlt(e.target.value)}
            disabled={pending}
          />
        </label>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,.jpg,.jpeg,.png,.webp,.heic,.heif,.mp4,.webm"
          hidden
          onChange={(e) => void pickFile(e.target.files?.[0] ?? null)}
        />

        <div className="simg-card__actions">
          <button
            type="button"
            className="pbtn"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
          >
            {file ? 'Cambiar archivo' : 'Imagen o video'}
          </button>
          <button type="button" className="pbtn pbtn--primary" onClick={save} disabled={!canSave}>
            {btnLabel}
          </button>
          {(file || altChanged) && !pending && (
            <button type="button" className="simg-card__reset" onClick={reset}>
              Cancelar
            </button>
          )}
        </div>

        {file && <span className="simg-card__file">{file.name}</span>}
        <span className="simg-card__hint">
          Imagen JPG/PNG/WebP (máx 25MB) · Video MP4/WebM (máx 50MB, clip corto)
        </span>
        {msg && <p className={`pmsg ${msg.ok ? 'pmsg--ok' : 'pmsg--error'}`}>{msg.text}</p>}
      </div>
    </div>
  );
}

export function SiteImageManager({ items }: { items: SiteImageItem[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, SiteImageItem[]>();
    for (const it of items) {
      const arr = map.get(it.group) ?? [];
      arr.push(it);
      map.set(it.group, arr);
    }
    return Array.from(map.entries());
  }, [items]);

  return (
    <div className="simg-wrap">
      {groups.map(([group, groupItems]) => (
        <section key={group} className="simg-group">
          <h2 className="psection-title">{group}</h2>
          <div className="simg-grid">
            {groupItems.map((it) => (
              <SlotCard key={it.key} item={it} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
