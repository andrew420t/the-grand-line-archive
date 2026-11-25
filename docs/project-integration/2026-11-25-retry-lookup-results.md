# Grand Line Archive — Retry Lookup Results
Date: 25 November 2026 (Europe/Gibraltar)

## Executive result
The retry lookup succeeded across GitHub, Cloudflare and the dedicated Supabase testing project. The candidate source is preserved on the integration branch; no production merge or database write was made during this lookup.

## GitHub pull requests

### PR #26 — scanner and archive feature set
- State: open, unmerged, non-draft; GitHub reports mergeable.
- Branch: `feature/scanner-number-first-verification`.
- Exact head: `8240334bc8b4bb008e7e75012389182ee8188532`.
- Base/master SHA: `70029519438f2a15e6030523104325552d60674a`.
- 69 changed files; 7,512 additions and 629 deletions.
- Scope: scanner number-first OCR, full-card and number-only modes, optional confirmed manual crop, catalogue candidate ranking/confirmation, language handling, image reference fallback, shared/local recognition memory, Quick Add and bulk import improvements, image library/storage pagination, product edit/schema safeguards, order checkout/status helpers, environment separation, tests and audit/manual-test documents.
- Scanner sample evidence: 100/100 sample image slots reported load-verified across 25 targets; OP18 and EB05 entries remain sample-only supplements, not complete set imports. Image-load checks are not physical-card OCR accuracy tests.
- Exact-head GitHub Actions run #844 succeeded: install, automated tests, lint and production build all passed.
- PR: https://github.com/andrew420t/the-grand-line-archive/pull/26

### PR #27 — isolated demo mode
- State: open, draft, unmerged; GitHub reports mergeable.
- Base: PR #26 head `8240334bc8b4bb008e7e75012389182ee8188532`.
- Head: `0c98feea685449bdaaae3b8c5eaeac845ba889b4`.
- Two changed files: `src/App.jsx` and `src/PreviewDemo.jsx`.
- Adds a clearly labelled local-only demo workspace with six sample catalogue cards and a scanner workbench. No Supabase session, database mutations, inventory updates or image uploads are available in that demo.
- Cloudflare preview URL: https://preview-safe-demo-mode-the-grand-line-archive.andrew420-t27.workers.dev/
- Cloudflare preview: Ready; latest listed version `f75926bc` (7 hours ago); code commit `0c98feea` also has a Ready deployment (10 hours ago). One earlier build was skipped.
- PR: https://github.com/andrew420t/the-grand-line-archive/pull/27

### PR #5 — older Cloudflare preview workflow
- State: open, unmerged.
- One changed file: `.github/workflows/cloudflare-preview.yml`.
- Its build uses generic `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` secrets. Do not merge this workflow unchanged: the current source expects preview builds to use `VITE_PREVIEW_SUPABASE_URL` and `VITE_PREVIEW_SUPABASE_ANON_KEY`, and it must point only to the isolated testing project.
- PR: https://github.com/andrew420t/the-grand-line-archive/pull/5

## Integration candidate / PR #28
- Integration branch: `integration/grand-line-archive-2026-11-25`.
- Current inspected head: `b47bb8f699b619cc384a13f5dc042b375ae269b8`.
- Draft PR #28 exists, open and unmerged, based on `master`; it includes the PR #26 69-file source snapshot plus two integration/validation documents (71 files total). PR #27 and PR #5 are intentionally excluded.
- PR #28: https://github.com/andrew420t/the-grand-line-archive/pull/28
- CI run #846 on tested source/documentation checkpoint `6b335da39cd573a1cea04b5b09585a3a6b40f493`: 161 tests passed, 0 failed; lint passed with 8 warnings and 0 errors; production build passed.
- CI run #847 on integration head `b47bb8f699b619cc384a13f5dc042b375ae269b8`: install, tests, lint and build all succeeded.
- Non-blocking issues from #846: main minified bundle 767.36 kB (218.34 kB gzip), above Vite's 500 kB warning threshold; 8 lint warnings around React effects/ref access. Review before merge; do not make cosmetic scanner changes.
- Compare with master: integration is 685 commits ahead, 0 behind; merge base is exactly master SHA `70029519438f2a15e6030523104325552d60674a`. The ahead count is history, not changed-file count.
- Keep PR #28 draft and do not merge until staging/browser/manual acceptance checks are complete.

## Cloudflare inspection (read-only)

