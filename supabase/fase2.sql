-- ===========================================================================
-- SAHOS — Fase 2 (portal premium) data model. Run AFTER schema.sql + seed.sql +
-- portal.sql, in the Supabase SQL editor. Idempotent — safe to re-run.
--
-- Adds: order fulfillment tracking, per-size inventory mode + low-stock
-- threshold, and per-piece production cost (admin-only, never public). RLS is
-- enabled + forced everywhere; the public may read inventory (to know what is
-- sold out) but nothing about orders or costs. Stock decrement is atomic and
-- mode-aware so on-demand pieces never run out and limited pieces can't oversell.
-- ===========================================================================

-- --- Enums ------------------------------------------------------------------
do $$ begin
  create type fulfillment_status as enum ('new','preparing','shipped','delivered','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type stock_mode as enum ('limited','on_demand');
exception when duplicate_object then null; end $$;

-- --- orders: fulfillment + customer + shipping fields -----------------------
alter table orders add column if not exists fulfillment_status fulfillment_status not null default 'new';
alter table orders add column if not exists customer_name text;
alter table orders add column if not exists tracking_number text;
alter table orders add column if not exists courier text;
alter table orders add column if not exists shipped_at timestamptz;
alter table orders add column if not exists updated_at timestamptz not null default now();

-- --- product_sizes: inventory mode + low-stock threshold --------------------
alter table product_sizes add column if not exists mode stock_mode not null default 'limited';
alter table product_sizes add column if not exists low_stock_threshold int not null default 3;

-- --- product_costs: production cost per piece (admin-only) ------------------
create table if not exists product_costs (
  product_id uuid primary key references products(id) on delete cascade,
  cost_cents int not null default 0 check (cost_cents >= 0),
  updated_at timestamptz not null default now()
);
alter table product_costs enable row level security;
alter table product_costs force row level security;

-- ===========================================================================
-- RLS policies
-- ===========================================================================
-- Orders / order_items: admin (authenticated) read + write. NO anon access
-- (the base tables already have RLS forced with no anon policy). The Stripe
-- webhook writes via service_role, which bypasses RLS by design.
drop policy if exists "admin read orders" on orders;
create policy "admin read orders" on orders for select to authenticated
  using ((select auth.uid()) is not null);
drop policy if exists "admin write orders" on orders;
create policy "admin write orders" on orders for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy if exists "admin read order_items" on order_items;
create policy "admin read order_items" on order_items for select to authenticated
  using ((select auth.uid()) is not null);
drop policy if exists "admin write order_items" on order_items;
create policy "admin write order_items" on order_items for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

-- product_costs: admin-only (never exposed to the public store).
drop policy if exists "admin read costs" on product_costs;
create policy "admin read costs" on product_costs for select to authenticated
  using ((select auth.uid()) is not null);
drop policy if exists "admin write costs" on product_costs;
create policy "admin write costs" on product_costs for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

-- (product_sizes public-read + admin-write policies already exist; the new
--  mode/low_stock_threshold columns are covered by them.)

-- ===========================================================================
-- Atomic, mode-aware stock decrement (SECURITY DEFINER, pinned search_path).
-- Only decrements 'limited' sizes; 'on_demand' is a no-op (never sells out).
-- The WHERE stock >= p_qty guard makes it race-safe (no oversell).
-- ===========================================================================
create or replace function decrement_stock(p_product uuid, p_size size_code, p_qty int)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_mode stock_mode;
begin
  select mode into v_mode from product_sizes
   where product_id = p_product and size = p_size;

  if v_mode is distinct from 'limited' then
    return; -- on_demand or missing row → do not track stock
  end if;

  update product_sizes
     set stock = stock - p_qty
   where product_id = p_product and size = p_size and stock >= p_qty;

  if not found then
    raise exception 'Insufficient stock for product % size %', p_product, p_size;
  end if;
end;
$$;

revoke all on function decrement_stock(uuid, size_code, int) from public, anon, authenticated;
grant execute on function decrement_stock(uuid, size_code, int) to service_role;

-- ===========================================================================
-- Record a paid order's items + decrement inventory in one transaction.
-- Called by the verified Stripe webhook (service_role). Idempotent per
-- order: if items already exist for the order, it does nothing (safe on
-- Stripe webhook retries).
-- p_items: jsonb array of { slug, size, qty, unit_price_cents }.
-- ===========================================================================
create or replace function record_order_items(p_order uuid, p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  it jsonb;
  v_product uuid;
begin
  if exists (select 1 from order_items where order_id = p_order) then
    return; -- already recorded (webhook retry)
  end if;

  for it in select * from jsonb_array_elements(p_items) loop
    select id into v_product from products where slug = it->>'slug';
    if v_product is null then
      continue;
    end if;

    insert into order_items (order_id, product_id, size, qty, unit_price_cents)
    values (
      p_order,
      v_product,
      (it->>'size')::size_code,
      (it->>'qty')::int,
      (it->>'unit_price_cents')::int
    );

    perform decrement_stock(v_product, (it->>'size')::size_code, (it->>'qty')::int);
  end loop;
end;
$$;

revoke all on function record_order_items(uuid, jsonb) from public, anon, authenticated;
grant execute on function record_order_items(uuid, jsonb) to service_role;

-- Seed inventory defaults: give existing sizes the 'limited' mode explicitly
-- (already the column default; this is a no-op safety net).
update product_sizes set mode = coalesce(mode, 'limited');
