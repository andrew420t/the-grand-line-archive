# Stage 4B-1N — Official source gaps and printing/image verification

**Audit date:** 2026-11-27  
**Repository:** `andrew420t/the-grand-line-archive`  
**Working branch:** `audit/official-bandai-inventory-stage4b-1l-2026-11-27`  
**Starting commit:** `6e39eb3a34639127ccfe1c404c5db8d6d429e54a`  
**Stage 3 baseline:** `448bc546c30ad1d7c69481dbdf794711810c5560`  
**Machine-readable matrix:** [official-bandai-inventory-stage4b-1l.json](./official-bandai-inventory-stage4b-1l.json)

## Executive result

The full entry-level Bandai inventory now covers **all 50 language/set rows**. Each row has a source result count, parsed entry count, official image URL count and distinct image identity count. The detailed source records preserve card number, rarity, type, name, product/release label, reprint flag, exact image URL and entry-to-image alignment.

- Full official product entries: **7,867** across the 50 matrix rows.
- Unique official image URLs: **7,786**. The 81 English EB-04 entries are a filtered subset of OP14-EB04 and OP15-EB04 product pages and are not double-counted as new URLs.
- All 50 rows: result count = parsed entries = image URL count; zero unparsed official rows; zero source image omissions in the detailed extraction; zero URL extraction shortfall.
- Official printing IDs are unique within each language/set row and match the recorded printing count.
- No row is marked COMPLETE because live HTTP image responses and full application printing-identity reconciliation have not yet passed.

<badge color="warning">50 INCOMPLETE</badge> 0 COMPLETE · 0 IMAGE MISSING · 0 DUPLICATE · 0 SOURCE UNVERIFIED

## All 50 language/set results

Counts are **official result rows / parsed entries / official image URLs**. Base count refers only to the original OP/EB card-number prefix. PRB prefix counts are shown separately and are not represented as original base-card counts.

