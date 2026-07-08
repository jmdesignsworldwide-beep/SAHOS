import { PortalHeader } from '@/components/portal/PortalHeader';
import { SiteImageManager, type SiteImageItem } from '@/components/portal/SiteImageManager';
import { getSiteImageMap } from '@/lib/site-images.server';
import { SITE_IMAGE_SLOTS, resolveSiteMedia } from '@/lib/site-images';

// Auth-gated by middleware. force-dynamic so the grid always shows live values.
export const dynamic = 'force-dynamic';

// Visual manager for every editable site slot (heros, campaign, packaging, Our
// Story). The owner replaces any slot with an image OR a looping video + its alt
// text here; the change reflects on the storefront with no redeploy.
export default async function ImagenesPage() {
  const map = await getSiteImageMap();

  const items: SiteImageItem[] = SITE_IMAGE_SLOTS.map((slot) => {
    const media = resolveSiteMedia(map, slot.key);
    const row = map[slot.key];
    return {
      key: slot.key,
      group: slot.group,
      label: slot.label,
      currentSrc: media.type === 'video' ? media.src : media.src,
      mediaType: media.type,
      posterSrc: media.poster,
      alt: row?.alt ?? '',
      hasCustom: Boolean(row?.url),
    };
  });

  return (
    <>
      <PortalHeader />
      <main className="pwrap pwrap--wide">
        <div className="ptoolbar">
          <h1 className="ptitle">Imágenes del sitio</h1>
        </div>
        <p className="pmsg pmsg--muted">
          Reemplaza cualquier slot del sitio por una imagen o un video en loop. Los cambios se
          reflejan en vivo, sin publicar de nuevo. Imagen: JPG/PNG/WebP (máx 25MB). Video: MP4/WebM
          (máx 50MB) — usa clips cortos de pocos segundos para el mejor rendimiento.
        </p>
        <SiteImageManager items={items} />
      </main>
    </>
  );
}
