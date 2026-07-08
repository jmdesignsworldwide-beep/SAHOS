-- ===========================================================================
-- SAHOS — Storage bucket size limit. OPTIONAL: run in the Supabase SQL editor
-- only if large uploads are rejected. Idempotent.
--
-- The `product-images` bucket holds product photos AND site images (under the
-- site/ prefix). Clean hero photos are large, so we raise the per-file limit to
-- 25MB. (If the bucket has no explicit limit it already inherits the project
-- global — 50MB on the free tier — so this is a safety/clarity net.)
-- ===========================================================================

update storage.buckets
   set file_size_limit = 26214400   -- 25 MB
 where id = 'product-images';
