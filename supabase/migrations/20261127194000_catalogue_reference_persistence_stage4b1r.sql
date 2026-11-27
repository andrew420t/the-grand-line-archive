-- Stage 4B-1R approved Testing-only reference-catalogue schema migration.
-- Target is hard-scoped to Testing project ehzqsnfkmwphyllhaqhe.
-- Never apply this migration to Production or any other Supabase project.
-- This file creates schema only. It contains no catalogue inserts, inventory updates,
-- backfills, seed statements, or changes to public.products/public.cards/public.sets.
--
-- Target only: Testing project ehzqsnfkmwphyllhaqhe after a separately approved
-- schema preflight. Re-check public.products.id type and public.is_admin() first.
-- Catalogue data import is a separate, separately controlled operation.

BEGIN;

DO $preflight$
DECLARE
  product_id_type text;
BEGIN
  IF to_regprocedure('public.is_admin()') IS NULL THEN
    RAISE EXCEPTION 'Required public.is_admin() function is missing; stop and review the live Testing schema.';
  END IF;
  IF pg_get_function_result('public.is_admin()'::regprocedure) <> 'boolean' THEN
    RAISE EXCEPTION 'public.is_admin() must return boolean; stop before applying this proposal.';
  END IF;
  IF to_regclass('public.products') IS NULL THEN
    RAISE EXCEPTION 'public.products is missing; this proposal expects the existing inventory table.';
  END IF;
  SELECT format_type(atttypid, atttypmod) INTO product_id_type
  FROM pg_attribute
  WHERE attrelid = 'public.products'::regclass AND attname = 'id' AND NOT attisdropped;
  IF product_id_type IS DISTINCT FROM 'uuid' THEN
    RAISE EXCEPTION 'Expected public.products.id uuid, found %; inspect the live schema before proceeding.', COALESCE(product_id_type, 'missing');
  END IF;
END
$preflight$;

CREATE TABLE IF NOT EXISTS public.catalogue_release_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_code text NOT NULL UNIQUE,
  set_name text NOT NULL,
  source_commit text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.catalogue_release_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language text NOT NULL CHECK (language IN ('en', 'jp')),
  source_product_key text NOT NULL,
  product_name text NOT NULL,
  product_code text,
  official_product_url text,
  release_date date,
  source_commit text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalogue_release_products_source_identity UNIQUE (language, source_product_key),
  CONSTRAINT catalogue_release_products_id_language UNIQUE (id, language)
);

CREATE TABLE IF NOT EXISTS public.catalogue_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language text NOT NULL CHECK (language IN ('en', 'jp')),
  source_card_key text NOT NULL,
  card_number text NOT NULL,
  original_name text,
  original_name_native text,
  card_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_commit text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalogue_cards_source_identity UNIQUE (language, source_card_key),
  CONSTRAINT catalogue_cards_number_identity UNIQUE (language, card_number),
  CONSTRAINT catalogue_cards_id_language UNIQUE (id, language)
);

