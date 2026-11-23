-- REVIEW ONLY: this file has not been run.
-- The SELECT statements below are a read-only grant audit. Review their results
-- before executing the remaining DDL and policy statements as a separate step.
-- Confirm public.is_admin() is the existing zero-argument boolean function.
-- This transaction does not modify existing policies or functions.

BEGIN;

-- Read-only audit of current direct and effective Storage table privileges.
SELECT grantee, grantor, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'storage'
  AND table_name = 'objects'
ORDER BY grantee, privilege_type;

WITH roles(role_name) AS (
  VALUES ('anon'), ('authenticated'), ('service_role'), ('postgres')
),
privileges(privilege_name) AS (
  VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')
)
SELECT
  roles.role_name,
  privileges.privilege_name,
  has_table_privilege(
    roles.role_name,
    'storage.objects',
    privileges.privilege_name
  ) AS effective_privilege
FROM roles
CROSS JOIN privileges
ORDER BY roles.role_name, privileges.privilege_name;

DO $preflight$
DECLARE
  storage_rls_enabled boolean;
  missing_storage_privileges text[] := ARRAY[]::text[];
BEGIN
  IF to_regprocedure('public.is_admin()') IS NULL THEN
    RAISE EXCEPTION
      'Expected existing function public.is_admin() was not found. Stop and adapt this proposal to the actual function signature.';
  END IF;

  IF to_regprocedure('public.is_admin()') IS NOT NULL
     AND pg_get_function_result('public.is_admin()'::regprocedure) <> 'boolean' THEN
    RAISE EXCEPTION
      'public.is_admin() does not return boolean; stop and review the function before applying this migration.';
  END IF;

  SELECT relrowsecurity
    INTO storage_rls_enabled
  FROM pg_class
  WHERE oid = 'storage.objects'::regclass;

  IF NOT COALESCE(storage_rls_enabled, false) THEN
    RAISE EXCEPTION
      'Row Level Security is not enabled on storage.objects; stop before continuing.';
  END IF;

  IF NOT has_table_privilege('authenticated', 'storage.objects', 'SELECT') THEN
    missing_storage_privileges := array_append(missing_storage_privileges, 'SELECT');
  END IF;
  IF NOT has_table_privilege('authenticated', 'storage.objects', 'INSERT') THEN
    missing_storage_privileges := array_append(missing_storage_privileges, 'INSERT');
  END IF;
  IF NOT has_table_privilege('authenticated', 'storage.objects', 'UPDATE') THEN
    missing_storage_privileges := array_append(missing_storage_privileges, 'UPDATE');
  END IF;
  IF NOT has_table_privilege('authenticated', 'storage.objects', 'DELETE') THEN
    missing_storage_privileges := array_append(missing_storage_privileges, 'DELETE');
  END IF;
  IF NOT has_table_privilege('anon', 'storage.objects', 'SELECT') THEN
    missing_storage_privileges := array_append(missing_storage_privileges, 'anon SELECT (required for Storage API public-bucket URL delivery)');
  END IF;

  IF cardinality(missing_storage_privileges) > 0 THEN
    RAISE EXCEPTION
      'Required effective permissions on storage.objects are missing: %. Review the existing grants and approve any separate grant change before applying this migration. No Storage grants were changed.',
      array_to_string(missing_storage_privileges, ', ');
  END IF;

  IF has_table_privilege('anon', 'storage.objects', 'SELECT') THEN
    RAISE NOTICE
      'anon currently has effective SELECT permission on storage.objects. Inspect existing SELECT policies: the migration adds a restrictive guard for product-card-images but preserves all existing policies.';
  END IF;
END
$preflight$;

-- Validate the product table shape before any DDL is attempted.
DO $schema_preflight$
DECLARE
  product_id_type text;
  image_product_id_type text;
  missing_image_columns text[];
