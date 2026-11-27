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
