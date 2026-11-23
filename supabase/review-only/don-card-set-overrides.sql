-- REVIEW ONLY: DON!! source-set corrections. This migration has not been applied.
-- Admins may assign a source set to a catalogue printing; it does not modify card images or inventory.

BEGIN;

DO $preflight$
BEGIN
  IF to_regprocedure('public.is_admin()') IS NULL THEN
    RAISE EXCEPTION 'Expected public.is_admin() function not found. Stop and review admin authorization.';
  END IF;
  IF to_regclass('public.don_card_set_overrides') IS NOT NULL THEN
    RAISE EXCEPTION 'public.don_card_set_overrides already exists. Inspect it before applying.';
  END IF;
END
$preflight$;

CREATE TABLE public.don_card_set_overrides (
  printing_key text PRIMARY KEY,
  language text NOT NULL CHECK (language IN ('en', 'jp')),
  set_code text NOT NULL,
  source_note text NOT NULL DEFAULT 'Manually verified from source product/list',
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.don_card_set_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read DON card set overrides"
  ON public.don_card_set_overrides FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can add DON card set overrides"
  ON public.don_card_set_overrides FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update DON card set overrides"
  ON public.don_card_set_overrides FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.don_card_set_overrides TO authenticated;

COMMIT;
