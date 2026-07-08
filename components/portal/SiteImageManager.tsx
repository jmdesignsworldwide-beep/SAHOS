'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createSiteImageUpload, saveSiteImageMeta } from '@/app/portal/actions';
import { getBrowserSupabase } from '@/lib/supabase/browser';

const BUCKET = 'product-images';
const MAX_BYTES = 25 * 1024 * 1024; // 25MB — clean hero photos are large
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

// Returns a human error string if the file can't be used, else null.
function validateFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif');
  if (isHeic) {
    return 'Las fotos HEIC del iPhone no se ven en la web. En tu iPhone: Ajustes → Cámara → Formatos → «Más compatible», o abre la foto y expórtala como JPG, y vuelve a subirla.';
  }
  if (!ALLOWED.includes(file.type)) {
    return 'Formato no soportado. Usa JPG, PNG o WebP.';
  }
  if (file.size > MAX_BYTES) {
    return `La imagen es muy grande (${(file.size / 1024 / 1024).toFixed(1)}MB). El máximo es 25MB.`;
  }
  return null;
}

export interface SiteImageItem {
  key: string;
  group: string;
  label: string;
  /** current image to show (uploaded one, or the /public fallback) */
  currentSrc: string;
  /** current alt text (empty string if none set) */
  alt: string;
  /** true when a custom image has been uploaded (vs. the default file) */
  hasCustom: boolean;
}

type Phase = 'idle' | 'uploading' | 'saving';

function SlotCard({ item }: { item: SiteImageItem }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
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

  const pickFile = (f: File | null) => {
    setMsg(null);
    if (preview) URL.revokeObjectURL(preview);
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    const err = validateFile(f);
    if (err) {
      // Reject clearly and don't stage the file.
      setFile(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = '';
      setMsg({ text: err });
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const reset = () => {
    pickFile(null);
    setAlt(item.alt);
    setMsg(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const save = () => {
    if (!canSave) return;
    setMsg(null);
    startTransition(async () => {
      try {
        let uploadedUrl: string | undefined;

        if (file) {
          // 1) ask the server for a signed upload URL (server picks the path).
          setPhase('uploading');
          const ticketFd = new FormData();
          ticketFd.set('slot_key', item.key);
          ticketFd.set('content_type', file.type);
          const ticket = await createSiteImageUpload(ticketFd);
          if (ticket?.error || !ticket?.path || !ticket?.token) {
            setPhase('idle');
            setMsg({ text: ticket?.error || 'No se pudo iniciar la subida.' });
            return;
          }

          // 2) push the bytes straight to Storage (bypasses function limits).
          const supa = getBrowserSupabase();
          if (!supa) {
            setPhase('idle');
            setMsg({ text: 'Almacenamiento no configurado.' });
            return;
          }
          const { error: upErr } = await supa.storage
            .from(BUCKET)
            .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
          if (upErr) {
            setPhase('idle');
            setMsg({ text: `No se pudo subir la imagen: ${upErr.message}` });
            return;
          }
          uploadedUrl = ticket.publicUrl;
        }

        // 3) persist the new URL (if any) + alt text.
        setPhase('saving');
        const metaFd = new FormData();
        metaFd.set('slot_key', item.key);
        metaFd.set('alt_text', alt);
        if (uploadedUrl) metaFd.set('image_url', uploadedUrl);
        const res = await saveSiteImageMeta(metaFd);
        if (res?.error) {
          setPhase('idle');
          setMsg({ text: res.error });
          return;
        }

        // success — clear the staged selection; refreshed data is the new state
        if (preview) URL.revokeObjectURL(preview);
        setFile(null);
        setPreview(null);
        if (inputRef.current) inputRef.current.value = '';
        setPhase('idle');
        setMsg({ ok: true, text: 'Guardado' });
        router.refresh();
      } catch (e) {
        // Never fail silently — surface anything unexpected.
        setPhase('idle');
        setMsg({
          text: e instanceof Error ? e.message : 'Error inesperado al subir. Inténtalo de nuevo.',
        });
      }
    });
  };

  const shown = preview ?? item.currentSrc;
  const btnLabel = !pending ? 'Guardar' : phase === 'uploading' ? 'Subiendo…' : 'Guardando…';

  return (
    <div className="simg-card">
      <div className="simg-card__media">
        {shown ? (
          <img src={shown} alt={item.alt || item.label} loading="lazy" />
        ) : (
          <span className="simg-card__empty">—</span>
        )}
        {pending && <span className="simg-card__tag simg-card__tag--busy">{btnLabel}</span>}
        {!pending && preview && (
          <span className="simg-card__tag simg-card__tag--preview">Vista previa</span>
        )}
        {!pending && !preview && (
          <span className={`simg-card__tag ${item.hasCustom ? 'is-custom' : 'is-default'}`}>
            {item.hasCustom ? 'Personalizada' : 'Por defecto'}
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
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.heic,.heif"
          hidden
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />

        <div className="simg-card__actions">
          <button
            type="button"
            className="pbtn"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
          >
            {file ? 'Cambiar archivo' : 'Elegir imagen'}
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
        <span className="simg-card__hint">JPG, PNG o WebP · máx 25MB · (HEIC del iPhone no)</span>
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
