# Catalogue coverage audit — Stage 4B-1J

## Source snapshot

- Repository: `hotavocado/koala-kollect-data`
- Commit: `619965ec198047de519dc6eb098c7a56aed9bd58`
- Manifest generated: `2026-10-22T04:46:19Z`
- Source snapshot age at audit: 36 days on 2026-11-27
- Languages inspected: English (`en`) and Japanese (`jp`)
- Data relationships inspected: `cards.jsonl`, `printings/{en,jp}.jsonl`, `printing_products/{en,jp}.jsonl`, `products/{en,jp}.jsonl`, and `product_sets.jsonl`

The CSV is a feed-observed inventory, not an authoritative expected checklist. Expected official counts and missing official card/printing lists remain blank until independently checked against the relevant Bandai card lists. All 50 rows are therefore `SOURCE UNVERIFIED`. A zero feed count means this source snapshot does not provide records for that set; it does not prove the set has no cards.

`feed_observed_card_number_prefix_count` counts distinct card numbers in the language's printing feed whose number prefix matches the set. It is not the official expected count. `feed_observed_release_printings` counts distinct printing keys assigned to the release set using product-to-set relationships and card-number prefixes. `feed_printings_without_image_url` only checks the source printing row's image URL field; it is not an HTTP image-load audit.

## OP-15 duplicate investigation

The English and Japanese source records show the same pattern for OP15-075 and OP15-108:

- Each has one base printing linked to the OP-15 booster product.
- Each has one parallel printing linked to a named Premium Card Collection - Best Selection Vol.6 product.
- Each parallel printing is also linked to a generic “Other Product Card” placeholder product.
- The generic and named product links share the same printing key and image URL. They are not two different parallel printings.

English source printing keys:
- OP15-075 base: `prt_rbj4de58fj1x`
- OP15-075 parallel: `prt_w3wxxest6fk2`
- OP15-108 base: `prt_zwys920v8e5w`
- OP15-108 parallel: `prt_66s87yd68r06`

Japanese source printing keys:
- OP15-075 base: `prt_f03q7rkttdwd`
- OP15-075 parallel: `prt_k5qg9snrrrr4`
- OP15-108 base: `prt_n9lgpe49tg4v`
- OP15-108 parallel: `prt_l7sqc3seymu8`

The duplicate gallery rows were created because the gallery retained both product keys and used the card-number prefix as a fallback release set when the linked product had no set code. The fix suppresses the generic placeholder only when a concrete named product is also linked, and assigns the parallel to the named Premium Card Collection product rather than the original OP-15 set. A sole generic product link is retained so a printing is not lost.

## Combined OP-15 / EB-04 product relationship

The source `product_sets.jsonl` maps English product `en:569115` to both `OP-15` and `EB-04`. The gallery now uses the card-number prefix to assign a card from that combined product to its matching set, rather than making every linked card appear in both release-set filters.

## Current feed observations

- OP-15 English: 119 distinct OP15-prefixed card numbers; 155 distinct feed printings assigned to OP-15.
- OP-15 Japanese: 119 distinct OP15-prefixed card numbers; 152 distinct feed printings assigned to OP-15.
- OP-18 and EB-05 have no records in this upstream snapshot for either language. OP-18 is supplemented separately in the application from a Bandai list; EB-05 still requires an independent official inventory.

These values are source observations only. They are not official completeness claims and do not replace the remaining 25-set Bandai checklist and live image verification.


## Official Bandai card-list cross-check — Stage 4B-1K

Official Bandai card-list pages were retrieved independently for English and Japanese on 2026-11-27. The following are **card-number prefix observations from the official pages**, not a claim that every printing has been independently reconciled to the app's image catalogue.

| Set | Language | Bandai page result count | Distinct card numbers on page | Numbers belonging to this set prefix |
|---|---|---:|---:|---:|
| OP-15 | English | 196 | 157 | 119 |
| OP-15 | Japanese | Not exposed in extracted page text | 124 | 119 |
| OP-18 | English | 159 | 125 | 119 |
| OP-18 | Japanese | Not exposed in extracted page text | 125 | 119 |
| EB-05 | English | 96 | 72 | 61 |
| EB-05 | Japanese | Not exposed in extracted page text | 72 | 61 |

Official source URLs:
- OP-15 English: https://en.onepiece-cardgame.com/cardlist/?series=569115
- OP-15 Japanese: https://www.onepiece-cardgame.com/cardlist/?series=550115
- OP-18 English: https://en.onepiece-cardgame.com/cardlist/?series=569118
- OP-18 Japanese: https://www.onepiece-cardgame.com/cardlist/?series=550118
- EB-05 English: https://en.onepiece-cardgame.com/cardlist/?series=569205
- EB-05 Japanese: https://www.onepiece-cardgame.com/cardlist/?series=550205

The page result totals include cards with other card-number prefixes that are associated with the selected product, including reprints and special inclusions. Therefore, the result total is not the base-card count. For OP-15 the official pages show 119 OP15-prefixed card numbers in each language; the page also includes EB04 and reprint numbers. OP-18 shows 119 OP18-prefixed numbers and 40 additional records/numbers from other products or reprints in the result set. EB-05 shows 61 EB05-prefixed numbers and 35 other card-number records in its product result set.

