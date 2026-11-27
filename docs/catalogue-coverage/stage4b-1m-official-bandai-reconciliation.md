# Stage 4B-1M — Official Bandai inventory extraction and reconciliation

**Retrieved:** 2026-11-27  
**Working branch:** `audit/official-bandai-inventory-stage4b-1l-2026-11-27`  
**Stage 3 baseline:** `448bc546c30ad1d7c69481dbdf794711810c5560`  
**Machine-readable matrix:** [official-bandai-inventory-stage4b-1l.json](./official-bandai-inventory-stage4b-1l.json)

## Executive result

The 50-row matrix now records the official English and Japanese Bandai sources for all 25 sets. For the 22 originally outstanding sets (44 language/set rows), **43 official pages returned a result list**; the English EB-04 page returned no usable result list and remains **SOURCE UNVERIFIED**.

Across all 50 rows, the conservative overall statuses are **49 INCOMPLETE and 1 SOURCE UNVERIFIED**. This does not mean 49 card-number lists are missing. The status remains INCOMPLETE because source image references have not been HTTP/browser-verified and several page extractions have parser or image-link shortfalls. No IMAGE MISSING status is assigned without a verified failed image request. No row is marked COMPLETE until image delivery verification is complete.

For the 44 outstanding inventories:
- 29 pages have matching displayed-result, parsed-entry and extracted-image-URL counts.
- 14 pages have an extraction/association shortfall.
- 1 page (EB-04 English) has no usable official result list.
- PRB-01 and PRB-02 are available but their result lists were only partially parsed; they are INCOMPLETE, not treated as complete from feed totals.

## 50-row language/set inventory

Base counts are distinct card numbers with the exact OP/EB set prefix. PRB is a reprint product, so it has no inferred PRB base-card count. Page result counts are product/list rows, not base-card counts.

| Set | EN base | JP base | EN results / parsed / images | JP results / parsed / images | EN status | JP status |
|---|---:|---:|---:|---:|---|---|
| OP-01 | 121 | 121 | 154 / 154 / 154 | 154 / 154 / 154 | INCOMPLETE | INCOMPLETE |
| OP-02 | 121 | 121 | 154 / 154 / 154 | 154 / 154 / 154 | INCOMPLETE | INCOMPLETE |
| OP-03 | 123 | 123 | 154 / 154 / 154 | 154 / 154 / 154 | INCOMPLETE | INCOMPLETE |
| OP-04 | 119 | 119 | 149 / 149 / 149 | 149 / 149 / 149 | INCOMPLETE | INCOMPLETE |
| OP-05 | 119 | 119 | 154 / 154 / 154 | 154 / 154 / 154 | INCOMPLETE | INCOMPLETE |
| OP-06 | 119 | 119 | 151 / 151 / 151 | 150 / 150 / 150 | INCOMPLETE | INCOMPLETE |
| OP-07 | 119 | 119 | 151 / 151 / 151 | 150 / 150 / 150 | INCOMPLETE | INCOMPLETE |
| OP-08 | 119 | 119 | 151 / 151 / 151 | 150 / 150 / 150 | INCOMPLETE | INCOMPLETE |
| OP-09 | 119 | 119 | 159 / 159 / 159 | 158 / 158 / 158 | INCOMPLETE | INCOMPLETE |
| OP-10 | 119 | 119 | 151 / 151 / 151 | 150 / 150 / 150 | INCOMPLETE | INCOMPLETE |
| OP-11 | 119 | 119 | 156 / 156 / 154 | 155 / 155 / 153 | INCOMPLETE | INCOMPLETE |
| OP-12 | 119 | 119 | 155 / 155 / 153 | 154 / 154 / 152 | INCOMPLETE | INCOMPLETE |
| OP-13 | 120 | 120 | 175 / 175 / 175 | 174 / 174 / 174 | INCOMPLETE | INCOMPLETE |
| OP-14 | 120 | 120 | 199 / 198 / 199 | 156 / 156 / 156 | INCOMPLETE | INCOMPLETE |
| OP-15 | 119 | 119 | 196 / 194 / 194 | 152 / 151 / 151 | INCOMPLETE | INCOMPLETE |
| OP-16 | 119 | 119 | 155 / 155 / 154 | 155 / 155 / 154 | INCOMPLETE | INCOMPLETE |
| OP-17 | 119 | 119 | 169 / 167 / 164 | 169 / 167 / 164 | INCOMPLETE | INCOMPLETE |
| OP-18 | 119 | 119 | 159 / 159 / 159 | 159 / 159 / 159 | INCOMPLETE | INCOMPLETE |
| EB-01 | 61 | 61 | 80 / 80 / 80 | 80 / 80 / 80 | INCOMPLETE | INCOMPLETE |
| EB-02 | 61 | 61 | 105 / 105 / 105 | 105 / 105 / 105 | INCOMPLETE | INCOMPLETE |
| EB-03 | 62 | 62 | 90 / 90 / 90 | 90 / 90 / 90 | INCOMPLETE | INCOMPLETE |
| EB-04 | — | 61 | unavailable / 0 / 0 | 85 / 83 / 83 | SOURCE UNVERIFIED | INCOMPLETE |
| EB-05 | 61 | 61 | 96 / 96 / 96 | 96 / 96 / 96 | INCOMPLETE | INCOMPLETE |
| PRB-01 | — | — | 319 / 305 / 197 | 319 / 305 / 197 | INCOMPLETE | INCOMPLETE |
| PRB-02 | — | — | 316 / 249 / 109 | 316 / 249 / 109 | INCOMPLETE | INCOMPLETE |