CREATE TABLE IF NOT EXISTS public.catalogue_printings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language text NOT NULL CHECK (language IN ('en', 'jp')),
  printing_key text NOT NULL,
  card_id uuid NOT NULL,
  rarity text,
  variant text NOT NULL,
  variant_label text,
  parallel_identity text,
  official_image_id text,
  source_commit text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalogue_printings_source_identity UNIQUE (language, printing_key),
  CONSTRAINT catalogue_printings_id_language UNIQUE (id, language),
  CONSTRAINT catalogue_printings_card_language_fk
    FOREIGN KEY (card_id, language)
    REFERENCES public.catalogue_cards (id, language)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.catalogue_printing_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  printing_id uuid NOT NULL,
  language text NOT NULL CHECK (language IN ('en', 'jp')),
  image_role text NOT NULL CHECK (image_role IN ('primary', 'alternate')),
  image_id text NOT NULL,
  exact_image_url text NOT NULL CHECK (exact_image_url ~ '^https://'),
  source_site text NOT NULL,
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'verified', 'missing', 'invalid', 'failed')),
  http_status integer,
  content_type text,
  verified_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalogue_printing_images_identity UNIQUE (printing_id, image_id, exact_image_url),
  CONSTRAINT catalogue_printing_images_printing_language_fk
    FOREIGN KEY (printing_id, language)
    REFERENCES public.catalogue_printings (id, language)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.catalogue_product_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language text NOT NULL CHECK (language IN ('en', 'jp')),
  product_id uuid NOT NULL,
  set_id uuid NOT NULL REFERENCES public.catalogue_release_sets (id) ON DELETE RESTRICT,
  source_commit text NOT NULL,
  CONSTRAINT catalogue_product_sets_identity UNIQUE (language, product_id, set_id),
  CONSTRAINT catalogue_product_sets_product_language_fk
    FOREIGN KEY (product_id, language)
    REFERENCES public.catalogue_release_products (id, language)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.catalogue_product_printings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language text NOT NULL CHECK (language IN ('en', 'jp')),
  product_id uuid NOT NULL,
  printing_id uuid NOT NULL,
  source_commit text NOT NULL,
  CONSTRAINT catalogue_product_printings_identity UNIQUE (language, product_id, printing_id),
  CONSTRAINT catalogue_product_printings_product_language_fk
    FOREIGN KEY (product_id, language)
    REFERENCES public.catalogue_release_products (id, language)
    ON DELETE RESTRICT,
  CONSTRAINT catalogue_product_printings_printing_language_fk
    FOREIGN KEY (printing_id, language)
    REFERENCES public.catalogue_printings (id, language)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.catalogue_set_printings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language text NOT NULL CHECK (language IN ('en', 'jp')),
  set_id uuid NOT NULL REFERENCES public.catalogue_release_sets (id) ON DELETE RESTRICT,
  printing_id uuid NOT NULL,
  source_commit text NOT NULL,
  CONSTRAINT catalogue_set_printings_identity UNIQUE (language, set_id, printing_id),
  CONSTRAINT catalogue_set_printings_printing_language_fk
    FOREIGN KEY (printing_id, language)
    REFERENCES public.catalogue_printings (id, language)
    ON DELETE RESTRICT
);

-- Inventory linking is intentionally separate from the import. No rows are
-- inserted here; a later approved link operation must be exact and reviewed.
CREATE TABLE IF NOT EXISTS public.catalogue_inventory_links (
  inventory_product_id uuid PRIMARY KEY
    REFERENCES public.products (id) ON DELETE RESTRICT,
  language text NOT NULL CHECK (language IN ('en', 'jp')),
  printing_id uuid NOT NULL,
  match_method text NOT NULL CHECK (match_method IN ('exact_printing_key', 'exact_image_id', 'manual_verified')),
  reviewed_by uuid REFERENCES auth.users (id) ON DELETE RESTRICT,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  CONSTRAINT catalogue_inventory_links_printing_language_fk
    FOREIGN KEY (printing_id, language)
    REFERENCES public.catalogue_printings (id, language)
    ON DELETE RESTRICT
);

-- Enforce that an inventory row and its reference printing use the same language.
-- The existing inventory schema stores language as a display label (English/Japanese).
CREATE OR REPLACE FUNCTION public.guard_catalogue_inventory_link_language()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  inventory_language text;
  normalized_inventory_language text;
BEGIN
  SELECT lower(trim(language))
    INTO inventory_language
  FROM public.products
  WHERE id = NEW.inventory_product_id;

  normalized_inventory_language := CASE
    WHEN inventory_language IN ('en', 'eng', 'english') THEN 'en'
    WHEN inventory_language IN ('jp', 'ja', 'jpn', 'japanese') THEN 'jp'
    ELSE NULL
  END;

  IF normalized_inventory_language IS NULL
     OR normalized_inventory_language <> NEW.language THEN
    RAISE EXCEPTION
      'Inventory/reference language mismatch for product % (inventory %, reference %).',
      NEW.inventory_product_id, COALESCE(inventory_language, 'missing'), NEW.language;
  END IF;

  RETURN NEW;
END
$function$;

CREATE TRIGGER catalogue_inventory_link_language_guard
  BEFORE INSERT OR UPDATE OF inventory_product_id, language, printing_id
  ON public.catalogue_inventory_links
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_catalogue_inventory_link_language();

