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

**Verification state:** baseline run #773 passed on the pre-fix SHA. The full-photo scanner fix passed exact-head [run #778](https://github.com/andrew420t/the-grand-line-archive/actions/runs/45361595227), and the first audit-log head passed [run #782](https://github.com/andrew420t/the-grand-line-archive/actions/runs/45361754071). The order-grant hardening head passed [run #791](https://github.com/andrew420t/the-grand-line-archive/actions/runs/45362359656). The recognition-privacy code/test head `089feaab92852f4cc80baa064a95ac5f948b83f2` passed exact-head [run #811](https://github.com/andrew420t/the-grand-line-archive/actions/runs/45363619774). The follow-up preflight/test head `0d69565d82531ed96f985ba6ae3b2d181dacdb70` passed exact-head [run #827](https://github.com/andrew420t/the-grand-line-archive/actions/runs/45364203712): install, tests, lint, and production build all succeeded. An earlier run #809 failed on a multiline static-test assertion only; the assertion was fixed before #811. No live browser or physical-card test was possible in this run.

### Priority 1 / 7 — Checkout and order data integrity review

Source review confirms that the client calls `create_order_atomic` for checkout and `update_order_status_atomic` for admin status transitions. The client fails closed with a clear error if the RPC is missing; it does not fall back to separate client-side order/item inserts. The proposal in `supabase/review-only/atomic-checkout-rpc.sql` includes row locks, expected-price checks, stock reservation, idempotent cancellation/restocking, and revokes direct order/order-item writes.

**Important blocker:** the SQL is explicitly review-only and has not been applied. Therefore the source-level checkout path is not evidence that the live database has the required functions, columns, grants, triggers, or RLS behavior. Until a separate staging project is confirmed and the schema/policies/triggers are reviewed there, checkout and order lifecycle cannot be called end-to-end verified. Do not apply this proposal to production.

### Priority 1 / 7 — Product visibility and admin data access review

Reviewed `supabase/review-only/product-visibility-rls-audit.sql`. It is read-only and checks RLS state, existing policies, table and column grants, product status distribution, order/profile policies, and Storage object policies/bucket configuration. It correctly calls out that permissive RLS policies combine with OR and that adding a new permissive policy alone cannot narrow an existing broad policy.

**Blocker:** the audit has not been run against a confirmed staging database. No claim is made about actual production RLS, grants, Storage policy, or customer-data exposure.

### Scanner and catalogue evidence retained

- The PR description and scanner progress log report all 100 sample matrix image slots as load-verified, including recovered OP17 and Japanese EB01/EB02 references. I re-read the CSV: it contains 100 unique target-set/language/slot rows across 25 targets, with exactly two English and two Japanese rows per target; `tests/sampleCardMatrix.test.js` enforces those counts and the 100 `verified-load` statuses. This is **image-load evidence only**, not OCR accuracy or proof that every set's complete catalogue is imported.
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

### Follow-up security review — order mutation grants

A second source-level review found that the review-only atomic checkout proposal's comment promised the RPC would be the only authenticated order-write path, but its original grants block revoked direct order INSERT/UPDATE and order-item INSERT only. It did not revoke direct order DELETE or order-item UPDATE/DELETE. It also revoked only selected column-level INSERT/UPDATE grants, even though PostgreSQL column grants can remain after a table-level revoke. The application source has no direct order/order-item update or delete workflow; checkout and status changes use the two atomic RPCs.

**Safe proposal improvement (not applied):**

