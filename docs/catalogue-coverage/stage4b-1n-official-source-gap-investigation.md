# Stage 4B-1N — Official source reconciliation and image verification

**Audit date:** 2026-11-27  
**Repository:** `andrew420t/the-grand-line-archive`  
**Working branch:** `audit/official-bandai-inventory-stage4b-1l-2026-11-27`  
**Starting commit:** `6e39eb3a34639127ccfe1c404c5db8d6d429e54a`  
**Stage 3 baseline:** `448bc546c30ad1d7c69481dbdf794711810c5560`  
**Machine-readable matrix:** [official-bandai-inventory-stage4b-1l.json](./official-bandai-inventory-stage4b-1l.json)

## Executive result

All 50 language/set rows now have full entry-level official Bandai extraction, card-number and release-product reconciliation, distinct printing/image identities, and HTTP verification.

- 50/50 source rows fully extracted: result rows = parsed entries = official image URLs.
- 7,867 product-entry references across the 50 matrix rows. The 81 English EB-04 entries are a filtered subset of the OP14-EB04 and OP15-EB04 product pages.
- **7,798 unique official image URLs checked**, including 12 separate Premium Card Collection – Best Selection Vol.6 product images.
- **7,798/7,798 returned HTTP 200 with image content.**
- 7,786 PNG and 12 WebP responses.
- 0 missing, invalid, timeout or unresolved temporary failures.
- 0 redirects and 0 English/Japanese host mismatches.
- All 50 matrix rows have image status LOADED. The matrix remains INCOMPLETE overall because a full application printing-identity comparison cannot be completed from the current Testing Supabase dataset.

<badge color="success">Official image HTTP audit passed</badge> 7,798 loaded · 0 missing · 0 invalid · 0 timeout · 0 unresolved temporary failure

## All 50 language/set results

Counts are **official result rows / parsed entries / image URLs**. Base count refers only to the original OP/EB card-number prefix. PRB product-prefix numbers are shown separately and are not asserted as original base-card counts. HTTP column is **LOADED / total row associations**.

