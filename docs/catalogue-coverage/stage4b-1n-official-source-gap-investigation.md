# Stage 4B-1N — Official source gaps and image verification

**Retrieved:** 2026-11-27  
**Repository:** `andrew420t/the-grand-line-archive`  
**Working branch:** `audit/official-bandai-inventory-stage4b-1l-2026-11-27`  
**Starting commit:** `6e39eb3a34639127ccfe1c404c5db8d6d429e54a`  
**Stage 3 baseline:** `448bc546c30ad1d7c69481dbdf794711810c5560`  
**Machine-readable matrix:** [official-bandai-inventory-stage4b-1l.json](./official-bandai-inventory-stage4b-1l.json)

## Executive result

The official source inventory now has a source locator and extraction evidence for all 50 language/set rows. The standalone English EB-04 URL still fails to render, but its full inventory was recovered from the two official combined product pages:

- OP14-EB04: 40 EB-04 entries, 31 distinct EB04 card numbers, 40 official image IDs.
- OP15-EB04: 41 EB-04 entries, 30 distinct EB04 card numbers, 41 official image IDs.
- Combined: 61 distinct card numbers (EB04-001 through EB04-061), 81 distinct official image IDs/URLs, all paired to a parsed card entry. Two SP CARD printings (EB04-003 and EB04-039) remain separate identities. No image HTTP status has yet been checked.

The matrix is conservatively **50 INCOMPLETE, 0 COMPLETE, 0 IMAGE MISSING, 0 DUPLICATE, 0 SOURCE UNVERIFIED**. All 50 rows have source evidence, but no row is marked complete because HTTP image loading and several printing/parser reconciliations remain unfinished. Extraction shortfalls are not classified as missing images.

## All 50 language/set rows

Counts are **official page result rows / parsed product entries / extracted image URLs**. A base count is shown only for OP/EB base-number prefixes. PRB base counts are deliberately blank; PRB parsed card-number observations are reported separately below.

