# Stage 4B-1M — Official Bandai inventory extraction and reconciliation

**Repository:** `andrew420t/the-grand-line-archive`  
**Working branch:** `audit/official-bandai-inventory-stage4b-1l-2026-11-27`  
**Starting commit:** `6357ec85c14f6789361a1a2086000af46a818062`  
**Stage 3 baseline:** `448bc546c30ad1d7c69481dbdf794711810c5560`  
**Retrieval date:** 2026-11-27

## Safety and scope

- PR #37 and PR #38 remain open and unmerged.
- No changes to main/master, Production deployment, or Production Supabase.
- No branches or commits deleted.
- This supplemental Stage 4B-1M work adds official evidence, a language-aware OP-18 printing correction, and regression tests. It preserves the scanner, Image Library, filters and OP-15 corrections. The branch already contained earlier Stage 4B-1M/1N artifacts beyond the supplied starting commit; no history was rewritten or deleted.

## Extraction result

- 44/44 requested outstanding language/set inventories are extracted. English EB-04 is a composite official-source inventory because Bandai has no standalone English EB-04 page/product.
- 49 direct official Bandai card-list pages were fetched: 7,786 card-list entries and 7,786 official card-image URLs. Every extracted page's visible result count, parsed card entries and image URL count reconcile exactly.
- The 50-row matrix contains 7,867 printing identity IDs because the 81 English EB-04 entries are also represented as a separate EB-04 cross-product row while remaining in their original OP14-EB04/OP15-EB04 release-product rows. Do not sum matrix rows as if they were disjoint.
- All rows remain **INCOMPLETE** because image HTTP delivery and the remaining application/catalogue identity checks have not been fully run. Zero extracted entries currently lack an official image URL reference; this does not prove that every image URL loads in the application.

## Complete 50-row matrix

Counts below are independently extracted from official Bandai pages, not inferred from feed totals. “Missing” compares official base-prefix numbers with the 2026-10-22 upstream card-number snapshot.

