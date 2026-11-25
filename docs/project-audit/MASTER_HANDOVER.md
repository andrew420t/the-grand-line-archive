# Grand Line Archive — Master Handover
**Checkpoint:** 25 November 2026, 01:10 Europe/Gibraltar  
**Repository:** https://github.com/andrew420t/the-grand-line-archive  
**Production baseline:** `master` at `70029519438f2a15e6030523104325552d60674a`  
**Working integration branch:** `integration/recovery-2026-11-25` (created from the verified master ref; documentation-only so far)

## Mission
Recover and consolidate all completed and unfinished Grand Line Archive work into one complete, reliable website. First get a full-site staging preview working, test the storefront/admin/catalogue/inventory/scanner/image library/checkout, then prepare a safe production upgrade. Gibraltar local pickup only remains the shipping/pickup requirement.

## Operating rules
- Treat `master` and the production Supabase project as protected.
- Do not merge to master, deploy production, change secrets, apply production migrations, or modify production data without explicit user approval.
- Prefer one integration branch and one living handover document; avoid duplicate audits and disconnected documents.
- Mark work complete only when independently verified. Separate code present, CI passed, staging tested, and production verified.
- Every work session updates this document with exact refs, tests, blockers, and next action.
- Never expose credentials or copy production credentials into preview builds.

## Current confirmed repository state
- Default/main branch: `master`, commit `70029519438f2a15e6030523104325552d60674a`.
- Open PR #26: https://github.com/andrew420t/the-grand-line-archive/pull/26  
  Head `feature/scanner-number-first-verification` at `8240334bc8b4bb008e7e75012389182ee8188532`; base master. Includes substantial scanner, catalogue, admin, image-library, checkout, SQL proposal, and regression-test work. GitHub compare reports **683 commits ahead** of master, despite the PR body describing a much narrower feature bundle. This unusual history must be investigated before any merge. Compare reports no commits behind and a common ancestor at master. File-level compare lists changes across App/admin/scanner/catalogue, order checkout, Supabase SQL proposals and tests.
  - PR body reports runs #741 and #742 passed for an earlier exact head, but current head must be checked against its own run.
  - Current exact head CI run #844 completed successfully.
- Open PR #27: https://github.com/andrew420t/the-grand-line-archive/pull/27  
  Head `preview/safe-demo-mode` at `0c98feea685449bdaaae3b8c5eaeac845ba889b4`; base is `feature/scanner-number-first-verification`, not master. It is two commits ahead of that base and changes `src/App.jsx` plus adds `src/PreviewDemo.jsx` (92 lines). It is a demo-mode layer on top of the scanner branch, not a separate full-site build. Current exact head CI run #845 completed successfully.
- Open PR #5: https://github.com/andrew420t/the-grand-line-archive/pull/5  
  Old preview deployment workflow; base ref is an older master commit `7321f4d17a6845ee05cea3964ab8880776e775d8`. PR description expects Cloudflare/GitHub secrets and VITE_SUPABASE_* variables. Must compare with current build environment logic before using; do not merge blindly.
- Branch search returned 30 branch names on the first page, including scanner, catalogue, admin image library, inventory draft/publish, archive filters, set imports, Gibraltar pickup, storefront controls, unique slug fixes, public stock visibility, OCR fixes, docs and preview branches. Search cursor was returned; retrieve remaining pages if a complete inventory is required.
- On the scanner branch, `.github/workflows/verify.yml` runs on PRs targeting master and pushes to `feature/card-identification` and `feature/scanner-number-first-verification`; steps are npm ci, npm test, npm run lint, npm run build. It does not currently run on every push to master.
- Scanner branch `package.json`: scripts are test=node --test, lint=oxlint, build=vite build.

## Build environment findings
Inspected on `feature/scanner-number-first-verification`:
- `src/lib/buildEnvironment.js` identifies branch from WORKERS_CI_BRANCH, CF_PAGES_BRANCH, GITHUB_HEAD_REF or GITHUB_REF_NAME. If Cloudflare CI marker exists but branch is missing, it fails closed as preview. Branches master/main are production; other branches are preview.
- `vite.config.js` uses `envPrefix: 'VITE_PREVIEW_'` for preview builds and `'VITE_'` for production/local builds, and defines `VITE_PREVIEW_BUILD`.
- `src/lib/supabaseConfig.js` uses only `VITE_PREVIEW_SUPABASE_URL` and `VITE_PREVIEW_SUPABASE_ANON_KEY` in preview; production uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- `src/lib/supabase.js` creates a Supabase client only when both resolved values are present.
- This is promising separation logic, but actual Cloudflare preview build variables and branch metadata have not yet been verified against the live Cloudflare build configuration. A build with preview vars missing can fall into the no-Supabase/demo route; verify actual preview bundle before claiming full staging works.

