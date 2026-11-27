# Stage 4B-1P — Testing Catalogue Persistence and Premium Card Collection Reconciliation

**Repository:** `andrew420t/the-grand-line-archive`  
**Branch:** `audit/official-bandai-inventory-stage4b-1l-2026-11-27`  
**Verified code commit:** `31101fe4c00305dbb833adc3d5e02ea159fd745a`  
**Starting commit supplied:** `9114a9dbfb8d78a56afe875fce951ae36664bf49`  
**Stage 3 baseline:** `448bc546c30ad1d7c69481dbdf794711810c5560`  
**Exact Stage 4B-1P CI:** [Run #46053638883](https://github.com/andrew420t/the-grand-line-archive/actions/runs/46053638883)

## CI result

- **335/335 tests passed**
- Lint passed
- Production build passed
- Stage 4B-1O application-versus-official audit passed
- Stage 4B-1P Premium Card Collection and Testing persistence audit passed
- No Testing database writes or seeds

## Testing Supabase — read-only result

Project `ehzqsnfkmwphyllhaqhe`:

| Evidence | Result |
|---|---:|
| Release-set definitions | 25 |
| Stock/inventory products | 32 |
| Products assigned to release sets | 2 |
| Products without a release set | 30 |
| Legacy `public.cards` rows | 0 |
| Product image rows | 9 |
| Inventory rows with uploaded images | 5 |
| Catalogue printing keys | 0 |
| Catalogue match IDs | 0 |
| Catalogue reference-image URLs | 0 |

31 inventory rows have card numbers and all 31 have application card-number candidates; one DON!! row has no card number. There are no assigned-set mismatches. The Japanese `OP17-119` inventory card number occurs twice. Both physical inventory rows are preserved; neither was deleted or merged.

**Persistence comparison:** all 50 English/Japanese set rows match the pinned official/application runtime exactly, but all remain **INCOMPLETE** because zero of the 7,786 expected set printing identities are persisted in Testing with catalogue printing keys, match IDs or reference-image references. Missing persisted identities: 7,786. Unexpected persisted identities: 0.

The inspected schema has no dedicated reference-catalogue table. `public.products` is stock/inventory and `public.cards` is a legacy stock-card table. Do not seed either with thousands of zero-stock catalogue entries. The CI artifact contains the complete 7,786-record import plan, including language, release assignment, printing key, card number, image ID and application image reference: [download from run #46053638883](https://github.com/andrew420t/the-grand-line-archive/actions/runs/46053638883/artifacts/15224509616).

Recommended future persistence design: separate normalized tables for named release products, language-scoped cards, language-scoped printings, product-printing links and set-printing assignments. Inventory rows should link to reference records without changing stock, prices, status or uploaded images.

## All 50 official language/set rows

The 7,786 official release-assignment printing identities match the application runtime with zero missing, unexpected, duplicate or metadata-mismatched identities. Persisted Testing coverage is zero in every row; therefore none is marked COMPLETE.

| Set | English printings | Japanese printings | Persisted keys EN/JP |
|---|---:|---:|---:|
| OP-01 | 154 | 154 | 0 / 0 |
| OP-02 | 154 | 154 | 0 / 0 |
| OP-03 | 154 | 154 | 0 / 0 |
| OP-04 | 149 | 149 | 0 / 0 |
| OP-05 | 154 | 154 | 0 / 0 |
| OP-06 | 151 | 150 | 0 / 0 |
| OP-07 | 151 | 150 | 0 / 0 |
| OP-08 | 151 | 150 | 0 / 0 |
| OP-09 | 159 | 158 | 0 / 0 |
| OP-10 | 151 | 150 | 0 / 0 |
| OP-11 | 156 | 155 | 0 / 0 |
| OP-12 | 155 | 154 | 0 / 0 |
| OP-13 | 175 | 174 | 0 / 0 |
| OP-14 | 159 | 156 | 0 / 0 |
| OP-15 | 155 | 152 | 0 / 0 |
| OP-16 | 155 | 155 | 0 / 0 |
| OP-17 | 169 | 169 | 0 / 0 |
| OP-18 | 159 | 159 | 0 / 0 |
| EB-01 | 80 | 80 | 0 / 0 |
| EB-02 | 105 | 105 | 0 / 0 |
| EB-03 | 90 | 90 | 0 / 0 |
| EB-04 | 81 | 85 | 0 / 0 |
| EB-05 | 96 | 96 | 0 / 0 |
| PRB-01 | 319 | 319 | 0 / 0 |
| PRB-02 | 316 | 316 | 0 / 0 |

OP-18 and EB-05 remain sourced from local official supplements with language-scoped generated printing keys: OP-18 159 English + 159 Japanese; EB-05 96 English + 96 Japanese. Both remain incomplete in Testing because none of those identities is persisted.

PRB-01 and PRB-02 counts are release-product printing counts, not assertions about base-card counts. PRB-01 is 319 printings per language; PRB-02 is 316 per language.

The OP13-037 correction is preserved: English OP15-EB04 TR printing `prt_pm4j0pgnb4he` remains distinct; Japanese EB-04 has no OP13-037 TR printing. The Japanese original remains assigned to OP-13.

## Premium Card Collection identities

All nine English named products are separately retained. All 103 English product-printing links have unique language-scoped printing keys and exact application runtime matches. The eight outstanding products account for 91 printings; Best Selection Vol.6 remains 12/12.

| English product | Printings | Runtime match |
|---|---:|---|
| Live Action Edition | 9 | Exact |
| FILM RED Edition | 12 | Exact |
| Best Selection | 12 | Exact |
| Best Selection Vol.3 | 12 | Exact |
| Best Selection Vol.4 | 12 | Exact |
| Best Selection Vol.5 | 12 | Exact |
| 25th Edition | 10 | Exact |
| BANDAI CARD GAMES Fest. 23-24 Edition | 12 | Exact |
| Best Selection Vol.6 | 12 | Exact |

The pinned Japanese feed is separate: 15 named Japanese Premium Card Collection products and 128 linked printing identities. Eight Japanese product counterparts are matched to the requested English products (91 printing links). No matching Japanese BANDAI CARD GAMES Fest. 23-24 named product exists in the pinned Japanese product feed; no Japanese record was invented.

All 231 English/Japanese Premium Card Collection identities passed exact runtime checks for product assignment, language, original card number, printing key, rarity, variant, image ID and exact image path. All 231 official image URLs returned HTTP 200; zero failed.

## Image and fallback verification

- Previous official image audit: 7,798/7,798 HTTP 200; zero missing, invalid, timeout or final temporary failures.
- Premium Card Collection recheck: 231/231 HTTP 200, PNG; zero failures.
- Same-language fallback, alternate-printing fallback and placeholder-suppression regression tests remain in the full suite.
- No English image is substituted into Japanese printings or vice versa. All exact premium images loaded, so no fallback was needed for these 231 checks.

## PRs, deployment and safety

- PR #37: open, unmerged.
- PR #38: open, unmerged.
- Preview: not deployed in this stage.
- Production: not deployed or modified.
- Testing Supabase: read-only; no writes or seeding.
- No branch or commit was deleted. Scanner, Image Library, filters and OP-15 duplicate corrections remain preserved.

## Remaining blocker

The reference catalogue is complete in the pinned application feed plus local supplements and verified against the official matrix, but it is not persisted in Testing. The next stage must design and obtain explicit authorization for a Testing-only normalized reference-catalogue schema and a controlled import/link operation. Until then, all 50 matrix rows must remain INCOMPLETE.
