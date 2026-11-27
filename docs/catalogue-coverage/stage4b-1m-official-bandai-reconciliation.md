# Stage 4B-1M — Official Bandai inventory extraction and reconciliation

**Retrieved:** 2026-11-27  
**Working branch:** `audit/official-bandai-inventory-stage4b-1l-2026-11-27`  
**Baseline:** `448bc546c30ad1d7c69481dbdf794711810c5560`  
**Current audit matrix:** [official-bandai-inventory-stage4b-1l.json](./official-bandai-inventory-stage4b-1l.json)

## Executive result

The machine-readable matrix now contains all **50 language/set rows**. The 44 rows covering the 22 originally outstanding sets were independently queried against Bandai English and Japanese card-list URLs. The focused OP-15, OP-18 and EB-05 sources were also rechecked.

Current matrix statuses: **33 COMPLETE, 16 INCOMPLETE, 1 SOURCE UNVERIFIED**. A COMPLETE row means the official result count, parsed entry count and extracted image URL count reconcile, and (where comparable) the base-number inventory matches the Stage 3 feed. For OP-18 and EB-05 the separate supplemental image identities were also compared. COMPLETE does not claim browser-level image load testing.

## 50-row language/set coverage

| Set | EN base | JP base | EN Bandai results | JP Bandai results | EN status | JP status |
|---|---:|---:|---:|---:|---|---|
| OP-01 | 121 | 121 | 154 | 154 | COMPLETE | COMPLETE |
| OP-02 | 121 | 121 | 154 | 154 | COMPLETE | COMPLETE |
| OP-03 | 123 | 123 | 154 | 154 | COMPLETE | COMPLETE |
| OP-04 | 119 | 119 | 149 | 149 | COMPLETE | COMPLETE |
| OP-05 | 119 | 119 | 154 | 154 | COMPLETE | COMPLETE |
| OP-06 | 119 | 119 | 151 | 150 | COMPLETE | COMPLETE |
| OP-07 | 119 | 119 | 151 | 150 | COMPLETE | COMPLETE |
| OP-08 | 119 | 119 | 151 | 150 | COMPLETE | COMPLETE |
| OP-09 | 119 | 119 | 159 | 158 | COMPLETE | COMPLETE |
| OP-10 | 119 | 119 | 151 | 150 | COMPLETE | COMPLETE |
| OP-11 | 119 | 119 | 156 | 155 | INCOMPLETE | INCOMPLETE |
| OP-12 | 119 | 119 | 155 | 154 | INCOMPLETE | INCOMPLETE |
| OP-13 | 120 | 120 | 175 | 174 | COMPLETE | COMPLETE |
| OP-14 | 120 | 120 | 199 | 156 | INCOMPLETE | COMPLETE |
| OP-15 | 119 | 119 | 196 | 152 | INCOMPLETE | INCOMPLETE |
| OP-16 | 119 | 119 | 155 | 155 | INCOMPLETE | INCOMPLETE |
| OP-17 | 119 | 119 | 169 | 169 | INCOMPLETE | INCOMPLETE |
| OP-18 | 119 | 119 | 159 | 159 | COMPLETE | COMPLETE |
| EB-01 | 61 | 61 | 80 | 80 | COMPLETE | COMPLETE |
| EB-02 | 61 | 61 | 105 | 105 | COMPLETE | COMPLETE |
| EB-03 | 62 | 62 | 90 | 90 | COMPLETE | COMPLETE |
| EB-04 | — | 61 | unavailable | 85 | SOURCE UNVERIFIED | INCOMPLETE |
| EB-05 | 61 | 61 | 96 | 96 | COMPLETE | COMPLETE |
| PRB-01 | — | — | 319 | 319 | INCOMPLETE | INCOMPLETE |
| PRB-02 | — | — | 316 | 316 | INCOMPLETE | INCOMPLETE |

The exact source URLs and retrieved card-number arrays are stored in each row of the JSON matrix. Official page result totals are not treated as base-card counts. OP/EB base counts use the requested card-number prefix; reprints keep their original card-number identity. PRB products are reprint products, so no PRB base-card count is inferred.