### Production
- Worker: `the-grand-line-archive`.
- Source: `master`.
- URL: https://the-grand-line-archive.andrew420-t27.workers.dev
- Latest reported commit: `81e1d12e` — Add shared card recognition memory.
- Status: Ready (dashboard showed 2 days ago at inspection time).

### PR #26 preview
- Environment: `feature/scanner-number-first-verification`.
- URL: https://feature-scanner-number-first-verificatio-the-grand-line-archive.andrew420-t27.workers.dev/
- Latest listed version: `c776dab8`, Ready (about 2 days ago).
- Two commits in its deployment history were skipped; other listed deployments were Ready.

### PR #27 preview
- Environment: `preview/safe-demo-mode`.
- URL: https://preview-safe-demo-mode-the-grand-line-archive.andrew420-t27.workers.dev/
- Latest listed version: `f75926bc`, Ready; underlying demo code commit `0c98feea` Ready.

### Integration preview
- Branch: `integration/grand-line-archive-2026-11-25`.
- URL: https://db699eec-the-grand-line-archive.andrew420-t27.workers.dev
- Version/deployment ID: `db699eec`.
- Commit: `b47bb8f699b619cc384a13f5dc042b375ae269b8` — `docs: record integration validation results`.
- Status: Ready; dashboard showed 5 minutes ago at inspection time.
- A Ready deployment is not proof of end-to-end app behavior or correct Supabase binding.

## Supabase inspection (read-only)

### Projects
- Dedicated testing project: `Grand Line Archive Testing`, project ref `ehzqsnfkmwphyllhaqhe`, region `eu-west-1`, status `ACTIVE_HEALTHY`.
- Separate existing project: ref `aknokkfeufkfsggdfsyi`, also `ACTIVE_HEALTHY`; it was not modified.

### Testing project state
- Seven migrations are recorded: `staging_core_schema`, `staging_admin_features`, `staging_atomic_checkout`, `staging_card_recognition_memory`, `staging_catalogue_overrides`, `staging_don_set_overrides`, `staging_security_and_indexes`.
- RLS is enabled on the inspected public tables.
- Read-only row counts: products 0; sets 25; orders 0; card_recognition_examples 0; site_settings 1. This is a schema-ready test project with set data, not a copy of live inventory/orders or recognition examples.
- Storage bucket `card-recognition-references` is private (`public=false`). `product-card-images` is public (`public=true`), consistent with public storefront image delivery but its access policies should remain part of review.
- Security advisor reports three SECURITY DEFINER functions executable by `authenticated`: `create_order_atomic`, `update_order_status_atomic`, `is_admin`. Inspection confirms `anon` cannot execute them. `create_order_atomic` requires `auth.uid()` and validates product, price and stock; `update_order_status_atomic` requires an authenticated admin via `is_admin()`; `is_admin()` checks the user's profile role. Treat the advisor entries as review warnings, not confirmed vulnerabilities, but retain them in the staging sign-off checklist.

## Safety / what was not done
- No production merge, deployment, secret edit, Cloudflare setting change, Supabase migration, database write, Storage object operation, or inventory/order/customer-data mutation was performed in this lookup.
- SQL files under `supabase/review-only/` remain review proposals; the testing project has its own recorded `staging_*` migrations.
- Physical-card OCR, end-to-end scanner behavior, preview-to-testing-project credential binding and customer/admin browser journeys remain unverified.

## Recommended next gate
Use the PR #27 safe demo preview for visual/local scanner interaction tests. Separately verify that the integration preview uses only the dedicated testing project's preview-prefixed credentials before any database-backed staging tests. Keep PR #28 draft until those checks and the 8 lint warnings / bundle-size warning are reviewed.


# Current branch follow-up — 25 November 2026

After the read-only lookup report was committed, the integration branch received documentation-only commit `680d6284e8e52dacddcaf5ccb7a0a3b7e7f95214` (`docs: record retried integration lookup results`). PR #28 now contains 72 changed files and remains open, draft, and unmerged. GitHub Actions run #848 was triggered for this exact head and was still in progress at the last check; do not treat it as passed until its final result is confirmed.

The Cloudflare preview that was inspected and confirmed Ready is still the prior source commit `b47bb8f699b619cc384a13f5dc042b375ae269b8` at `https://db699eec-the-grand-line-archive.andrew420-t27.workers.dev`. The documentation-only commit may trigger a subsequent preview deployment; its deployment was not yet verified at the time of this update.
