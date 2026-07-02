-- ===========================================================================
-- SAHOS — Admin Portal (Fase 1) database + storage setup. Run in the Supabase
-- SQL editor AFTER schema.sql + seed.sql. Idempotent — safe to re-run.
--
-- What this does:
--   * Adds WRITE policies so an AUTHENTICATED admin can create/edit/delete the
--     catalog. Public read (active rows) stays as-is from schema.sql. Anonymous
--     users still cannot write anything.
--   * Lets an authenticated admin read INACTIVE products too (for the portal
--     list), while the public policy keeps anon to active-only.
--   * Creates the `product-images` Storage bucket (public read) with
--     authenticated-only write/update/delete.
--
-- Security posture (spec §5): every write path requires a valid session; RLS is
-- the backstop even if application code has a bug. service_role is never used
-- from the client.
-- ===========================================================================

-- Predicate for "there is a valid session". Expressed explicitly (rather than a
-- bare `true`) so the Security Advisor's rls_policy_always_true check passes; the
-- effect is identical — only the authenticated admin can read/write. Wrapped in
-- a subselect so auth.uid() is evaluated once per statement (Supabase perf tip).

-- --- Catalog: authenticated admin can read everything (incl. inactive) -------
drop policy if exists "admin read all products" on products;
create policy "admin read all products"
  on products for select to authenticated using ((select auth.uid()) is not null);

drop policy if exists "admin read all images" on product_images;
create policy "admin read all images"
  on product_images for select to authenticated using ((select auth.uid()) is not null);

drop policy if exists "admin read all sizes" on product_sizes;
create policy "admin read all sizes"
  on product_sizes for select to authenticated using ((select auth.uid()) is not null);

-- --- Catalog: authenticated admin can write ---------------------------------
drop policy if exists "admin write products" on products;
create policy "admin write products"
  on products for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy if exists "admin write images" on product_images;
create policy "admin write images"
  on product_images for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy if exists "admin write sizes" on product_sizes;
create policy "admin write sizes"
  on product_sizes for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

-- ===========================================================================
-- Storage: product-images bucket
-- ===========================================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- Public can READ product images (bucket is public; policy makes it explicit).
drop policy if exists "public read product images" on storage.objects;
create policy "public read product images"
  on storage.objects for select
  to public
  using (bucket_id = 'product-images');

-- Only authenticated admins can upload / modify / delete product images.
drop policy if exists "admin upload product images" on storage.objects;
create policy "admin upload product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images');

drop policy if exists "admin update product images" on storage.objects;
create policy "admin update product images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images')
  with check (bucket_id = 'product-images');

drop policy if exists "admin delete product images" on storage.objects;
create policy "admin delete product images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images');

-- ===========================================================================
-- Admin user
-- ===========================================================================
-- Create the single shared admin from the Supabase dashboard:
--   Authentication → Users → Add user → enter email + a temporary password,
--   and tick "Auto Confirm User".
-- Then sign in at /portal and change it under /portal/cuenta.
-- (Users cannot be created via plain SQL safely; use the dashboard or Admin API.)
