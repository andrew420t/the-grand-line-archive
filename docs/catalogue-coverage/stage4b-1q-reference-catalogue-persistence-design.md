# Stage 4B-1Q — Testing-only reference catalogue persistence design

**Repository:** `andrew420t/the-grand-line-archive`  
**Working branch:** `audit/official-bandai-inventory-stage4b-1l-2026-11-27`  
**Starting commit:** `d0c478adf17767d0fa441c4483ac42a18a4b089a`  
**Stage 3 baseline:** `448bc546c30ad1d7c69481dbdf794711810c5560`  
**Pinned reference feed:** `hotavocado/koala-kollect-data@619965ec198047de519dc6eb098c7a56aed9bd58`  
**Testing project only:** `ehzqsnfkmwphyllhaqhe`

## Safety outcome

This stage is design, source reconciliation and read-only dry-run evidence only.

- No migration was executed.
- No Testing Supabase writes, inserts, updates, deletes, or seeds were executed.
- No Production Supabase access or deployment occurred.
- `public.products`, `public.cards`, `public.sets`, uploaded product images, stock, prices, status and inventory IDs were not changed.
- PR #37 and PR #38 remain open and unmerged.
- No branch or commit was deleted.
- Scanner, Image Library, filters and OP-15 duplicate corrections remain untouched.

