# Stage 4B-1N — Official source gap resolution and printing/image verification

**Retrieved:** 2026-11-27  
**Repository:** `andrew420t/the-grand-line-archive`  
**Working branch:** `audit/official-bandai-inventory-stage4b-1l-2026-11-27`  
**Starting commit:** `6e39eb3a34639127ccfe1c404c5db8d6d429e54`  
**Stage 3 baseline:** `448bc546c30ad1d7c69481dbdf794711810c5560`  
**Machine-readable audit matrix:** [official-bandai-inventory-stage4b-1l.json](./official-bandai-inventory-stage4b-1l.json)

## Executive result

Stage 4B-1M's source extraction and HTTP image audit resolve the earlier parser/image-URL shortfalls. Stage 4B-1N reconciles those results, corrects PRB base-count semantics, and identifies the OP-15 English-only cross-prefix reprint discrepancy.

- **50/50 language/set rows** have matching parsed-entry and extracted-image-reference counts.
- **7,867 source-page entry references** were parsed; 0 unparsed rows and 0 extraction image-URL shortfalls.
- **7,798 unique official image URLs** were HTTP checked; all returned **200**. The audit also includes 12 supplementary Premium Card Collection image references.
- No official source image is classified missing, invalid, timed out or temporarily failed.
- PRB-01 has 319 printings / 111 distinct original card numbers; PRB-02 has 316 printings / 173 distinct original card numbers. Their PRB-prefixed product card-number counts (1 and 18) are kept separate. **No PRB base-card count is asserted.**
- All 50 rows remain **INCOMPLETE**, not COMPLETE, because the Testing Supabase catalogue is not sufficiently populated to compare application printing identities against the official inventory. Alternate-image fallback behavior is also not verifiable from that dataset.

## 50 language/set results

Each cell is **base card numbers / official page or supplemental entries / distinct card numbers represented / image URL references**. A dash means no base-card count is asserted (PRB reprint products).

| Set | English: base / entries / distinct numbers / images | Japanese: base / entries / distinct numbers / images |
|---|---:|---:|
| OP-01 | 121 / 154 / 121 / 154 | 121 / 154 / 121 / 154 |
| OP-02 | 121 / 154 / 121 / 154 | 121 / 154 / 121 / 154 |
| OP-03 | 123 / 154 / 127 / 154 | 123 / 154 / 127 / 154 |
| OP-04 | 119 / 149 / 124 / 149 | 119 / 149 / 124 / 149 |
| OP-05 | 119 / 154 / 125 / 154 | 119 / 154 / 125 / 154 |
| OP-06 | 119 / 151 / 126 / 151 | 119 / 150 / 125 / 150 |
| OP-07 | 119 / 151 / 126 / 151 | 119 / 150 / 125 / 150 |
| OP-08 | 119 / 151 / 126 / 151 | 119 / 150 / 125 / 150 |
| OP-09 | 119 / 159 / 127 / 159 | 119 / 158 / 126 / 158 |
| OP-10 | 119 / 151 / 126 / 151 | 119 / 150 / 125 / 150 |
| OP-11 | 119 / 156 / 127 / 156 | 119 / 155 / 126 / 155 |
| OP-12 | 119 / 155 / 127 / 155 | 119 / 154 / 126 / 154 |
| OP-13 | 120 / 175 / 129 / 175 | 120 / 174 / 128 / 174 |
| OP-14 | 120 / 199 / 160 / 199 | 120 / 156 / 126 / 156 |
| OP-15 | 119 / 196 / 158 / 196 | 119 / 152 / 125 / 152 |
| OP-16 | 119 / 155 / 125 / 155 | 119 / 155 / 125 / 155 |
| OP-17 | 119 / 169 / 130 / 169 | 119 / 169 / 130 / 169 |
| OP-18 | 119 / 159 / 125 / 159 | 119 / 159 / 125 / 159 |
| EB-01 | 61 / 80 / 61 / 80 | 61 / 80 / 61 / 80 |
| EB-02 | 61 / 105 / 87 / 105 | 61 / 105 / 87 / 105 |
| EB-03 | 62 / 90 / 62 / 90 | 62 / 90 / 62 / 90 |
| EB-04 | 61 / 81 / 61 / 81 | 61 / 85 / 65 / 85 |
| EB-05 | 61 / 96 / 72 / 96 | 61 / 96 / 72 / 96 |
| PRB-01 | — / 319 / 111 / 319 | — / 319 / 111 / 319 |
| PRB-02 | — / 316 / 173 / 316 | — / 316 / 173 / 316 |

