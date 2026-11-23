-- REVIEW ONLY / READ-ONLY: product visibility and RLS audit.
-- Run only after an authorised reviewer confirms the intended Supabase project.
-- This file contains SELECT statements only; it makes no changes.
-- Review all existing policies: permissive policies combine with OR, so adding
-- an "active only" policy does not narrow an existing broad public SELECT policy.

-- 1. RLS status for products.
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'products';

-- 2. All existing products policies, including policy type and expressions.
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'products'
ORDER BY policyname;

-- 3. Direct table grants to public API roles.
SELECT grantee, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'products'
  AND grantee IN ('anon', 'authenticated', 'PUBLIC')
ORDER BY grantee, privilege_type;

-- 4. Effective SELECT/INSERT/UPDATE/DELETE privileges for API roles.
SELECT
  role_name,
  privilege_name,
  has_table_privilege(role_name, 'public.products', privilege_name) AS granted
FROM (VALUES ('anon'), ('authenticated')) AS roles(role_name)
CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) AS privileges(privilege_name)
ORDER BY role_name, privilege_name;

-- 5. Publication status distribution and null/unknown status count.
SELECT
  lower(trim(coalesce(status::text, ''))) AS normalized_status,
  count(*) AS product_count
FROM public.products
GROUP BY 1
ORDER BY 1;

-- Review requirements before any policy change:
-- * Public SELECT should expose only status='active' (and the minimum necessary
--   columns; consider a public view if sensitive admin fields are in products).
-- * Admin reads/writes should be governed by the existing verified is_admin().
-- * Inspect every current policy for broad access. Since permissive policies OR
--   together, broad policies must be safely revised, not merely supplemented.
-- * Do not apply policy changes without an approved live-schema review.

-- 6. RLS enabled/forced state for all feature tables proposed by the admin migration.
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'product_images', 'site_settings',
    'card_catalogue_overrides', 'don_card_set_overrides'
  )
ORDER BY c.relname;

-- 7. Existing policies on feature tables. Do not assume policies added by the
-- proposed migration narrow existing permissive policies: permissive policies
-- combine with OR and may already allow broader access.
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'product_images', 'site_settings',
    'card_catalogue_overrides', 'don_card_set_overrides'
  )
ORDER BY tablename, policyname;

-- 8. Existing direct grants for feature tables, including PUBLIC grants.
SELECT grantee, table_name, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (
    'products', 'product_images', 'site_settings',
    'card_catalogue_overrides', 'don_card_set_overrides'
  )
  AND grantee IN ('anon', 'authenticated', 'PUBLIC')
ORDER BY table_name, grantee, privilege_type;

-- 9. Existing Storage policies and bucket configuration. Bucket-level public
-- access is separate from object-table RLS and must be reviewed together.
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'product-card-images';

-- 10. Read-only order/profile access audit for checkout and account tests.
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('orders', 'order_items', 'profiles')
ORDER BY c.relname;

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('orders', 'order_items', 'profiles')
ORDER BY tablename, policyname;

SELECT grantee, table_name, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('orders', 'order_items', 'profiles')
  AND grantee IN ('anon', 'authenticated', 'PUBLIC')
ORDER BY table_name, grantee, privilege_type;

-- Review customer ownership checks, admin exceptions, and whether customers
-- can insert order_items for arbitrary orders/products. These query results are
-- audit-only and do not establish that checkout stock is reserved atomically.

-- 11. Column-level privileges on order and order-item tables. Table-level
-- grants alone do not reveal column-specific INSERT/UPDATE bypasses.
SELECT grantee, table_name, column_name, privilege_type, is_grantable
FROM information_schema.role_column_grants
WHERE table_schema = 'public'
  AND table_name IN ('orders', 'order_items')
  AND grantee IN ('anon', 'authenticated', 'PUBLIC')
ORDER BY table_name, grantee, column_name, privilege_type;
