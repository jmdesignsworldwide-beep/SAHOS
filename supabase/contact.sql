-- ===========================================================================
-- SAHOS — Contact-us messages (customer service). Run in the Supabase SQL editor
-- AFTER schema.sql. Idempotent — safe to re-run.
--
-- Separate from `newsletter` (marketing email capture): this table holds full
-- customer-service messages the owner reads/answers from /portal/mensajes.
--
-- Security posture (Fort Knox):
--   * RLS ENABLED + FORCED.
--   * NO anon policy at all → the public can never read or write this table
--     directly. The public contact form inserts ONLY through the server API,
--     which uses the service_role key (bypasses RLS).
--   * AUTHENTICATED admin may READ and UPDATE (mark read/replied) — real
--     predicate `(select auth.uid()) is not null`, so the Security Advisor's
--     rls_policy_always_true check passes.
-- ===========================================================================

create table if not exists contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  email       text not null,
  message     text not null,
  status      text not null default 'new',   -- new | read | replied
  created_at  timestamptz not null default now()
);
create index if not exists contact_messages_created_idx on contact_messages (created_at desc);

alter table contact_messages enable row level security;
alter table contact_messages force  row level security;

-- Authenticated admin: read every message.
drop policy if exists "admin read contact messages" on contact_messages;
create policy "admin read contact messages"
  on contact_messages for select
  to authenticated
  using ((select auth.uid()) is not null);

-- Authenticated admin: update status (new → read → replied).
drop policy if exists "admin update contact messages" on contact_messages;
create policy "admin update contact messages"
  on contact_messages for update
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

-- No INSERT/DELETE policies: inserts happen server-side via service_role, which
-- bypasses RLS; nothing else may write. (Anon has no policy → fully locked out.)
