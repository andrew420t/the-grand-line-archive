-- REVIEW ONLY: this migration has not been run.
-- Creates a private, admin-managed correction/custom-card layer for the card catalogue.
-- Run only after reviewing the existing public.is_admin() function and the policy below.

BEGIN;

DO $preflight$
BEGIN
  IF to_regprocedure('public.is_admin()') IS NULL THEN
    RAISE EXCEPTION 'Expected existing public.is_admin() function was not found. Stop and review admin authorization.';
  END IF;

  IF to_regclass('public.card_catalogue_overrides') IS NOT NULL THEN
    RAISE EXCEPTION 'public.card_catalogue_overrides already exists. Stop and inspect it before applying this migration.';
  END IF;
END
$preflight$;

CREATE TABLE public.card_catalogue_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_number text NOT NULL,
  language text NOT NULL CHECK (language IN ('English', 'Japanese')),
  set_code text NOT NULL DEFAULT '',
  variant_label text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'Grand Line Archive admin correction',
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT card_catalogue_overrides_identity
    UNIQUE (card_number, language, set_code, variant_label)
);

CREATE INDEX card_catalogue_overrides_card_number_idx
  ON public.card_catalogue_overrides (upper(card_number));

ALTER TABLE public.card_catalogue_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read card catalogue overrides"
  ON public.card_catalogue_overrides
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can add card catalogue overrides"
  ON public.card_catalogue_overrides
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update card catalogue overrides"
  ON public.card_catalogue_overrides
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.card_catalogue_overrides TO authenticated;

COMMIT;
