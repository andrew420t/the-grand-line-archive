-- REVIEW ONLY: privacy remediation for an already-created shared recognition setup.
-- Do not run this against production. Review existing consumers first: making the
-- bucket private disables public image URLs. The scanner only reads metadata/hash
-- rows; it does not download reference-image objects.
--
-- This script is separate from card-recognition-memory.sql because that initial
-- setup intentionally stops when the table already exists. Apply only to an
-- isolated staging project after checking the actual policies and object use.

BEGIN;

DO $preflight$
DECLARE
  table_rls boolean;
  storage_rls boolean;
  missing_columns text[];
BEGIN
  IF to_regprocedure('public.is_admin()') IS NULL
     OR pg_get_function_result('public.is_admin()'::regprocedure) IS DISTINCT FROM 'boolean' THEN
    RAISE EXCEPTION 'Expected public.is_admin() boolean function is missing or has an incompatible return type.';
  END IF;

  IF to_regclass('public.card_recognition_examples') IS NULL THEN
    RAISE EXCEPTION 'public.card_recognition_examples does not exist; apply/review the initial setup first.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'card-recognition-references') THEN
    RAISE EXCEPTION 'card-recognition-references bucket does not exist.';
  END IF;

  SELECT relrowsecurity INTO table_rls
  FROM pg_class
  WHERE oid = 'public.card_recognition_examples'::regclass;
  SELECT relrowsecurity INTO storage_rls
  FROM pg_class
  WHERE oid = 'storage.objects'::regclass;

  IF table_rls IS DISTINCT FROM true OR storage_rls IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'RLS must be enabled on card_recognition_examples and storage.objects before remediation.';
  END IF;

  SELECT array_agg(required.column_name ORDER BY required.column_name)
  INTO missing_columns
  FROM unnest(ARRAY[
    'id', 'printing_id', 'card_number', 'card_name', 'language',
    'set_code', 'rarity', 'variant', 'image_hash', 'storage_path',
    'confirmed_by', 'confirmed_at'
  ]) AS required(column_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.card_recognition_examples'::regclass
      AND attname = required.column_name
      AND NOT attisdropped
  );

  IF cardinality(coalesce(missing_columns, ARRAY[]::text[])) > 0 THEN
    RAISE EXCEPTION 'Recognition table is missing required columns: %.', array_to_string(missing_columns, ', ');
  END IF;
END
$preflight$;

-- Public URLs for these original scan photos may expose background content.
-- Private storage is compatible with the current app: it only uploads/removes
-- objects and reads the public metadata/hash table; it never downloads images.
UPDATE storage.buckets
SET public = false
WHERE id = 'card-recognition-references';

DROP POLICY IF EXISTS "Public can view card recognition reference images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view card recognition reference images" ON storage.objects;
CREATE POLICY "Admins can view card recognition reference images"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'card-recognition-references' AND coalesce(public.is_admin(), false));

DROP POLICY IF EXISTS "Only admins can view recognition reference images" ON storage.objects;
CREATE POLICY "Only admins can view recognition reference images"
  ON storage.objects AS RESTRICTIVE
  FOR SELECT TO public
  USING (bucket_id <> 'card-recognition-references' OR coalesce(public.is_admin(), false));

DROP POLICY IF EXISTS "Only admins can upload recognition reference images" ON storage.objects;
CREATE POLICY "Only admins can upload recognition reference images"
  ON storage.objects AS RESTRICTIVE
  FOR INSERT TO public
  WITH CHECK (bucket_id <> 'card-recognition-references' OR coalesce(public.is_admin(), false));

DROP POLICY IF EXISTS "Only admins can delete recognition reference images" ON storage.objects;
CREATE POLICY "Only admins can delete recognition reference images"
  ON storage.objects AS RESTRICTIVE
  FOR DELETE TO public
  USING (bucket_id <> 'card-recognition-references' OR coalesce(public.is_admin(), false));

DROP POLICY IF EXISTS "Only admins can update recognition reference images" ON storage.objects;
CREATE POLICY "Only admins can update recognition reference images"
  ON storage.objects AS RESTRICTIVE
  FOR UPDATE TO public
  USING (bucket_id <> 'card-recognition-references' OR coalesce(public.is_admin(), false))
  WITH CHECK (bucket_id <> 'card-recognition-references' OR coalesce(public.is_admin(), false));

-- Restrict table writes even if older permissive policies exist. Metadata reads
-- remain public, but the contributor auth UUID is not exposed.
DROP POLICY IF EXISTS "Only admins can contribute recognition examples" ON public.card_recognition_examples;
CREATE POLICY "Only admins can contribute recognition examples"
  ON public.card_recognition_examples AS RESTRICTIVE
  FOR INSERT TO public
  WITH CHECK (coalesce(public.is_admin(), false) AND confirmed_by = auth.uid());

DROP POLICY IF EXISTS "No direct recognition example updates" ON public.card_recognition_examples;
CREATE POLICY "No direct recognition example updates"
  ON public.card_recognition_examples AS RESTRICTIVE
  FOR UPDATE TO public
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Only admins can delete recognition examples" ON public.card_recognition_examples;
CREATE POLICY "Only admins can delete recognition examples"
  ON public.card_recognition_examples AS RESTRICTIVE
  FOR DELETE TO public
  USING (coalesce(public.is_admin(), false));

REVOKE ALL ON public.card_recognition_examples FROM PUBLIC, anon, authenticated;

-- Table-level REVOKE does not remove existing column-level grants.
DO $column_grants$
DECLARE
  v_column text;
BEGIN
  FOR v_column IN
    SELECT attname
    FROM pg_attribute
    WHERE attrelid = 'public.card_recognition_examples'::regclass
      AND attnum > 0
      AND NOT attisdropped
  LOOP
    EXECUTE format('REVOKE SELECT (%I) ON TABLE public.card_recognition_examples FROM PUBLIC, anon, authenticated', v_column);
    EXECUTE format('REVOKE INSERT (%I) ON TABLE public.card_recognition_examples FROM PUBLIC, anon, authenticated', v_column);
    EXECUTE format('REVOKE UPDATE (%I) ON TABLE public.card_recognition_examples FROM PUBLIC, anon, authenticated', v_column);
  END LOOP;
END
$column_grants$;

GRANT SELECT (id, printing_id, card_number, card_name, language, set_code, rarity, variant, image_hash, storage_path, confirmed_at)
  ON public.card_recognition_examples TO anon, authenticated;
GRANT INSERT (printing_id, card_number, card_name, language, set_code, rarity, variant, image_hash, storage_path, confirmed_by)
  ON public.card_recognition_examples TO authenticated;
GRANT DELETE ON public.card_recognition_examples TO authenticated;

COMMIT;
