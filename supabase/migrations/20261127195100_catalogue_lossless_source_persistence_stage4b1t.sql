-- Stage 4B-1T: lossless source persistence extensions.
-- Testing project ONLY: ehzqsnfkmwphyllhaqhe.
-- Additive schema-only migration. No catalogue import, inventory writes, deletes,
-- truncates, or changes to public.products/public.cards/public.sets.
BEGIN;

DO $preflight$
DECLARE
  project_ref text := current_setting('app.settings.project_ref', true);
BEGIN
  -- Supabase does not expose a guaranteed project-ref setting in every SQL
  -- execution context. The migration runner must verify the project reference
  -- before applying; this guard also rejects an explicitly different ref.
  IF project_ref IS NOT NULL AND project_ref <> 'ehzqsnfkmwphyllhaqhe' THEN
    RAISE EXCEPTION 'Stage 4B-1T migration is Testing-only; current project ref is %', project_ref;
  END IF;
  IF to_regclass('public.catalogue_printings') IS NULL
     OR to_regclass('public.catalogue_printing_images') IS NULL
     OR to_regclass('public.catalogue_release_products') IS NULL
     OR to_regclass('public.catalogue_product_printings') IS NULL
     OR to_regclass('public.catalogue_cards') IS NULL THEN
    RAISE EXCEPTION 'Stage 4B-1R catalogue schema is incomplete; stop.';
  END IF;
END
$preflight$;

-- A source_record JSONB column retains the exact parsed JSON object from each
-- pinned JSONL row. Typed columns below support indexing and constraints; the
-- raw object prevents loss when upstream adds optional fields in a later schema.
ALTER TABLE public.catalogue_release_sets
  ADD COLUMN IF NOT EXISTS source_set_key text,
  ADD COLUMN IF NOT EXISTS source_record jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.catalogue_release_products
  ADD COLUMN IF NOT EXISTS source_namespace text NOT NULL DEFAULT 'upstream_feed'
    CHECK (source_namespace IN ('upstream_feed','local_official')),
  ADD COLUMN IF NOT EXISTS product_kind text,
  ADD COLUMN IF NOT EXISTS is_bucket boolean,
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS release_date_source text,
  ADD COLUMN IF NOT EXISTS first_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_record jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.catalogue_cards
  ALTER COLUMN card_number DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS source_namespace text NOT NULL DEFAULT 'upstream_feed'
    CHECK (source_namespace IN ('upstream_feed','local_official')),
  ADD COLUMN IF NOT EXISTS don_design text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS colors jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cost integer,
  ADD COLUMN IF NOT EXISTS life integer,
  ADD COLUMN IF NOT EXISTS power integer,
  ADD COLUMN IF NOT EXISTS counter integer,
  ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS block_icon text,
  ADD COLUMN IF NOT EXISTS facts_site text,
  ADD COLUMN IF NOT EXISTS first_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_record jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.catalogue_printings
  ADD COLUMN IF NOT EXISTS source_namespace text NOT NULL DEFAULT 'upstream_feed'
    CHECK (source_namespace IN ('upstream_feed','local_official')),
  ADD COLUMN IF NOT EXISTS source_site text,
  ADD COLUMN IF NOT EXISTS source_text text,
  ADD COLUMN IF NOT EXISTS block_icon text,
  ADD COLUMN IF NOT EXISTS provenance_url text,
  ADD COLUMN IF NOT EXISTS number_token text,
  ADD COLUMN IF NOT EXISTS image_token text,
  ADD COLUMN IF NOT EXISTS image_hash text,
  ADD COLUMN IF NOT EXISTS first_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_record jsonb NOT NULL DEFAULT '{}'::jsonb;

-- The upstream feed's key format is deliberately enforced only in its own
-- namespace. Local OP-18/EB-05 evidence keeps its own deterministic key and
-- cannot masquerade as a minted upstream prt_ identity.
ALTER TABLE public.catalogue_printings
  ADD CONSTRAINT catalogue_printings_namespace_key_check
  CHECK (
    (source_namespace = 'upstream_feed' AND printing_key ~ '^prt_[0-9a-z]{12}$')
    OR
    (source_namespace = 'local_official' AND printing_key ~ '^(op18|eb05):(en|jp):[A-Za-z0-9_-]+$')
  );

ALTER TABLE public.catalogue_printings
  ADD CONSTRAINT catalogue_printings_source_site_check
  CHECK (source_site IS NULL OR source_site IN ('en','jp','tcgcsv'));

ALTER TABLE public.catalogue_printings
  ADD CONSTRAINT catalogue_printings_block_icon_check
  CHECK (block_icon IS NULL OR block_icon = 'X' OR block_icon ~ '^[0-9]+$');