Each row in the JSON matrix includes its exact Bandai URL, retrieval date, official base card-number array, feed comparison where comparable, type and rarity counts, other-prefix reprints, displayed result count, parsed entry count, extracted image URL count, parser shortfall, status and notes. The per-set extraction JSON files preserve the extracted card number, name, rarity, type and image URL lists.

## Source extraction shortfalls

These are extraction-service/parser shortfalls, not confirmed broken Bandai images:

- **EB-04 English:** official URL `https://en.onepiece-cardgame.com/cardlist/?series=569204` returned no usable result count or card entries. It remains SOURCE UNVERIFIED; feed totals are not substituted.
- **EB-04 Japanese:** 85 results, 83 parsed entries and 83 image URLs; two result rows remain unparsed.
- **OP-11:** EN 156/156/154; JP 155/155/153.
- **OP-12:** EN 155/155/153; JP 154/154/152.
- **OP-14 English:** 199 results, 198 parsed entries and 199 image URLs. The page includes EB-04-prefixed cards and OP-12 reprint/special entries alongside OP-14 base numbers. This is a release-product versus original card-number-set distinction, not evidence of missing OP-14 base cards.
- **OP-15:** EN 196/194/194; JP 152/151/151. Both pages contain all 119 OP15-prefixed base numbers.
- **OP-16:** EN and JP each 155/155/154.
- **OP-17:** EN and JP each 169/167/164.
- **PRB-01:** 319 displayed results, 305 parsed entries, 197 image URLs; 14 rows not parsed.
- **PRB-02:** 316 displayed results, 249 parsed entries, 109 image URLs; 67 rows not parsed.

PRB products include reprints with original OP/EB/ST card numbers. Their page totals cannot be converted into PRB base-card counts. The incomplete PRB text extraction does not support a complete distinct printing inventory.

## OP-15 duplicate printing investigation

The Stage 3 feed/code investigation found generic **Other Product Card** and named **Premium Card Collection - Best Selection Vol.6** product links resolving to the same printing key and image for OP15-075 and OP15-108 in both languages. They are duplicate links to one printing, not two different printings. Stage 3's `dedupePrintingProducts` keeps the named product when present and retains the generic link only if it is the sole product link.

| Language | Card | Printing key |
|---|---|---|
| English | OP15-075 | `prt_w3wxxest6fk2` |
| English | OP15-108 | `prt_66s87yd68r06` |
| Japanese | OP15-075 | `prt_k5qg9snrrrr4` |
| Japanese | OP15-108 | `prt_l7sqc3seymu8` |