| Set | Language | Base numbers | Results | Parsed | Image URLs | Unparsed | Image URL shortfall | Status |
|---|---|---:|---:|---:|---:|---:|---:|---|
| OP-01 | English | 121 | 154 | 154 | 154 | 0 | 0 | INCOMPLETE |
| OP-01 | Japanese | 121 | 154 | 154 | 154 | 0 | 0 | INCOMPLETE |
| OP-02 | English | 121 | 154 | 154 | 154 | 0 | 0 | INCOMPLETE |
| OP-02 | Japanese | 121 | 154 | 154 | 154 | 0 | 0 | INCOMPLETE |
| OP-03 | English | 123 | 154 | 154 | 154 | 0 | 0 | INCOMPLETE |
| OP-03 | Japanese | 123 | 154 | 154 | 154 | 0 | 0 | INCOMPLETE |
| OP-04 | English | 119 | 149 | 149 | 149 | 0 | 0 | INCOMPLETE |
| OP-04 | Japanese | 119 | 149 | 149 | 149 | 0 | 0 | INCOMPLETE |
| OP-05 | English | 119 | 154 | 154 | 154 | 0 | 0 | INCOMPLETE |
| OP-05 | Japanese | 119 | 154 | 154 | 154 | 0 | 0 | INCOMPLETE |
| OP-06 | English | 119 | 151 | 151 | 151 | 0 | 0 | INCOMPLETE |
| OP-06 | Japanese | 119 | 150 | 150 | 150 | 0 | 0 | INCOMPLETE |
| OP-07 | English | 119 | 151 | 151 | 151 | 0 | 0 | INCOMPLETE |
| OP-07 | Japanese | 119 | 150 | 150 | 150 | 0 | 0 | INCOMPLETE |
| OP-08 | English | 119 | 151 | 151 | 151 | 0 | 0 | INCOMPLETE |
| OP-08 | Japanese | 119 | 150 | 150 | 150 | 0 | 0 | INCOMPLETE |
| OP-09 | English | 119 | 159 | 159 | 159 | 0 | 0 | INCOMPLETE |
| OP-09 | Japanese | 119 | 158 | 158 | 158 | 0 | 0 | INCOMPLETE |
| OP-10 | English | 119 | 151 | 151 | 151 | 0 | 0 | INCOMPLETE |
| OP-10 | Japanese | 119 | 150 | 150 | 150 | 0 | 0 | INCOMPLETE |
| OP-11 | English | 119 | 156 | 156 | 154 | 0 | 2 | INCOMPLETE |
| OP-11 | Japanese | 119 | 155 | 155 | 153 | 0 | 2 | INCOMPLETE |
| OP-12 | English | 119 | 155 | 155 | 153 | 0 | 2 | INCOMPLETE |
| OP-12 | Japanese | 119 | 154 | 154 | 152 | 0 | 2 | INCOMPLETE |
| OP-13 | English | 120 | 175 | 175 | 175 | 0 | 0 | INCOMPLETE |
| OP-13 | Japanese | 120 | 174 | 174 | 174 | 0 | 0 | INCOMPLETE |
| OP-14 | English | 120 | 199 | 198 | 199 | 1 | 0 | INCOMPLETE |
| OP-14 | Japanese | 120 | 156 | 156 | 156 | 0 | 0 | INCOMPLETE |
| OP-15 | English | 119 | 196 | 194 | 194 | 2 | 2 | INCOMPLETE |
| OP-15 | Japanese | 119 | 152 | 151 | 151 | 1 | 1 | INCOMPLETE |
| OP-16 | English | 119 | 155 | 155 | 154 | 0 | 1 | INCOMPLETE |
| OP-16 | Japanese | 119 | 155 | 155 | 154 | 0 | 1 | INCOMPLETE |
| OP-17 | English | 119 | 169 | 167 | 164 | 2 | 5 | INCOMPLETE |
| OP-17 | Japanese | 119 | 169 | 167 | 164 | 2 | 5 | INCOMPLETE |
| OP-18 | English | 119 | 159 | 159 | 159 | 0 | 0 | INCOMPLETE |
| OP-18 | Japanese | 119 | 159 | 159 | 159 | 0 | 0 | INCOMPLETE |
| EB-01 | English | 61 | 80 | 80 | 80 | 0 | 0 | INCOMPLETE |
| EB-01 | Japanese | 61 | 80 | 80 | 80 | 0 | 0 | INCOMPLETE |
| EB-02 | English | 61 | 105 | 105 | 105 | 0 | 0 | INCOMPLETE |
| EB-02 | Japanese | 61 | 105 | 105 | 105 | 0 | 0 | INCOMPLETE |
| EB-03 | English | 62 | 90 | 90 | 90 | 0 | 0 | INCOMPLETE |
| EB-03 | Japanese | 62 | 90 | 90 | 90 | 0 | 0 | INCOMPLETE |
| EB-04 | English | 61 | 81 | 81 | 81 | 0 | 0 | INCOMPLETE |
| EB-04 | Japanese | 61 | 85 | 83 | 83 | 2 | 2 | INCOMPLETE |
| EB-05 | English | 61 | 96 | 96 | 96 | 0 | 0 | INCOMPLETE |
| EB-05 | Japanese | 61 | 96 | 96 | 96 | 0 | 0 | INCOMPLETE |
| PRB-01 | English | — | 319 | 305 | 197 | 14 | 122 | INCOMPLETE |
| PRB-01 | Japanese | — | 319 | 305 | 197 | 14 | 122 | INCOMPLETE |
| PRB-02 | English | — | 316 | 249 | 109 | 67 | 207 | INCOMPLETE |
| PRB-02 | Japanese | — | 316 | 249 | 109 | 67 | 207 | INCOMPLETE |

## Confirmed extraction gaps and classification