The extracted Japanese pages did not expose the same visible “N Results” label, so those page-result counts are deliberately left unreported rather than inferred from the English page. The distinct-number observations were extracted from the page card entries.

### Limits and next reconciliation steps

- These pages establish the official card-number prefix inventory for OP-15 (119), OP-18 (119) and EB-05 (61) in both languages.
- They do not, by themselves, enumerate a canonical image/printing identifier for every parallel or prove that every image URL loads.
- OP-18's 159-row supplemental app catalogue is not equivalent to the Bandai page's 159 result cards: the Bandai page contains 119 OP18-prefixed card numbers plus entries with other prefixes. Reconcile by card number, rarity, variant and official product information, not by row totals.
- EB-05's official page includes 61 EB05-prefixed card numbers plus reprint/inclusion entries. The 61 is the base-prefix inventory, not the total printing inventory.
- The other 22 set/language combinations have not yet been independently enumerated in this stage. They remain `SOURCE UNVERIFIED` in the audit matrix.
- No catalogue entries were added from these page counts alone. No artwork was copied, substituted or re-hosted.


## Stage 4B-1K — Official Bandai inventory findings (2026-11-27)

Official English and Japanese Bandai card-list pages were fetched for all 25 requested set codes. The exact page URLs, page result rows, unique card-number counts, card-type counts, Koala feed comparison and current status are in `25-set-official-bandai-inventory-2026-11-27.csv`.

### Numbered card inventory

The official page extraction found these distinct set-prefixed card-number counts:

- OP-01: 121; OP-02: 121; OP-03: 123.
- OP-04 through OP-12: 119 each.
- OP-13: 120; OP-14: 120; OP-15: 119; OP-16: 119; OP-17: 119; OP-18: 119.
- EB-01: 61; EB-02: 61; EB-03: 62; EB-04: 61; EB-05: 61.
- PRB-01 and PRB-02 reuse original card numbers rather than having a PRB-only base-number namespace. Their official pages list 107 and 158 distinct original card numbers respectively.

These counts are card-number identifiers observed on the official Bandai pages, not printing counts. Product page result rows and unique artwork IDs are recorded separately. The OP-14 and OP-15 English pages are combined OP-14/EB-04 and OP-15/EB-04 pages; EB-04 English card numbers were extracted across both pages.

### Feed reconciliation

The 2026-10-22 Koala Kollect snapshot has matching set-prefixed card-number counts for OP-01 through OP-17 and EB-01 through EB-03 in both languages. This is a number-level comparison only; it does not certify all parallels, reprints, release-product assignments or live images.

The feed has no OP-18 or EB-05 card-number records in either language:
- OP-18: 119 official numbered cards missing from the feed per language. The application has a 159-printing official Bandai supplement for both languages.
- EB-05: 61 official numbered cards missing from the feed per language. A new official Bandai supplement now contains 96 product printings per language: 61 base, 27 parallel and 8 SP CARD. Eleven additional original card numbers occur as reprints. The English and Japanese image IDs are stored separately; five image IDs differ by language.

These supplements are marked pending live image verification. They do not justify marking the sets COMPLETE yet.

### OP-18 localized official list discrepancy

The official English and Japanese Bandai pages do not present the same TR card identity:
- English: OP18-049, Mr.2.Bon.Kurei(Bentham), TR, image `OP18-049_p1`.
- Japanese: OP18-064, キリンガム聖, TR, image `OP18-064_p1`.

The English and Japanese OP18-049 / OP18-064 card entries therefore remain language-specific rather than being forced into one shared card number. The English/Japanese SP image identifiers also differ for OP13-012 (`_p1` vs `_p2`) and OP17-040 (`_p2` vs `_p1`). The application now carries localized identifiers and localized TR metadata.

### EB-04 and PRB follow-up

EB-04 remains SOURCE UNVERIFIED for release-product printing reconciliation:
- English: 61 EB04-prefixed card numbers and 81 EB04-prefixed artwork IDs counted across the combined OP-14/EB-04 and OP-15/EB-04 pages. The feed assigns 100 printings to EB-04; source links include many non-EB04 card numbers and require exact product/printing review.
- Japanese: the official EB-04 page has 85 result rows and 85 artwork IDs, including 61 EB04-prefixed card numbers and four other reprint card numbers. The feed reports 85 release-linked printing keys.

PRB-01 and PRB-02 official page result totals (319 and 316) match the feed's release-linked printing-key totals. The original card numbers are reused, so a prefix-only comparison is invalid. Exact printing/image identity matching is still pending.

### Status policy

All sets other than the feed-gap cases remain SOURCE UNVERIFIED until every expected printing identity and image has been reconciled. OP-18 and EB-05 remain INCOMPLETE relative to the stale upstream feed even though the application supplements now provide their official Bandai printings. No set is declared COMPLETE in this stage.
