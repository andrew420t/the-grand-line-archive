# Stage 4B-1O — Application Printing Reconciliation and Final Audit Verification

**Repository:** `andrew420t/the-grand-line-archive`  
**Branch:** `audit/official-bandai-inventory-stage4b-1l-2026-11-27`  
**Starting commit:** `96bc0ee10b79397a9b20d85012477277bf15e5b6`  
**Stage 3 baseline:** `448bc546c30ad1d7c69481dbdf794711810c5560`  
**Reference feed commit:** `619965ec198047de519dc6eb098c7a56aed9bd58`  
**Reference feed manifest date:** `2026-10-22T04:46:19Z`

## Executive result

The application reference catalogue has exact identity and metadata parity with all 50 official Bandai language/set rows:

- 50/50 language/set identity sets matched.
- 7,786 release-assigned printing identities matched exactly.
- 0 missing, unexpected or duplicate identity IDs.
- 0 unaccepted metadata mismatches.
- 1 documented Bandai product-specific Japanese spelling variation (EB01-056).
- 7,798 official image URLs previously verified HTTP 200; no missing, invalid, timeout or final temporary failures.
- 12 Premium Card Collection -Best Selection Vol.6- English printings retained as separate product printings.
- OP18 and EB05 language-specific supplements use the correct image IDs, card numbers, names, rarities and variant labels.
- Application runtime data and manifest are pinned to the audited immutable upstream commit.

**Overall matrix status remains 50 INCOMPLETE / 0 COMPLETE.** This is deliberate: Testing Supabase contains a small stock/inventory dataset, not complete persisted product-to-printing linkage. The external application reference catalogue itself is verified; persisted Testing inventory linkage is not. No database was modified.

## All 50 official/application results

Each cell is **official distinct base card numbers / application reference printing identities**. PRB has no asserted base-card count.

| Set | English: base / printings | Japanese: base / printings |
|---|---:|---:|
| EB-01 | 61 / 80 | 61 / 80 |
| EB-02 | 61 / 105 | 61 / 105 |
| EB-03 | 62 / 90 | 62 / 90 |
| EB-04 | 61 / 81 | 61 / 85 |
| EB-05 | 61 / 96 | 61 / 96 |
| OP-01 | 121 / 154 | 121 / 154 |
| OP-02 | 121 / 154 | 121 / 154 |
| OP-03 | 123 / 154 | 123 / 154 |
| OP-04 | 119 / 149 | 119 / 149 |
| OP-05 | 119 / 154 | 119 / 154 |
| OP-06 | 119 / 151 | 119 / 150 |
| OP-07 | 119 / 151 | 119 / 150 |
| OP-08 | 119 / 151 | 119 / 150 |
| OP-09 | 119 / 159 | 119 / 158 |
| OP-10 | 119 / 151 | 119 / 150 |
| OP-11 | 119 / 156 | 119 / 155 |
| OP-12 | 119 / 155 | 119 / 154 |
| OP-13 | 120 / 175 | 120 / 174 |
| OP-14 | 120 / 159 | 120 / 156 |
| OP-15 | 119 / 155 | 119 / 152 |
| OP-16 | 119 / 155 | 119 / 155 |
| OP-17 | 119 / 169 | 119 / 169 |
| OP-18 | 119 / 159 | 119 / 159 |
| PRB-01 | — / 319 | — / 319 |
| PRB-02 | — / 316 | — / 316 |

Total application reference printings: **7,786**. The 7,867 raw official source-page row associations include 81 cross-product appearances from combined OP14-EB04 and OP15-EB04 English pages. Those appearances are assigned once to the correct release-product row.

## Combined English OP14-EB04 / OP15-EB04 pages

- OP14-EB04: 199 raw rows = 159 OP-14 release assignments + 40 EB04-prefixed entries assigned to EB-04.
- OP15-EB04: 196 raw rows = 155 OP-15 release assignments + 41 EB04-prefixed entries assigned to EB-04.
- English EB-04: 81 EB04-prefixed printings across those two pages, including 61 distinct EB04 base numbers.
- The 81 EB-04 English entries are not double-counted in OP-14 or OP-15.

## Testing Supabase investigation

Read-only project: `ehzqsnfkmwphyllhaqhe`.

| Evidence | Result |
|---|---:|
| `public.sets` definitions | 25 |
| `public.products` inventory rows | 32 |
| Products linked to a release set | 2 |
| Products without a release set | 30 |
| Distinct linked release sets | 2 |
| `catalogue_printing_key` populated | 0 |
| `catalogue_match_id` populated | 0 |
| `catalogue_reference_image_url` populated | 0 |
| Products with uploaded `image_url` | 5 |
| `product_images` rows | 9 |
| Products with product images | 5 |

The two linked inventory products are one OP-15 English and one OP-17 Japanese. These 32 rows are stock/inventory records, not the 25-set reference catalogue. The app reference catalogue is sourced from the pinned Koala Kollect JSONL snapshot plus local official OP-18/EB-05 supplements.