CREATE INDEX IF NOT EXISTS catalogue_cards_number_lookup_idx
  ON public.catalogue_cards (language, upper(card_number));
CREATE INDEX IF NOT EXISTS catalogue_printings_card_lookup_idx
  ON public.catalogue_printings (card_id, language);
CREATE INDEX IF NOT EXISTS catalogue_printing_images_lookup_idx
  ON public.catalogue_printing_images (printing_id, language, image_role, sort_order);
CREATE INDEX IF NOT EXISTS catalogue_product_printings_printing_idx
  ON public.catalogue_product_printings (printing_id, language);
CREATE INDEX IF NOT EXISTS catalogue_set_printings_set_idx
  ON public.catalogue_set_printings (set_id, language);
CREATE INDEX IF NOT EXISTS catalogue_inventory_links_printing_idx
  ON public.catalogue_inventory_links (printing_id, language);

DO $policies$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'catalogue_release_sets', 'catalogue_release_products', 'catalogue_cards',
    'catalogue_printings', 'catalogue_printing_images', 'catalogue_product_sets',
    'catalogue_product_printings', 'catalogue_set_printings'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = table_name
        AND policyname = table_name || '_public_read'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)',
        table_name || '_public_read', table_name
      );
    END IF;
  END LOOP;

  ALTER TABLE public.catalogue_inventory_links ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'catalogue_inventory_links'
      AND policyname = 'catalogue_inventory_links_admin_read'
  ) THEN
    CREATE POLICY catalogue_inventory_links_admin_read
      ON public.catalogue_inventory_links
      FOR SELECT TO authenticated
      USING (public.is_admin());
  END IF;
END
$policies$;

GRANT SELECT ON
  public.catalogue_release_sets,
  public.catalogue_release_products,
  public.catalogue_cards,
  public.catalogue_printings,
  public.catalogue_printing_images,
  public.catalogue_product_sets,
  public.catalogue_product_printings,
  public.catalogue_set_printings
TO anon, authenticated;

GRANT SELECT ON public.catalogue_inventory_links TO authenticated;

-- Supabase default privileges in this project grant ALL table privileges to anon,
-- authenticated and service_role. Explicitly remove client write privileges before
-- granting only the intended SELECT access. RLS alone is not a substitute for grants.
REVOKE ALL PRIVILEGES ON
  public.catalogue_release_sets,
  public.catalogue_release_products,
  public.catalogue_cards,
  public.catalogue_printings,
  public.catalogue_printing_images,
  public.catalogue_product_sets,
  public.catalogue_product_printings,
  public.catalogue_set_printings,
  public.catalogue_inventory_links
FROM PUBLIC, anon, authenticated;

GRANT ALL PRIVILEGES ON
  public.catalogue_release_sets,
  public.catalogue_release_products,
  public.catalogue_cards,
  public.catalogue_printings,
  public.catalogue_printing_images,
  public.catalogue_product_sets,
  public.catalogue_product_printings,
  public.catalogue_set_printings,
  public.catalogue_inventory_links
TO service_role;

GRANT SELECT ON
  public.catalogue_release_sets,
  public.catalogue_release_products,
  public.catalogue_cards,
  public.catalogue_printings,
  public.catalogue_printing_images,
  public.catalogue_product_sets,
  public.catalogue_product_printings,
  public.catalogue_set_printings
TO anon, authenticated;

GRANT SELECT ON public.catalogue_inventory_links TO authenticated;

REVOKE ALL PRIVILEGES ON FUNCTION public.guard_catalogue_inventory_link_language()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_catalogue_inventory_link_language()
TO postgres, service_role;

COMMIT;

-- Proposed rollback (separate, explicit approval only; reverse dependency order):
-- DROP TABLE public.catalogue_inventory_links;
-- DROP TABLE public.catalogue_set_printings;
-- DROP TABLE public.catalogue_product_printings;
-- DROP TABLE public.catalogue_product_sets;
-- DROP TABLE public.catalogue_printing_images;
-- DROP TABLE public.catalogue_printings;
-- DROP TABLE public.catalogue_cards;
-- DROP TABLE public.catalogue_release_products;
-- DROP TABLE public.catalogue_release_sets;
