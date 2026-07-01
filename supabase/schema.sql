-- ===========================================================================
-- SAHOS — Supabase schema (spec §9) with Fort Knox RLS (spec §8.2, §8.9).
-- Run in the Supabase SQL editor (or `supabase db push`). Idempotent-ish:
-- safe to re-run in a fresh project.
--
-- Security posture:
--   * RLS ENABLED + FORCED on every table (owner is not exempt).
--   * anon/authenticated may ONLY read active catalog rows.
--   * orders / order_items / newsletter have NO client policies → only the
--     service_role (server) can touch them, bypassing RLS by design.
--   * Stock decrement is a SECURITY DEFINER function with a pinned search_path
--     and EXECUTE revoked from anon/authenticated.
-- ===========================================================================

-- Extensions -----------------------------------------------------------------
create extension if not exists "pgcrypto";

-- Enums ----------------------------------------------------------------------
do $$ begin
  create type product_image_type as enum ('model', 'garment_360', 'detail');
exception when duplicate_object then null; end $$;

do $$ begin
  create type size_code as enum ('XS', 'S', 'M', 'L');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('pending', 'paid', 'failed', 'fulfilled', 'refunded', 'cancelled');
exception when duplicate_object then null; end $$;

-- Tables ---------------------------------------------------------------------
create table if not exists products (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  subtitle     text,
  description  text,
  color        text,
  factory_ref  text,
  price_cents  int check (price_cents is null or price_cents >= 0),
  currency     text not null default 'usd',
  active       boolean not null default true,
  position     int not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  url         text not null,
  type        product_image_type not null default 'model',
  position    int not null default 0,
  alt         text
);
create index if not exists product_images_product_idx on product_images(product_id);

create table if not exists product_sizes (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  size        size_code not null,
  stock       int not null default 0 check (stock >= 0),
  unique (product_id, size)
);
create index if not exists product_sizes_product_idx on product_sizes(product_id);

create table if not exists orders (
  id                     uuid primary key default gen_random_uuid(),
  stripe_payment_intent  text unique,
  email                  text,
  status                 order_status not null default 'pending',
  amount_cents           int not null default 0,
  currency               text not null default 'usd',
  shipping_json          jsonb,
  created_at             timestamptz not null default now()
);

create table if not exists order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references orders(id) on delete cascade,
  product_id       uuid references products(id),
  size             size_code not null,
  qty              int not null check (qty > 0),
  unit_price_cents int not null check (unit_price_cents >= 0)
);
create index if not exists order_items_order_idx on order_items(order_id);

create table if not exists newsletter (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  created_at  timestamptz not null default now()
);

-- ===========================================================================
-- Row Level Security — ENABLE + FORCE on all tables
-- ===========================================================================
alter table products       enable row level security;
alter table products       force row level security;
alter table product_images enable row level security;
alter table product_images force row level security;
alter table product_sizes  enable row level security;
alter table product_sizes  force row level security;
alter table orders         enable row level security;
alter table orders         force row level security;
alter table order_items    enable row level security;
alter table order_items    force row level security;
alter table newsletter     enable row level security;
alter table newsletter     force row level security;

-- Public READ of active catalog only ----------------------------------------
drop policy if exists "public read active products" on products;
create policy "public read active products"
  on products for select
  to anon, authenticated
  using (active = true);

drop policy if exists "public read images of active products" on product_images;
create policy "public read images of active products"
  on product_images for select
  to anon, authenticated
  using (exists (select 1 from products p where p.id = product_images.product_id and p.active));

drop policy if exists "public read sizes of active products" on product_sizes;
create policy "public read sizes of active products"
  on product_sizes for select
  to anon, authenticated
  using (exists (select 1 from products p where p.id = product_sizes.product_id and p.active));

-- orders / order_items / newsletter: NO anon/authenticated policies.
-- With RLS forced and no permissive policy, the client can do nothing; the
-- server uses the service_role key which bypasses RLS. (spec §8.2, §9)

-- ===========================================================================
-- Stock decrement — SECURITY DEFINER, pinned search_path, no anon EXECUTE
-- ===========================================================================
create or replace function decrement_stock(p_product uuid, p_size size_code, p_qty int)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update product_sizes
     set stock = stock - p_qty
   where product_id = p_product
     and size = p_size
     and stock >= p_qty;
  if not found then
    raise exception 'Insufficient stock for product % size %', p_product, p_size;
  end if;
end;
$$;

revoke all on function decrement_stock(uuid, size_code, int) from public;
revoke all on function decrement_stock(uuid, size_code, int) from anon;
revoke all on function decrement_stock(uuid, size_code, int) from authenticated;
-- service_role retains EXECUTE implicitly via ownership; grant explicitly:
grant execute on function decrement_stock(uuid, size_code, int) to service_role;