**Persisted inventory-to-printing linkage remains INCOMPLETE.** No database rows were inserted, updated, seeded or deleted.

## Printing identity findings

### OP13-037

Four distinct identities are retained:

1. English original OP13-037.
2. Japanese original OP13-037.
3. English OP15-EB04 TR reprint `OP13-037_p1`.
4. English Premium Card Collection printing `OP13-037_p2`.

The OP15-EB04 product is linked to both OP-15 and EB-04. For a cross-prefix card number matching neither set prefix, the application preserves combined product code `OP15-EB04` rather than arbitrarily choosing the first linked set. No Japanese OP15-EB04 TR counterpart is created.

### OP10 Japanese EB01-056

The Japanese EB01 original page spells the name `シャーロット・フランぺ`; the OP10 reprint page spells the printing `シャーロット・フランペ`. This one-character variation is retained as an official product-specific source difference. The app keeps the original card-level name; no global override is applied.

### OP18 and EB05

- OP-18: 159 English and 159 Japanese printing identities. English Treasure Rare uses `OP18-049_p1`; Japanese uses `OP18-064_p1`.
- EB-05: 96 English and 96 Japanese printing identities. Japanese SP rarity labels retain Bandai's `SPカード` source text.
- The 2026-10-22 upstream feed omits 119 OP-18 and 61 EB-05 base numbers per language. Local official supplements cover all these numbers and their printing identities; upstream omissions remain recorded in the matrix.

### PRB-01 / PRB-02

- PRB-01: 319 printings per language; 111 distinct original card numbers; 1 PRB01-prefixed product number.
- PRB-02: 316 printings per language; 173 distinct original card numbers; 18 PRB02-prefixed product numbers.
- PRB-prefixed counts are release-product numbers, not original base-card counts. No PRB base-card count is asserted.

### Premium Card Collection -Best Selection Vol.6-

All 12 English product-linked printings match the official product list. No Japanese product records were invented. Generic `Other Product Card` links are suppressed in favour of the named product identity; all 12 printings remain distinct from original booster printings.

## Image verification and fallback

The official image HTTP audit (run `46043216009`, audit commit `f13880972eea4ffd4f683f94375dd80b14175734`) recorded:

| Classification | Count |
|---|---:|
| Unique official image URLs | 7,798 |
| HTTP 200 / loaded | 7,798 |
| Missing | 0 |
| Invalid URL | 0 |
| Timeout | 0 |
| Temporary failure after retries | 0 |
| Redirects | 0 |
| Language-host mismatches | 0 |

The 7,798 URLs include 7,786 PNG card images and 12 WebP Premium Card Collection images. Two initial 502 responses were retried and returned HTTP 200.

Regression tests verify exact image identity, same-language alternate and base fallback, and rejection of cross-language fallback. No live fallback was required because every official source image returned HTTP 200.

## Code and regression changes

- Pinned application reference data and manifest URLs to immutable commit `619965ec198047de519dc6eb098c7a56aed9bd58`.
- Fixed OP-18 reference-test matrix language-specific image IDs, card numbers, names, rarity and variant labels.
- Fixed EB-05 reference-test matrix language-specific image IDs, Japanese names and Japanese SP rarity/variant labels.
- Preserved combined release-product code for cross-prefix printings such as OP13-037 in OP15-EB04.
- Added application printing identity and metadata reconciliation workflow and artifact.
- Added tests for pinned feed, OP18/EB05 language separation, combined product assignment, Japanese SP labels, pagination overlap, filter clearing and same-language fallback.

## CI and verification

GitHub Actions run `46049546908` on code commit `162ad1616e2a12ac16bdb2493adc82e01d180cc1` passed:

- Automated tests: **320/320**.
- Lint: passed.
- Production build: passed.
- Application reference printing reconciliation: passed.
- Premium Card Collection: 12/12.
- OP13-037 cross-prefix identity check: passed.

The final audit-matrix, regression-test and report commits trigger a fresh exact-head workflow run. The final handover records its result.

## PR, deployment and data safety

- PR #37: OPEN.
- PR #38: OPEN.
- No merge into main/master.
- No Production deployment.
- No Production Supabase access.
- No Testing Supabase writes.
- No Preview deployment.
- No branch or commit deleted.

## Remaining blocker

The only outstanding audit blocker is persisted Testing stock/inventory linkage: 30 of 32 product rows have no release-set assignment, and all 32 lack catalogue printing keys, match IDs and reference image URLs. Keep all 50 matrix rows INCOMPLETE until this separate linkage is populated through an explicitly authorized Testing-only workflow and verified.

## Next stage

Stage 4B-1P should reconcile the 32 Testing stock products read-only against the verified 7,786-printing reference catalogue. Produce proposed product-to-printing matches and an exact unmatched/ambiguous list. Do not seed or modify Supabase without explicit authorization.
