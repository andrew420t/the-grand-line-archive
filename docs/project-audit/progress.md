# Grand Line Archive — Project Audit Progress

Repository: [andrew420t/the-grand-line-archive](https://github.com/andrew420t/the-grand-line-archive)  
Working branch: `feature/scanner-number-first-verification`  
Related PR: [#26 — Improve scanner with lower-right card-number OCR](https://github.com/andrew420t/the-grand-line-archive/pull/26)

This log records repeatable source/CI evidence and safe improvements. It does not treat source inspection as proof of live deployment, browser behavior, or database policy correctness.

## 24 November 2026 — Run 1

### Branch and PR state

- PR #26 was open, unmerged, and mergeable at the start of the audit.
- Starting PR head: `3690663cc1ee2fe46faa4e71377bf6f4d16ac929`.
- Work was committed only to the dedicated feature branch. No direct `master` changes, merge, or production deployment were made.
- Exact-head baseline GitHub Actions [run #773](https://github.com/andrew420t/the-grand-line-archive/actions/runs/45348304782) passed: dependency installation, tests, lint, and production build.

### Priority 1 — User-facing scanner breakage found and fixed

**Finding:** the scanner UI allowed users to leave manual cropping disabled, but the scan pipeline still passed a non-null full-frame rectangle together with `manualCropConfirmed=false`. The strict crop guard correctly rejects unconfirmed explicit rectangles, so both automatic number-region preparation and full-card OCR could fail before OCR began whenever manual cropping was off. This contradicted the advertised optional-crop workflow.

**Fix committed on the feature branch:**

- `src/admin/CardScanner.jsx` now passes `null` when manual crop is disabled.
- `src/admin/cardNumberRegion.js` treats only a null crop as the full source image. A user-selected crop object still requires explicit confirmation and is subject to the existing normalized bounds, 12% minimum dimensions, and 64-pixel minimum checks.
- `tests/cardNumberRegion.test.js` now verifies that a full-photo scan resolves to the complete source dimensions without manual confirmation, while invalid image dimensions fail and explicit crops remain confirmation-gated.
- Code commits: [4e4184c](https://github.com/andrew420t/the-grand-line-archive/commit/4e4184c703fe731695307873ea45f01c7f546976), [650c8fc](https://github.com/andrew420t/the-grand-line-archive/commit/650c8fc172e85d491f6e8a09e7c328c27b92b05c), [2577959](https://github.com/andrew420t/the-grand-line-archive/commit/257795979e0933ea00104354673b8e4bc9bd1cc1).
- Scanner evidence was appended to [docs/scanner-testing/progress.md](../scanner-testing/progress.md).

**Verification state:** baseline run #773 passed on the pre-fix SHA. The fixed code triggered Actions run #778; it was in progress at the time of the code check. A later documentation commit means CI must be checked against the newest branch head before reporting a final pass. No live browser or physical-card test was possible in this run.

### Priority 1 / 7 — Checkout and order data integrity review

Source review confirms that the client calls `create_order_atomic` for checkout and `update_order_status_atomic` for admin status transitions. The client fails closed with a clear error if the RPC is missing; it does not fall back to separate client-side order/item inserts. The proposal in `supabase/review-only/atomic-checkout-rpc.sql` includes row locks, expected-price checks, stock reservation, idempotent cancellation/restocking, and revokes direct order/order-item writes.

**Important blocker:** the SQL is explicitly review-only and has not been applied. Therefore the source-level checkout path is not evidence that the live database has the required functions, columns, grants, triggers, or RLS behavior. Until a separate staging project is confirmed and the schema/policies/triggers are reviewed there, checkout and order lifecycle cannot be called end-to-end verified. Do not apply this proposal to production.

### Priority 1 / 7 — Product visibility and admin data access review

Reviewed `supabase/review-only/product-visibility-rls-audit.sql`. It is read-only and checks RLS state, existing policies, table and column grants, product status distribution, order/profile policies, and Storage object policies/bucket configuration. It correctly calls out that permissive RLS policies combine with OR and that adding a new permissive policy alone cannot narrow an existing broad policy.

**Blocker:** the audit has not been run against a confirmed staging database. No claim is made about actual production RLS, grants, Storage policy, or customer-data exposure.

### Scanner and catalogue evidence retained

- The PR description and scanner progress log report all 100 sample matrix image slots as load-verified, including recovered OP17 and Japanese EB01/EB02 references. This is **image-load evidence only**, not OCR accuracy.
- Synthetic OCR, parser, matching, real-photo OCR, browser/preview, and production UI evidence remain separate categories.
- No genuine physical-card photo was available to this run for a new OCR trial.
- OP18 and EB05 supplemental sample entries must not be described as complete full-set imports.

### Preview / environment safety

- Source includes a fail-closed preview Supabase configuration path using preview-prefixed values and no production-variable fallback.
- The actual Cloudflare Preview build variables, configured Supabase project identity, and Storage bucket isolation remain unverified. The preview URL/browser reachability has also been reported as unavailable in prior scanner progress records.
- Do not sign in, upload, or run database-backed tests against Preview until a dedicated staging Supabase project and isolated Storage bucket are confirmed.

### Safety actions taken / not taken

- No production database query or write, migration, Storage operation, inventory/order/customer-data change, Cloudflare setting/secret change, merge, or deployment.
- All code and documentation edits were confined to `feature/scanner-number-first-verification`.

### Next priorities

1. Verify GitHub Actions on the latest exact feature-branch head; inspect any failed step before continuing.
2. Continue scanner review and regression coverage, especially full-card vs number-only mode, crop interactions, catalogue confirmation, language/variant identity, and recognition-memory failure behavior.
3. Inspect checkout and admin product write paths for false-success and partial-failure handling; add safe unit tests where a defect is confirmed.
4. Continue the 100-case evidence backlog without conflating image loading with OCR or matching; test genuine physical photos only when available.
5. Review migrations/RLS/Storage proposals as code only; run them only against a confirmed isolated staging project with explicit authorization.
6. Re-attempt Preview/browser checks only after URL reachability and staging isolation can be established.

### Evidence links

- [PR #26](https://github.com/andrew420t/the-grand-line-archive/pull/26)
- [Baseline CI run #773](https://github.com/andrew420t/the-grand-line-archive/actions/runs/45348304782)
- [Scanner progress log](../scanner-testing/progress.md)
- [Manual staging test checklist](../scanner-testing/manual-test-checklist.md)
