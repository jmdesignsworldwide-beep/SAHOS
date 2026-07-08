import 'server-only';
import { cache } from 'react';
import { getPublicClient } from '@/lib/supabase/public';
import type { SiteImageMap, SiteMediaType } from '@/lib/site-images';

interface Row {
  slot_key: string;
  image_url: string | null;
  alt_text: string | null;
  media_type?: string | null;
  poster_url?: string | null;
}

// Read every editable site slot from Supabase, once per request (React cache
// dedupes across the page tree). Uses the ANON client — site_images is publicly
// readable by design. If Supabase is not configured or the read fails, returns
// {} so every slot falls back to its /public file and the site never breaks.
//
// Resilient to the media columns not existing yet: if selecting media_type/
// poster_url errors (migration not applied), it retries with the base columns,
// so merging the code before running the SQL never blanks the storefront.
export const getSiteImageMap = cache(async (): Promise<SiteImageMap> => {
  const supabase = getPublicClient();
  if (!supabase) return {};

  let rows: Row[] = [];
  const full = await supabase.from('site_images').select('slot_key,image_url,alt_text,media_type,poster_url');
  if (full.error) {
    const base = await supabase.from('site_images').select('slot_key,image_url,alt_text');
    if (base.error || !base.data) return {};
    rows = base.data as Row[];
  } else {
    rows = (full.data ?? []) as Row[];
  }

  const map: SiteImageMap = {};
  for (const row of rows) {
    const mediaType: SiteMediaType = row.media_type === 'video' ? 'video' : 'image';
    map[row.slot_key] = {
      url: row.image_url ?? null,
      alt: row.alt_text ?? null,
      mediaType,
      posterUrl: row.poster_url ?? null,
    };
  }
  return map;
});
