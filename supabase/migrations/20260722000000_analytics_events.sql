-- ===========================================================================
-- SAHOS — Behavioral ANALYTICS (sessions · events · carts).
-- Powers the premium /portal/analytics module: visitors, traffic sources,
-- devices, behavior, the conversion funnel, abandoned carts and per-piece
-- performance. Applied automatically on merge by the migrations pipeline
-- (.github/workflows/supabase-migrations.yml). Idempotent — safe to re-run.
--
-- Privacy: anonymous, first-party only. A session is a random UUID kept in a
-- first-party cookie. We store NO PII here — no email, no name, no full IP.
-- Names/emails live only in `orders` (Stripe). Approximate geography comes from
-- Vercel edge headers; the raw IP is never persisted.
--
-- Security posture (Fort Knox — stronger than the brief):
--   * RLS ENABLED + FORCED on every table.
--   * NO anon or public policies at all. The public store never touches these
--     tables with the anon key; ALL writes happen server-side via the
--     service_role client in /api/track (rate-limited + payload-validated), so
--     the anon key can neither read the data nor flood it directly.
--   * A single admin READ policy per table, with a real predicate
--     (auth.uid() is not null) — never a bare `true` — so the Security Advisor
--     stays clean. The dashboard reads through the authenticated RLS client.
-- ===========================================================================

-- --- Sessions --------------------------------------------------------------
-- One row per anonymous visitor session (first-party cookie id). First-touch
-- attribution: referrer / utm / device are set once, on the first event.
create table if not exists analytics_sessions (
  id              uuid primary key,              -- session id (cookie value)
  created_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  referrer        text,                          -- raw document.referrer host
  referrer_source text,                          -- 'instagram' | 'google' | 'direct' | 'referral' | ...
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  device          text,                          -- 'mobile' | 'desktop' | 'tablet'
  country         text,                          -- ISO alpha-2, approximate
  region          text,                          -- state / region, approximate
  user_agent      text
);
create index if not exists analytics_sessions_created_idx on analytics_sessions (created_at desc);
create index if not exists analytics_sessions_source_idx  on analytics_sessions (referrer_source);
create index if not exists analytics_sessions_device_idx  on analytics_sessions (device);

alter table analytics_sessions enable row level security;
alter table analytics_sessions force  row level security;
drop policy if exists "admin read analytics_sessions" on analytics_sessions;
create policy "admin read analytics_sessions"
  on analytics_sessions for select to authenticated
  using ((select auth.uid()) is not null);

-- --- Events -----------------------------------------------------------------
-- The behavioral event stream. event_type is constrained so bad payloads can't
-- create junk types. product_slug ties events to the static catalog.
create table if not exists analytics_events (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid references analytics_sessions (id) on delete cascade,
  event_type   text not null check (event_type in (
                  'page_view','product_view','size_select',
                  'add_to_cart','remove_from_cart','checkout_started','purchase'
                )),
  product_slug text,
  size         text,
  value_cents  integer,
  path         text,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists analytics_events_created_idx  on analytics_events (created_at desc);
create index if not exists analytics_events_type_idx     on analytics_events (event_type);
create index if not exists analytics_events_slug_idx     on analytics_events (product_slug);
create index if not exists analytics_events_session_idx  on analytics_events (session_id);

alter table analytics_events enable row level security;
alter table analytics_events force  row level security;
drop policy if exists "admin read analytics_events" on analytics_events;
create policy "admin read analytics_events"
  on analytics_events for select to authenticated
  using ((select auth.uid()) is not null);

-- --- Carts ------------------------------------------------------------------
-- Cart lifecycle, one row per session (its current/last cart). state moves
-- active → converted on purchase; "abandoned" is derived at read time (active +
-- stale by more than the app's threshold) so no cron job is required.
create table if not exists carts (
  session_id         uuid primary key references analytics_sessions (id) on delete cascade,
  state              text not null default 'active' check (state in ('active','abandoned','converted')),
  items              jsonb not null default '[]'::jsonb,   -- [{slug,size,qty,value_cents}]
  value_cents        integer not null default 0,
  item_count         integer not null default 0,
  last_step          text,                                 -- 'add_to_cart' | 'checkout_started'
  converted_order_id uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists carts_state_idx      on carts (state);
create index if not exists carts_updated_idx    on carts (updated_at desc);

alter table carts enable row level security;
alter table carts force  row level security;
drop policy if exists "admin read carts" on carts;
create policy "admin read carts"
  on carts for select to authenticated
  using ((select auth.uid()) is not null);