## Source extraction gaps and discrepancies

- **EB-04 English:** `https://en.onepiece-cardgame.com/cardlist/?series=569204` returned no usable result count or card entries. The row remains SOURCE UNVERIFIED; the older feed's 61 prefix numbers are not substituted for an official extraction.
- **EB-04 Japanese:** 85 displayed results, 83 parsed entries and 83 extracted official image URLs. Two result rows remain unresolved by the parser; the row is INCOMPLETE.
- **OP-11:** EN 156 results / 156 parsed entries / 154 extracted image URLs; JP 155 / 155 / 153. The image association extraction is short by two in each language.
- **OP-12:** EN 155 / 155 / 153; JP 154 / 154 / 152. Two image URL associations per language remain unresolved.
- **OP-14 English:** 199 results, 198 parsed entries and 199 image URLs. The page includes EB-04-prefixed cards and OP-12 reprint/special entries in addition to OP-14 base numbers. This is a release-product versus original card-number-set distinction; the parser's one-row discrepancy remains open. OP-14 Japanese returned 156 / 156 / 156.
- **OP-15:** EN 196 results, 194 parsed entries and 194 extracted image URLs; JP 152 / 151 / 151. Both languages contain all 119 OP15-prefixed base numbers and the official card-list records for OP15-075 (UC Event, El Thor / 神の裁き) and OP15-108 (R Character, Nami / ナミ). The two/one parser gaps and independent Premium Card Collection - Best Selection Vol.6 product identity check remain open.
- **OP-16:** EN and JP each returned 155 results and 155 parsed entries, but 154 image URLs were extracted in each language.
- **OP-17:** EN and JP each returned 169 results, 167 parsed entries and 164 image URLs. Two result rows and five image associations per language remain unresolved.
- **PRB-01:** 319 Bandai results; 305 parsed entries; 197 image URLs extracted. Distinct card numbers observed by parser: 106 English and 109 Japanese. The parser did not capture 14 result rows.
- **PRB-02:** 316 Bandai results; 249 parsed entries; 109 image URLs extracted. Distinct card numbers observed by parser: 140 English and 153 Japanese. The parser did not capture 67 result rows. Neither PRB product is certified complete.

An extraction shortfall is not proof that Bandai's image is missing from its website. The matrix records the parser/image URL gap separately and does not manufacture missing card numbers or printing identities.

## OP-15 duplicate printing investigation

The Stage 3 feed/code investigation identified generic **Other Product Card** and named **Premium Card Collection - Best Selection Vol.6** product links that resolve to the same printing key and image for OP15-075 and OP15-108 in each language. These are duplicate product links, not additional distinct printings. Stage 3's `dedupePrintingProducts` keeps the named product when present and retains the generic link only if it is the sole product link.

| Language | Card | Printing key |
|---|---|---|
| English | OP15-075 | `prt_w3wxxest6fk2` |
| English | OP15-108 | `prt_66s87yd68r06` |
| Japanese | OP15-075 | `prt_k5qg9snrrrr4` |
| Japanese | OP15-108 | `prt_l7sqc3seymu8` |

The Bandai OP-15 booster card-list pages show the base card identities and do not by themselves prove the Premium Collection product relationship. The named product relationship above is from the existing upstream catalogue and is covered by `tests/catalogueImageFilters.test.js`. No new printing was added.

## OP-18 reconciliation

Both official Bandai pages returned 159 entries and 159 extracted official image URLs. The Stage 3 supplemental module contains 159 printing records in each language: 119 Base, 33 Parallel, 1 Treasure Rare and 6 SP Card.

The language-specific Treasure Rare identity is intentional:
- English: **OP18-049**, Mr.2.Bon.Kurei(Bentham), TR, image ID `OP18-049_p1`.
- Japanese: **OP18-064**, キリンガム聖, TR, image ID `OP18-064_p1`.