The Stage 4B-1P import-plan artifact is retained in the exact-head Stage 4B-1Q CI run. It contains the full 7,786-row set-printing manifest and the per-inventory-row candidate report:
[Download Stage 4B-1Q full import and inventory audit artifact](https://github.com/andrew420t/the-grand-line-archive/actions/runs/46053970318/artifacts/15225393084).

The artifact's set manifest includes language, original card number, release set, named release product, product key/code, printing key, rarity, variant, image ID, application image URL, exact official image URL and source.

## 1. Persistence architecture

The Testing snapshot confirms that `public.products` is the live stock/inventory table and `public.cards` is a legacy stock-card table. Neither is a reference catalogue. The existing optional catalogue identity fields on inventory rows are linking metadata, not a suitable place to store thousands of reference printings.

The proposed normalized model is:

| Table | Purpose | Stable identity |
|---|---|---|
| `catalogue_release_sets` | 25 canonical release-set definitions | `set_code` |
| `catalogue_release_products` | Named English/Japanese Bandai products, including Premium products | `language + source_product_key` |
| `catalogue_cards` | Language-scoped original card identity and original card number/name | `language + source_card_key`; unique `language + card_number` |
| `catalogue_printings` | Base, parallel, special and Treasure Rare printings | `language + printing_key` |
| `catalogue_printing_images` | Exact official image references and alternate same-language fallback references | `printing + image_id + exact URL` |
| `catalogue_product_sets` | Named product to release-set relationships | `language + product + set` |
| `catalogue_product_printings` | Named release product to printing assignments | `language + product + printing` |
| `catalogue_set_printings` | Release-set to printing assignments | `language + set + printing` |
| `catalogue_inventory_links` | Explicitly reviewed inventory-to-printing links | `inventory_product_id` |

The card identity is independent of its release-product assignment. A printing points to one language-scoped original card; named products and release sets link to the printing through separate many-to-many assignment tables. A product may be associated with multiple release sets, and a printing may be assigned to a named special product without changing its original card number.

Every printing/image relationship carries a language key. Composite foreign keys prevent an English product, card, printing or fallback image from being linked to a Japanese identity. Original card number, printing key, parallel identity, rarity, variant, language, official image ID and exact URL are retained independently.

The proposed DDL is stored as a review-only file:
`supabase/review-only/catalogue-reference-persistence-stage4b-1q.sql`.

It contains schema creation only. It has no catalogue inserts or inventory updates. It is not an executable migration until separately reviewed and explicitly authorised.

### Constraints and access

- Unique constraints on source product key, language-scoped card key/number, language-scoped printing key, and each assignment relationship.
- Composite foreign keys include language to enforce language separation.
- Restrict-delete foreign keys prevent accidental deletion of referenced cards, printings, products, sets or inventory.
- Indexes cover card-number lookup, card-to-printing, printing-image, product-printing, set-printing and inventory-link lookups.
- RLS is enabled on every new table.
- Reference catalogue tables are read-only to `anon` and `authenticated` clients.
- Inventory links are readable only by authenticated admins through `public.is_admin()`.
- No client INSERT/UPDATE/DELETE grants or write policies are proposed. The later import would use a separately approved privileged transaction.
- The migration preflight checks the existing admin function and `public.products.id` UUID type. Live schema compatibility and existing grants/policies must be re-audited before any execution.

### Idempotency and duplicate protection

The importer must stage and validate all rows before opening its write transaction. It must reject duplicate source identities, conflicting card-number-to-card-key mappings, cross-language joins, missing product/printing parents, missing set parents, duplicate image IDs with conflicting URLs, and manifest count drift.

Upserts use the language-scoped unique source keys. A repeated import updates only mutable source metadata when the stable identity and parent relationship still match. It must raise an error rather than silently re-parent a printing to another original card. Product/set and product/printing assignments use their unique composite keys and `ON CONFLICT DO NOTHING` only after verifying the existing relationship is identical. A second identical import therefore creates no duplicate identities or assignments.

All inserts/upserts and post-import integrity checks run in one transaction. Any count, identity, image, language or referential-integrity failure aborts the transaction. No inventory link is part of the catalogue import transaction.

### Rollback

Before any future approved import, take a Testing-only schema/data snapshot and record row counts and hashes. Rollback is a separate, explicitly approved operation. First remove only rows tagged with the import batch/source commit and only after verifying no inventory links or other references depend on them; then drop new tables in reverse FK order if the schema itself must be removed. Never truncate or delete existing inventory tables. The commented DROP sequence in the review-only SQL is not to be run automatically.

## 2. Complete import scope

| Measure | Expected |
|---|---:|
| Named release sets | 25 |
| Language/set comparisons | 50 |
| Set printing assignment rows | 7,786 |
| Distinct language-scoped set printing keys | 7,786 |
| Distinct language-scoped base card numbers | 5,123 |
| OP-18 local official supplement identities | 318 |
| EB-05 local official supplement identities | 192 |
| Combined local OP-18/EB-05 supplement identities | 510 |
| English Premium named products | 9 |
| English Premium product-printing assignments | 103 |
| Japanese Premium named products | 15 |
| Japanese Premium product-printing assignments | 128 |
| Additional Premium product-printing assignments | 231 |
| Premium printing keys already in the 25-set matrix | 0 |
| Combined distinct language-scoped printing keys | 8,017 |

The 510 OP-18/EB-05 supplement identities are included in the 7,786 set assignments, not added a second time. The 231 Premium product-printing identities are additional, yielding 8,017 combined distinct language-scoped printing keys.

The pinned upstream feed was generated on 2026-10-22. OP-18 and EB-05 are retained from the local official Bandai supplements because those releases are absent from the pinned upstream feed.

## 3. All 25 sets / 50 language comparisons

Counts are official release-assignment printing identities, English / Japanese. Every row matched the application runtime identity and metadata in the prior reconciliation. Testing persistence remains zero in every row, so all rows remain INCOMPLETE.

| Set | English | Japanese | Persisted keys EN/JP | Status |
|---|---:|---:|---:|---|
| OP-01 | 154 | 154 | 0 / 0 | INCOMPLETE |
| OP-02 | 154 | 154 | 0 / 0 | INCOMPLETE |
| OP-03 | 154 | 154 | 0 / 0 | INCOMPLETE |
| OP-04 | 149 | 149 | 0 / 0 | INCOMPLETE |
| OP-05 | 154 | 154 | 0 / 0 | INCOMPLETE |
| OP-06 | 151 | 150 | 0 / 0 | INCOMPLETE |
| OP-07 | 151 | 150 | 0 / 0 | INCOMPLETE |
| OP-08 | 151 | 150 | 0 / 0 | INCOMPLETE |
| OP-09 | 159 | 158 | 0 / 0 | INCOMPLETE |
| OP-10 | 151 | 150 | 0 / 0 | INCOMPLETE |
| OP-11 | 156 | 155 | 0 / 0 | INCOMPLETE |
| OP-12 | 155 | 154 | 0 / 0 | INCOMPLETE |
| OP-13 | 175 | 174 | 0 / 0 | INCOMPLETE |
| OP-14 | 159 | 156 | 0 / 0 | INCOMPLETE |
| OP-15 | 155 | 152 | 0 / 0 | INCOMPLETE |
| OP-16 | 155 | 155 | 0 / 0 | INCOMPLETE |
| OP-17 | 169 | 169 | 0 / 0 | INCOMPLETE |
| OP-18 | 159 | 159 | 0 / 0 | INCOMPLETE |
| EB-01 | 80 | 80 | 0 / 0 | INCOMPLETE |
| EB-02 | 105 | 105 | 0 / 0 | INCOMPLETE |
| EB-03 | 90 | 90 | 0 / 0 | INCOMPLETE |
| EB-04 | 81 | 85 | 0 / 0 | INCOMPLETE |
| EB-05 | 96 | 96 | 0 / 0 | INCOMPLETE |
| PRB-01 | 319 | 319 | 0 / 0 | INCOMPLETE |
| PRB-02 | 316 | 316 | 0 / 0 | INCOMPLETE |
| **TOTAL** | **3,898** | **3,888** | **0 / 0** | **50 INCOMPLETE** |

Across all 50 rows: 7,786 official assignments, 7,786 application runtime printings, 50/50 exact identity rows, zero missing/unexpected/duplicate application identities and zero metadata mismatches. Testing has zero persisted reference printing keys and therefore 7,786 missing persisted identities.

## 4. Premium Card Collection reconciliation

### English — 9 products / 103 printings

| Named product | Printing assignments |
|---|---:|
| Premium Card Collection -Live Action Edition- | 9 |
| Premium Card Collection -FILM RED Edition- | 12 |
| Premium Card Collection -Best Selection- | 12 |
| Premium Card Collection -Best Selection Vol.3- | 12 |
| Premium Card Collection -Best Selection Vol.4- | 12 |
| Premium Card Collection -Best Selection Vol.5- | 12 |
| Premium Card Collection -25th Edition- | 10 |
| Premium Card Collection -BANDAI CARD GAMES Fest. 23-24 Edition- | 12 |
| Premium Card Collection -Best Selection Vol.6- | 12 |
| **Total** | **103** |

The eight products previously outstanding account for 91 printing assignments. Best Selection Vol.6 remains 12/12.

### Japanese — 15 products / 128 printings

| Named product | Printing assignments |
|---|---:|
| プレミアムカードコレクション - ベストセレクション vol.4 - | 12 |
| プレミアムカードコレクション-ONE PIECE DAY’25- | 1 |
| プレミアムカードコレクション - ベストセレクション vol.5 - | 12 |
| プレミアムカードコレクション-ONE PIECE DAY'24- | 1 |
| プレミアムカードコレクション ‐ONE PIECE FILM RED ‐ | 12 |
| プレミアムカードコレクション-ウタ- | 6 |
| プレミアムカードコレクション 25周年エディション | 10 |
| プレミアムカードコレクション-Live Action Edition- | 9 |
| プレミアムカードコレクション-メラメラの実争奪戦Edition- | 3 |
| プレミアムカードコレクション-Live Action Edition vol.2 バロックワークス- | 7 |
| プレミアムカードコレクション - ベストセレクション vol.6 - | 12 |
| プレミアムカードコレクション - ベストセレクションvol.2 - | 12 |
| プレミアムカードコレクション-ベストセレクションvol.3- | 12 |
| プレミアムカードコレクション-Live Action Edition vol.2 麦わらの一味- | 7 |
| プレミアムカードコレクション - ベストセレクションvol.1 - | 12 |
| **Total** | **128** |

Eight verified Japanese Bandai product-page counterparts map to 91 printings. The pinned Japanese product feed has no named BANDAI CARD GAMES Fest. 23-24 product; no Japanese product has been invented. All 231 Premium printing identities matched language, product key/name, original card number, printing key, rarity, variant, image ID and exact runtime image path.

## 5. Special identity preservation

- OP-18 English/Japanese supplements: 159 printings per language.
- EB-05 English/Japanese supplements: 96 printings per language.
- PRB-01 and PRB-02 remain separate named release products and set assignments.
- All nine English and all 15 Japanese Premium Card Collection products remain distinct.
- English OP13-037 OP15-EB04 Treasure Rare remains printing key `prt_pm4j0pgnb4he`.
- Japanese EB-04 has no OP13-037 Treasure Rare printing. The Japanese original remains assigned to OP-13.
- Original card number is never overwritten by a product or release assignment.
- OP-15 generic placeholder product links remain suppressed only where a concrete named product exists; distinct OP-15 base and Premium Vol.6 parallel printings remain distinct.

## 6. Testing inventory linking report

Read-only Testing snapshot:

| Measure | Result |
|---|---:|
| Inventory products | 32 |
| Card-numbered inventory products | 31 |
| Products with no card number | 1 |
| Card-number rows with an application card-number candidate | 31 |
| Card-number rows with no application candidate | 0 |
| Existing set assignments | 2 |
| Unassigned products | 30 |
| Assigned-set mismatches | 0 |
| Existing catalogue match IDs / printing keys / reference URLs | 0 / 0 / 0 |
| Automatic inventory links created | 0 |

A card-number/language candidate is not sufficient to identify a particular parallel printing. The per-row candidate printing keys and image IDs are included in the linked CI artifact. Do not link any row until the exact printing key or exact image ID and variant have been reviewed.

| Existing inventory record | Language | Card number | Current set assignment | Candidate status |
|---|---|---|---|---|
| Brook | English | OP15-032 | OP-15 | Candidate; printing-level review required |
| Mr. 2 Bon Kurei (Bentham) | Japanese | EB01-061 | Unassigned | Candidate; printing-level review required |
| Enel | Japanese | EB02-052 | Unassigned | Candidate; printing-level review required |
| Jewelry Bonney | Japanese | EB04-002 | Unassigned | Candidate; printing-level review required |
| Roronoa Zoro | Japanese | EB04-007 | Unassigned | Candidate; printing-level review required |
| Nefeltari Vivi | Japanese | EB04-025 | Unassigned | Candidate; printing-level review required |
| Rosinante & Law | Japanese | EB04-038 | Unassigned | Candidate; printing-level review required |
| Sanji | Japanese | OP06-119 | Unassigned | Candidate; printing-level review required |
| Tony Tony Chopper | Japanese | OP10-011 | Unassigned | Candidate; printing-level review required |
| Donquixote Rosinante | Japanese | OP12-061 | Unassigned | Candidate; printing-level review required |
| Trafalgar Law | Japanese | OP14-009 | Unassigned | Candidate; printing-level review required |
| Monkey D. Luffy | Japanese | OP14-024 | Unassigned | Candidate; printing-level review required |
| Pirates Docking Six | Japanese | OP15-088 | Unassigned | Candidate; printing-level review required |
| Monkey D. Luffy | Japanese | OP15-119 | Unassigned | Candidate; printing-level review required |
| Edward Newgate | Japanese | OP16-003 | Unassigned | Candidate; printing-level review required |
| Emporio Ivankov | Japanese | OP16-026 | Unassigned | Candidate; printing-level review required |
| Monkey D. Luffy | Japanese | OP16-034 | Unassigned | Candidate; printing-level review required |
| Buggy | Japanese | OP16-041 | Unassigned | Candidate; printing-level review required |
| Yamato | Japanese | OP16-098 | Unassigned | Candidate; printing-level review required |
| Portgas D. Ace | Japanese | OP16-118 | Unassigned | Candidate; printing-level review required |
| Marshall D. Teach | Japanese | OP16-119 | Unassigned | Candidate; printing-level review required |
| Shanks | Japanese | OP17-022 | Unassigned | Candidate; printing-level review required |
| Lead Performers | Japanese | OP17-061 | Unassigned | Candidate; printing-level review required |
| Charlotte Pudding | Japanese | OP17-109 | Unassigned | Candidate; printing-level review required |
| Rocks D. Xebec | Japanese | OP17-118 | Unassigned | Candidate; printing-level review required |
| Loki | Japanese | OP17-119 | OP-17 | Candidate; duplicate provenance and printing review required |
| Loki | Japanese | OP17-119 | Unassigned | Candidate; duplicate provenance and printing review required |
| Monkey D. Luffy [Jump] | Japanese | P-159 | Unassigned | Candidate; special product/printing review required |
| Nami | Japanese | PRB02-012 | Unassigned | Candidate; PRB-02 product review required |
| Edward Newgate | Japanese | ST15-002 | Unassigned | Candidate; starter-product review required |
| Uso-Hachi | Japanese | ST18-001 | Unassigned | Candidate; starter-product review required |
| DON!! Card (Jinbe) | Japanese | No card number | Unassigned | Unmatchable until official identity is established |

The two Japanese OP17-119 Loki rows are separate inventory records and remain untouched. Their provenance must be established before either is linked. Uploaded inventory images are not official reference-image URLs and must never be overwritten by catalogue image imports.

## 7. Image and fallback evidence

- Previously verified official image references retained: 7,798/7,798 HTTP 200; zero missing, invalid, timeout or temporary failures.
- Premium Card Collection recheck: 231/231 HTTP 200 PNG; zero failures.
- Exact primary image references are retained separately from alternate official fallback references.
- Fallback selection must be same-language only; English artwork must never be used as a Japanese fallback or vice versa.
- Existing regression coverage includes exact image selection, alternate printing/fallback selection, invalid URLs, missing images, failed requests and placeholder suppression.
- All 231 Premium checks loaded their exact primary image; no fallback was needed for those 231 checks.

## 8. Exact-head CI and PR state

Stage 4B-1P exact-head workflow evidence supplied at Stage 4B-1Q start:

- Commit: `d0c478adf17767d0fa441c4483ac42a18a4b089a`
- Workflow run: [46053970318](https://github.com/andrew420t/the-grand-line-archive/actions/runs/46053970318)
- 337 tests passed.
- Lint passed.
- Production build passed.
- Application-versus-official audit passed.
- Premium Card Collection and Testing persistence reconciliation passed.
- The audit-only image URL step was skipped in this run; prior 7,798-image evidence and 231 Premium recheck are retained above.

PR #37 remains OPEN and UNMERGED. PR #38 remains OPEN and UNMERGED. No merge or deployment was performed.

## 9. Acceptance gates before a Testing import

The next authorised operation must be split into two approvals:

1. **Schema approval:** inspect the current Testing schema, grants and RLS policies again; review the proposed DDL; apply only to project `ehzqsnfkmwphyllhaqhe`.
2. **Import/link approval:** run the dry-run against the exact pinned feed and supplements; compare all 8,017 language-scoped printing identities, 25 sets, 50 set/language assignments, named product assignments and all image references; then import reference data in one transaction. Inventory links remain a separate manually reviewed step.

Post-import gates: 7,786 set assignments, 8,017 combined distinct printing keys, 5,123 language-scoped original card numbers, all named product relationships, 231 Premium assignments, all exact image references and same-language alternates, zero duplicate source identities, zero orphan FKs, zero cross-language relationships, and unchanged inventory snapshot (32 products, stock, prices, uploaded images, statuses and IDs).

Do not mark any matrix row COMPLETE until its official identity, application runtime, Testing persistence and image verification layers all pass. The current matrix correctly retains 0 COMPLETE / 50 INCOMPLETE.
