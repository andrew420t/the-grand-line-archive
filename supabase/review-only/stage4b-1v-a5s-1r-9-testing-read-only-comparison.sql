-- Execute only against project ref ehzqsnfkmwphyllhaqhe (Grand Line Archive Testing).
-- Read-only inventory/catalogue snapshot. This file contains no writes, DDL or transaction control.
WITH inventory AS (
  SELECT
    p.id,
    p.name,
    p.language,
    p.card_number,
    s.code AS set_code,
    p.image_url IS NOT NULL AND p.image_url <> '' AS uploaded_image_present,
    p.catalogue_match_id,
    p.catalogue_printing_key,
    p.catalogue_reference_image_url
  FROM public.products AS p
  LEFT JOIN public.sets AS s ON s.id = p.set_id
),
catalogue_counts AS (
  SELECT jsonb_build_object(
    'catalogue_release_sets', (SELECT count(*) FROM public.catalogue_release_sets),
    'catalogue_release_products', (SELECT count(*) FROM public.catalogue_release_products),
    'catalogue_cards', (SELECT count(*) FROM public.catalogue_cards),
    'catalogue_printings', (SELECT count(*) FROM public.catalogue_printings),
    'catalogue_card_observations', (SELECT count(*) FROM public.catalogue_card_observations),
    'catalogue_printing_images', (SELECT count(*) FROM public.catalogue_printing_images),
    'catalogue_product_sets', (SELECT count(*) FROM public.catalogue_product_sets),
    'catalogue_product_printings', (SELECT count(*) FROM public.catalogue_product_printings),
    'catalogue_set_printings', (SELECT count(*) FROM public.catalogue_set_printings),
    'catalogue_inventory_links', (SELECT count(*) FROM public.catalogue_inventory_links)
  ) AS counts
),
loki AS (
  SELECT jsonb_agg(
    jsonb_build_object(
      'product_id', id,
      'name', name,
      'language', language,
      'card_number', card_number,
      'set_code', set_code,
      'uploaded_image_present', uploaded_image_present,
      'catalogue_match_id_present', catalogue_match_id IS NOT NULL,
      'catalogue_printing_key_present', catalogue_printing_key IS NOT NULL,
      'catalogue_reference_image_present', catalogue_reference_image_url IS NOT NULL
    ) ORDER BY id
  ) AS rows
  FROM inventory
  WHERE name = 'Loki' AND language = 'Japanese' AND card_number = 'OP17-119'
)
SELECT jsonb_build_object(
  'sets', (SELECT count(*) FROM public.sets),
  'products', count(*),
  'card_numbered_products', count(*) FILTER (WHERE card_number IS NOT NULL AND card_number <> ''),
  'products_without_card_number', count(*) FILTER (WHERE card_number IS NULL OR card_number = ''),
  'products_with_uploaded_image', count(*) FILTER (WHERE uploaded_image_present),
  'products_with_catalogue_match_id', count(*) FILTER (WHERE catalogue_match_id IS NOT NULL),
  'products_with_catalogue_printing_key', count(*) FILTER (WHERE catalogue_printing_key IS NOT NULL),
  'products_with_catalogue_reference_image', count(*) FILTER (WHERE catalogue_reference_image_url IS NOT NULL),
  'set_assigned_products', count(*) FILTER (WHERE set_code IS NOT NULL),
  'products_without_set', count(*) FILTER (WHERE set_code IS NULL),
  'product_image_rows', (SELECT count(*) FROM public.product_images),
  'legacy_public_cards', (SELECT count(*) FROM public.cards),
  'catalogue_counts', (SELECT counts FROM catalogue_counts),
  'loki_records', (SELECT rows FROM loki)
) AS testing_read_only_snapshot
FROM inventory;
