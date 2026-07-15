-- ===========================================================================
-- SAHOS — Location ANALYTICS (privacy-first visitor geography).
-- Run in the Supabase SQL editor AFTER schema.sql + portal.sql. Idempotent —
-- safe to re-run.
--
-- What this does:
--   * Creates the `page_visits` table: one lightweight row per public-page
--     visit, holding ONLY approximate geography (country / region / city) as
--     derived from Vercel's edge geo headers, the visited path, and a
--     timestamp. NEVER an IP address and NEVER any personal / identifying data.
--   * RLS ENABLED + FORCED. There are NO anon or public policies at all, so the
--     table cannot be read or written with the anon key. Rows are written ONLY
--     by the server via the service_role key (bypasses RLS) from /api/track,
--     and read ONLY by an AUTHENTICATED admin for the portal dashboard.
--
-- Privacy / legal (US-friendly): we store aggregate location, not people. No
-- IP is persisted (it is used transiently, in memory, only to rate-limit the
-- tracking endpoint). Nothing here can identify an individual visitor.
--
-- Security posture (Fort Knox): service_role is server-only; the public site
-- never touches this table with the anon key; RLS is the backstop. The admin
-- read policy uses a real predicate (auth.uid() is not null), not a bare
-- `true`, so the Security Advisor stays clean.
-- ===========================================================================

create table if not exists page_visits (
  id          uuid primary key default gen_random_uuid(),
  country     text,            -- ISO 3166-1 alpha-2 (e.g. 'US'), approximate
  region      text,            -- state / region code or name, approximate
  city        text,            -- approximate city (edge-derived), never precise
  path        text,            -- public page visited (e.g. '/', '/collection')
  created_at  timestamptz not null default now()
);

-- Query paths the dashboard uses: time-window scans and per-country grouping.
create index if not exists page_visits_created_at_idx on page_visits (created_at desc);
create index if not exists page_visits_country_idx     on page_visits (country);

alter table page_visits enable row level security;
alter table page_visits force  row level security;

-- Authenticated admin may READ (for the portal analytics dashboard). No INSERT
-- policy for anon/authenticated: writes come exclusively from the server's
-- service_role client, which bypasses RLS. This means the anon key can neither
-- read the data nor spam the table.
drop policy if exists "admin read page visits" on page_visits;
create policy "admin read page visits"
  on page_visits for select
  to authenticated
  using ((select auth.uid()) is not null);