BEGIN
  IF to_regclass('public.products') IS NULL THEN
    RAISE EXCEPTION
      'Expected public.products table was not found. Stop and review the live schema before applying this proposal.';
  END IF;

  SELECT format_type(atttypid, atttypmod)
    INTO product_id_type
  FROM pg_attribute
  WHERE attrelid = 'public.products'::regclass
    AND attname = 'id'
    AND NOT attisdropped;

  IF product_id_type IS DISTINCT FROM 'uuid' THEN
    RAISE EXCEPTION
      'public.products.id must be uuid for the proposed product_images foreign key; found %. No schema changes were applied.', COALESCE(product_id_type, 'missing');
  END IF;

  IF to_regclass('public.product_images') IS NOT NULL THEN
    SELECT ARRAY(
      SELECT required.column_name
      FROM unnest(ARRAY[
        'id', 'product_id', 'image_url', 'storage_path',
        'role', 'sort_order', 'uploaded_by', 'created_at'
      ]) AS required(column_name)
      WHERE NOT EXISTS (
        SELECT 1
        FROM pg_attribute
        WHERE attrelid = 'public.product_images'::regclass
          AND attname = required.column_name
          AND NOT attisdropped
      )
    )
    INTO missing_image_columns;

    IF cardinality(missing_image_columns) > 0 THEN
      RAISE EXCEPTION
        'Existing public.product_images table is missing required columns: %. Review its structure before applying this proposal.',
        array_to_string(missing_image_columns, ', ');
    END IF;

    SELECT format_type(atttypid, atttypmod)
      INTO image_product_id_type
    FROM pg_attribute
    WHERE attrelid = 'public.product_images'::regclass
      AND attname = 'product_id'
      AND NOT attisdropped;

    IF image_product_id_type IS DISTINCT FROM 'uuid' THEN
      RAISE EXCEPTION
        'Existing public.product_images.product_id must be uuid; found %. Review the existing table before applying this proposal.', COALESCE(image_product_id_type, 'missing');
    END IF;
  END IF;
END
$schema_preflight$;

-- Read-only audit: report existing exact-printing identity collisions before
-- relying on catalogue_printing_key + language for future duplicate protection.
-- Rows with a blank language are grouped together so ambiguous legacy data is visible.
SELECT
  set_id,
  card_number,
  catalogue_printing_key,
  lower(NULLIF(btrim(language), '')) AS normalized_language,
  count(*) AS matching_products,
  array_agg(id ORDER BY id) AS product_ids
FROM public.products
WHERE NULLIF(btrim(catalogue_printing_key), '') IS NOT NULL
GROUP BY
  set_id,
  card_number,
  catalogue_printing_key,
  lower(NULLIF(btrim(language), ''))
HAVING count(*) > 1
ORDER BY matching_products DESC, card_number, catalogue_printing_key;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS power integer,
  ADD COLUMN IF NOT EXISTS cost integer,
  ADD COLUMN IF NOT EXISTS card_type text,
  ADD COLUMN IF NOT EXISTS effect_text text,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS classification text,
  ADD COLUMN IF NOT EXISTS variant_label text,
  ADD COLUMN IF NOT EXISTS catalogue_match_id text,
  ADD COLUMN IF NOT EXISTS catalogue_printing_key text,
  ADD COLUMN IF NOT EXISTS catalogue_reference_image_url text,
  ADD COLUMN IF NOT EXISTS catalogue_reference_image_source text;

CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('front', 'back', 'detail')),
  sort_order integer NOT NULL DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_images_product_id_sort_order_idx
  ON public.product_images (product_id, sort_order);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_images TO authenticated;

DO $product_image_policies$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'product_images'
      AND policyname = 'gla_product_images_public_active_read'
  ) THEN
    CREATE POLICY gla_product_images_public_active_read
      ON public.product_images
      FOR SELECT
      TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.products AS product
          WHERE product.id = product_images.product_id
            AND product.status = 'active'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'product_images'
      AND policyname = 'gla_product_images_admin_read'
  ) THEN
    CREATE POLICY gla_product_images_admin_read
      ON public.product_images
      FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'product_images'
      AND policyname = 'gla_product_images_admin_insert'
  ) THEN
    CREATE POLICY gla_product_images_admin_insert
      ON public.product_images
      FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'product_images'
      AND policyname = 'gla_product_images_admin_update'
  ) THEN
    CREATE POLICY gla_product_images_admin_update
      ON public.product_images
      FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'product_images'
      AND policyname = 'gla_product_images_admin_delete'
  ) THEN
    CREATE POLICY gla_product_images_admin_delete
      ON public.product_images
      FOR DELETE
      TO authenticated
      USING (public.is_admin());
  END IF;
