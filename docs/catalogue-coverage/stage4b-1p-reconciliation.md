# Stage 4B-1P — Premium Card Collection and Testing Catalogue Persistence Reconciliation

**Repository:** `andrew420t/the-grand-line-archive`  
**Branch:** `audit/official-bandai-inventory-stage4b-1l-2026-11-27`  
**Starting branch head:** `25ec88ef665dc8715be009ed235385dae7b25eca`  
**Stage 3 baseline:** `448bc546c30ad1d7c69481dbdf794711810c5560`  
**Pinned application feed:** `619965ec198047de519dc6eb098c7a56aed9bd58`  
**Testing Supabase project:** `ehzqsnfkmwphyllhaqhe`  
**Database writes:** None

## Scope and safety

This stage is read-only against Testing Supabase. It does not seed, alter, delete, or migrate database records. No Production project, production database, main/master branch, or deployment target is accessed. PR #37 and PR #38 remain open and untouched.

## Official Premium Card Collection inventory

The pinned English feed contains nine named Premium Card Collection products with 103 distinct product-linked printing keys. The eight products requested for reconciliation account for 91 printings; Best Selection Vol.6 remains 12/12 and is rechecked by the Stage 4B-1P runtime audit.

| English product | Expected printings |
|---|---:|
| Premium Card Collection -Live Action Edition- | 9 |
| Premium Card Collection -FILM RED Edition- | 12 |
| Premium Card Collection -Best Selection- | 12 |
| Premium Card Collection -Best Selection Vol.3- | 12 |
| Premium Card Collection -Best Selection Vol.4- | 12 |
| Premium Card Collection -Best Selection Vol.5- | 12 |
| Premium Card Collection -25th Edition- | 10 |
| Premium Card Collection -BANDAI CARD GAMES Fest. 23-24 Edition- | 12 |
| Premium Card Collection -Best Selection Vol.6- | 12 |
| **Total** | **103** |

The manifest records each product key, product page, printing key, original card number, official image ID, image suffix family, language and release-product assignment. The CI audit compares every manifest entry to the pinned product/link/locator feeds and the application runtime, including the exact runtime image URL and image HTTP response. Product identities are not merged into the original booster release product.

## Japanese product coverage

The pinned Japanese feed contains 15 named Premium Card Collection products and 128 distinct linked printing keys. Eight Bandai-listed Japanese product pages correspond to eight of the English product groups (91 printings). The BANDAI CARD GAMES Fest. 23-24 Edition has no matching named Japanese product in the pinned Japanese product feed; no Japanese record is fabricated.

Japanese product names, product keys, official page URLs, printing keys and image IDs remain language-scoped. English image URLs are never substituted into Japanese entries.

## Testing Supabase persistence findings

The read-only Testing snapshot reports:

| Measure | Result |
|---|---:|
| `public.products` inventory rows | 32 |
| `public.sets` definitions | 25 |
| `public.cards` rows | 0 |
| Inventory rows assigned to a set | 2 |
| Inventory rows without a set | 30 |
| Catalogue match IDs | 0 |
| Catalogue printing keys | 0 |
| Catalogue reference image URLs | 0 |
| Uploaded product image URLs | 5 |
| `public.product_images` rows | 9 |

The two set-assigned stock rows are Brook / OP15-032 / English / Adventure on Kami's Island and Loki / OP17-119 / Japanese / The World's Strongest Warriors. The remaining 30 inventory rows are unassigned. The duplicate OP17-119 Japanese card-number rows are retained as separate stock records; they are not merged or deleted.

The schema inspection found no dedicated reference-catalogue table. `public.cards` lacks card number, language, printing key and release-product identity fields. `public.products` is a stock/inventory table with price, quantity, condition and uploaded-image fields; its catalogue columns are optional links from inventory to reference data. The 9 `product_images` rows and 5 uploaded image URLs are not official catalogue reference URLs.

## Safe import plan — no writes performed

Do not insert thousands of reference records into `public.products` or the legacy `public.cards` table. A complete persisted catalogue requires a dedicated normalized reference schema:

1. `catalogue_release_products`: language-scoped Bandai product keys and named product metadata.
2. `catalogue_cards`: language-scoped original card numbers and card-level metadata.
3. `catalogue_printings`: language-scoped printing keys, original card number, rarity, parallel/special/TR identity, official image ID, exact image URL and fallback metadata.
4. `catalogue_product_printings`: product-to-printing links, preserving each named Premium Card Collection as a separate product.
5. `catalogue_set_printings`: all 50 English/Japanese set assignments, including PRB-01/02 and official local OP-18/EB-05 supplements.

The 25 set definitions already exist in Testing. The pinned feed and local supplements reconstruct all 50 language/set reference rows; OP-18 and EB-05 use generated language-scoped keys (`op18:<language>:<imageId>` and `eb05:<language>:<imageId>`). Existing inventory products should only be linked to a specific catalogue printing after an exact language, card number, release assignment and printing identity match is confirmed.

All inserts should be idempotent and keyed by language plus official identity. Any migration, schema creation, or seed requires separate explicit authorization.

## Runtime and image audit

The Stage 4B-1P CI artifact records all 50 Stage 4B-1O official/application row comparisons, per-row Testing persistence status, all 231 Premium product-printing records, exact runtime image references, image HTTP results, and the complete import counts. The previous 7,798-image official HTTP audit is retained unchanged. Existing same-language fallback, alternate-printing, missing-image, invalid-URL and placeholder-suppression tests remain in the regression suite.

**CI runtime result:** Pending the exact Stage 4B-1P commit run.