The matrix retains the exact official source URLs, full card-number arrays, printing identity IDs, rarity/type counts, reprint lists, retrieval date, source-page counts, image audit classifications and per-row status for every language/set.

## Resolved extraction discrepancies

- **EB-04 English:** 81 EB04-prefixed printing entries assembled from official English pages `series=569114` (40 matching EB04-prefixed entries) and `series=569115` (41). They contain 61 distinct EB04-prefixed base card numbers. The English source pages are combined OP14-EB04 / OP15-EB04 release groups; the EB-04 row is a prefix-specific supplemental view, not a separate standalone English EB-04 page.
- **PRB-01 English/Japanese:** 319/319 entries parsed independently for each language; 319 image URL references each; 111 distinct original card numbers; 1 PRB01-prefixed product number. No base count.
- **PRB-02 English/Japanese:** 316/316 entries parsed independently for each language; 316 image URL references each; 173 distinct original card numbers; 18 PRB02-prefixed product numbers. No base count.
- **OP-11 English/Japanese:** 156/156 and 155/155 parsed; all image references present. Earlier 2-URL shortfalls per language are resolved.
- **OP-12 English/Japanese:** 155/155 and 154/154 parsed; all image references present. Earlier 2-URL shortfalls per language are resolved.
- **OP-14 English:** 199/199 parsed, including OP14 and EB04 original-number entries and reprints. The former unparsed row is resolved.
- **OP-15 English/Japanese:** 196/196 and 152/152 parsed; all image references present. The former unparsed rows are resolved.
- **OP-16 English/Japanese:** 155/155 each parsed; all image references present.
- **OP-17 English/Japanese:** 169/169 each parsed; former unparsed rows and image-reference shortfalls are resolved.
- **EB-04 Japanese:** 85/85 parsed; all image references present.

### OP-15 non-base product-number discrepancy

The English OP15-EB04 source page contains **OP13-037**, rarity TR, Character, Roronoa Zoro, image identity `OP13-037_p1`. The Japanese EB-04 official page does not contain OP13-037. This is recorded as an **English-only cross-prefix reprint observation**, not a missing image and not permission to synthesize a Japanese record.

The other cross-prefix entries OP11-106 and PRB02-014 are present on both the English OP15-EB04 source page and the Japanese EB-04 source page. They are not missing Japanese printings.