ALTER TABLE public.catalogue_release_products
  ADD CONSTRAINT catalogue_release_products_release_date_source_check
  CHECK (release_date_source IS NULL OR release_date_source ~ '^https://');

ALTER TABLE public.catalogue_cards
  ADD CONSTRAINT catalogue_cards_don_design_identity_check
  CHECK (
    (don_design IS NULL AND card_number IS NOT NULL)
    OR
    (don_design IS NOT NULL AND card_number IS NULL)
  );

-- Site-specific card observations are versioned and language-scoped. lang is
-- normalized to the application's en/jp labels while source_site retains
-- whether the evidence came from en, jp, or tcgcsv.
CREATE TABLE IF NOT EXISTS public.catalogue_card_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language text NOT NULL CHECK (language IN ('en','jp')),
  card_id uuid NOT NULL,
  source_observation_key text NOT NULL,
  source_site text NOT NULL CHECK (source_site IN ('en','jp','tcgcsv')),
  source_language text NOT NULL CHECK (source_language IN ('en','ja')),
  observation_hash text NOT NULL CHECK (observation_hash ~ '^[0-9a-f]{16}$'),
  original_name text NOT NULL,
  category text NOT NULL,
  colors jsonb NOT NULL DEFAULT '[]'::jsonb,
  cost integer,
  life integer,
  power integer,
  counter integer,
  attributes jsonb NOT NULL DEFAULT '[]'::jsonb,
  types jsonb NOT NULL DEFAULT '[]'::jsonb,
  effect text,
  trigger_text text,
  first_seen_at timestamptz NOT NULL,
  superseded_at timestamptz,
  source_record jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalogue_card_observations_source_identity UNIQUE (source_observation_key),
  CONSTRAINT catalogue_card_observations_id_language UNIQUE (id,language),
  CONSTRAINT catalogue_card_observations_card_language_fk
    FOREIGN KEY (card_id,language)
    REFERENCES public.catalogue_cards(id,language) ON DELETE RESTRICT,
  CONSTRAINT catalogue_card_observations_time_check
    CHECK (superseded_at IS NULL OR superseded_at >= first_seen_at)
);

CREATE INDEX IF NOT EXISTS catalogue_card_observations_card_history_idx
  ON public.catalogue_card_observations(card_id,language,first_seen_at);

ALTER TABLE public.catalogue_printing_images
  ALTER COLUMN exact_image_url DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS source_namespace text NOT NULL DEFAULT 'upstream_feed'
    CHECK (source_namespace IN ('upstream_feed','local_official')),
  ADD COLUMN IF NOT EXISTS source_locator_key text,
  ADD COLUMN IF NOT EXISTS source_first_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS application_image_path text,
  ADD COLUMN IF NOT EXISTS source_record jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.catalogue_printing_images
  ADD CONSTRAINT catalogue_printing_images_url_or_path_check
  CHECK (
    (exact_image_url IS NOT NULL AND exact_image_url ~ '^https://(en|www)\.onepiece-cardgame\.com/')
    OR
    (application_image_path IS NOT NULL AND application_image_path ~ '^/_card-image/(bandai/(en|jp)/|)')
  );

ALTER TABLE public.catalogue_printing_images
  ADD CONSTRAINT catalogue_printing_images_no_url_path_alias_check
  CHECK (
    exact_image_url IS NULL
    OR application_image_path IS NULL
    OR exact_image_url <> application_image_path
  );

ALTER TABLE public.catalogue_product_sets
  ADD COLUMN IF NOT EXISTS source_first_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_record jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.catalogue_product_printings
  ADD COLUMN IF NOT EXISTS source_first_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS removed_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_record jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD CONSTRAINT catalogue_product_printings_lifecycle_check
    CHECK (removed_at IS NULL OR source_first_seen_at IS NULL OR removed_at >= source_first_seen_at);

ALTER TABLE public.catalogue_set_printings
  ADD COLUMN IF NOT EXISTS source_first_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_record jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Preserve locator identity independently from the image row's display role.
ALTER TABLE public.catalogue_printing_images
  ADD CONSTRAINT catalogue_printing_images_locator_identity
  UNIQUE (source_namespace, language, source_locator_key);

-- Read-only client access follows the existing reference-table policy. No
-- client write grants or policies are added; service_role retains importer access.
ALTER TABLE public.catalogue_card_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY catalogue_card_observations_public_read
  ON public.catalogue_card_observations FOR SELECT TO anon, authenticated USING (true);
REVOKE ALL PRIVILEGES ON public.catalogue_card_observations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.catalogue_card_observations TO anon, authenticated;
GRANT ALL PRIVILEGES ON public.catalogue_card_observations TO service_role;

COMMIT;
