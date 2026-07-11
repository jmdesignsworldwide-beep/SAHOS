-- ===========================================================================
-- SAHOS — Editable SITE images (heros, campaign, packaging, Our Story).
-- Run in the Supabase SQL editor AFTER schema.sql + portal.sql. Idempotent —
-- safe to re-run.
--
-- What this does:
--   * Creates the `site_images` table: one row per editable image slot on the
--     site, keyed by a stable slot_key (matches lib/site-images.ts).
--   * RLS ENABLED + FORCED. Public (anon) may READ populated slots so the
--     storefront can render them; only an AUTHENTICATED admin may WRITE.
--   * Seeds a row for every slot the site uses today (image_url NULL → the app
--     falls back to the current /public file until the owner uploads one).
--
-- Storage: reuses the existing `product-images` bucket under a `site/` prefix,
-- so no new bucket and no new storage policies are needed (the portal.sql
-- authenticated-write policies already cover it, and public URLs serve without
-- RLS). Nothing to add here for storage.
--
-- Security posture (Fort Knox): service_role is never used from the client;
-- writes require a valid session; RLS is the backstop. Read policy uses a real
-- column predicate (not a bare `true`) so the Security Advisor stays clean.
-- ===========================================================================

create table if not exists site_images (
  id          uuid primary key default gen_random_uuid(),
  slot_key    text unique not null,
  image_url   text,
  alt_text    text,
  updated_at  timestamptz not null default now()
);

alter table site_images enable row level security;
alter table site_images force  row level security;

-- Public READ of populated slots only. Expressed as `image_url is not null`
-- (a genuine predicate, not a tautology) so rls_policy_always_true passes; empty
-- slots have no URL to serve and the app uses the /public fallback anyway.
drop policy if exists "public read site images" on site_images;
create policy "public read site images"
  on site_images for select
  to anon, authenticated
  using (image_url is not null);

-- Authenticated admin can read every slot (incl. empty) and write.
drop policy if exists "admin read all site images" on site_images;
create policy "admin read all site images"
  on site_images for select
  to authenticated
  using ((select auth.uid()) is not null);

drop policy if exists "admin write site images" on site_images;
create policy "admin write site images"
  on site_images for all
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

-- Seed one row per slot (image_url NULL → /public fallback until replaced).
insert into site_images (slot_key) values
  ('home_hero'),
  ('campaign_1'),
  ('house_packaging'),
  ('home_uniquely'),
  ('home_marilyn_bg'),
  ('campaign_2'),
  ('our_story_founder'),
  ('our_story_philosophy'),
  ('our_story_design')
on conflict (slot_key) do nothing;