Official page references:
- [English OP14-EB04 card list](https://en.onepiece-cardgame.com/cardlist/?series=569114)
- [English OP15-EB04 card list](https://en.onepiece-cardgame.com/cardlist/?series=569115)
- [Japanese EB-04 card list](https://www.onepiece-cardgame.com/cardlist/?series=550204)

## Printing identity and release/card-number separation

- The source artifacts preserve each entry's original card number, rarity, type, name, release/product label and exact image URL.
- Original card-number prefix and release/product grouping are separate concepts. English source groups are explicitly labelled OP14-EB04 and OP15-EB04; the EB-04 English supplemental row counts EB04-prefixed entries only.
- Genuine parallel, SP, TR and reprint identities are retained by image/printing identity; repeated card numbers are not automatically collapsed.
- PRB rows now use null base counts and empty base-card arrays. PRB-prefixed product numbers remain in their dedicated fields.
- The Stage 3 regression coverage already records the OP-15 Best Selection Vol.6 generic-placeholder versus named-product deduplication rule, preserving the named printing and avoiding a false second identity.
- OP-18 English/Japanese Treasure Rare identities remain language-specific (English OP18-049 / Japanese OP18-064); they are not cross-language substitutions.

## Image verification

The recorded image audit (run `46043216009`, audit commit `f13880972eea4ffd4f683f94375dd80b14175734`) reports:

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

Content types: 7,786 PNG and 12 WebP supplementary Premium Card Collection images. Two initial 502 responses in earlier attempts were retried and returned 200; no final temporary failures remain. Alternate-image fallback remains **NOT TESTED** because the Testing catalogue has no usable catalogue reference-image URLs.

## Remaining catalogue gaps and blockers

1. **Application printing parity:** the read-only Testing project `ehzqsnfkmwphyllhaqhe` has 32 products, only 2 release sets linked, and zero `catalogue_printing_key`, `catalogue_match_id` or `catalogue_reference_image_url` values. It cannot support a full 25-set application-vs-official identity comparison.
2. **Upstream feed snapshot:** the 2026-10-22 feed still lacks the 119 OP-18 base numbers and 61 EB-05 base numbers in both languages. These are feed snapshot omissions, not missing entries on the current official Bandai pages; the official OP-18 and EB-05 source inventories contain their complete base-prefix lists.
3. **Alternate image fallback:** cannot be verified until a complete Testing catalogue has valid reference-image URLs.
4. **PRB and Premium Card Collection application reprints:** official product entries are enumerated, but full application identity parity cannot be established from the smoke dataset.
5. **No row is marked COMPLETE** while application parity/fallback verification remains outstanding.

## Regression tests and CI

Added `test/catalogue-coverage/officialBandaiInventoryStage4b1n.test.js` to verify:
- 50 unique language/set rows across 25 sets.
- Parsed rows, printing identity IDs and source image URL counts reconcile exactly.
- HTTP image classifications are all loaded and no false IMAGE MISSING state is introduced.
- PRB base counts remain null and PRB product-prefix counts are separate.
- EB-04 English uses the two official combined-source pages.
- OP-18 English/Japanese TR identities remain distinct.
- OP13-037 remains the single English-only official cross-prefix TR printing; OP11-106 and PRB02-014 have Japanese EB-04 SPカード counterparts.
- No row is COMPLETE while the application comparison dataset is incomplete.

Also updated `src/admin/storagePagination.js` to suppress overlapping Storage pages by stable object ID (falling back to object name) while preserving first-seen order. Added two overlap regression cases to `tests/storagePagination.test.js`. Existing `tests/catalogueImageFilters.test.js` covers intersecting filters, exact card-number matching, original-card-number set versus release set, language/variant separation, named Premium Card Collection product preference and generic-placeholder suppression; a new case verifies that clearing every filter restores the complete result list. Existing `tests/officialBandaiInventoryStage4b1m.test.js` covers PRB product-prefix/base-count separation, Premium Card Collection printings, Japanese EB-04 cross-prefix entries and language-specific OP-18 / EB-05 metadata.

**Full exact-code-commit execution:** GitHub Actions run [46044786850](https://github.com/andrew420t/the-grand-line-archive/actions/runs/46044786850) on code-bearing commit `f7f510802036960a50e1f377c20d389836db303c` passed:
- **306/306 automated tests**.
- `npm run lint`: passed, 17 warnings and 0 errors.
- `npm run build`: passed; non-blocking Vite chunk-size and Node `punycode` deprecation warnings only.

The final official image HTTP audit was run separately on [46043216009](https://github.com/andrew420t/the-grand-line-archive/actions/runs/46043216009), commit `f13880972eea4ffd4f683f94375dd80b14175734`: **7,798/7,798 HTTP 200**. The subsequent code-bearing commit adds regression coverage but does not change official image URLs, so the recorded image audit remains applicable.

The latest metadata/report commits are documentation updates after the successful code-bearing CI run. They do not alter application code or official image source URLs.

## Branch, PR and deployment safety

- Working branch remains `audit/official-bandai-inventory-stage4b-1l-2026-11-27`.
- PR #37: OPEN; not merged.
- PR #38: OPEN / DRAFT; not merged.
- No merge to main/master.
- No Production deployment or Production Supabase access.
- No Preview deployment was initiated. Existing Stage 3 Preview evidence is not evidence for this audit branch.
- No branch or commit was deleted.

## Next stage blockers

Stage 4B-1O should obtain a complete, non-production Testing catalogue snapshot with all English/Japanese product/printing keys and reference image URLs, then reconcile every one of the 25 release sets against the official matrix. It should also resolve the OP-18 / EB-05 upstream feed coverage gaps and verify alternate-image fallback using same-language/same-source candidates only. Preserve the one English-only OP13-037 TR printing without inventing a Japanese EB-04 counterpart.
