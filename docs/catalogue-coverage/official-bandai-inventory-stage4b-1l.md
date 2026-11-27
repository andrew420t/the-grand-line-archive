# Official Bandai inventory matrix — Stage 4B-1L

Retrieval date: 2026-11-27  
Repository baseline: `448bc546c30ad1d7c69481dbdf794711810c5560`  
Working branch: `audit/official-bandai-inventory-stage4b-1l-2026-11-27`

Machine-readable row-level matrix: [official-bandai-inventory-stage4b-1l.json](./official-bandai-inventory-stage4b-1l.json)

## Scope and counting rules

The matrix contains 50 independent rows: 25 products/sets × English and Japanese. The audited scope is OP-01–OP-18, EB-01–EB-05, PRB-01 and PRB-02.

- Count distinct card numbers, not repeated page entries.
- A card number with multiple printings remains one base card number.
- Reprints do not increase the base-card count of the original release.
- Release-set assignment and card-number prefix are separate dimensions.
- A printing is distinct only where the product/printing identity is supported by official evidence.
- Feed totals and sample tests do not establish completeness.
- Unknown values remain `null`; no expected counts, missing numbers, printings or image URLs are estimated.

## Official source URL convention

Bandai's official card-list uses language-specific series identifiers. The matrix records the corresponding official English and Japanese URLs for each set. The identifiers for OP-01, EB-01, PRB-01, OP-15, OP-18 and EB-05 were directly opened or independently recorded in the Stage 4B-1K evidence. The other URLs are recorded as source locators, not as proof that their complete card inventories were extracted.

English host: `https://en.onepiece-cardgame.com/cardlist/?series={series}`  
Japanese host: `https://www.onepiece-cardgame.com/cardlist/?series={series}`

## Verified Stage 4B-1K prefix observations carried forward

| Set | Language | Official distinct prefix count | Status |
|---|---|---:|---|
| OP-15 | English | 119 | INCOMPLETE |
| OP-15 | Japanese | 119 | INCOMPLETE |
| OP-18 | English | 119 | INCOMPLETE |
| OP-18 | Japanese | 119 | INCOMPLETE |
| EB-05 | English | 61 | INCOMPLETE |
| EB-05 | Japanese | 61 | INCOMPLETE |

These are official page prefix observations, not verified printing/image totals. OP-15's English result count was 196 and OP-18's English result count was 159; neither result count is a base-card count. Japanese result-count labels were not exposed in the extracted page text and are not inferred.

## Status interpretation

- `COMPLETE`: card-number, printing-identity and image-reference reconciliation independently complete.
- `INCOMPLETE`: an official observation exists, but at least one required reconciliation layer is unfinished.
- `DUPLICATE`: a proven duplicate identity requires correction or explicit resolution.
- `IMAGE MISSING`: a confirmed printing lacks a usable official image reference.
- `SOURCE UNVERIFIED`: official source extraction is not evidenced sufficiently to publish expected/actual inventory counts.

## Current limitations

The remaining 22 sets have not yet had their English and Japanese card entries extracted and reconciled number-by-number in this stage. They remain `SOURCE UNVERIFIED`. The six carried-forward rows remain `INCOMPLETE` because their complete printing, variant and image audits are not finished. No rows are marked `COMPLETE`.

No catalogue records were changed based solely on page totals. No artwork was copied, substituted or re-hosted. OP-15 generic-placeholder suppression, named Premium Card Collection printing identity, scanner behavior, Image Library filters and Stage 2/3 work are unchanged by this documentation-only commit.
