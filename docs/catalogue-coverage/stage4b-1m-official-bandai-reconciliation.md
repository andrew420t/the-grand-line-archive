# Stage 4B-1M — Official Bandai inventory extraction and reconciliation

**Retrieved:** 2026-11-27  
**Working branch:** `audit/official-bandai-inventory-stage4b-1l-2026-11-27`  
**Audit baseline:** `448bc546c30ad1d7c69481dbdf794711810c5560`  
**Machine-readable matrix:** [official-bandai-inventory-stage4b-1l.json](./official-bandai-inventory-stage4b-1l.json)

## Executive result

The 25-set matrix contains 50 independent English/Japanese rows. Official Bandai card-list pages returned usable card-list content for 43 of the 44 pages in the 22 previously outstanding sets. The English EB-04 page returned a filter shell without a result count or card entries and remains **SOURCE UNVERIFIED**. PRB-01 and PRB-02 result totals were captured, but the page text parser did not capture every result entry; their card-number inventories remain **SOURCE UNVERIFIED**.

No row is marked COMPLETE. Matching official base-number counts to the older feed snapshot is not a full printing/image completeness certification.

## 25-set coverage

| Set | EN base | JP base | EN results | JP results | EN printings | JP printings | Status |
|---|---:|---:|---:|---:|---:|---:|---|
| OP-01 | 121 | 121 | 154 | 154 | 154 | 154 | INCOMPLETE |
| OP-02 | 121 | 121 | 154 | 154 | 154 | 154 | INCOMPLETE |
| OP-03 | 123 | 123 | 154 | 154 | 154 | 154 | INCOMPLETE |
| OP-04 | 119 | 119 | 149 | 149 | 149 | 149 | INCOMPLETE |
| OP-05 | 119 | 119 | 154 | 154 | 154 | 154 | INCOMPLETE |
| OP-06 | 119 | 119 | 151 | 150 | 151 | 150 | INCOMPLETE |
| OP-07 | 119 | 119 | 151 | 150 | 151 | 150 | INCOMPLETE |
| OP-08 | 119 | 119 | 151 | 150 | 151 | 150 | INCOMPLETE |
| OP-09 | 119 | 119 | 159 | 158 | 159 | 158 | INCOMPLETE |
| OP-10 | 119 | 119 | 151 | 150 | 151 | 150 | INCOMPLETE |
| OP-11 | 119 | 119 | 156 | 155 | 156 | 155 | INCOMPLETE |
| OP-12 | 119 | 119 | 155 | 154 | 155 | 154 | INCOMPLETE |
| OP-13 | 120 | 120 | 175 | 174 | 175 | 174 | INCOMPLETE |
| OP-14 | 120 | 120 | 199 | 156 | 159 | 156 | INCOMPLETE |
| OP-15 | 119 | 119 | 196 | 152 | 155 | 152 | INCOMPLETE |
| OP-16 | 119 | 119 | 155 | 155 | 155 | 155 | INCOMPLETE |
| OP-17 | 119 | 119 | 169 | 169 | 169 | 169 | INCOMPLETE |
| OP-18 | 119 | 119 | 159 | 159 | 159 | 159 | INCOMPLETE |
| EB-01 | 61 | 61 | 80 | 80 | 80 | 80 | INCOMPLETE |
| EB-02 | 61 | 61 | 105 | 105 | 105 | 105 | INCOMPLETE |
| EB-03 | 62 | 62 | 90 | 90 | 90 | 90 | INCOMPLETE |
| EB-04 | 0 | 61 | — | 85 | 100 | 85 | SOURCE UNVERIFIED |
| EB-05 | 61 | 61 | 96 | 96 | 96 | 96 | INCOMPLETE |
| PRB-01 | — | — | 319 | 319 | 319 | 319 | SOURCE UNVERIFIED |
| PRB-02 | — | — | 316 | 316 | 316 | 316 | SOURCE UNVERIFIED |

OP/EB base counts are distinct card-number entries with the requested set prefix. Reprints with another original card-number prefix do not increase the original set's base count. PRB products are reprint/inclusion products; their original OP/EB/ST card numbers do not establish a PRB base-card count.

## Official sources checked