| Set | Language | Base numbers | Distinct product card numbers | Official entries / printings | Non-base card numbers | Missing from upstream | Missing image refs | Upstream product link count | Status | Official source |
|---|---:|---:|---:|---:|---:|---:|---:|---|---|---|
| OP-01 | English | 121 | 121 | 154 | 0 | 0 | 0 | en:569101 (154) | INCOMPLETE | [Bandai EN](https://en.onepiece-cardgame.com/cardlist/?series=569101) |
| OP-01 | Japanese | 121 | 121 | 154 | 0 | 0 | 0 | jp:550101 (154) | INCOMPLETE | [Bandai JP](https://www.onepiece-cardgame.com/cardlist/?series=550101) |
| OP-02 | English | 121 | 121 | 154 | 0 | 0 | 0 | en:569102 (154) | INCOMPLETE | [Bandai EN](https://en.onepiece-cardgame.com/cardlist/?series=569102) |
| OP-02 | Japanese | 121 | 121 | 154 | 0 | 0 | 0 | jp:550102 (154) | INCOMPLETE | [Bandai JP](https://www.onepiece-cardgame.com/cardlist/?series=550102) |
| OP-03 | English | 123 | 127 | 154 | 4 | 0 | 0 | en:569103 (154) | INCOMPLETE | [Bandai EN](https://en.onepiece-cardgame.com/cardlist/?series=569103) |
| OP-03 | Japanese | 123 | 127 | 154 | 4 | 0 | 0 | jp:550103 (154) | INCOMPLETE | [Bandai JP](https://www.onepiece-cardgame.com/cardlist/?series=550103) |
| OP-04 | English | 119 | 124 | 149 | 5 | 0 | 0 | en:569104 (149) | INCOMPLETE | [Bandai EN](https://en.onepiece-cardgame.com/cardlist/?series=569104) |
| OP-04 | Japanese | 119 | 124 | 149 | 5 | 0 | 0 | jp:550104 (149) | INCOMPLETE | [Bandai JP](https://www.onepiece-cardgame.com/cardlist/?series=550104) |
| OP-05 | English | 119 | 125 | 154 | 6 | 0 | 0 | en:569105 (154) | INCOMPLETE | [Bandai EN](https://en.onepiece-cardgame.com/cardlist/?series=569105) |
| OP-05 | Japanese | 119 | 125 | 154 | 6 | 0 | 0 | jp:550105 (154) | INCOMPLETE | [Bandai JP](https://www.onepiece-cardgame.com/cardlist/?series=550105) |
| OP-06 | English | 119 | 126 | 151 | 7 | 0 | 0 | en:569106 (151) | INCOMPLETE | [Bandai EN](https://en.onepiece-cardgame.com/cardlist/?series=569106) |
| OP-06 | Japanese | 119 | 125 | 150 | 6 | 0 | 0 | jp:550106 (150) | INCOMPLETE | [Bandai JP](https://www.onepiece-cardgame.com/cardlist/?series=550106) |
| OP-07 | English | 119 | 126 | 151 | 7 | 0 | 0 | en:569107 (151) | INCOMPLETE | [Bandai EN](https://en.onepiece-cardgame.com/cardlist/?series=569107) |
| OP-07 | Japanese | 119 | 125 | 150 | 6 | 0 | 0 | jp:550107 (150) | INCOMPLETE | [Bandai JP](https://www.onepiece-cardgame.com/cardlist/?series=550107) |
| OP-08 | English | 119 | 126 | 151 | 7 | 0 | 0 | en:569108 (151) | INCOMPLETE | [Bandai EN](https://en.onepiece-cardgame.com/cardlist/?series=569108) |
| OP-08 | Japanese | 119 | 125 | 150 | 6 | 0 | 0 | jp:550108 (150) | INCOMPLETE | [Bandai JP](https://www.onepiece-cardgame.com/cardlist/?series=550108) |
| OP-09 | English | 119 | 127 | 159 | 8 | 0 | 0 | en:569109 (159) | INCOMPLETE | [Bandai EN](https://en.onepiece-cardgame.com/cardlist/?series=569109) |
| OP-09 | Japanese | 119 | 126 | 158 | 7 | 0 | 0 | jp:550109 (158) | INCOMPLETE | [Bandai JP](https://www.onepiece-cardgame.com/cardlist/?series=550109) |
| OP-10 | English | 119 | 126 | 151 | 7 | 0 | 0 | en:569110 (151) | INCOMPLETE | [Bandai EN](https://en.onepiece-cardgame.com/cardlist/?series=569110) |
| OP-10 | Japanese | 119 | 125 | 150 | 6 | 0 | 0 | jp:550110 (150) | INCOMPLETE | [Bandai JP](https://www.onepiece-cardgame.com/cardlist/?series=550110) |
| OP-11 | English | 119 | 127 | 156 | 8 | 0 | 0 | en:569111 (156) | INCOMPLETE | [Bandai EN](https://en.onepiece-cardgame.com/cardlist/?series=569111) |
| OP-11 | Japanese | 119 | 126 | 155 | 7 | 0 | 0 | jp:550111 (155) | INCOMPLETE | [Bandai JP](https://www.onepiece-cardgame.com/cardlist/?series=550111) |
| OP-12 | English | 119 | 127 | 155 | 8 | 0 | 0 | en:569112 (155) | INCOMPLETE | [Bandai EN](https://en.onepiece-cardgame.com/cardlist/?series=569112) |
| OP-12 | Japanese | 119 | 126 | 154 | 7 | 0 | 0 | jp:550112 (154) | INCOMPLETE | [Bandai JP](https://www.onepiece-cardgame.com/cardlist/?series=550112) |
| OP-13 | English | 120 | 129 | 175 | 9 | 0 | 0 | en:569113 (175) | INCOMPLETE | [Bandai EN](https://en.onepiece-cardgame.com/cardlist/?series=569113) |
| OP-13 | Japanese | 120 | 128 | 174 | 8 | 0 | 0 | jp:550113 (174) | INCOMPLETE | [Bandai JP](https://www.onepiece-cardgame.com/cardlist/?series=550113) |
| OP-14 | English | 120 | 160 | 199 | 40 | 0 | 0 | en:569114 (199) | INCOMPLETE | [Bandai EN](https://en.onepiece-cardgame.com/cardlist/?series=569114) |
| OP-14 | Japanese | 120 | 126 | 156 | 6 | 0 | 0 | jp:550114 (156) | INCOMPLETE | [Bandai JP](https://www.onepiece-cardgame.com/cardlist/?series=550114) |
| OP-15 | English | 119 | 158 | 196 | 39 | 0 | 0 | en:569115 (196) | INCOMPLETE | [Bandai EN](https://en.onepiece-cardgame.com/cardlist/?series=569115) |
| OP-15 | Japanese | 119 | 125 | 152 | 6 | 0 | 0 | jp:550115 (152) | INCOMPLETE | [Bandai JP](https://www.onepiece-cardgame.com/cardlist/?series=550115) |
| OP-16 | English | 119 | 125 | 155 | 6 | 0 | 0 | en:569116 (155) | INCOMPLETE | [Bandai EN](https://en.onepiece-cardgame.com/cardlist/?series=569116) |
| OP-16 | Japanese | 119 | 125 | 155 | 6 | 0 | 0 | jp:550116 (155) | INCOMPLETE | [Bandai JP](https://www.onepiece-cardgame.com/cardlist/?series=550116) |
| OP-17 | English | 119 | 130 | 169 | 11 | 0 | 0 | en:569117 (169) | INCOMPLETE | [Bandai EN](https://en.onepiece-cardgame.com/cardlist/?series=569117) |
| OP-17 | Japanese | 119 | 130 | 169 | 11 | 0 | 0 | jp:550117 (169) | INCOMPLETE | [Bandai JP](https://www.onepiece-cardgame.com/cardlist/?series=550117) |
| OP-18 | English | 119 | 125 | 159 | 6 | 119 | 0 | not in snapshot | INCOMPLETE | [Bandai EN](https://en.onepiece-cardgame.com/cardlist/?series=569118) |
| OP-18 | Japanese | 119 | 125 | 159 | 6 | 119 | 0 | not in snapshot | INCOMPLETE | [Bandai JP](https://www.onepiece-cardgame.com/cardlist/?series=550118) |
| EB-01 | English | 61 | 61 | 80 | 0 | 0 | 0 | en:569201 (80) | INCOMPLETE | [Bandai EN](https://en.onepiece-cardgame.com/cardlist/?series=569201) |
| EB-01 | Japanese | 61 | 61 | 80 | 0 | 0 | 0 | jp:550201 (80) | INCOMPLETE | [Bandai JP](https://www.onepiece-cardgame.com/cardlist/?series=550201) |
| EB-02 | English | 61 | 87 | 105 | 26 | 0 | 0 | en:569202 (105) | INCOMPLETE | [Bandai EN](https://en.onepiece-cardgame.com/cardlist/?series=569202) |
| EB-02 | Japanese | 61 | 87 | 105 | 26 | 0 | 0 | jp:550202 (105) | INCOMPLETE | [Bandai JP](https://www.onepiece-cardgame.com/cardlist/?series=550202) |
| EB-03 | English | 62 | 62 | 90 | 0 | 0 | 0 | en:569203 (90) | INCOMPLETE | [Bandai EN](https://en.onepiece-cardgame.com/cardlist/?series=569203) |
| EB-03 | Japanese | 62 | 62 | 90 | 0 | 0 | 0 | jp:550203 (90) | INCOMPLETE | [Bandai JP](https://www.onepiece-cardgame.com/cardlist/?series=550203) |
| EB-04 | English | 61 | 61 | 81 | 0 | 0 | 0 | combined en:569114 + en:569115 | INCOMPLETE | [OP14-EB04](https://en.onepiece-cardgame.com/cardlist/?series=569114) / [OP15-EB04](https://en.onepiece-cardgame.com/cardlist/?series=569115) |
| EB-04 | Japanese | 61 | 65 | 85 | 4 | 0 | 0 | jp:550204 (85) | INCOMPLETE | [Bandai JP](https://www.onepiece-cardgame.com/cardlist/?series=550204) |
| EB-05 | English | 61 | 72 | 96 | 11 | 61 | 0 | not in snapshot | INCOMPLETE | [Bandai EN](https://en.onepiece-cardgame.com/cardlist/?series=569205) |
| EB-05 | Japanese | 61 | 72 | 96 | 11 | 61 | 0 | not in snapshot | INCOMPLETE | [Bandai JP](https://www.onepiece-cardgame.com/cardlist/?series=550205) |
| PRB-01 | English | 1 | 111 | 319 | 110 | 0 | 0 | en:569301 (319) | INCOMPLETE | [Bandai EN](https://en.onepiece-cardgame.com/cardlist/?series=569301) |
| PRB-01 | Japanese | 1 | 111 | 319 | 110 | 0 | 0 | jp:550301 (319) | INCOMPLETE | [Bandai JP](https://www.onepiece-cardgame.com/cardlist/?series=550301) |
| PRB-02 | English | 18 | 173 | 316 | 155 | 0 | 0 | en:569302 (316) | INCOMPLETE | [Bandai EN](https://en.onepiece-cardgame.com/cardlist/?series=569302) |
| PRB-02 | Japanese | 18 | 173 | 316 | 155 | 0 | 0 | jp:550302 (316) | INCOMPLETE | [Bandai JP](https://www.onepiece-cardgame.com/cardlist/?series=550302) |

The full base-number lists, non-base/reprint lists, printing identity IDs, image URLs, exact source URLs, retrieval dates, missing/unexpected numbers and row-level reconciliation fields are in `docs/catalogue-coverage/official-bandai-inventory-stage4b-1l.json`. Full card-level entries are in the five linked JSON evidence batches.

## Key reconciliations

### OP-15

- 119 base card numbers in both languages.
- English: 196 official entries/printing identities; Japanese: 152.
- The English OP15-EB04 page contains 41 EB04-prefixed entries; the OP14-EB04 page contains 40. These are retained in the release-product rows and assigned by card number in the separate EB-04 English row.
- Bandai's official [Premium Card Collection -Best Selection Vol.6-](https://en.onepiece-cardgame.com/products/other/cardcollection_bestselection_vol6.php) page confirms 12 collection card images. OP15-075 El Thor and OP15-108 Nami each have a distinct Best Selection product printing in addition to their OP15-EB04 base printing. Exact official product image assets are recorded in `official-premium-card-collection-best-selection-vol6.json`.
- The Stage 3 filter implementation and tests already suppress a generic “Other Product Card” placeholder when a named product exists, while retaining distinct product keys. This stage did not modify that runtime code.

### OP-18

- Both languages: 159 entries; 119 base card numbers; 125 distinct product card numbers; 6 additional non-OP18 card numbers.
- Exactly 33 parallel variants and 7 special printings (6 SP plus 1 TR) in each language. The audit branch now preserves English SP CARD and Japanese SPカード labels separately.
- The Stage 3 supplemental list has three English image-ID mismatches:
  - Official: `OP18-049_p1`, `OP13-012_p1`, `OP17-040_p2`
  - Stage 3 supplemental file instead uses: `OP18-064_p1`, `OP13-012_p2`, `OP17-040_p1`
- Japanese image IDs match. One Japanese TR name is concatenated incorrectly (official: `キリンガム聖`); six SP rarity labels use the normalized English label `SP CARD` instead of Bandai's `SPカード`.
- The English/Japanese differences are now corrected on the audit branch in `src/admin/op18OfficialCatalogue.js`: 160 union records produce 159 language-correct printings per language; the English OP18-049 TR and Japanese OP18-064 TR are separate, and the Japanese TR name is corrected. PR #38 itself remains open and unmodified.

### EB-05

- Both languages: 96 entries; 61 base card numbers; 72 distinct product card numbers; 11 additional reprint card numbers.
- Exactly 27 parallel variants and 8 SP printings in each language.
- English supplemental list matches all 96 official image IDs, card numbers, names and rarity.
- Japanese supplemental list matches all 96 image IDs and names; eight SP labels are normalized to `SP CARD` instead of Bandai's `SPカード`.

### EB-04

- English: 61 base card numbers, 81 printing identities, 40 entries from OP14-EB04 plus 41 from OP15-EB04. No standalone English EB-04 product key exists.
- Japanese: 61 base card numbers, 85 entries, 65 distinct product card numbers, including four additional non-EB04-numbered inclusions: `EB01-023`, `OP11-106`, `PRB02-006`, `PRB02-014`.

### PRB reprints

- PRB-01 English/Japanese: 319 official printings, 111 distinct card numbers, 1 PRB01-prefixed number and 110 reprint card numbers.
- PRB-02 English/Japanese: 316 official printings, 173 distinct card numbers, 18 PRB02-prefixed numbers and 155 reprint card numbers.
- The full card-number/reprint lists and image IDs are in the matrix and evidence files.

## Upstream catalogue comparison

The upstream `hotavocado/koala-kollect-data` manifest was generated at **2026-10-22T04:46:19Z**. It is stale relative to this audit.

- All 45 standalone upstream product keys that exist in this snapshot have product-link counts matching their independently extracted Bandai page entry counts.
- OP-18 and EB-05 product keys are absent from the upstream snapshot; their official Bandai inventories are independently extracted and the Stage 3 supplemental catalogue is compared card-by-card above.
- English EB-04 has no standalone upstream product key; the English EB04 entries are within OP14-EB04 and OP15-EB04.
- The upstream Best Selection Vol.6 product key has 12 printing-product links, matching the official product page's 12 card images.
- Upstream counts are used only as a cross-check, never as proof that the Bandai inventory is complete.

## Regression tests and runtime preservation

Added `tests/officialBandaiInventoryStage4b1m.test.js` to guard:
- all 50 language/set rows and all 7,867 matrix printing identity IDs;
- page-result, parsed-entry and image-reference count equality;
- combined OP14/EB04 + OP15/EB04 English assignment;
- EB-04 Japanese reprints;
- PRB-01/PRB-02 printing and card-number counts;
- OP-18/EB-05 parallel and special printing counts;
- OP15-075/OP15-108 Best Selection Vol.6 product identity separation;
- the three known OP-18 English supplemental image-ID mismatches;
- upstream product-link counts for all 45 standalone product rows.

Existing Stage 3 code/tests inspected (not modified): `src/admin/catalogueImageFilters.js`, `tests/catalogueImageFilters.test.js`, `src/admin/catalogueImageCorrections.js`, `tests/catalogueImageCorrections.test.js`. The generic placeholder suppression, distinct-product preservation, release-set/card-number-set assignment and language-specific correction matching are present in that PR branch.

## Verification and blockers

- The 50-row evidence matrix and all extracted-page invariants were checked in-memory against the committed JSON evidence.
- **Automated `npm test`, lint and production build are not yet confirmed for the latest audit head.** The audit branch workflow contains a push trigger for this branch, but the GitHub connector currently exposes no completed push-run result or combined check status for the latest commit. The earlier Stage 4B-1N report records a prior 271/271 test, lint and build pass on commit `6f4327a7`; that is not verification of this latest commit.
- Official image URLs were extracted and count-aligned. The HTTP audit now covers **7,798 unique URLs**: 7,786 card-list images plus all 12 official Best Selection Vol.6 product-page images. Live HTTP loading and application proxy delivery are not yet verified.
- Preview was not deployed or verified. No Supabase project was modified. The existing Stage 4B-1N investigation records the Testing project as a small smoke dataset (32 products, 2 product-linked sets and no reference-image records); it was not changed.
- The OP-18 language-specific image IDs, separate English/Japanese TR card numbers, Japanese TR name and Japanese SP rarity labels are corrected on the audit branch. EB-05's eight Japanese SP rarity/variant labels are also corrected. CI and live image verification remain pending.
- Full pagination/filter UI regression, language separation in rendered results, duplicate suppression in actual data, and a live Preview audit remain outstanding.

## Handover

Next requested stage: **Stage 4B-1N**. A prior 1N investigation document already exists on this branch; its OP-18 image-ID conclusion is superseded by the erratum appended to that document. Continue from the exact head in the handover message, verify the new language-aware OP-18 code with CI, complete the 7,786-image HTTP audit, and finish the remaining catalogue-to-application printing crosswalk. Preserve PR #37/#38 as open and unmerged; do not merge into main/master, deploy Production, or modify Production Supabase.
