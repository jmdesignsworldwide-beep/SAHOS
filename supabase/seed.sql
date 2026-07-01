-- ===========================================================================
-- SAHOS — seed the Marilyn Collection (spec §5). Run AFTER schema.sql.
-- Prices are NULL (TODO_PRECIO) — set the real price_cents before launch.
-- Image URLs point at the structured public paths; swap the low-res catalog
-- crops for the photographer's high-res originals before launch (spec §7).
-- ===========================================================================

insert into products (slug, name, subtitle, description, color, factory_ref, price_cents, position)
values
  ('lola',    'Lola',    'Satin Cross Back Dress',   'A satin mini with a crossed open back and a clean, low-cut front.', 'Gold',  'TD25091007', null, 1),
  ('kateryn', 'Kateryn', 'Flowy Two Piece Set',      'A flowing two-piece set — V-neck collared top over a straight-flow trouser.', 'Yellow', 'TD25091008', null, 2),
  ('amber',   'Amber',   'Wine Corset Dress',        'A wine corset mini with a low V front and adjustable back ties.', 'Wine',  'TD25091006', null, 3),
  ('daisy',   'Daisy',   'Satin White T-Shirt Dress','A satin t-shirt silhouette in pure white — collared and button-up.', 'White', 'TD25091010', null, 4),
  ('gianna',  'Gianna',  'Satin Beige Hardware Dress','A beige satin mini with an adjustable halter neck and custom "S" zipper hardware.', 'Beige', 'TD25091009', null, 5)
on conflict (slug) do update
  set name = excluded.name,
      subtitle = excluded.subtitle,
      description = excluded.description,
      color = excluded.color,
      factory_ref = excluded.factory_ref,
      position = excluded.position;

-- Sizes XS–L for every piece, seeded with placeholder stock.
insert into product_sizes (product_id, size, stock)
select p.id, s.size, 5
from products p
cross join (values ('XS'::size_code), ('S'), ('M'), ('L')) as s(size)
on conflict (product_id, size) do nothing;

-- Model + garment image rows (paths mirror /public/products/<slug>/...).
insert into product_images (product_id, url, type, position, alt)
select p.id, '/products/' || p.slug || '/model-1.jpg', 'model', 1, p.name || ' — look 1' from products p
union all
select p.id, '/products/' || p.slug || '/model-2.jpg', 'model', 2, p.name || ' — look 2' from products p
union all
select p.id, '/products/' || p.slug || '/model-3.jpg', 'model', 3, p.name || ' — look 3' from products p
union all
select p.id, '/products/' || p.slug || '/garment-front.jpg', 'garment_360', 1, p.name || ' — front' from products p
union all
select p.id, '/products/' || p.slug || '/garment-side.jpg', 'garment_360', 2, p.name || ' — side' from products p
union all
select p.id, '/products/' || p.slug || '/garment-back.jpg', 'garment_360', 3, p.name || ' — back' from products p;