| Source | English | Japanese | Current interpretation |
|---|---:|---:|---|
| OP-11 | 156 / 156 / 154 | 155 / 155 / 153 | No unparsed card rows; 2 image URLs short of page rows per language. Extraction gap only. |
| OP-12 | 155 / 155 / 153 | 154 / 154 / 152 | No unparsed card rows; 2 image URLs short per language. Extraction gap only. |
| OP-14 | 199 / 198 / 199 | 156 / 156 / 156 | English has one unparsed product row but no image URL count shortfall. The product page includes EB-04 and other release inclusions; release product is not the original card-number set. |
| OP-15 | 196 / 194 / 194 | 152 / 151 / 151 | English: 2 unparsed rows and 2 image URL shortfall. Japanese: 1 unparsed row and 1 image URL shortfall. Base prefix numbers remain 119 per language. |
| OP-16 | 155 / 155 / 154 | 155 / 155 / 154 | One image URL short per language; no unparsed card rows. |
| OP-17 | 169 / 167 / 164 | 169 / 167 / 164 | Two unparsed rows and five image URLs short per language. |
| EB-04 | 81 / 81 / 81 via combined pages | 85 / 83 / 83 | English fully extracted from OP14-EB04 and OP15-EB04; Japanese has two unparsed rows and two image URL extraction shortfall. |
| PRB-01 | 319 / 305 / 197 | 319 / 305 / 197 | 14 unparsed rows per language; 122 image URL extraction shortfall per language. |
| PRB-02 | 316 / 249 / 109 | 316 / 249 / 109 | 67 unparsed rows per language; 207 image URL extraction shortfall per language. |

An image URL extraction shortfall is a difference between the page result count and the extracted URL count. It is **not** evidence that Bandai's image is broken or missing. Likewise, an unparsed result row is not automatically a missing card or a separate printing.

## PRB-01 and PRB-02 — what is actually established

The extracted rows provide these partial, language-specific card-number observations:

- PRB-01: 305 parsed entries and 106 distinct original OP/EB/ST card numbers in each language; 14 result rows remain unparsed.
- PRB-02: 249 parsed entries and 140 distinct original OP/EB/ST card numbers in each language; 67 result rows remain unparsed.

The source data does not yet associate every result row with an exact image ID, rarity/type/name tuple and release printing identity. Repeated card-number/name/rarity/type signatures are retained as candidate separate printings, not discarded as duplicates. No PRB base-card count, complete reprint list, or complete printing total is asserted. The matrix stores parsed card-number lists separately from the unknown complete product inventory.

## Other reconciliation observations

- OP-14 and OP-15 English official product pages contain EB-04 entries. The EB-04 English matrix row now records the 61 EB04-prefix card numbers and 81 printings from these two official product pages. The same entries remain part of their release-product rows.
- OP-15 generic Other Product Card placeholders remain distinct from named Premium Card Collection - Best Selection Vol.6 product links only when official/catalogue evidence supports a distinct printing. Existing Stage 3 duplicate suppression is not changed.
- OP-18 and EB-05 base counts and supplemental printing identities are carried forward. The language-specific OP-18 Treasure Rare identities remain separate.
- Original card-number prefix and release-product assignment remain separate dimensions.
- No image is marked IMAGE MISSING from a parser shortfall alone.

## HTTP image verification implementation

Added `scripts/auditOfficialBandaiImages.mjs`, with tests in `tests/officialImageHttpAudit.test.js`. The audit script gathers unique official image URLs from all six extraction datasets and the EB-04 combined-page entries, validates that English and Japanese image hosts remain language-specific, and performs GET requests. It classifies each reference as:

- LOADED (2xx image content)
- MISSING (404/410)
- INVALID_URL (malformed, wrong-language host, non-image response or invalid request)
- TIMEOUT
- TEMPORARY_FAILURE (access restriction, rate limit, network/server failure)

The script is configured for the audit branch's Verify workflow only and uploads a per-URL JSON artifact. The source snapshot contains **7,103 unique official image URLs** before any future source updates. This count is a workload count, not a claim that all images load. The script has not yet executed in GitHub Actions, so there are no actual HTTP result counts to publish in this report. Application fallback behavior is not changed; the existing same-language fallback restriction is preserved.

## Regression coverage and verification

- Added unit coverage for HTTP response classification, wrong-language host rejection, English/Japanese host aliases, 404/410, non-image responses and temporary failures.
- Existing repository regression tests for Image Library filter intersection/clearing, pagination deduplication, release set versus original card-number set, language separation, OP-15 placeholder handling, PRB/Premium Card Collection product identities and image fallback remain in the working tree.
- No application scanner, Image Library, catalogue filter, or OP-15 production logic was changed in this stage.
- `npm test`, `npm run lint` and `npm run build` have **not** been run in a local checkout in this environment.
- GitHub Actions lookup for the latest audit commit returned no workflow runs and no combined status checks. CI is therefore **NOT RUN / UNVERIFIED**, not passed. The workflow now includes the audit-only image HTTP step, but the exact latest commit still needs a real Actions run.
- No Preview deployment was initiated. The existing Stage 3 Preview branch was not changed or redeployed.