This is not a missing-card discrepancy. The localized printing records keep the distinct official number and image ID per language. OP18-084 Base, Parallel and SP CARD are separate printings sharing one card number. Existing tests cover the 119 base numbers, all 159 printings, image audit records, language-specific TR identity and alternate printing lookup.

## EB-05 reconciliation

Both official Bandai pages returned 96 entries and 96 extracted official image URLs. The supplemental catalogue has 96 printing records in each language: 61 Base, 27 Parallel and 8 SP CARD. The 72 distinct card numbers include reprints retaining their original OP/EB/ST card-number prefixes; those are not additional EB-05 base numbers. Existing tests cover all 61 base numbers, all 96 language-specific image IDs, variants and original card-number-set versus release-set assignment.

## Catalogue behaviour and regression coverage inspected

The Stage 3 branch's `catalogueImageFilters.js` and `tests/catalogueImageFilters.test.js` cover:
- Exact card-number filtering after separator normalization and intersection with other filters.
- Release set versus original card-number set.
- Combined OP-15/EB-04 release product assignment.
- Premium Card Collection - Best Selection Vol.6 named-product preference over generic placeholders.
- Preservation of different release products, languages and variants.
- Filter options, clearing filters, rarity/type/colour/image-state filtering.
- EB-05 reprint release identity separate from the original card-number set.

The OP-18 and EB-05 supplemental tests cover all base counts, printing counts, per-language image IDs, metadata and localized printing lookup. The Image Library code deduplicates overlapping pagination pages by stable gallery entry ID; a dedicated pagination-overlap regression test was not found in the inspected test file. No catalogue code correction was made in this audit because no additional independently proven catalogue defect was established. The parser/extraction gaps above are audit evidence gaps, not catalogue changes.

## CI, Preview and safety

- PR #37: **OPEN**, not merged.
- PR #38: **OPEN / DRAFT**, not merged. Its head is the Stage 3 branch; the audit branch remains separate.
- The latest Stage 3 Preview evidence is a successful build/deployment of commit `957d5eb` on 2026-11-27. It is not the audit branch commit and does not verify the Stage 4B-1M data changes. No Preview deployment was initiated in this stage.
- The audit branch's current GitHub Actions lookup returned no workflow runs or check runs. The current verify workflow did not trigger for this audit branch, and no workflow-trigger change was made in this stage. A CI run for the audit branch is still required.
- `npm test`, `npm run lint` and `npm run build` have not been run in a local checkout in this environment. They are NOT RUN, not passed.
- No Production deployment, Production Supabase operation, merge, branch deletion or credential access occurred.


## Source extraction and image-link shortfalls

The image-link counts below are the URLs returned by the page extractor, not a verified count of broken Bandai artwork. Repeated product result rows can share one image identifier, and the extraction service may omit repeated links. These differences are therefore **SOURCE EXTRACTION SHORTFALLS**, not confirmed missing application images:

| Set | Language | Bandai result rows | Parsed card entries | Extracted image URLs |
|---|---|---:|---:|---:|
| OP-11 | English | 156 | 156 | 154 |
| OP-11 | Japanese | 155 | 155 | 153 |
| OP-12 | English | 155 | 155 | 153 |
| OP-12 | Japanese | 154 | 154 | 152 |
| OP-14 | English | 199 | 198 | 199 |
| OP-15 | English | 196 | 194 | 194 |
| OP-15 | Japanese | 152 | 151 | 151 |
| OP-16 | English | 155 | 155 | 154 |
| OP-16 | Japanese | 155 | 155 | 154 |
| OP-17 | English | 169 | 167 | 164 |
| OP-17 | Japanese | 169 | 167 | 164 |
| EB-04 | Japanese | 85 | 83 | 83 |
| PRB-01 | English/Japanese | 319 | 305 | 197 |
| PRB-02 | English/Japanese | 316 | 249 | 109 |

These rows remain INCOMPLETE or SOURCE UNVERIFIED as appropriate. No IMAGE MISSING status is assigned solely from extractor link counts. Actual HTTP response checks for the card image URLs remain outstanding.
