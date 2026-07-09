-- ===========================================================================
-- SAHOS — per-piece estimated shipping weight (for buying labels in PirateShip).
-- Run in the Supabase SQL editor AFTER schema.sql. Idempotent, additive.
--
-- weight_oz: estimated weight of one piece, in OUNCES (decimals allowed, e.g.
-- 8.5). Nullable — the owner fills it from the product portal. No RLS change:
-- the existing products policies already govern this column.
-- ===========================================================================

alter table products
  add column if not exists weight_oz numeric(7,2) check (weight_oz is null or weight_oz >= 0);