## Supabase environments — current live inventory
Both projects are ACTIVE_HEALTHY and in eu-west-1:
- Production: `andrew420.t27@gmail.com's Project`, ref `aknokkfeufkfsggdfsyi`.
- Testing: `Grand Line Archive Testing`, ref `ehzqsnfkmwphyllhaqhe`.

Read-only table inventory:
| Item | Production | Testing |
|---|---:|---:|
| products | 32 | 0 |
| sets | 23 | 25 |
| categories | 5 | 5 |
| profiles | 2 | 0 |
| product_images | 9 | 0 |
| site_settings | 1 | 1 |
| card_recognition_examples | not present | present, 0 rows |
| card_catalogue_overrides | not present | present, 0 rows |
| don_card_set_overrides | not present | present, 0 rows |

Both have legacy `cards`, `orders`, `order_items`, and `messages` tables, but column differences exist. Testing `products` includes card-language/catalogue fields; testing `orders` includes stock_reserved; testing `order_items` includes product_id and unit_price. Production has live product/admin/image data and must remain the authoritative live database.
- Supabase migration history: production returned no tracked migrations; testing returned seven migrations: staging_core_schema, staging_admin_features, staging_atomic_checkout, staging_card_recognition_memory, staging_catalogue_overrides, staging_don_set_overrides, staging_security_and_indexes.
- Do not infer that a feature is production-ready just because a staging table/function exists. Compare SQL, RLS, policies, RPCs, storage buckets and app queries before designing any production migration.
- Staging has no product rows or admin profiles, explaining why it is not yet a realistic full-site test environment. A test administrator and representative sample catalogue/inventory will be needed, but create only through an explicitly safe, separate staging workflow.

## Feature inventory to reconcile
- Storefront, homepage, catalogue, card details, search and set/language/rarity/condition/variant filters.
- Catalogue coverage: OP-01–OP-18, EB-01–EB-05, PRB-01 and PRB-02; English/Japanese entries; full image coverage. OP18/EB05 sample supplements are not full set imports.
- Admin dashboard/login/permissions, card editor including clearing optional fields, bulk set imports and duplicate protection.
- Inventory book and explicit publish-to-Archive workflow.
- Admin image library, multi-image card support and correct image matching.
- Scanner: full-card mode, card-number-only mode, manual crop/confirm, OCR normalization, candidate confirmation, reference image and recognition memory. Image-load success is not OCR success. Real physical-card testing remains insufficient; a prior physical photo failed identification.
- Checkout: order creation, stock reservation, failure rollback, cancellation/restock, status transitions.
- Website customisation and Gibraltar local pickup only.

## Immediate next actions
1. Inspect why PR #26 compares as 683 commits ahead and verify its actual changed-file set, merge base, current head CI, and whether its commit history contains unrelated history. Do not merge until understood.
2. Inspect PR #27's diff and route behavior; decide whether demo mode should be kept separate from full Supabase-backed staging.
3. Inspect PR #5 workflow and current Cloudflare Workers build settings. Verify branch metadata and preview variables without displaying secret values.
4. Build a controlled full staging environment: confirm testing Supabase URL/key are used only for preview, seed safe sample products and a separate test admin, verify storage/RLS.
5. Compare schema, RPCs, policies and migrations; prepare reviewed migration plan, no production changes yet.
6. Run CI and browser checks for the full website. Publish a preview link only after verifying it loads the real app and points to testing Supabase.
7. Update this handover with each run's results and next step.

## Latest checkpoint
- Automation “Grand Line Archive Build” is enabled for daily runs at approximately 09:00 Europe/Gibraltar and was manually started for an immediate first run.
- First run confirmed branch/PR relationships, current PR CI, build config source and both Supabase project inventories.
- New integration branch `integration/recovery-2026-11-25` was created from master. No application code, production database, secrets or deployments were changed.
