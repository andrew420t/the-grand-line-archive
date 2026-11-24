-- REVIEW ONLY: shared recognition memory for confirmed One Piece card printings.
-- Apply in Supabase SQL Editor after reviewing the existing public.is_admin() function.
-- Shared examples are uploaded from the original scan photo, which may include
-- background or other incidental personal content. Keep image objects private;
-- only the non-image recognition metadata is readable by the public.

BEGIN;

DO $preflight$
BEGIN
  IF to_regprocedure('public.is_admin()') IS NULL THEN
    RAISE EXCEPTION 'Expected public.is_admin() function was not found. Stop and review admin authorization.';
  END IF;
  IF to_regclass('public.card_recognition_examples') IS NOT NULL THEN
    RAISE EXCEPTION 'public.card_recognition_examples already exists. Inspect it before applying this migration.';
  END IF;
END
$preflight$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('card-recognition-references', 'card-recognition-references', false, 10485760, ARRAY['image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- If this bucket already exists from an earlier setup, make its objects private.
-- Review existing consumers before applying: public URLs for this bucket will stop working.
UPDATE storage.buckets
SET public = false
WHERE id = 'card-recognition-references';

CREATE TABLE public.card_recognition_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  printing_id text NOT NULL,
  card_number text NOT NULL,
  card_name text NOT NULL DEFAULT '',
  language text NOT NULL CHECK (language IN ('English', 'Japanese', 'English (promo/stamped)')),
  set_code text NOT NULL DEFAULT '',
  rarity text NOT NULL DEFAULT '',
  variant text NOT NULL DEFAULT '',
  image_hash text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT card_recognition_examples_printing_hash UNIQUE (printing_id, image_hash)
);

CREATE INDEX card_recognition_examples_card_number_idx
  ON public.card_recognition_examples (upper(card_number));
CREATE INDEX card_recognition_examples_printing_idx
  ON public.card_recognition_examples (printing_id);

ALTER TABLE public.card_recognition_examples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read verified card recognition examples"
  ON public.card_recognition_examples
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can add verified card recognition examples"
  ON public.card_recognition_examples
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND confirmed_by = auth.uid());

CREATE POLICY "Admins can delete verified card recognition examples"
  ON public.card_recognition_examples
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- Expose only recognition metadata, not the contributor's auth UUID.
-- Column-level grants also keep the internal contributor field private.
GRANT SELECT (id, printing_id, card_number, card_name, language, set_code, rarity, variant, image_hash, storage_path, confirmed_at)
  ON public.card_recognition_examples TO anon, authenticated;
REVOKE INSERT ON public.card_recognition_examples FROM PUBLIC, anon, authenticated;
GRANT INSERT (printing_id, card_number, card_name, language, set_code, rarity, variant, image_hash, storage_path, confirmed_by)
  ON public.card_recognition_examples TO authenticated;
GRANT DELETE ON public.card_recognition_examples TO authenticated;

-- The app reads hashes/metadata only; it never downloads the stored reference
-- photo. Keep the original scan photo private and administrator-only.
CREATE POLICY "Admins can view card recognition reference images"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'card-recognition-references' AND public.is_admin());

CREATE POLICY "Only admins can view recognition reference images"
  ON storage.objects AS RESTRICTIVE
  FOR SELECT TO public
  USING (bucket_id <> 'card-recognition-references' OR coalesce(public.is_admin(), false));

CREATE POLICY "Admins can upload card recognition reference images"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'card-recognition-references' AND public.is_admin());

CREATE POLICY "Only admins can upload recognition reference images"
  ON storage.objects AS RESTRICTIVE
  FOR INSERT TO public
  WITH CHECK (bucket_id <> 'card-recognition-references' OR coalesce(public.is_admin(), false));

CREATE POLICY "Admins can delete card recognition reference images"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'card-recognition-references' AND public.is_admin());

CREATE POLICY "Only admins can delete recognition reference images"
  ON storage.objects AS RESTRICTIVE
  FOR DELETE TO public
  USING (bucket_id <> 'card-recognition-references' OR coalesce(public.is_admin(), false));

CREATE POLICY "Only admins can update recognition reference images"
  ON storage.objects AS RESTRICTIVE
  FOR UPDATE TO public
  USING (bucket_id <> 'card-recognition-references' OR coalesce(public.is_admin(), false))
  WITH CHECK (bucket_id <> 'card-recognition-references' OR coalesce(public.is_admin(), false));

COMMIT;