| Set | Language | Base numbers | Distinct product numbers | PRB product-prefix numbers | Results / entries / images | Distinct printings | Feed-missing base numbers | Status |
|---|---|---:|---:|---:|---:|---:|---:|---|
| OP-01 | English | 121 | 121 | — | 154/154/154 | 154 | 0 | INCOMPLETE |
| OP-01 | Japanese | 121 | 121 | — | 154/154/154 | 154 | 0 | INCOMPLETE |
| OP-02 | English | 121 | 121 | — | 154/154/154 | 154 | 0 | INCOMPLETE |
| OP-02 | Japanese | 121 | 121 | — | 154/154/154 | 154 | 0 | INCOMPLETE |
| OP-03 | English | 123 | 127 | — | 154/154/154 | 154 | 0 | INCOMPLETE |
| OP-03 | Japanese | 123 | 127 | — | 154/154/154 | 154 | 0 | INCOMPLETE |
| OP-04 | English | 119 | 124 | — | 149/149/149 | 149 | 0 | INCOMPLETE |
| OP-04 | Japanese | 119 | 124 | — | 149/149/149 | 149 | 0 | INCOMPLETE |
| OP-05 | English | 119 | 125 | — | 154/154/154 | 154 | 0 | INCOMPLETE |
| OP-05 | Japanese | 119 | 125 | — | 154/154/154 | 154 | 0 | INCOMPLETE |
| OP-06 | English | 119 | 126 | — | 151/151/151 | 151 | 0 | INCOMPLETE |
| OP-06 | Japanese | 119 | 125 | — | 150/150/150 | 150 | 0 | INCOMPLETE |
| OP-07 | English | 119 | 126 | — | 151/151/151 | 151 | 0 | INCOMPLETE |
| OP-07 | Japanese | 119 | 125 | — | 150/150/150 | 150 | 0 | INCOMPLETE |
| OP-08 | English | 119 | 126 | — | 151/151/151 | 151 | 0 | INCOMPLETE |
| OP-08 | Japanese | 119 | 125 | — | 150/150/150 | 150 | 0 | INCOMPLETE |
| OP-09 | English | 119 | 127 | — | 159/159/159 | 159 | 0 | INCOMPLETE |
| OP-09 | Japanese | 119 | 126 | — | 158/158/158 | 158 | 0 | INCOMPLETE |
| OP-10 | English | 119 | 126 | — | 151/151/151 | 151 | 0 | INCOMPLETE |
| OP-10 | Japanese | 119 | 125 | — | 150/150/150 | 150 | 0 | INCOMPLETE |
| OP-11 | English | 119 | 127 | — | 156/156/156 | 156 | 0 | INCOMPLETE |
| OP-11 | Japanese | 119 | 126 | — | 155/155/155 | 155 | 0 | INCOMPLETE |
| OP-12 | English | 119 | 127 | — | 155/155/155 | 155 | 0 | INCOMPLETE |
| OP-12 | Japanese | 119 | 126 | — | 154/154/154 | 154 | 0 | INCOMPLETE |
| OP-13 | English | 120 | 129 | — | 175/175/175 | 175 | 0 | INCOMPLETE |
| OP-13 | Japanese | 120 | 128 | — | 174/174/174 | 174 | 0 | INCOMPLETE |
| OP-14 | English | 120 | 160 | — | 199/199/199 | 199 | 0 | INCOMPLETE |
| OP-14 | Japanese | 120 | 126 | — | 156/156/156 | 156 | 0 | INCOMPLETE |
| OP-15 | English | 119 | 158 | — | 196/196/196 | 196 | 0 | INCOMPLETE |
| OP-15 | Japanese | 119 | 125 | — | 152/152/152 | 152 | 0 | INCOMPLETE |
| OP-16 | English | 119 | 125 | — | 155/155/155 | 155 | 0 | INCOMPLETE |
| OP-16 | Japanese | 119 | 125 | — | 155/155/155 | 155 | 0 | INCOMPLETE |
| OP-17 | English | 119 | 130 | — | 169/169/169 | 169 | 0 | INCOMPLETE |
| OP-17 | Japanese | 119 | 130 | — | 169/169/169 | 169 | 0 | INCOMPLETE |
| OP-18 | English | 119 | 125 | — | 159/159/159 | 159 | 119 | INCOMPLETE |
| OP-18 | Japanese | 119 | 125 | — | 159/159/159 | 159 | 119 | INCOMPLETE |
| EB-01 | English | 61 | 61 | — | 80/80/80 | 80 | 0 | INCOMPLETE |
| EB-01 | Japanese | 61 | 61 | — | 80/80/80 | 80 | 0 | INCOMPLETE |
| EB-02 | English | 61 | 87 | — | 105/105/105 | 105 | 0 | INCOMPLETE |
| EB-02 | Japanese | 61 | 87 | — | 105/105/105 | 105 | 0 | INCOMPLETE |
| EB-03 | English | 62 | 62 | — | 90/90/90 | 90 | 0 | INCOMPLETE |
| EB-03 | Japanese | 62 | 62 | — | 90/90/90 | 90 | 0 | INCOMPLETE |
| EB-04 | English | 61 | 61 | — | 81/81/81 | 81 | 0 | INCOMPLETE |
| EB-04 | Japanese | 61 | 65 | — | 85/85/85 | 85 | 0 | INCOMPLETE |
| EB-05 | English | 61 | 72 | — | 96/96/96 | 96 | 61 | INCOMPLETE |
| EB-05 | Japanese | 61 | 72 | — | 96/96/96 | 96 | 61 | INCOMPLETE |
| PRB-01 | English | — | 111 | 1 | 319/319/319 | 319 | — | INCOMPLETE |
| PRB-01 | Japanese | — | 111 | 1 | 319/319/319 | 319 | — | INCOMPLETE |
| PRB-02 | English | — | 173 | 18 | 316/316/316 | 316 | — | INCOMPLETE |
| PRB-02 | Japanese | — | 173 | 18 | 316/316/316 | 316 | — | INCOMPLETE |

## EB-04 English — standalone page resolved through combined products

