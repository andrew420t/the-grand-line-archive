-- REVIEW ONLY: shared recognition memory for confirmed One Piece card printings.
-- Apply in Supabase SQL Editor after reviewing the existing public.is_admin() function.
-- Card reference images are public card artwork; only administrators may contribute or remove examples.

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
VALUES ('card-recognition-references', 'card-recognition-references', true, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

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

GRANT SELECT ON public.card_recognition_examples TO anon, authenticated;
GRANT INSERT, DELETE ON public.card_recognition_examples TO authenticated;

CREATE POLICY "Public can view card recognition reference images"
  ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'card-recognition-references');

CREATE POLICY "Admins can upload card recognition reference images"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'card-recognition-references' AND public.is_admin());

CREATE POLICY "Admins can delete card recognition reference images"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'card-recognition-references' AND public.is_admin());

COMMIT;
