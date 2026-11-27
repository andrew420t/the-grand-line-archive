# Stage 4B-1T — Lossless Catalogue Source Persistence Design

**Status: schema designed and migrated in Testing; import deliberately not run.**

- Repository: `andrew420t/the-grand-line-archive`
- Branch: `audit/official-bandai-inventory-stage4b-1l-2026-11-27`
- Starting commit: `9645e2bfb068c0cd519facad1c185306ad72eb52`
- Source: `hotavocado/koala-kollect-data@619965ec198047de519dc6eb098c7a56aed9bd58`
- Testing project: `ehzqsnfkmwphyllhaqhe`
- Migrations: `20261127195100_catalogue_lossless_source_persistence_stage4b1t` and `20261127195212_catalogue_locator_suffix_provenance_stage4b1t`

## Design principles

1. Typed columns support indexed identity and validation; a `source_record jsonb` column retains the complete parsed source object so optional source fields are not silently discarded.
2. Upstream feed identities and local official supplements occupy separate namespaces. Local OP-18/EB-05 deterministic identities are never rewritten as upstream `prt_...` keys.
3. Printing identity, card identity, locator/image identity, product listing and set assignment remain separate records.
4. Card observations are immutable, site-specific versions. A new observation hash creates a new observation row; historical rows are retained and `superseded_at` marks the prior version.
5. An official source image URL and an application proxy path are different fields. Application paths are never stored as official Bandai URLs.
6. Language-safe composite foreign keys continue to prevent cross-language card/printing/observation relationships.
7. Both migrations are additive and schema-only. It does not import, update or delete catalogue data, inventory products, legacy cards or inventory links.

## Schema extensions

### Release sets

- `source_set_key`
- `source_record`

The curated display name remains separate from the source set key/code.

### Release products

- `source_namespace` (`upstream_feed` or `local_official`)
- `product_kind`, `is_bucket`, `name_en`
- `release_date_source`, `first_seen_at`
- `source_record`

This preserves product index metadata and distinguishes named products from listing buckets.

### Cards

- Nullable `card_number` to represent source DON designs without inventing a card number.
- `don_design`, `category`, `colors`, `cost`, `life`, `power`, `counter`, `attributes`, `block_icon`, `facts_site`, `first_seen_at`, `source_record`.
- A check constraint requires numbered identities to have a card number and DON designs to have a `don_design` key.

### Printings

- `source_namespace`, `source_site`, `source_text`, `block_icon`, `provenance_url`, `number_token`, `image_token`, `image_hash`, `first_seen_at`, `source_record`.
- `block_icon` is text so it preserves integers, literal `X`, and null without coercion.
- The upstream namespace requires the feed's `prt_[0-9a-z]{12}` identity. The local namespace requires a scoped `op18:` or `eb05:` identity.

### Versioned card observations

New table: `catalogue_card_observations`.

It stores source observation key, source site, source language, observation hash, name, category, colors, cost, life, power, counter, attributes, types, effect, trigger, first-seen and superseded timestamps, plus the complete source JSON. It is linked to a card with a composite `(card_id, language)` foreign key and uniquely keyed by source observation key.

### Printing images / locators

- `exact_image_url` is nullable and restricted to official Bandai HTTPS hosts.
- `application_image_path` separately stores local app paths such as `/_card-image/bandai/en/...`.
- `source_namespace`, `source_locator_key`, `source_first_seen_at`, `suffix_family`, `suffix_n`, `source_image_url`, and `source_record` retain locator provenance and the complete locator identity.
- A constraint requires an official URL or an application path and prevents storing the same value as both.

### Product/set relationships

- Product/printing links now preserve `source_first_seen_at`, `removed_at`, and `source_record`.
- Product/set and set/printing links preserve source first-seen and complete source records.
- Lifecycle check prevents a removal timestamp preceding first-seen.

## Security

- The new observation table has RLS enabled.
- `anon` and `authenticated` receive SELECT only.
- Client INSERT/UPDATE/DELETE privileges are explicitly revoked.
- `service_role` has the privileged importer grants.
- Existing inventory-link table, trigger and policies are unchanged.
- No inventory-link rows are created.

The migration includes a defensive check against an explicitly different `app.settings.project_ref`; the operator must still independently verify the project reference before applying it because not every Supabase SQL execution context exposes that setting.

## Scope and completion boundary

The 25-set / 50-language-set / 7,786 main-set assignment / 5,123 base card number / 24 Premium product / 231 Premium assignment / 8,017 combined printing identity figures remain audit targets. No source rows have been inserted in Stage 4B-1T, so these are not yet persisted counts and the 50 matrix rows remain incomplete.

The next importer must stage and checksum every pinned source file, filter explicitly to the approved EN/JP 25-set and named Premium scope, preserve the 510 local OP-18/EB-05 supplement records separately, and reconcile all 8,017 identities before marking any row complete.

## Tests

`tests/catalogueLosslessPersistenceStage4b1t.test.js` checks the additive Testing-only migration contract, typed and raw source-field retention, observation versioning, official URL/application path separation, locator suffix and source-image provenance, lifecycle metadata, namespace distinction and client read-only grants.

## Explicitly not done

- No catalogue import or seed.
- No inventory or legacy card writes.
- No inventory matching or links.
- No Production access, merge or deployment.
- No claim that the 8,017 identities are persisted or complete.

## Exact-commit CI verification

- Run: [46059857353](https://github.com/andrew420t/the-grand-line-archive/actions/runs/46059857353)
- Verified code commit: `ca37f835c656b6819983e90a39ad197e8256f5d1`
- Tests: 348 passed, 0 failed.
- Lint: passed.
- Production build: passed.
- Stage 4B-1O application printing reconciliation: passed.
- Stage 4B-1P Premium/persistence reconciliation: passed.
- Official image HTTP audit: skipped by workflow condition; no new image audit is claimed.

The workflow does not import catalogue rows. The 50 catalogue matrix rows remain INCOMPLETE until the secure Testing importer and image verification have completed.