The standalone English EB-04 page still returns Bandai's generic card-list display failure. Its inventory is fully recovered from the official combined product pages:

- [OP14-EB04 official page](https://en.onepiece-cardgame.com/cardlist/?series=569114): 40 EB-04 entries, 31 distinct EB04 card numbers, 40 image IDs.
- [OP15-EB04 official page](https://en.onepiece-cardgame.com/cardlist/?series=569115): 41 EB-04 entries, 30 distinct EB04 card numbers, 41 image IDs.
- Combined: **81 entries, 61 distinct card numbers (EB04-001 through EB04-061), 81 unique printing/image identities**.
- EB04-003 and EB04-039 each have a separate SP CARD printing; those are preserved as separate identities.
- The EB-04 English matrix row records the two source URLs and the combined product-page result counts (199 and 196). The 81 filtered EB-04 entries remain part of the OP14/OP15 release-product rows as well.

## PRB-01 and PRB-02 — complete entry extraction

The more complete Stage 4B-1M entry-level inventories supersede the weaker secondary parser. Every result row has an exact card number, rarity, type, name, release-product label, reprint flag and official image URL.

| Product | Language | Result / parsed / images | Distinct product card numbers | PRB-prefixed product numbers | Reprint card numbers | Printing identities |
|---|---|---:|---:|---:|---:|---:|
| PRB-01 | English | 319 / 319 / 319 | 111 | 1 | 110 | 319 |
| PRB-01 | Japanese | 319 / 319 / 319 | 111 | 1 | 110 | 319 |
| PRB-02 | English | 316 / 316 / 316 | 173 | 18 | 155 | 316 |
| PRB-02 | Japanese | 316 / 316 / 316 | 173 | 18 | 155 | 316 |

The 1 and 18 PRB-prefixed values are recorded as **release-product prefix numbers**, not asserted as original base-card counts. The original OP/EB/ST card numbers remain separately recorded as reprints. No PRB base-card count is invented.

### Secondary parser shortfalls — resolved

The earlier secondary parser reported the following incomplete results. The full entry-level inventories recover all of these rows and image URLs:

| Source | Secondary parser | Full entry-level extraction | Finding |
|---|---:|---:|---|
| OP-11 EN | 156 / 156 / 154 | 156 / 156 / 156 | 2 image URLs omitted by secondary parser |
| OP-11 JP | 155 / 155 / 153 | 155 / 155 / 155 | 2 omitted |
| OP-12 EN | 155 / 155 / 153 | 155 / 155 / 155 | 2 omitted |
| OP-12 JP | 154 / 154 / 152 | 154 / 154 / 154 | 2 omitted |
| OP-14 EN | 199 / 198 / 199 | 199 / 199 / 199 | 1 entry omitted by secondary parser; image URL existed |
| OP-15 EN | 196 / 194 / 194 | 196 / 196 / 196 | 2 entries and 2 image URLs omitted by secondary parser |
| OP-15 JP | 152 / 151 / 151 | 152 / 152 / 152 | 1 entry and image URL omitted |
| OP-16 EN | 155 / 155 / 154 | 155 / 155 / 155 | 1 image URL omitted |
| OP-16 JP | 155 / 155 / 154 | 155 / 155 / 155 | 1 image URL omitted |
| OP-17 EN | 169 / 167 / 164 | 169 / 169 / 169 | 2 entries and 5 image URLs omitted |
| OP-17 JP | 169 / 167 / 164 | 169 / 169 / 169 | 2 entries and 5 image URLs omitted |
| EB-04 JP | 85 / 83 / 83 | 85 / 85 / 85 | 2 entries and 2 image URLs omitted |
| PRB-01 EN/JP | 319 / 305 / 197 | 319 / 319 / 319 | 14 entries and 122 image URLs omitted per language |
| PRB-02 EN/JP | 316 / 249 / 109 | 316 / 316 / 316 | 67 entries and 207 image URLs omitted per language |

These are confirmed secondary-parser omissions, **not missing Bandai card entries or missing source images**. The complete entry-level extraction reports `ENTRY_ORDER_MATCH` and zero missing source-image entries for these rows.

## OP-15 non-base product-number reconciliation

Both languages contain all 119 OP15-prefixed base card numbers. English has 39 reprint card numbers and Japanese has 6 because the English OP15 page combines the OP15-EB04 product assignment while Japanese EB-04 is listed separately.

The 33 English-only reprint card numbers consist of 30 EB04-prefixed numbers plus three additional official non-EB04 printings:

- **OP11-106** — Zeus, SP CARD, image ID `OP11-106_p2`.
- **OP13-037** — Roronoa Zoro, Treasure Rare, image ID `OP13-037_p1`.
- **PRB02-014** — Sabo, SP CARD, image ID `PRB02-014_p2`.

All three entries carry the official product label `-ADVENTURE ON KAMI'S ISLAND- [OP15-EB04]`. PRB02-014 is a distinct OP15-EB04 printing of the original PRB02-014 card, not an OP15 base card. The matrix preserves the original card number and release-product assignment separately.

## Feed comparison: OP-18 and EB-05

The official Bandai entries are complete, but the 22/10/2026 upstream feed snapshot contains no base-prefix numbers for OP-18 or EB-05:

- OP-18: **119 missing feed base numbers in English and 119 in Japanese**.
- EB-05: **61 missing feed base numbers in English and 61 in Japanese**.
- No unexpected feed base numbers were found in the comparison.

These are confirmed feed-coverage gaps, not missing official Bandai cards. The official card numbers, product numbers, reprints and image references remain in the matrix.

## Image verification implementation and current status

Added:

- `scripts/auditOfficialBandaiImages.mjs`
- `tests/officialImageHttpAudit.test.js`
- Audit-only step and JSON artifact upload in `.github/workflows/verify.yml`

The script reads all five full entry-level inventory files plus the English EB-04 subset from OP14/OP15. It checks **7,786 unique official image URLs** using GET requests and records status code, content type, final URL, latency, error and source-language associations.

Classifications: LOADED, MISSING (404/410), INVALID_URL, TIMEOUT and TEMPORARY_FAILURE. English URLs must remain on `en.onepiece-cardgame.com`; Japanese URLs must remain on `www.onepiece-cardgame.com`. No cross-language fallback is allowed.

**No HTTP audit has run yet.** The 7,786 URLs are source references, not verified successful loads. Therefore no image is classified IMAGE MISSING or LOADED based solely on the extraction data.

## Application printing identity comparison — blocked by Testing data

A read-only check was made against the explicitly permitted Testing Supabase project `ehzqsnfkmwphyllhaqhe` (`Grand Line Archive Testing`). It is ACTIVE_HEALTHY, but its application dataset is only a smoke dataset:

- 32 products.
- 25 sets defined, but only 2 sets linked to products.
- 2 languages represented.
- 0 products with `catalogue_printing_key`.
- 0 products with `catalogue_match_id`.
- 0 products with `catalogue_reference_image_url`.

This dataset cannot support a full application-to-Bandai printing reconciliation. Each matrix row records this limitation. No Production Supabase project was accessed or modified.

## Regression coverage

The working tree retains existing coverage for:

- Image Library filter intersection and clearing.
- Pagination overlap and duplicate suppression.
- Release set versus original card-number set.
- English/Japanese separation and same-language image fallback.
- OP-15 generic placeholder versus named Premium Card Collection product handling.
- OP-18 and EB-05 official catalogue corrections.

Added HTTP audit unit tests for English/Japanese host restrictions, aliases, loaded image responses, missing responses, malformed/wrong-host/non-image URLs and temporary failures.

Test files present:
- `tests/catalogueImageFilters.test.js`
- `tests/storagePagination.test.js`
- `tests/officialImageOnlyFallback.test.js`
- `tests/catalogueImageCorrections.test.js`
- `tests/eb05OfficialCatalogue.test.js`
- `tests/op18OfficialCatalogue.test.js`
- `tests/officialImageHttpAudit.test.js`

**Execution status:** `npm test`, `npm run lint` and `npm run build` have not run in a local checkout. GitHub Actions has no run or combined status associated with the latest audit commit. CI is NOT RUN / UNVERIFIED, not passed.

## Safety, PR and Preview status

- PR #37: OPEN, not merged.
- PR #38: OPEN / DRAFT, not merged.
- No PR merge, no main/master merge, no branch or commit deletion.
- No Production deployment.
- No Production Supabase access or modification.
- No Preview deployment or refresh in this stage. The existing Stage 3 Preview branch was not changed.
- No credentials were read, copied or exposed.
- Scanner, Image Library, filters and OP-15 duplicate corrections were not changed.

## Remaining blockers

1. Execute the 7,786-URL HTTP audit and record actual results for every unique official image reference.
2. Obtain a complete, read-only application catalogue dataset in the permitted Testing environment (or another explicitly approved non-production snapshot) to compare all official printing identities, including Premium Card Collection and PRB variants. The current 32-product Testing dataset is insufficient.
3. Run tests, lint and build, then obtain GitHub Actions status for the exact final commit.
4. Only then promote rows to COMPLETE. No row is COMPLETE at this stage.

## Exact next prompt — Stage 4B-1O

```text
The Grand Line Archive — Stage 4B-1O: Execute Full Official Image HTTP Audit and Complete Application Printing Identity Reconciliation

Continue directly from Stage 4B-1N.

Repository: andrew420t/the-grand-line-archive
Working branch: audit/official-bandai-inventory-stage4b-1l-2026-11-27
Starting commit: current HEAD of the named audit branch (verify the exact SHA before edits)
Stage 3 baseline: 448bc546c30ad1d7c69481dbdf794711810c5560

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
- Use only read-only access to the permitted Testing Supabase project unless an explicit safe test-data operation is requested.

1. Run scripts/auditOfficialBandaiImages.mjs against all 7,786 unique official Bandai image URLs. Capture actual HTTP status, content type, final URL, latency and classification for every URL. Distinguish LOADED, MISSING, INVALID_URL, TIMEOUT and TEMPORARY_FAILURE. Retry only temporary failures with a documented retry policy. Preserve English/Japanese host restrictions and prohibit cross-language fallback.

2. Update docs/catalogue-coverage/official-bandai-inventory-stage4b-1l.json with the actual HTTP results for all 50 language/set rows. Do not mark extraction shortfalls as missing images. Preserve all 7,867 official product-entry records, release-product assignments, printing IDs and separate variants.

3. Complete application printing identity reconciliation. The Testing project ehzqsnfkmwphyllhaqhe currently has only 32 products, 2 product-linked sets, and zero catalogue printing keys, match IDs or reference image URLs. Do not claim full reconciliation from that dataset. Determine whether a complete safe test-only catalogue snapshot is available; do not query or modify Production.

4. Reconcile Premium Card Collection, PRB reprints, SP cards, Treasure Rare, parallel printings, alternate art and language-specific identities against the complete application dataset. Preserve genuine separate printings and suppress only proven duplicate placeholders. Keep original card-number set separate from release-product assignment.

5. Add regression tests for any confirmed application defects, including pagination overlap, all combined Image Library filters, clearing all filters, release set versus original card-number set, OP-15 duplicate placeholder handling, PRB/Premium Card Collection reprints and English/Japanese separation.

6. Run npm test, npm run lint and npm run build on the audit branch. Check GitHub Actions for the exact latest commit. Report failures honestly; do not call checks passed without actual successful runs.

7. If Preview is necessary, use only the existing Stage 3 Preview branch and Testing Supabase project ehzqsnfkmwphyllhaqhe. Never deploy Production.

8. Update the matrix and Stage 4B-1O handover with exact branch/commit, all 50 rows, all HTTP outcomes, missing/unexpected cards and printings, duplicate corrections, regression tests, CI/lint/build, PR #37/#38 status, Preview status and remaining blockers.

Continue working on the repository. Do not stop at a plan. Never merge or deploy Production.
```