## Pull requests and safety

- PR #37: **OPEN**, not merged.
- PR #38: **OPEN / DRAFT**, not merged.
- No PR was merged, no branch or commit was deleted, no Production deployment occurred, and no Production Supabase project was accessed or modified.
- The audit branch remains separate from `main`/`master`.
- No credentials were read, copied or exposed.

## Remaining blockers

1. Complete independent PRB-01/PRB-02 product-entry extraction, including the currently unparsed rows and exact image-to-printing associations.
2. Resolve the OP-11, OP-12, OP-14, OP-15, OP-16, OP-17 and EB-04 Japanese parser/image URL shortfalls against actual Bandai page DOM entries.
3. Run the 7,103-reference HTTP audit and store actual per-URL outcomes in the matrix. Do not promote extraction shortfalls to IMAGE MISSING without HTTP evidence.
4. Reconcile all official image IDs to application printing identity IDs for all 50 rows, including Premium Card Collection and PRB.
5. Obtain a successful CI run for the exact latest audit commit and confirm tests, lint and build.
6. Perform Preview verification only through the existing Stage 3 Preview branch and Testing Supabase project if a Preview is required.

## Exact next prompt — Stage 4B-1O

```text
The Grand Line Archive — Stage 4B-1O: Complete PRB Printing Extraction, Resolve Remaining Parser Gaps and Verify All Official Images

Continue directly from Stage 4B-1N.

Repository: andrew420t/the-grand-line-archive
Working branch: audit/official-bandai-inventory-stage4b-1l-2026-11-27
Starting commit: 2e2a7b0f41dcbc987e8ac91a5e9fc8ee57c35fca
Stage 3 baseline: 448bc546c30ad1d7c69481dbdf794711810c5560

Absolute restrictions:
- Never merge PR #37 or PR #38.
- Never merge into main/master.
- Never deploy Production or modify Production Supabase.
- Never delete branches or commits.
- Keep PR #37 and PR #38 open.
- Preserve scanner, Image Library, filters and OP-15 duplicate corrections.
- Never expose credentials.
- Never invent card numbers, printing identities or image references.

1. Finish PRB-01 and PRB-02 independently in English and Japanese. Parse every official product result row, including the 14 PRB-01 and 67 PRB-02 unparsed rows per language. Associate each row with its exact official image ID, rarity, type, name, release-product assignment and printing identity. Do not infer a PRB base-card count from page totals or image IDs.

2. Resolve the remaining OP-11, OP-12, OP-14, OP-15, OP-16, OP-17 and EB-04 Japanese extraction shortfalls. Distinguish repeated page entries, separate printings, parser failures and source image references.

3. Execute scripts/auditOfficialBandaiImages.mjs on the audit branch. Record the actual HTTP status, content type, final URL, latency and classification for every official image URL. Include loaded, missing, invalid URL, timeout and temporary failure. Preserve English/Japanese host restrictions and do not use cross-language fallback.

4. Reconcile all 50 language/set rows against application printing identities, including base, parallel, SP, Treasure Rare, Premium Card Collection and PRB printings. Keep original card-number set separate from release-product assignment. Preserve genuine separate printings and suppress only proven duplicate placeholders.

5. Update docs/catalogue-coverage/official-bandai-inventory-stage4b-1l.json with exact source evidence, complete card-number lists, printing identities, image HTTP results, missing/unexpected entries, retrieval dates and honest classifications. COMPLETE requires all verification layers to pass.

6. Add regression tests for any newly confirmed defects. Run npm test, npm run lint and npm run build. Check GitHub Actions for the exact final commit. If Actions do not trigger, report that honestly; do not merge or create a PR merely to force CI.

7. If Preview is required, use only the existing Stage 3 Preview branch and Testing Supabase project ehzqsnfkmwphyllhaqhe. Never deploy Production.

8. Report exact branch/commit, all 50 rows, remaining card/printing gaps, actual image HTTP results, duplicate corrections, regression tests, CI/lint/build, PR #37/#38 status, Preview status and remaining blockers.

Do not stop at a plan. Continue working on the repository and never merge or deploy Production.
```
