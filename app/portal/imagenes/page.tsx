import { PortalHeader } from '@/components/portal/PortalHeader';
import { SiteImageManager, type SiteImageItem } from '@/components/portal/SiteImageManager';
import { getSiteImageMap } from '@/lib/site-images.server';
import { SITE_IMAGE_SLOTS, resolveSiteImage } from '@/lib/site-images';

// Auth-gated by middleware. force-dynamic so the grid always shows live values.
export const dynamic = 'force-dynamic';

// Visual manager for every editable site image (heros, campaign, packaging,
// Our Story). The owner replaces any image + its alt text here; the change
// reflects on the storefront with no redeploy.
export default async function ImagenesPage() {
  const map = await getSiteImageMap();

  const items: SiteImageItem[] = SITE_IMAGE_SLOTS.map((slot) => {
    const { src } = resolveSiteImage(map, slot.key);
    const row = map[slot.key];
    return {
      key: slot.key,
      group: slot.group,
      label: slot.label,
      currentSrc: src,
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
          Reemplaza cualquier imagen fija del sitio. Los cambios se reflejan en vivo, sin publicar
          de nuevo. Sube JPG, PNG o WebP (máx 10MB); usa fotos verticales de alta resolución para el
          mejor resultado.
        </p>
        <SiteImageManager items={items} />
      </main>
    </>
  );
}