END
$product_image_policies$;

CREATE TABLE IF NOT EXISTS public.site_settings (
  id text PRIMARY KEY,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.site_settings TO authenticated;

DO $site_settings_policies$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'site_settings'
      AND policyname = 'gla_site_settings_homepage_public_read'
  ) THEN
    CREATE POLICY gla_site_settings_homepage_public_read
      ON public.site_settings
      FOR SELECT
      TO anon, authenticated
      USING (id = 'homepage');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'site_settings'
      AND policyname = 'gla_site_settings_admin_read'
  ) THEN
    CREATE POLICY gla_site_settings_admin_read
      ON public.site_settings
      FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'site_settings'
      AND policyname = 'gla_site_settings_admin_insert'
  ) THEN
    CREATE POLICY gla_site_settings_admin_insert
      ON public.site_settings
      FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'site_settings'
      AND policyname = 'gla_site_settings_admin_update'
  ) THEN
    CREATE POLICY gla_site_settings_admin_update
      ON public.site_settings
      FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END
$site_settings_policies$;

-- A public bucket makes every uploaded card image readable by anyone with its URL.
-- Upload only card photographs; never place personal or otherwise private images here.
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'product-card-images',
  'product-card-images',
  true,
  10485760,
  ARRAY['image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

DO $bucket_check$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE id = 'product-card-images'
      AND public = true
      AND file_size_limit = 10485760
      AND allowed_mime_types = ARRAY['image/jpeg']
  ) THEN
    RAISE EXCEPTION
      'Bucket product-card-images already exists with incompatible settings; review it manually before continuing.';
  END IF;
END
$bucket_check$;

DO $storage_policies$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'gla_product_card_images_admin_select'
  ) THEN
    CREATE POLICY gla_product_card_images_admin_select
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'product-card-images'
        AND public.is_admin()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'gla_product_card_images_admin_insert'
  ) THEN
    CREATE POLICY gla_product_card_images_admin_insert
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'product-card-images'
        AND public.is_admin()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'gla_product_card_images_select_admin_guard'
  ) THEN
    CREATE POLICY gla_product_card_images_select_admin_guard
      ON storage.objects
      AS RESTRICTIVE
      FOR SELECT
      TO public
      USING (
        bucket_id <> 'product-card-images'
        OR public.is_admin()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'gla_product_card_images_admin_update'
  ) THEN
    CREATE POLICY gla_product_card_images_admin_update
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'product-card-images'
        AND public.is_admin()
      )
      WITH CHECK (
        bucket_id = 'product-card-images'
        AND public.is_admin()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'gla_product_card_images_admin_delete'
  ) THEN
    CREATE POLICY gla_product_card_images_admin_delete
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'product-card-images'
        AND public.is_admin()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'gla_product_card_images_insert_admin_guard'
  ) THEN
    CREATE POLICY gla_product_card_images_insert_admin_guard
      ON storage.objects
      AS RESTRICTIVE
      FOR INSERT
      TO public
      WITH CHECK (
        bucket_id <> 'product-card-images'
        OR public.is_admin()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'gla_product_card_images_update_admin_guard'
  ) THEN
    CREATE POLICY gla_product_card_images_update_admin_guard
      ON storage.objects
      AS RESTRICTIVE
      FOR UPDATE
      TO public
      USING (
        bucket_id <> 'product-card-images'
        OR public.is_admin()
      )
      WITH CHECK (
        bucket_id <> 'product-card-images'
        OR public.is_admin()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'gla_product_card_images_delete_admin_guard'
  ) THEN
    CREATE POLICY gla_product_card_images_delete_admin_guard
      ON storage.objects
      AS RESTRICTIVE
      FOR DELETE
      TO public
      USING (
        bucket_id <> 'product-card-images'
        OR public.is_admin()
      );
  END IF;
END
$storage_policies$;

COMMIT;
