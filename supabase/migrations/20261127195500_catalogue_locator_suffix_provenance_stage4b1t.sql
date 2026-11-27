-- Stage 4B-1T follow-up: retain the exact source locator suffix fields.
-- Testing project ONLY: ehzqsnfkmwphyllhaqhe. Additive schema only.
BEGIN;
DO $preflight$
DECLARE project_ref text := current_setting('app.settings.project_ref', true);
BEGIN
  IF project_ref IS NOT NULL AND project_ref <> 'ehzqsnfkmwphyllhaqhe' THEN
    RAISE EXCEPTION 'Testing-only migration; unexpected project reference %', project_ref;
  END IF;
  IF to_regclass('public.catalogue_printing_images') IS NULL THEN
    RAISE EXCEPTION 'Stage 4B-1R/1T image table missing; stop.';
  END IF;
END
$preflight$;

ALTER TABLE public.catalogue_printing_images
  ADD COLUMN IF NOT EXISTS suffix_family text,
  ADD COLUMN IF NOT EXISTS suffix_n integer,
  ADD COLUMN IF NOT EXISTS source_image_url text;

ALTER TABLE public.catalogue_printing_images
  ADD CONSTRAINT catalogue_printing_images_suffix_pair_check
  CHECK (
    (suffix_family IS NULL AND suffix_n IS NULL)
    OR
    (suffix_family IN ('p','r') AND suffix_n IS NOT NULL AND suffix_n >= 0)
  );

ALTER TABLE public.catalogue_printing_images
  ADD CONSTRAINT catalogue_printing_images_source_image_url_check
  CHECK (source_image_url IS NULL OR source_image_url ~ '^https://');

COMMIT;