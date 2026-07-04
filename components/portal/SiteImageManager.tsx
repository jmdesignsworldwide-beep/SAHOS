'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveSiteImageAction } from '@/app/portal/actions';

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

function SlotCard({ item }: { item: SiteImageItem }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [alt, setAlt] = useState(item.alt);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  // Revoke object URLs to avoid leaks.
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
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    } else {
      setFile(null);
      setPreview(null);
    }
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
      const fd = new FormData();
      fd.set('slot_key', item.key);
      fd.set('alt_text', alt);
      if (file) fd.set('file', file);
      const res = await saveSiteImageAction(fd);
      if (res?.error) {
        setMsg({ text: res.error });
        return;
      }
      // clear the pending selection; refreshed data becomes the new "current"
      if (preview) URL.revokeObjectURL(preview);
      setFile(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = '';
      setMsg({ ok: true, text: 'Guardado' });
      router.refresh();
    });
  };

  const shown = preview ?? item.currentSrc;

  return (
    <div className="simg-card">
      <div className="simg-card__media">
        {shown ? (
          <img src={shown} alt={item.alt || item.label} loading="lazy" />
        ) : (
          <span className="simg-card__empty">—</span>
        )}
        {preview && <span className="simg-card__tag simg-card__tag--preview">Vista previa</span>}
        {!preview && (
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
          accept="image/jpeg,image/png,image/webp"
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
            {pending ? 'Guardando…' : 'Guardar'}
          </button>
          {(file || altChanged) && !pending && (
            <button type="button" className="simg-card__reset" onClick={reset}>
              Cancelar
            </button>
          )}
        </div>

        {file && <span className="simg-card__file">{file.name}</span>}
        <span className="simg-card__hint">JPG, PNG o WebP · máx 10MB</span>
        {msg && (
          <p className={`pmsg ${msg.ok ? 'pmsg--ok' : 'pmsg--error'}`}>{msg.text}</p>
        )}
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