| Set | Language | Base numbers | Distinct product numbers | PRB product-prefix numbers | Results / entries / images | Distinct printings | HTTP loaded / total | Feed-missing base numbers | Overall status |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| OP-01 | English | 121 | 121 | — | 154/154/154 | 154 | 154/154 | 0 | INCOMPLETE |
| OP-01 | Japanese | 121 | 121 | — | 154/154/154 | 154 | 154/154 | 0 | INCOMPLETE |
| OP-02 | English | 121 | 121 | — | 154/154/154 | 154 | 154/154 | 0 | INCOMPLETE |
| OP-02 | Japanese | 121 | 121 | — | 154/154/154 | 154 | 154/154 | 0 | INCOMPLETE |
| OP-03 | English | 123 | 127 | — | 154/154/154 | 154 | 154/154 | 0 | INCOMPLETE |
| OP-03 | Japanese | 123 | 127 | — | 154/154/154 | 154 | 154/154 | 0 | INCOMPLETE |
| OP-04 | English | 119 | 124 | — | 149/149/149 | 149 | 149/149 | 0 | INCOMPLETE |
| OP-04 | Japanese | 119 | 124 | — | 149/149/149 | 149 | 149/149 | 0 | INCOMPLETE |
| OP-05 | English | 119 | 125 | — | 154/154/154 | 154 | 154/154 | 0 | INCOMPLETE |
| OP-05 | Japanese | 119 | 125 | — | 154/154/154 | 154 | 154/154 | 0 | INCOMPLETE |
| OP-06 | English | 119 | 126 | — | 151/151/151 | 151 | 151/151 | 0 | INCOMPLETE |
| OP-06 | Japanese | 119 | 125 | — | 150/150/150 | 150 | 150/150 | 0 | INCOMPLETE |
| OP-07 | English | 119 | 126 | — | 151/151/151 | 151 | 151/151 | 0 | INCOMPLETE |
| OP-07 | Japanese | 119 | 125 | — | 150/150/150 | 150 | 150/150 | 0 | INCOMPLETE |
| OP-08 | English | 119 | 126 | — | 151/151/151 | 151 | 151/151 | 0 | INCOMPLETE |
| OP-08 | Japanese | 119 | 125 | — | 150/150/150 | 150 | 150/150 | 0 | INCOMPLETE |
| OP-09 | English | 119 | 127 | — | 159/159/159 | 159 | 159/159 | 0 | INCOMPLETE |
| OP-09 | Japanese | 119 | 126 | — | 158/158/158 | 158 | 158/158 | 0 | INCOMPLETE |
| OP-10 | English | 119 | 126 | — | 151/151/151 | 151 | 151/151 | 0 | INCOMPLETE |
| OP-10 | Japanese | 119 | 125 | — | 150/150/150 | 150 | 150/150 | 0 | INCOMPLETE |
| OP-11 | English | 119 | 127 | — | 156/156/156 | 156 | 156/156 | 0 | INCOMPLETE |
| OP-11 | Japanese | 119 | 126 | — | 155/155/155 | 155 | 155/155 | 0 | INCOMPLETE |
| OP-12 | English | 119 | 127 | — | 155/155/155 | 155 | 155/155 | 0 | INCOMPLETE |
| OP-12 | Japanese | 119 | 126 | — | 154/154/154 | 154 | 154/154 | 0 | INCOMPLETE |
| OP-13 | English | 120 | 129 | — | 175/175/175 | 175 | 175/175 | 0 | INCOMPLETE |
| OP-13 | Japanese | 120 | 128 | — | 174/174/174 | 174 | 174/174 | 0 | INCOMPLETE |
| OP-14 | English | 120 | 160 | — | 199/199/199 | 199 | 199/199 | 0 | INCOMPLETE |
| OP-14 | Japanese | 120 | 126 | — | 156/156/156 | 156 | 156/156 | 0 | INCOMPLETE |
| OP-15 | English | 119 | 158 | — | 196/196/196 | 196 | 196/196 | 0 | INCOMPLETE |
| OP-15 | Japanese | 119 | 125 | — | 152/152/152 | 152 | 152/152 | 0 | INCOMPLETE |
| OP-16 | English | 119 | 125 | — | 155/155/155 | 155 | 155/155 | 0 | INCOMPLETE |
| OP-16 | Japanese | 119 | 125 | — | 155/155/155 | 155 | 155/155 | 0 | INCOMPLETE |
| OP-17 | English | 119 | 130 | — | 169/169/169 | 169 | 169/169 | 0 | INCOMPLETE |
| OP-17 | Japanese | 119 | 130 | — | 169/169/169 | 169 | 169/169 | 0 | INCOMPLETE |
| OP-18 | English | 119 | 125 | — | 159/159/159 | 159 | 159/159 | 119 | INCOMPLETE |
| OP-18 | Japanese | 119 | 125 | — | 159/159/159 | 159 | 159/159 | 119 | INCOMPLETE |
| EB-01 | English | 61 | 61 | — | 80/80/80 | 80 | 80/80 | 0 | INCOMPLETE |
| EB-01 | Japanese | 61 | 61 | — | 80/80/80 | 80 | 80/80 | 0 | INCOMPLETE |
| EB-02 | English | 61 | 87 | — | 105/105/105 | 105 | 105/105 | 0 | INCOMPLETE |
| EB-02 | Japanese | 61 | 87 | — | 105/105/105 | 105 | 105/105 | 0 | INCOMPLETE |
| EB-03 | English | 62 | 62 | — | 90/90/90 | 90 | 90/90 | 0 | INCOMPLETE |
| EB-03 | Japanese | 62 | 62 | — | 90/90/90 | 90 | 90/90 | 0 | INCOMPLETE |
| EB-04 | English | 61 | 61 | — | 81/81/81 | 81 | 81/81 | 0 | INCOMPLETE |
| EB-04 | Japanese | 61 | 65 | — | 85/85/85 | 85 | 85/85 | 0 | INCOMPLETE |
| EB-05 | English | 61 | 72 | — | 96/96/96 | 96 | 96/96 | 61 | INCOMPLETE |
| EB-05 | Japanese | 61 | 72 | — | 96/96/96 | 96 | 96/96 | 61 | INCOMPLETE |
| PRB-01 | English | 1 | 111 | 1 | 319/319/319 | 319 | 319/319 | 0 | INCOMPLETE |
| PRB-01 | Japanese | 1 | 111 | 1 | 319/319/319 | 319 | 319/319 | 0 | INCOMPLETE |
| PRB-02 | English | 18 | 173 | 18 | 316/316/316 | 316 | 316/316 | 0 | INCOMPLETE |
| PRB-02 | Japanese | 18 | 173 | 18 | 316/316/316 | 316 | 316/316 | 0 | INCOMPLETE |

## EB-04 English — recovered from combined official product pages