The official OP-15 booster card-list pages confirm the base identities: OP15-075 is UC Event El Thor / 神の裁き; OP15-108 is R Character Nami / ナミ. The Bandai booster page alone does not prove the Premium Collection product relationship; that relationship is from the existing upstream catalogue and Stage 3 product-identity regression tests. No new printing was added.

## OP-18 reconciliation

Both official Bandai pages returned 159 entries and 159 image URLs. The Stage 3 supplemental module has 159 entries per language: 119 Base, 33 Parallel, 1 Treasure Rare and 6 SP Card. The supplemental records' language-specific image identifiers match the official page identifiers (159/159 per language); HTTP/browser image loading remains unverified.

The Treasure Rare is intentionally language-specific:
- English: OP18-049, Mr.2.Bon.Kurei(Bentham), TR, image ID `OP18-049_p1`.
- Japanese: OP18-064, キリンガム聖, TR, image ID `OP18-064_p1`.

This is not a missing-card discrepancy. OP18-084 Base, Parallel and SP CARD are separate printings sharing one card number.

## EB-05 reconciliation

Both official Bandai pages returned 96 entries and 96 image URLs. The Stage 3 supplemental module has 96 entries per language: 61 Base, 27 Parallel and 8 SP Card. The official image identifiers match the supplemental catalogue identifiers (96/96 per language); HTTP/browser image loading remains unverified. The 72 distinct card numbers include reprints carrying their original OP/EB/ST prefixes; they are not additional EB-05 base cards.

## Catalogue behaviour and regression coverage inspected

The Stage 3 branch's `catalogueImageFilters.js` and tests cover:
- Exact card-number filtering after separator normalization and intersection with other filters.
- Release set versus original card-number set.
- Combined OP-15/EB-04 release product assignment.
- Premium Card Collection - Best Selection Vol.6 named-product preference over generic placeholders.
- Preservation of different release products, languages and variants.
- Filter options, clearing filters, rarity/type/colour/image-state filtering.
- EB-05 reprint release identity separate from original card-number set.
- OP-18 119 base numbers, 159 printings and language-specific TR identities.
- EB-05 61 base numbers, 96 printings, language-specific image IDs and reprint identities.

A fresh audit-branch CI run exposed one real defect: the EB-05 card-number normalizer had double-escaped regular-expression tokens, so `EB-05-001` did not normalize to `EB05-001`. The implementation has been corrected to use the same single-escape normalization as OP-18. The existing regression was expanded to cover hyphenated, spaced and underscored EB-05 numbers. The first CI run had 270/271 tests passing and failed this EB-05 normalization test. After correcting the regex and expanding the tests, CI passed on code/test commit `6f4327a7e75721f114a78b4f749bc596e179fdad`: **271/271 tests passed, lint passed, and the production build passed**. The build emitted the existing Vite chunk-size warning (one JS chunk is approximately 1,005 kB); it did not fail.

The Image Library code deduplicates overlapping pagination pages by stable gallery entry ID. Existing tests cover storage pagination, exact page multiples and storage errors; no new pagination code change was justified by the audit. No other catalogue code correction was made because no additional independently proven defect was established.

## CI, Preview and safety

- PR #37: **OPEN**, not merged.
- PR #38: **OPEN**, not merged.
- The audit branch is isolated; it is not merged into main/master and does not change either PR.
- The existing Stage 3 Preview URL remains `https://fix-card-reference-images-stage3-2026-11-the-grand-line-archive.andrew420-t27.workers.dev`. Its previously recorded successful build was for Stage 3 commit `957d5eb`, not this audit branch. No Preview deployment or manual browser acceptance was performed.
- The audit branch verify workflow runs `npm ci`, `npm test`, `npm run lint` and `npm run build`. The successful CI run on `6f4327a7e75721f114a78b4f749bc596e179fdad` completed all four stages: 271/271 tests passed, lint passed, and build passed. A documentation-only update follows this run and will receive its own branch CI check.
- No Production deployment, Production Supabase operation, merge, branch deletion or credential access occurred.
