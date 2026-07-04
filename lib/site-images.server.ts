import 'server-only';
import { cache } from 'react';
import { getPublicClient } from '@/lib/supabase/public';
import type { SiteImageMap } from '@/lib/site-images';

// Read every editable site image from Supabase, once per request (React cache
// dedupes across the page tree). Uses the ANON client — the site_images table
// is publicly readable by design (the storefront must render its images). If
// Supabase is not configured or the read fails, returns {} so every slot falls
// back to its /public file and the site never breaks.
export const getSiteImageMap = cache(async (): Promise<SiteImageMap> => {
  const supabase = getPublicClient();
  if (!supabase) return {};
  const { data, error } = await supabase.from('site_images').select('slot_key,image_url,alt_text');
  if (error || !data) return {};
  const map: SiteImageMap = {};
  for (const row of data as { slot_key: string; image_url: string | null; alt_text: string | null }[]) {
    map[row.slot_key] = { url: row.image_url ?? null, alt: row.alt_text ?? null };
  }
  return map;
});
