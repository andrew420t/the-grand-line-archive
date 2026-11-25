# Integration Validation — 25 November 2026

## Validation pull request
- Draft PR: https://github.com/andrew420t/the-grand-line-archive/pull/28
- Branch: `integration/grand-line-archive-2026-11-25`
- Tested commit: `6b335da39cd573a1cea04b5b09585a3a6b40f493`
- Workflow: Verify application, run #846
- Run URL: https://github.com/andrew420t/the-grand-line-archive/actions/runs/45519608795
- Final workflow result: **success**

## Exact-head checks
- Dependency installation: passed.
- Automated tests: **161 passed, 0 failed**.
- Lint: passed, **8 warnings, 0 errors**.
- Production Vite build: passed.
- Workflow cleanup: completed successfully.

## Warnings to review
### Lint warnings (non-blocking)
- `src/admin/CatalogueReferenceImage.jsx`: synchronous state updates in effect; missing `candidates.length` dependency.
- `src/admin/AdminDashboard.jsx`: ref access during render (`photosRef.current = photos`).
- `src/admin/ImageLibraryPanel.jsx`: synchronous state updates in effects (two locations).
- `src/App.jsx`: synchronous state updates in effects (two locations).
- `src/admin/CardScanner.jsx`: synchronous state updates in effect.

These warnings did not fail lint or the build. Review for effect timing/render behavior before any cleanup; avoid cosmetic changes that could regress scanner state.

### Build size warning (non-blocking, worth improving)
- Main minified JavaScript chunk: **767.36 kB** (gzip **218.34 kB**), above Vite's 500 kB warning threshold.
- Build still completed successfully in 2.68 seconds.
- Candidate improvement: lazy-load admin/scanner-only code and inspect Tesseract and other large dependencies for safe code splitting. Do not merely raise the warning threshold.

### Runtime/tooling notices
- Node dependency deprecation notices for `punycode` and `url.parse()`.
- GitHub runner warns that `actions/checkout@v4` and `actions/setup-node@v4` target Node 20 and are being forced to Node 24. Review action upgrades separately.

## Source review completed so far
- Scanner crop flow: optional full-photo scanning passes a null crop; explicit crop requires selection and confirmation for the current file. Crop bounds enforce at least 12% width/height and 64 pixels each. Number-only mode reads the manually selected crop directly; full-card mode runs supporting OCR after number-region recognition.
- Supabase configuration: preview builds resolve only `VITE_PREVIEW_SUPABASE_URL` and `VITE_PREVIEW_SUPABASE_ANON_KEY`; production builds resolve `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Checkout: client calls `create_order_atomic` and fails closed if the RPC is missing; client-side snapshot is explicitly only a friendly safeguard, not a concurrency guarantee.
- Order status updates: use `update_order_status_atomic` and validate the returned order ID before reporting success.
- Product image upload path includes compensating cleanup and conditional restoration to avoid overwriting a concurrent image edit.
- Admin product update, publish, delete and stock paths check returned affected rows rather than assuming a successful request means a row changed.

## Remaining gates — not yet verified
- No browser-driven end-to-end tests on a real staging deployment.
- No physical card OCR accuracy test in this run.
- No live staging Supabase schema, RLS, grants, triggers or Storage bucket review.
- SQL under `supabase/review-only/` remains proposals and has not been applied.
- No Cloudflare preview deployment was made.
- No production deployment or production data changes.

## Decision
The candidate passes repository CI on its exact tested head. This is a strong source/automated-test milestone, **not yet a complete user-acceptance or staging sign-off**. Keep PR #28 in draft and do not merge until the remaining source review, staging isolation and browser/manual test gates are addressed.
