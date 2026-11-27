-- REVIEW ONLY: apply to the intended Supabase project after approval.
-- Adds a dedicated product flag without changing the product's real card category,
-- publication status, set, price, stock quantity, or photos.
--
-- Existing products default to regular inventory (is_bulk = false).
-- Reversible classification is handled by setting this boolean true/false.

BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_bulk boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.products.is_bulk
  IS 'True when this product belongs in the separate Bulk inventory view.';

CREATE INDEX IF NOT EXISTS products_is_bulk_true_idx
  ON public.products (is_bulk)
  WHERE is_bulk = true;

COMMIT;
