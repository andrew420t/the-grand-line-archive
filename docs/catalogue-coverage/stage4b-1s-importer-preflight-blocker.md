# Stage 4B-1S — secure importer preflight and persistence mapping gate

**Status: BLOCKED BEFORE IMPORT — schema/source mapping must be amended and reviewed.**

- Repository: `andrew420t/the-grand-line-archive`
- Branch: `audit/official-bandai-inventory-stage4b-1l-2026-11-27`
- Starting commit: `ebc5a55c2478f5dcccaabbfc28cbe0b96c910c9b`
- Testing Supabase project: `ehzqsnfkmwphyllhaqhe` (Grand Line Archive Testing, eu-west-1, ACTIVE_HEALTHY)
- Pinned source: `hotavocado/koala-kollect-data@619965ec198047de519dc6eb098c7a56aed9bd58`
- Source manifest generated: `2026-10-22T04:46:19Z`

## 1. Safety preflight

Verified at the start of this stage:

| Check | Result |
|---|---|
| Branch and exact head | PASS — expected branch at `ebc5a55c2478f5dcccaabbfc28cbe0b96c910c9b` |
| Supabase project identity | PASS — exact Testing project reference `ehzqsnfkmwphyllhaqhe` |
| Stage 4B-1R schema migration | PASS — migration `20261127194014/catalogue_reference_persistence_stage4b1r` recorded |
| Stage 4B-1R hardening migration | PASS — migration `20261127194050/harden_catalogue_inventory_link_guard` recorded |
| Nine catalogue tables | PASS — all present |
| RLS | PASS — enabled on all nine tables |
| Anonymous write grants | PASS — zero INSERT/UPDATE/DELETE grants |
| Authenticated write grants | PASS — zero INSERT/UPDATE/DELETE grants |
| Inventory-link language trigger | PASS — trigger present; function search_path pinned to empty string |
| Catalogue rows before import | PASS — all nine tables empty |
| Inventory count and hash | PASS — 32 rows; `4a7a39bb366cfdedd1e6bf39ea94e493` (unchanged from Stage 4B-1R) |
| Inventory links | PASS — zero |
| PR #37 / #38 | PASS — both open and unmerged |
| Stage 4B-1R CI | PASS — run [46058384917](https://github.com/andrew420t/the-grand-line-archive/actions/runs/46058384917), exact head SHA, success |

No database writes were performed in Stage 4B-1S. No inventory or legacy card table was modified. No Production project was accessed. No merge or deployment occurred.

## 2. Source feed inspection

The pinned manifest and schema were read. The feed has separate source files for cards, per-site card observations, printings, locators, products, product/set assignments and printing/product assignments. Important distinctions in the source contract:

- A card identity is not a printing identity.
- A printing is site-scoped and carries its own rarity, variant, source text and block icon.
- Printing locators provide site-local image IDs and are not substitutes for printing records.
- Product/printing assignments are many-to-many and may be moved between products over time.
- Card observations are versioned by site and observation hash; language-specific name/effect text can differ.
- The pinned feed contains 60 sets, 99 English products, 92 Japanese products and additional Chinese/TCGCSV records. It must be filtered to the approved 25-set EN/JP scope plus the 24 named Premium products; importing the whole feed would exceed scope.

The previous Stage 4B-1P reconciliation artifact contains 7,786 target set-printing rows and 231 Premium product-printing rows. It was inspected as historical reconciliation evidence, not treated as a substitute for the complete upstream source records.

## 3. Required schema changes before any import

The live Stage 4B-1R schema is not yet lossless for the pinned source contract and local official supplements. Importing now would discard source facts or misrepresent generated application values as official source identities. The following changes must be designed, reviewed and migrated in Testing before importing:

1. **Printing source record preservation.** `catalogue_printings` currently lacks the source printing's `site`, verbatim `source_text`, per-printing `block_icon` (including the literal `X` and null cases), `provenance_url`, CN token fields where applicable, `image_hash`, and `first_seen_at`. Add explicit typed columns or a documented lossless `source_metadata` JSONB field with validated typed identity columns. Do not collapse printing distinctions.
2. **Versioned card observations.** `catalogue_cards` has only one original name/native name and one metadata object. It cannot independently retain all per-site, per-language, per-observation-hash versions of name, category, colors, attributes, types, effect, trigger, cost, power, life and counter. Add a dedicated language-safe observation table with a unique source observation key and source provenance.
3. **Product source fields and lifecycle.** `catalogue_release_products` does not retain all source product attributes such as `kind`, `is_bucket`, `name_en`, `release_date_source` and `first_seen_at`. `catalogue_product_printings` also lacks source `first_seen_at` and `removed_at`. Preserve these fields so a listing relationship is not mistaken for the printing's permanent identity.
4. **Image identity and URL provenance.** `catalogue_printing_images.exact_image_url` currently requires an HTTPS URL. The approved OP-18/EB-05 local-supplement records in the application audit artifact include application proxy paths such as `/_card-image/bandai/en/...`, not a verified original Bandai HTTPS URL. These paths must not be stored as official URLs. Add a distinct application image path field and allow a nullable official URL only where source evidence is absent, while retaining the source image ID, site, source URL and provenance separately. Preserve same-language alternate references only.
5. **OP-18 and EB-05 supplement provenance.** OP-18 and EB-05 are absent from the pinned upstream feed. The audit artifact represents them using deterministic local keys such as `op18:en:OP13-012_p1` and `eb05:en:EB03-001_p2`, not the feed's `prt_[a-z0-9]{12}` printing keys. These are local supplement identities, not upstream feed identities. The schema must explicitly distinguish the source namespace and retain the exact official source evidence. No fake upstream printing key may be minted.
6. **Release set provenance.** The source `sets.jsonl` carries canonical set keys/codes; descriptive set names used by the application are additional curated display metadata. Keep the source code/key and the source of any display name distinguishable.

A revised migration must be accompanied by tests for the new constraints, language isolation, source identity uniqueness, observation versioning, and the separate official-URL/application-path fields. The migration must be applied only after a fresh project-reference preflight against `ehzqsnfkmwphyllhaqhe`.

## 4. Importer and credential status

No importer has been executed and no GitHub Actions job has been used to test credentials. The user has stated that `SUPABASE_SERVICE_ROLE_KEY` has been configured for Testing. GitHub's repository secret value and presence are not readable through the available GitHub connection; the secret must only be consumed inside a guarded GitHub Actions job and must never be echoed, logged or committed.

The importer should be implemented only after the schema adjustment is approved. It must validate the Testing project reference before any write, pin and checksum all source files against the feed manifest, stage and validate all source rows, reject count/identity drift, use bounded deterministic upserts in one transaction, never delete/truncate, and exclude `public.products`, `public.cards`, `public.sets` and `catalogue_inventory_links` from writes.

## 5. Expected scope retained as targets only

| Measure | Target |
|---|---:|
| Release sets | 25 |
| Language/set comparisons | 50 |
| Main-set assignments | 7,786 |
| Distinct main-set printing identities | 7,786 |
| Distinct language-scoped base card numbers | 5,123 |
| Premium products | 24 (9 EN / 15 JP) |
| Premium assignments | 231 |
| Combined distinct printing identities | 8,017 |

OP-18 remains 159 EN / 159 JP; EB-05 remains 96 EN / 96 JP. These 510 local official supplement assignments are included in the 7,786 main-set total. Premium remains separate at 231 assignments. These are reconciliation targets, not permission to synthesize missing source records.

The known Premium exceptions remain unchanged: no invented Japanese BANDAI CARD GAMES Fest. 23-24 counterpart; preserve English OP13-037 OP15-EB04 Treasure Rare as a distinct printing; preserve the genuine absence of its Japanese EB-04 counterpart; keep OP-15 base and Premium Vol.6 parallel printings distinct.

## 6. Inventory reconciliation boundary

Inventory remains at 32 unchanged rows with the Stage 4B-1R hash. There are zero catalogue inventory links. The two Japanese OP17-119 Loki inventory records remain distinct. No candidate matching or inventory-link creation was performed in this stage.

## 7. Completion state

- Schema/security preflight: COMPLETE.
- Source feed contract inspection: COMPLETE.
- Lossless source-to-schema mapping: BLOCKED pending schema amendment.
- Importer implementation and automated tests: NOT STARTED.
- Testing catalogue import: NOT RUN.
- Persisted 50-row reconciliation: NOT RUN.
- Premium persistence reconciliation: NOT RUN.
- Stage 4B-1S image HTTP audit: NOT RUN.
- Exact-commit Stage 4B-1S CI: NOT RUN.
- Catalogue completion: NOT COMPLETE; all 50 language/set rows remain INCOMPLETE.

**Stop condition honored:** no import was attempted because the current persistence schema cannot retain all required source facts and supplement provenance without loss or false attribution.
