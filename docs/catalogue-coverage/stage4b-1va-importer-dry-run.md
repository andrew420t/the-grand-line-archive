# Stage 4B-1V-A — importer dry-run

The new `scripts/catalogue-importer-stage4b1va.mjs` is a source-only planner. It has no Supabase SDK, credentials, network access or live-write mode. It validates the pinned manifest and all 27 JSONL files, computes English/Japanese target-set candidate rows, and emits a JSON report. The manual workflow checks out the exact source commit and only offers dry-run.

## Approved source mapping

| Source file/type | Approved destination | Eligibility |
|---|---|---|
| `sets.jsonl` | `catalogue_release_sets` | OP-01–OP-18, EB-01–EB-05, PRB-01/02 present in feed |
| `products/en,jp.jsonl` | `catalogue_release_products` | Only products linked to eligible target sets |
| `cards.jsonl` | `catalogue_cards` | Language-scoped from eligible EN/JP printing identities |
| `printings/en,jp.jsonl` | `catalogue_printings` | Eligible target-set printings only |
| `card_observations/en,jp.jsonl` | `catalogue_card_observations` | Observations for eligible language-scoped cards |
| `printing_locators/en,jp.jsonl` | `catalogue_printing_images` | Eligible printings and official Bandai HTTPS image URLs |
| `product_sets.jsonl` | `catalogue_product_sets` | Target-set/product edges only |
| `printing_products/en,jp.jsonl` | `catalogue_product_printings` | Assignments for eligible target-set products |
| CN and TCGCSV files | None | Outside EN/JP catalogue scope |
| `designs`, `printing_designs` | None | No lossless design destination in approved schema |
| `distributions`, `printing_distributions` | None | No approved distribution/event tables |
| `don_sets` | None | No approved DON-design table |
| `retired_printings` | None | No approved lifecycle destination |

Set-printing relationships are derived from validated product-set and printing-product edges. Inventory links are always excluded and remain a separately reviewed operation.

## Verified source facts

The supplied source archive and pinned GitHub commit manifest agree: 27 files, 74,144 rows, all checksums and row counts match. The pinned commit exists in GitHub at `619965ec198047de519dc6eb098c7a56aed9bd58`.

The local dry-run candidate plan reports 23 release sets (OP-01–OP-17, EB-01–EB-04, PRB-01/02), 47 named products, 4,757 language-scoped cards, 7,276 printings, 7,276 eligible official image locators, 49 product-set edges, 7,276 product-printing edges, 7,671 derived set-printing edges and 4,757 observations. EN/JP cards are 2,379/2,378; EN/JP printings are 3,643/3,633. There are six unsupported source types: designs (40), distributions (463), DON sets (165), printing designs (86), printing distributions (4,774) and retired printings (9,832). They are retained in the pinned source archive, not silently imported.

OP-18 and EB-05 are absent from this upstream feed and require separate local official supplements. Derived set relationships differ from the previously reconciled 7,786-row official set-printing manifest, particularly around English EB-04, OP-14 and OP-15. These differences must be reconciled against the Stage 4B-1Q artifact before live import; do not force counts to match.

## Safety / status

No database writes occurred. The dry-run planner cannot write. Testing was rechecked: products remain 32 rows with fingerprint `e4e473c5c9aae7c15acb4e472b288685`; catalogue reference tables and inventory links remain empty. Production was not accessed.

This is not yet the live importer: deterministic UUID upserts, transactional execution, persistent checkpoints, import-run metadata and interruption recovery remain for Stage 4B-1V-B. The workflow deliberately does not read the service-role secret because it makes no database calls.