- The review-only SQL now revokes table-level INSERT, UPDATE, DELETE, and TRUNCATE on both `orders` and `order_items` from `PUBLIC`, `anon`, and `authenticated`.
- A schema-driven block also revokes any existing per-column INSERT and UPDATE grants for every current column on those two tables, rather than assuming the original four-column snapshot is complete.
- Added `tests/atomicCheckoutSqlSafety.test.js` to guard the proposal against losing those table-level and column-level protections.
- Change commits: [9f1275d](https://github.com/andrew420t/the-grand-line-archive/commit/9f1275d8021ee985c0ea4494d0b819da382a5fb2), [46369b1](https://github.com/andrew420t/the-grand-line-archive/commit/46369b1b974024c6b22a62d83da0fbcc4d1b5b96).

**Limit:** this is a reviewed SQL proposal and a static regression guard, not a live grant audit. The SQL has not been run. Confirm the real staging schema, existing triggers, policies, and grants before any staging application; never apply it to production as part of this automation.

### Priority 1 — Shared scanner-photo privacy risk found and mitigated in review SQL

The shared recognition code uploads `prepareCardImage(file)` from the original scan photo without setting `cropToCard=true`. That means a shared reference object may include its surrounding background, not just the card. The original `supabase/review-only/card-recognition-memory.sql` proposal created the `card-recognition-references` bucket as public and allowed anon/authenticated object reads. If that proposal had been applied, anyone with a public object URL could potentially retrieve an original scan photo. This is a **potential exposure in the prior proposal**, not a confirmed live incident: the file is marked review-only, and this audit did not query a live Supabase project or inspect any bucket.

**Mitigation committed on the feature branch (proposals only):**

- The initial recognition setup now creates/sets the bucket private, gives object-read access only to admins, and adds restrictive SELECT/INSERT/DELETE/UPDATE guards so older broad Storage policies cannot expose the bucket. Its preflight also requires a boolean `public.is_admin()` function and enabled RLS on `storage.objects` before creating policies.
- The metadata table now starts with API-role privileges revoked and grants only the columns/operations used by the scanner. Public metadata reads do not include the contributor's `confirmed_by` auth UUID.
- Added a separate [privacy remediation SQL proposal](../../supabase/review-only/card-recognition-memory-privacy-remediation.sql) for a setup where the older public-bucket SQL may already have been applied. It checks schema/RLS/admin prerequisites, privatizes the bucket, removes the public object-read policy, adds restrictive admin-only policies, and removes broad table/column grants.
- Added a warning beside the upload path in `cardRecognitionMemory.js`, static SQL regression tests in `tests/cardRecognitionMemorySqlSafety.test.js`, and a staging-only object privacy test in the scanner manual checklist.
- Main changes: [1777669](https://github.com/andrew420t/the-grand-line-archive/commit/17776696713854fe4786ad2e19a1b4d91e75332c), [8f8b512](https://github.com/andrew420t/the-grand-line-archive/commit/8f8b5128d415ac2addffa5c670d2c041c9bcc695), [548af9c](https://github.com/andrew420t/the-grand-line-archive/commit/548af9c13330835b9cd6c3ec2dc002ab025d9f5a), [ac65713](https://github.com/andrew420t/the-grand-line-archive/commit/ac65713f9402f7af83d9c7c818fef2bb08d664ce), [089feaa](https://github.com/andrew420t/the-grand-line-archive/commit/089feaab92852f4cc80baa064a95ac5f948b83f2), [30ad4fb](https://github.com/andrew420t/the-grand-line-archive/commit/30ad4fb0298cd8e6994acdcc520dc0e59ab22fb3), [77da910](https://github.com/andrew420t/the-grand-line-archive/commit/77da9100eccadd5ff48c116b9df1a75beff8936e).

**Required follow-up:** establish whether the original recognition SQL was ever manually applied. If it was, do not assume the updated initial-setup file will upgrade it: that file deliberately stops when the table already exists. Review the separate remediation proposal against the actual isolated staging schema and object usage first. No SQL, bucket setting, object, or database was changed by this audit.

### Priority 2 — Recognition memory source precedence

The scanner previously let any same-card-number shared-memory match overwrite the local-memory printing ID, even if the local example had higher visual similarity. This was a ranking-quality issue rather than auto-confirmation: the confirmation popup remains required. Added `chooseRememberedImageMatch` to select the higher-similarity local/shared example, ignore memory for a different OCR-resolved card number, and prefer local on ties. Four regression tests cover these cases. Exact code/test head [afb63af](https://github.com/andrew420t/the-grand-line-archive/commit/afb63af4ddcf785589f89a19f63a2f04fdd2baf3) passed [CI run #836](https://github.com/andrew420t/the-grand-line-archive/actions/runs/45364536905) (install, tests, lint, build).

### Latest branch checkpoint — 24 November 2026

- PR #26 remains open, unmerged, and mergeable on `feature/scanner-number-first-verification`.
- Latest code/test checkpoint `afb63af4ddcf785589f89a19f63a2f04fdd2baf3` passed exact-head run #836.
- The audit and scanner progress documents were updated, and exact documentation head `a8062178b26f65ac4db9cc0d9a840eb591b6d8c8` passed [CI run #839](https://github.com/andrew420t/the-grand-line-archive/actions/runs/45364662064) (install, tests, lint, build).

### Scanner scaling follow-up

The shared recognition lookup downloads every row in `card_recognition_examples` (1,000 per page) and sorts the full result in the browser on each scan; local IndexedDB lookup also compares every saved example. This is currently a linear network/CPU cost as the library grows. It was documented rather than changed because the broad visual search can recover a card number when OCR is weak; a naive OCR-number filter could remove that recovery path. Next run should design and benchmark a two-stage lookup that retains the fallback.
