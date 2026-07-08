-- ===========================================================================
-- SAHOS — Site slots can hold a VIDEO as well as an image. Run in the Supabase
-- SQL editor AFTER site-images.sql. Idempotent — safe to re-run.
--
-- Adds two columns to site_images:
--   * media_type  'image' | 'video'  (default 'image')
--   * poster_url  text                (the poster/fallback image for a video)
--
-- No new RLS or Storage policies: videos live in the SAME product-images bucket
-- under the site/ prefix (public read via public URL, authenticated-only write),
-- and the existing site_images policies already govern this table. The public
-- read policy `image_url is not null` still applies (a video slot stores the
-- video URL in image_url), so the Security Advisor stays clean.
-- ===========================================================================

alter table site_images
  add column if not exists media_type text not null default 'image';

alter table site_images
  add column if not exists poster_url text;

-- Constrain media_type to the two supported kinds.
do $$ begin
  alter table site_images
    add constraint site_images_media_type_chk check (media_type in ('image', 'video'));
exception when duplicate_object then null; end $$;