| Set | Language | Official source | Status |
|---|---|---|---|
| OP-01 | English | SOURCE UNVERIFIED | INCOMPLETE |
| OP-01 | Japanese | SOURCE UNVERIFIED | INCOMPLETE |
| OP-02 | English | SOURCE UNVERIFIED | INCOMPLETE |
| OP-02 | Japanese | SOURCE UNVERIFIED | INCOMPLETE |
| OP-03 | English | SOURCE UNVERIFIED | INCOMPLETE |
| OP-03 | Japanese | SOURCE UNVERIFIED | INCOMPLETE |
| OP-04 | English | SOURCE UNVERIFIED | INCOMPLETE |
| OP-04 | Japanese | SOURCE UNVERIFIED | INCOMPLETE |
| OP-05 | English | SOURCE UNVERIFIED | INCOMPLETE |
| OP-05 | Japanese | SOURCE UNVERIFIED | INCOMPLETE |
| OP-06 | English | [Bandai card list](https://en.onepiece-cardgame.com/cardlist/?series=569106) | INCOMPLETE |
| OP-06 | Japanese | [Bandai card list](https://www.onepiece-cardgame.com/cardlist/?series=550106) | INCOMPLETE |
| OP-07 | English | [Bandai card list](https://en.onepiece-cardgame.com/cardlist/?series=569107) | INCOMPLETE |
| OP-07 | Japanese | [Bandai card list](https://www.onepiece-cardgame.com/cardlist/?series=550107) | INCOMPLETE |
| OP-08 | English | [Bandai card list](https://en.onepiece-cardgame.com/cardlist/?series=569108) | INCOMPLETE |
| OP-08 | Japanese | [Bandai card list](https://www.onepiece-cardgame.com/cardlist/?series=550108) | INCOMPLETE |
| OP-09 | English | [Bandai card list](https://en.onepiece-cardgame.com/cardlist/?series=569109) | INCOMPLETE |
| OP-09 | Japanese | [Bandai card list](https://www.onepiece-cardgame.com/cardlist/?series=550109) | INCOMPLETE |
| OP-10 | English | [Bandai card list](https://en.onepiece-cardgame.com/cardlist/?series=569110) | INCOMPLETE |
| OP-10 | Japanese | [Bandai card list](https://www.onepiece-cardgame.com/cardlist/?series=550110) | INCOMPLETE |
| OP-11 | English | [Bandai card list](https://en.onepiece-cardgame.com/cardlist/?series=569111) | INCOMPLETE |
| OP-11 | Japanese | [Bandai card list](https://www.onepiece-cardgame.com/cardlist/?series=550111) | INCOMPLETE |
| OP-12 | English | [Bandai card list](https://en.onepiece-cardgame.com/cardlist/?series=569112) | INCOMPLETE |
| OP-12 | Japanese | [Bandai card list](https://www.onepiece-cardgame.com/cardlist/?series=550112) | INCOMPLETE |
| OP-13 | English | [Bandai card list](https://en.onepiece-cardgame.com/cardlist/?series=569113) | INCOMPLETE |
| OP-13 | Japanese | [Bandai card list](https://www.onepiece-cardgame.com/cardlist/?series=550113) | INCOMPLETE |
| OP-14 | English | [Bandai card list](https://en.onepiece-cardgame.com/cardlist/?series=569114) | INCOMPLETE |
| OP-14 | Japanese | [Bandai card list](https://www.onepiece-cardgame.com/cardlist/?series=550114) | INCOMPLETE |
| OP-15 | English | [Bandai card list](https://en.onepiece-cardgame.com/cardlist/?series=569115) | INCOMPLETE |
| OP-15 | Japanese | [Bandai card list](https://www.onepiece-cardgame.com/cardlist/?series=550115) | INCOMPLETE |
| OP-16 | English | [Bandai card list](https://en.onepiece-cardgame.com/cardlist/?series=569116) | INCOMPLETE |
| OP-16 | Japanese | [Bandai card list](https://www.onepiece-cardgame.com/cardlist/?series=550116) | INCOMPLETE |
| OP-17 | English | [Bandai card list](https://en.onepiece-cardgame.com/cardlist/?series=569117) | INCOMPLETE |
| OP-17 | Japanese | [Bandai card list](https://www.onepiece-cardgame.com/cardlist/?series=550117) | INCOMPLETE |
| OP-18 | English | [Bandai card list](https://en.onepiece-cardgame.com/cardlist/?series=569118) | INCOMPLETE |
| OP-18 | Japanese | [Bandai card list](https://www.onepiece-cardgame.com/cardlist/?series=550118) | INCOMPLETE |
| EB-01 | English | [Bandai card list](https://en.onepiece-cardgame.com/cardlist/?series=569201) | INCOMPLETE |
| EB-01 | Japanese | [Bandai card list](https://www.onepiece-cardgame.com/cardlist/?series=550201) | INCOMPLETE |
| EB-02 | English | [Bandai card list](https://en.onepiece-cardgame.com/cardlist/?series=569202) | INCOMPLETE |
| EB-02 | Japanese | [Bandai card list](https://www.onepiece-cardgame.com/cardlist/?series=550202) | INCOMPLETE |
| EB-03 | English | [Bandai card list](https://en.onepiece-cardgame.com/cardlist/?series=569203) | INCOMPLETE |
| EB-03 | Japanese | [Bandai card list](https://www.onepiece-cardgame.com/cardlist/?series=550203) | INCOMPLETE |
| EB-04 | English | [Bandai card list](https://en.onepiece-cardgame.com/cardlist/?series=569204) | SOURCE UNVERIFIED |
| EB-04 | Japanese | [Bandai card list](https://www.onepiece-cardgame.com/cardlist/?series=550204) | INCOMPLETE |
| EB-05 | English | [Bandai card list](https://en.onepiece-cardgame.com/cardlist/?series=569205) | INCOMPLETE |
| EB-05 | Japanese | [Bandai card list](https://www.onepiece-cardgame.com/cardlist/?series=550205) | INCOMPLETE |
| PRB-01 | English | [Bandai card list](https://en.onepiece-cardgame.com/cardlist/?series=569301) | INCOMPLETE |
| PRB-01 | Japanese | [Bandai card list](https://www.onepiece-cardgame.com/cardlist/?series=550301) | INCOMPLETE |
| PRB-02 | English | [Bandai card list](https://en.onepiece-cardgame.com/cardlist/?series=569302) | INCOMPLETE |
| PRB-02 | Japanese | [Bandai card list](https://www.onepiece-cardgame.com/cardlist/?series=550302) | INCOMPLETE |

## Card-number coverage and source discrepancies

- For every OP/EB row with a usable official source, the official set-prefixed card-number list matched the observed feed/supplement base-number list: zero missing and zero unexpected base numbers in the recorded comparison.
- OP-18 has 119 base numbers in each language. Its 159 supplemental printing records comprise 119 Base, 33 Parallel, 1 Treasure Rare and 6 SP Card entries. Both official pages returned 159 product results.
- EB-05 has 61 base numbers in each language. Its 96 supplemental printing records comprise 61 Base, 27 Parallel and 8 SP Card entries. Both official pages returned 96 product results.
- OP-15 has 119 OP15-prefixed base numbers in both languages. The English page returned 196 results and the Japanese page 152. Other-prefix reprints and product inclusions are not additional OP-15 base cards. The current structured entry parser captured 156 distinct English product card numbers; Stage 4B-1K recorded 157, so one non-base product number remains unresolved. The 119 OP15-prefixed base inventory is consistent.
- OP-14 English returned 199 results while the release-assigned feed contains 159 distinct printing keys. The official product page includes EB-04-prefixed entries; this is a release-product versus card-number-prefix distinction, not evidence of 40 missing OP-14 base cards.
- PRB-01 and PRB-02 returned 319 and 316 results. The parser missed 14 and 67 page rows respectively. Their complete distinct-card inventories remain SOURCE UNVERIFIED.
- EB-04 English returned no usable result list. The feed has 61 EB04-prefixed numbers and 100 release printing keys, but neither substitutes for the missing official English extraction.

## OP-15 duplicate printing investigation

For OP15-075 and OP15-108 in both languages, the generic **Other Product Card** product link and the named **Premium Card Collection - Best Selection Vol.6** link refer to the same printing key and image URL. They are not two separate printings.

| Language | Card | Printing key |
|---|---|---|
| English | OP15-075 | `prt_w3wxxest6fk2` |
| English | OP15-108 | `prt_66s87yd68r06` |
| Japanese | OP15-075 | `prt_k5qg9snrrrr4` |
| Japanese | OP15-108 | `prt_l7sqc3seymu8` |

Stage 3's `dedupePrintingProducts` keeps the named product when present and suppresses the generic placeholder; it retains the generic link if it is the only product link. Regression coverage is present in the Stage 3 branch's `tests/catalogueImageFilters.test.js`.

## OP-18 and EB-05 supplemental catalogue comparison

The Stage 3 supplemental modules were inspected on PR #38 head `64f1203acc94b9409d6a10941aea00c541899ff4`:

| Comparison | English | Japanese |
|---|---:|---:|
| OP-18 metadata entries matched | 159/159 | 159/159 |
| OP-18 image identifiers matched | 159/159 | 159/159 |
| EB-05 metadata entries matched | 96/96 | 96/96 |
| EB-05 image identifiers matched | 96/96 | 96/96 |

Metadata comparison covered card number, name, rarity and type. OP-18 comparison uses `localizedEn` and `localizedJp` for the language-specific Treasure Rare identity: English OP18-049 Mr.2.Bon.Kurei(Bentham), Japanese OP18-064 キリンガム聖. OP18-084 Base, Parallel and SP CARD rows are distinct printings of the same card number.

These image checks compare official image identifiers, not successful HTTP/browser image loads.

## Feed and printing-count caveats

The comparison feed is from `hotavocado/koala-kollect-data` commit `619965ec198047de519dc6eb098c7a56aed9bd58`, generated 2026-10-22 (36 days before this audit). Its printing totals are observations, not authoritative expected totals. OP-18 and EB-05 are absent from that feed; their printing counts here come from their separately inspected supplemental catalogues. Bandai result rows, release-assigned printing keys and card-number prefix counts remain separate measures.

## Regression coverage inspected

Stage 3 test source includes:
- Exact card-number matching after separator normalization.
- Intersecting set, card-number-set, language, rarity, type, colour, variant and image-status filters.
- English/Japanese and distinct release/variant separation.
- Generic placeholder suppression while preserving named products and separate releases.
- Combined product set assignment by card-number prefix.
- Clearing all Image Library filters.
- OP-18 119 base numbers, 159 printings and localized Treasure Rare identity.
- EB-05 61 base numbers, 96 printings, language-specific image IDs and original card-number set versus release set.

The inspected Image Library code deduplicates overlapping pagination pages by stable gallery entry ID. A dedicated pagination-overlap test was not found in the inspected filter test file.

## Branch and environment safety

The working audit branch remains based on `448bc546c30ad1d7c69481dbdf794711810c5560`. PR #38 head `64f1203acc94b9409d6a10941aea00c541899ff4` is 10 commits ahead of that baseline and contains the supplemental catalogue code inspected above. The audit branch was not advanced or merged into PR #38.

No Production deployment, Production Supabase operation or Preview deployment was performed. Browser image-load verification and a fresh CI run for the audit branch remain outstanding.


## CI, Preview and PR status

- PR #37: **OPEN**, not merged.
- PR #38: **OPEN / DRAFT**, not merged.
- The Cloudflare Preview bot recorded a successful build and deployment for Stage 3 Preview commit `957d5eb` at `2026-11-27T15:48:09Z`: [existing Stage 3 Preview](https://fix-card-reference-images-stage3-2026-11-the-grand-line-archive.andrew420-t27.workers.dev). This is not the current PR #38 head (`64f1203`) or the audit branch head; no new Preview was deployed and no manual browser acceptance is claimed.
- GitHub combined-status and workflow-run lookups returned no checks/runs for audit commit `e67f2ca95134ba48e684584223baac074fc32afa` or Stage 3 PR #38 head `64f1203acc94b9409d6a10941aea00c541899ff4`.
- Local `git clone` / npm test, lint and build could not be run because the execution environment could not resolve `github.com`. These checks are **NOT RUN**, not passed.
- No Production deployment, Production Supabase operation, merge, branch deletion or credential access occurred.