The standalone English EB-04 page still returns Bandai's generic card-list display failure. The complete English inventory is recovered from two official combined product pages:

- [OP14-EB04 official page](https://en.onepiece-cardgame.com/cardlist/?series=569114): 40 EB-04 entries, 31 distinct EB04 card numbers, 40 image IDs.
- [OP15-EB04 official page](https://en.onepiece-cardgame.com/cardlist/?series=569115): 41 EB-04 entries, 30 distinct EB04 card numbers, 41 image IDs.
- Combined: **81 entries, 61 distinct card numbers (EB04-001 through EB04-061), 81 distinct printing/image identities**.
- EB04-003 and EB04-039 each have a separate SP CARD printing; both are retained.
- All 81 official image URLs returned HTTP 200 with `image/png`.
- The 81 filtered entries remain part of their OP14/OP15 release-product rows as well as the EB-04 matrix row.

## PRB-01 and PRB-02 — full entry extraction and reprint identity

The complete Stage 4B-1M entry-level inventories supersede the weaker secondary parser. Every result row has an exact card number, rarity, type, name, product/release label, reprint flag and official image URL.

| Product | Language | Result / parsed / images | Distinct product card numbers | PRB product-prefix numbers | Reprint card numbers | Printing identities | HTTP |
|---|---|---:|---:|---:|---:|---:|---|
| PRB-01 | English | 319 / 319 / 319 | 111 | 1 | 110 | 319 | 319/319 LOADED |
| PRB-01 | Japanese | 319 / 319 / 319 | 111 | 1 | 110 | 319 | 319/319 LOADED |
| PRB-02 | English | 316 / 316 / 316 | 173 | 18 | 155 | 316 | 316/316 LOADED |
| PRB-02 | Japanese | 316 / 316 / 316 | 173 | 18 | 155 | 316 | 316/316 LOADED |

The PRB-prefixed numbers are recorded separately as release-product prefix identifiers, not as original base-card counts. The detailed source records now set PRB `distinct_base_card_number_count` to null and keep `product_prefix_card_numbers` separate. Original OP/EB/ST card numbers remain separate as reprints. No PRB base-card count is asserted.

## Secondary parser discrepancies — resolved

The earlier secondary parser omitted entries or image URLs. The fuller entry-level Bandai inventories recover every result row and official image reference. The earlier shortfalls were parser omissions, not missing Bandai cards or broken source images.

| Source | Secondary parser result / entries / URLs | Full extraction result / entries / URLs | Resolution |
|---|---:|---:|---|
| OP-11 EN | 156 / 156 / 154 | 156 / 156 / 156 | 2 URLs omitted by secondary parser |
| OP-11 JP | 155 / 155 / 153 | 155 / 155 / 155 | 2 URLs omitted |
| OP-12 EN | 155 / 155 / 153 | 155 / 155 / 155 | 2 URLs omitted |
| OP-12 JP | 154 / 154 / 152 | 154 / 154 / 154 | 2 URLs omitted |
| OP-14 EN | 199 / 198 / 199 | 199 / 199 / 199 | 1 entry omitted; its image URL was present |
| OP-15 EN | 196 / 194 / 194 | 196 / 196 / 196 | 2 entries and 2 URLs omitted |
| OP-15 JP | 152 / 151 / 151 | 152 / 152 / 152 | 1 entry and URL omitted |
| OP-16 EN | 155 / 155 / 154 | 155 / 155 / 155 | 1 URL omitted |
| OP-16 JP | 155 / 155 / 154 | 155 / 155 / 155 | 1 URL omitted |
| OP-17 EN | 169 / 167 / 164 | 169 / 169 / 169 | 2 entries and 5 URLs omitted |
| OP-17 JP | 169 / 167 / 164 | 169 / 169 / 169 | 2 entries and 5 URLs omitted |
| EB-04 JP | 85 / 83 / 83 | 85 / 85 / 85 | 2 entries and 2 URLs omitted |
| PRB-01 EN/JP | 319 / 305 / 197 | 319 / 319 / 319 | 14 entries and 122 URLs omitted per language |
| PRB-02 EN/JP | 316 / 249 / 109 | 316 / 316 / 316 | 67 entries and 207 URLs omitted per language |

All 50 matrix rows now have zero unparsed official rows and zero source image URL extraction shortfall.

## OP-15 non-base product-number reconciliation

Both languages contain all 119 OP15-prefixed base card numbers. English has 39 reprint card numbers and Japanese has 6 because the English OP15 page combines the OP15-EB04 product assignment while Japanese EB-04 is listed separately.

The 33 English-only reprint card numbers consist of 30 EB04-prefixed numbers plus three additional official non-EB04 printings:

- **OP11-106** — Zeus, SP CARD, image ID `OP11-106_p2`.
- **OP13-037** — Roronoa Zoro, Treasure Rare, image ID `OP13-037_p1`.
- **PRB02-014** — Sabo, SP CARD, image ID `PRB02-014_p2`.

All three carry the official product label `-ADVENTURE ON KAMI'S ISLAND- [OP15-EB04]`. PRB02-014 is a distinct OP15-EB04 printing of the original PRB02-014 card, not an OP15 base card. The matrix preserves original card number and release-product assignment separately.

## OP-18 and EB-05 feed coverage gaps

The official Bandai entries and images are complete. The 22/10/2026 upstream feed snapshot has no base-prefix numbers for OP-18 or EB-05:

- OP-18: **119 missing feed base numbers in English and 119 in Japanese**.
- EB-05: **61 missing feed base numbers in English and 61 in Japanese**.
- No unexpected feed base numbers were found.

These are confirmed upstream feed-coverage gaps, not missing official Bandai cards. The audit branch also preserves the language-specific OP-18 image identities and the exact EB-05 Japanese SP rarity label `SPカード` rather than normalizing it to English `SP CARD`.

## HTTP image verification — final run

The final exact-commit audit ran on:

- Commit: `f13880972eea4ffd4f683f94375dd80b14175734`
- Workflow run: [46043216009](https://github.com/andrew420t/the-grand-line-archive/actions/runs/46043216009)
- Artifact ID: `15220403661`
- Retrieved: `2026-11-27T17:41:41.814Z`
- Artifact retention expires: 2027-02-25

| HTTP classification | Count |
|---|---:|
| LOADED | 7,798 |
| MISSING (404/410) | 0 |
| INVALID_URL | 0 |
| TIMEOUT | 0 |
| TEMPORARY_FAILURE | 0 |

All 7,798 responses were HTTP 200. Content types: 7,786 `image/png`, 12 `image/webp`. No redirects or cross-language host mismatches occurred. Latency: minimum 152 ms, median 306 ms, p95 310 ms, maximum 845 ms.

Two earlier transient 502 responses were recorded and retried successfully:
- OP09-040 English: first run 502; subsequent full audit 200.
- OP08-086 Japanese: first run 502; subsequent full audit 200.

The final run returned 200 for both. No alternate image fallback was required for any official source image. Application-level fallback remains unverified because the Testing catalogue has no reference-image URLs.

The complete per-URL status, content type, final URL and latency records are retained in the workflow artifact linked above. The matrix stores the per-row HTTP totals and artifact reference.

## Application printing identity comparison — Testing data blocker

A read-only query was made against the permitted Testing Supabase project `ehzqsnfkmwphyllhaqhe` (`Grand Line Archive Testing`):

- 32 products.
- 25 sets defined, but only 2 sets linked to products.
- 2 languages represented.
- 0 products with `catalogue_printing_key`.
- 0 products with `catalogue_match_id`.
- 0 products with `catalogue_reference_image_url`.

This is a small smoke dataset, not a complete application catalogue. Full application-to-Bandai printing reconciliation, including Premium Card Collection and PRB printing identity matches, cannot honestly be claimed from it. Each matrix row records this limitation. Production Supabase was not accessed or modified.

## Regression tests and verification

The final exact-commit GitHub Actions run completed successfully:

- **293 / 293 automated tests passed.**
- `npm run lint`: passed.
- `npm run build`: passed.
- Official image HTTP audit: passed, 7,798 / 7,798 loaded.
- Workflow run: [46043216009](https://github.com/andrew420t/the-grand-line-archive/actions/runs/46043216009).

The build emitted only the existing non-blocking Vite chunk-size warning.

Regression coverage includes:
- Image Library filter intersection and clearing.
- Pagination overlap and duplicate suppression.
- Release set versus original card-number set.
- English/Japanese separation and same-language image fallback.
- OP-15 generic placeholder versus named Premium Card Collection product handling.
- OP-18 language-specific image IDs and Japanese SP rarity.
- EB-05 Japanese SP rarity `SPカード`.
- PRB product-prefix separation and full reprint identity extraction.
- HTTP image response classification and source-host validation.

## PR, Preview and safety status

- PR #37: OPEN, not merged.
- PR #38: OPEN / DRAFT, not merged.
- No PR merge and no merge into main/master.
- No branch or commit deletion.
- No Production deployment.
- No Production Supabase access or modification.
- No Preview deployment or refresh. The existing Stage 3 Preview branch was not changed.
- Scanner, Image Library, filters and OP-15 duplicate corrections remain preserved.
- No credentials were read, copied or exposed.

## Remaining blockers

1. Obtain a complete, safe, non-production application catalogue snapshot to compare actual application printing identities against all 50 official rows.
2. Reconcile Premium Card Collection and PRB product identities against that complete application dataset.
3. Resolve the 119-per-language OP-18 and 61-per-language EB-05 upstream feed gaps without modifying Production.
4. Preserve the three flagged Stage 3 English OP-18 supplemental identity differences until the complete application comparison confirms their final disposition.

Official source extraction and HTTP image verification are complete. The matrix remains **50 INCOMPLETE** until application identity reconciliation passes.

## Exact next prompt — Stage 4B-1O

```text
The Grand Line Archive — Stage 4B-1O: Complete Application Printing Identity Reconciliation and Resolve Remaining Feed Coverage Gaps

Continue directly from Stage 4B-1N.

Repository: andrew420t/the-grand-line-archive
Working branch: audit/official-bandai-inventory-stage4b-1l-2026-11-27
Starting commit: current HEAD of the named audit branch (verify the exact SHA before edits)
Stage 3 baseline: 448bc546c30ad1d7c69481dbdf794711810c5560

Stage 4B-1N completed:
- All 50 official Bandai language/set rows have full entry-level extraction.
- All 7,798 unique official image URLs returned HTTP 200.
- 293/293 tests passed; lint and production build passed.
- Full per-URL HTTP results are in workflow artifact 15220403661 from run 46043216009.
- PRB-01/PRB-02 entries and reprints are fully extracted; PRB prefix IDs are separate from original base-card counts.
- OP-18 and EB-05 official source entries/images are complete.
- The Testing Supabase project has only 32 products, 2 product-linked sets and no catalogue printing keys, match IDs or reference image URLs.

Absolute restrictions:
- Never merge PR #37 or PR #38.
- Never merge into main/master.
- Never deploy Production.
- Never modify Production Supabase.
- Never delete existing branches or commits.
- Keep PR #37 and PR #38 open.
- Preserve scanner, Image Library, filters and OP-15 duplicate corrections.
- Never expose credentials.
- Never invent card numbers, printing identities or image references.
- Use read-only access to Testing Supabase unless an explicit safe test-data operation is requested.

1. Complete application printing identity reconciliation using a complete safe non-production application catalogue snapshot. Do not claim completion from the current 32-product Testing dataset. If no suitable test dataset exists, report the exact data requirement and keep affected rows INCOMPLETE.

2. Reconcile all 50 rows against application printing identities, including base, parallel, SP, Treasure Rare, Premium Card Collection, PRB reprints, alternate art and language-specific image IDs. Keep original card-number set separate from release-product assignment. Preserve genuine separate printings and suppress only proven duplicate placeholders.

3. Resolve the 119 English and 119 Japanese OP-18 base-card feed gaps, plus the 61 English and 61 Japanese EB-05 feed gaps, on the audit branch only. Do not alter Production data.

4. Reconcile the three flagged Stage 3 English OP-18 supplemental image identity differences against the complete application catalogue. Preserve the corrected language-specific OP-18 names, card numbers and image IDs. Preserve the exact Japanese EB-05 SP rarity label SPカード.

5. Preserve the final Stage 4B-1N HTTP audit results. Re-run the image audit only if official URLs or source entries change. If re-run is needed, use the audit workflow's [run-image-audit] commit-message opt-in and record the new artifact.

6. Add regression tests for confirmed application mismatches, pagination overlap, all combined Image Library filters, clearing all filters, release set versus original card-number set, OP-15 duplicate placeholders, PRB/Premium Card Collection reprints and English/Japanese separation.

7. Run npm test, npm run lint and npm run build on the audit branch. Check GitHub Actions for the exact final commit.

8. If Preview is necessary, use only the existing Stage 3 Preview branch and Testing Supabase project ehzqsnfkmwphyllhaqhe. Never deploy Production.

9. Update the matrix and Stage 4B-1O handover with exact branch/commit, all 50 application comparisons, remaining feed gaps, duplicate corrections, tests, CI, Preview status and blockers.

Continue working on the repository. Do not stop at a plan. Never merge or deploy Production.
```
