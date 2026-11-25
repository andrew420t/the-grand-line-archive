# REMEMBER — Grand Line Archive Master Project Memory
**Last updated:** 25 November 2026 — Prompt 4 investigation update  
**Purpose:** Single-file recovery handover for continuing the Grand Line Archive project after a lost or reset conversation.

> **How to use this file:** Upload `REMEMBER.md` into a new ChatGPT conversation and say:  
> “This is the master recovery file for my Grand Line Archive project. Read it fully, verify the current state against the connected GitHub, Cloudflare and Supabase sources before changing anything, then continue from the next action.”
>
> This file is a recovery record, not proof that every historical claim remains true today. It labels prior findings as reported where fresh verification is still needed. Never invent missing credentials, project details, commits, deployments or test results.

---

## 1. Mission and non-negotiable rules

Grand Line Archive is a website and management application for the One Piece Card Game. It supports a public storefront/archive, product and inventory management, card catalogue and scanner features, checkout/orders, images, sets, and site customisation.

**Technology and services**
- **GitHub:** source code, branches, pull requests, commit history and CI.
- **Cloudflare Workers:** hosting and deployments (the project has been described as a Worker, not a Pages project).
- **Supabase:** PostgreSQL database, authentication and image/object storage.
- **Vite:** frontend build tooling.
- **VS Code:** local development environment.

**Rules**
1. Protect the original production website and production database.
2. Never deploy to production or modify production data without the user's explicit approval for that specific action.
3. Never blindly merge branches, pull requests or migrations.
4. Preserve all working features and original shop data, including products, images, administrator access and homepage settings.
5. Keep preview/testing and production environments strictly separate.
6. Never expose API tokens, passwords, service-role keys, anon keys or other secrets in reports, commits, screenshots or this file.
7. Verify actual files, commits, CI results, Cloudflare deployment records, runtime requests and database records. Do not rely only on old chat statements or PR descriptions.
8. Distinguish **verified now**, **previously reported but needs re-verification**, and **unknown/not yet checked**.
9. Do not claim a task is complete until the relevant result has been observed and recorded.
10. Do not repeat completed work unnecessarily. Read this file and the latest checkpoint first.
11. Keep a chronological project history and individual prompt checkpoints in the repository where possible.
12. After each meaningful stage, update this file, save a dated checkpoint, record exact commit SHAs and changed files, and provide a downloadable copy.

---

## 2. Repository and project identifiers

### GitHub
- Repository: `andrew420t/the-grand-line-archive`
- Repository URL: https://github.com/andrew420t/the-grand-line-archive
- Previously reported production branch: `master`
- Previously reported master commit at initial baseline (25 Nov 2026):  
  `70029519438f2a15e6030523104325552d60674a`

### Important branches and pull requests (historical snapshot; re-check before use)
- PR #26 — scanner / catalogue / admin and related improvements; previously reported as 69 changed files.
- PR #27 — safe preview/demo overlay; previously reported as two changed files (`src/App.jsx` and `src/PreviewDemo.jsx`); described as demo-only and not a full database-backed site.
- PR #5 — older Cloudflare preview workflow; previously reported unsafe to reuse unchanged because it used generic `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` names in a preview workflow.
- Integration branch previously created:
  `integration/grand-line-archive-2026-11-25`
- Integration branch source commit previously reported:
  `8240334bc8b4bb008e7e75012389182ee8188532`
- PR #28 — previously reported as the integration pull request, left as a draft.
- A separate recovery branch/deployment named `integration/recovery-2026-11-25` was mentioned in a later Cloudflare history inspection. Its current existence and contents must be checked.

Branch URLs:
- Integration branch: https://github.com/andrew420t/the-grand-line-archive/tree/integration/grand-line-archive-2026-11-25
- PR #28: https://github.com/andrew420t/the-grand-line-archive/pull/28
- PR #26: https://github.com/andrew420t/the-grand-line-archive/pull/26
- PR #27: https://github.com/andrew420t/the-grand-line-archive/pull/27
- PR #5: https://github.com/andrew420t/the-grand-line-archive/pull/5

**Important caution:** A prior report said PR #26 showed 683 commits ahead but its actual diff was 69 files. Commit counts are not feature counts. Re-fetch current refs and inspect actual file diffs and commit ancestry.

---

## 3. Cloudflare hosting and deployment history

### Previously reported findings (must re-verify live)
- Cloudflare account contained a Worker named `the-grand-line-archive`.
- No Cloudflare Pages projects were found in the inspection described in the prior conversation.
- Worker production URL:
  https://the-grand-line-archive.andrew420-t27.workers.dev
- Production branch was reported as `master`.
- A previous inspection reported 33 production builds.
- Initial deployment was reported as approximately seven days before 25 Nov 2026, from commit `5fc4dc5` (short SHA only; resolve the full SHA).
- Separate preview deployments were reported for:
  - `preview/safe-demo-mode`
  - `feature/scanner-number-first-verification`
  - `integration/grand-line-archive-2026-11-25`
  - `integration/recovery-2026-11-25`

Previously supplied preview URLs:
- Integration preview: https://db699eec-the-grand-line-archive.andrew420-t27.workers.dev
- Safe demo preview: https://preview-safe-demo-mode-the-grand-line-archive.andrew420-t27.workers.dev/
- Scanner feature preview: https://feature-scanner-number-first-verificatio-the-grand-line-archive.andrew420-t27.workers.dev/

These URLs were reported as available in a prior dashboard inspection. They may be stale, incomplete or point to older builds. Check Cloudflare deployment history and current deployment status before recommending one as the canonical preview.

A prior check of `https://the-grand-line-archive.andrew420-t27.workers.dev/shop` returned a 404 through the available browser check. This did not establish that the Worker root or all routes were broken. Re-test root and application routes separately.

### Environment separation (previously reported)
Two separate sets of variables were described:
- Production build variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Preview build variables: `VITE_PREVIEW_SUPABASE_URL`, `VITE_PREVIEW_SUPABASE_ANON_KEY`

A prior Cloudflare dashboard inspection reported:
- Preview Supabase project reference: `ehzqsnfkmwphyllhaqhe`
- Production Supabase project reference: `aknokkfeufkfsggdfsyi`
- Preview had preview-specific variables.
- Production used its production project variables.
- A leftover preview URL variable was reportedly configured in the Production environment and considered unnecessary.
- `WORKERS_CI_BRANCH` was said to be injected automatically by Cloudflare Workers Builds, and the project code checked it to distinguish preview from master.

**Important:** These were dashboard observations, not sufficient proof of runtime isolation. Prompt 3 was marked complete in the old conversation, but runtime verification was explicitly still required. Confirm the actual compiled preview and browser network requests use only the testing project. Confirm no production URL/key fallback is possible. Do not print secret values.

---

## 4. Supabase projects and original shop data

Two Supabase projects were identified in prior read-only investigations.

### Production project (reported)
- Project reference: `aknokkfeufkfsggdfsyi`
- Display name was described as `andrew420.t27@gmail.com's Project`.
- Previously reported data:
  - 32 products
  - 23 sets
  - 5 categories
  - 2 administrator profiles
  - 9 product image records
  - Original homepage settings
- Original Brook product record reported:
  - Card number `OP15-032`
  - Product image reportedly present in Supabase.
- Original Loki product record reported:
  - Card number `OP17-119`
  - Product image reportedly present.
  - Product marked as featured.
- Homepage setting `card_of_the_week_product_id` was reportedly empty, despite Loki being marked featured. This may explain why Loki was not displayed as Card of the Week; verify actual setting and frontend logic.
- Original product/image data and administrator profiles were reported to remain present during a read-only inspection.

### Testing project (reported)
- Project reference: `ehzqsnfkmwphyllhaqhe`
- Display name: `Grand Line Archive Testing`
- Previously reported:
  - 0 products
  - 25 sets
  - 5 categories
  - 0 administrator profiles
  - Seven staging migrations
  - Scanner/catalogue-related tables
  - Recognition examples table empty
  - Recognition reference image bucket private
  - Three security-advisor warnings requiring review

An earlier snapshot compared the testing project as having 13 public tables and the other project as having 10 public tables. A later inspection described the production project as containing the original shop data above. Re-check current schemas and migration history; do not assume these counts remain current.

### Data preservation and testing-data policy
- Do not copy production wholesale into testing.
- First inventory production schema, records, storage objects, auth users/profiles, settings and foreign-key relationships.
- Design a reviewed, minimal and privacy-safe seed/export procedure for representative test data.
- Preserve original images and their storage paths/metadata where permitted.
- Create or configure a separate testing administrator account using a safe supported process; never copy passwords or expose auth secrets.
- Test with synthetic or explicitly approved representative records where possible.
- Do not apply testing migrations to production automatically.
- Review SQL files as proposals before execution. The prior branch audit noted review-only SQL files; they must not be run blindly.

---

## 5. Original website features and required preservation

The original working site must be recovered rather than replaced by a demo.

Preserve and verify:
- Original homepage and storefront layout.
- Public shop/archive and navigation.
- Original products, product images, sets and categories.
- Brook (`OP15-032`) and Loki (`OP17-119`) records and image references.
- Card of the Week selection and display.
- Administrator login, profiles, roles and admin access.
- Product editing, deletion and inventory.
- Checkout, order creation, stock reservation, cancellation/restocking and order status transitions.
- Gibraltar local pickup wording/behaviour; do not reintroduce UK/worldwide shipping claims.
- Homepage and archive customisation controls.
- Admin image library, uploads and image management.
- Collections and Sets administration, set filters and bulk import.
- Product-to-public-Archive publishing flow, if present in the latest source.
- Existing user-uploaded card photos must not be overwritten by sample/reference images.

### Card image library concept
A central card catalogue/reference image library should support:
- Scanner identification.
- Public Archive display.
- Inventory/product entry.
- Catalogue/set/variant metadata.
Keep official/reference imagery distinct from user-uploaded product photographs and storage objects. Confirm usage rights and source terms before importing or redistributing third-party images. Free-to-view does not automatically mean free to copy or republish.

Earlier conversation mentioned these card websites as research/reference sources:
- TCGKing: https://www.tcgking.com/
- Unicorn Cards: https://www.unicorncards.co.uk/
- TCG Republic: https://tcgrepublic.com/
- ManaMarket: https://www.manamarket.com/

These names were raised in a discussion, but the user later clarified that the key issue was the lost build/deployment trail and original website, not simply researching these sites. Do not treat them as confirmed data sources or assume bulk image copying is permitted.

---

## 6. Newer development to preserve and reconcile

PR #26 was previously reported as containing 69 changed files across these feature groups:

### Scanner and recognition
- Number-first OCR.
- Lower-right card-number region detection.
- Card-number-only and full-card scan modes.
- Manual crop selection, explicit confirmation and crop validation.
- Candidate extraction and ranking.
- English/Japanese matching and fallback.
- Recognition memory for previously verified image matches.
- Image references and fallbacks.
- Regression tests and scanner reports.

### Catalogue and card metadata
- Supplemental OP18/EB05 references.
- DON!! metadata.
- Official card-list links.
- Set, rarity, language and variant metadata.
- Catalogue confirmation UI, including reference image, card name, number, language, set, rarity and variant.
- Ability to select another candidate and optionally remember the match in the browser.

### Admin, products and image handling
- Admin catalogue confirmation.
- Language controls for English/Japanese text.
- Product editing improvements.
- Quick Add and bulk-import improvements.
- Image library.
- Photo preparation.
- Storage pagination.
- Safer upload rollback.

### Checkout and orders
- Checkout snapshot validation.
- Atomic checkout request preparation.
- Order-status transition checks.

### Environment, tests and SQL
- Preview/production environment separation logic.
- Regression tests.
- Review-only SQL proposals (inspect before use).

### PR #27 demo
- Previously described as a safe local sample-card demo/scanner workbench.
- Two files reported: `src/App.jsx`, `src/PreviewDemo.jsx`.
- Does not use a real Supabase session or persist database changes.
- Useful as a separate demo mode, but it is not the complete database-backed website.
- Integrate only if it can coexist cleanly with the original app and database-backed preview. Do not let demo mode replace the actual application.

### PR #5 workflow
- Old Cloudflare preview workflow should not be merged unchanged.
- It reportedly used generic production-style Supabase variable names in preview.
- Rework only if needed, using dedicated preview variables and explicit fail-closed checks.

---

## 7. Scanner catalogue coverage and known testing evidence

Previously recorded scanner/catalogue work:
- Scope: OP-01 to OP-18 (18 sets), EB-01 to EB-05 (5 sets), PRB-01 and PRB-02 (2 sets).
- Intended 100-image reference smoke test: 25 sets × 4 cards (2 English + 2 Japanese).
- Earlier reference dataset coverage snapshot dated 22 Oct 2026:
  - English: 5,626 / 5,705 with image references.
  - Japanese: 4,997 / 4,997.
- Known source gaps at that time: OP-18 and EB-05.
- 92 source locators were previously found; eight OP18/EB05 slots were supplemented with names/number references and candidate image URLs.
- Four official images were previously visually loaded: EN/JP OP01-001 Zoro and OP01-002 Law.
- Synthetic OCR test snapshot:
  - Tesseract 5.5 raw exact result: 57/100.
  - After PR20/PR21 normalization: 100/100.
  - These are synthetic text-crop tests, not proof of 100 physical-card recognition accuracy.
- Historical report files mentioned:
  - `docs/scanner-testing/progress.md`
  - commits `e3388f53b9db5b5c79662f49be3e3269bed3470b`
  - `13c9c5eaa987be965c64c9c8c430c1aa4db8b8c7`
- PR20 corrected O/0 confusion in set codes.
- PR21 corrected an extra O in the OP prefix.
- PR22 reference report.
- PR23 language fallback.
- PR24 ranking helper/tests.

All these are historical notes and must be checked against current repository state and test reports.

---

## 8. Historical build and CI findings

Previously reported:
- At one point, automated tests: 115/115 passed, lint passed, production build passed.
- Another report said PR #26 exact-head lint/build were clean, with eight non-blocking lint warnings noted in a separate later summary. These reports may refer to different commits/runs; reconcile them.
- Main JavaScript bundle previously reported as 767.36 kB.
- Master verification workflow reportedly ran on pull requests but not direct pushes to master.
- A later integration branch/PR had a documentation-only commit without its own CI result confirmed.
- Earlier deployment issue: assets-only Worker error caused by an unnecessary `ASSETS` binding in `wrangler.jsonc`; a fix was reportedly merged (commit `12c5d04`).
- Other historical fixes:
  - Duplicate product slug error `products_slug_key`; unique slug generation using card name, number, variant and unique ID; merge commit reported as `5cd4614`.
  - Cloudflare deployment configuration and Gibraltar local pickup wording.
  - Admin image library and scanner/card-number search improvements.
- These commit IDs and outcomes must be confirmed against current GitHub history before relying on them.

---

## 9. Current 11-prompt plan

The user wants an 11-prompt structured process. Do not reset or renumber it without a clear reason.

| Prompt | Scope | Status at last handover |
|---|---|---|
| 1 | Current baseline: GitHub, Cloudflare, Supabase, branches and deployments | Completed historically; refresh baseline as needed |
| 2 | Compare PR #26, #27 and #5; identify work to preserve | Completed historically; refresh if refs changed |
| 3 | Environment separation: preview must use testing Supabase, never production | Dashboard check reported complete; runtime verification still required |
| 4 | Recover original website and assemble safe integration candidate | **Current prompt / next work** |
| 5 | Complete integration verification: tests, lint, build, regression, migrations and config | Pending |
| 6 | Deploy complete Cloudflare preview connected only to testing Supabase; verify runtime | Pending |
| 7 | Full website acceptance testing: homepage, login, admin, products, inventory, archive, checkout, settings | Pending |
| 8 | Scanner, cropping, card images, catalogue, sets, variants and sample coverage | Pending |
| 9 | Production database preparation, backups, migrations, security and integrity review | Pending |
| 10 | Production release readiness and explicit approval gate | Pending |
| 11 | Approved production deployment and final handover | Pending |

### Prompt 4 — user's supplied scope
Investigate the entire project history across GitHub, Cloudflare and Supabase. Identify the original working website, deployment, configuration, database connections and authentication setup. Trace builds/previews to establish why the newer preview differs.

Recover and preserve:
- Original homepage/storefront.
- Brook and Loki products and uploaded images.
- Original Card of the Week configuration.
- Administrator profiles and login functionality.
- Original products, sets, categories and settings.
- Image storage and image references.
- Existing checkout and inventory.
- Valuable scanner, catalogue, admin and archive improvements.

Determine original code/configuration to restore and newer features to integrate. Assemble a complete integration candidate without overwriting master or production. Do not assume production data should be copied wholesale into testing. Establish a safe, reviewed method for representative testing data and authentication.

### Prompt 5 — user's supplied scope
Run all available automated tests, lint, production builds and regression checks. Inspect changed files, dependencies, migrations and environment configuration. Resolve errors, duplicates, missing functionality and conflicts. Report exact results; do not claim success without evidence.

### Prompt 6 — user's supplied scope
Deploy the verified integration candidate to a separate Cloudflare preview. Connect exclusively to the dedicated testing Supabase project. Verify the compiled application and runtime network connections. Provide one clear preview link to the complete application.

---

## 10. Permanent project archive structure

Maintain these paths in the GitHub repository (create only after checking whether equivalent files already exist):

```text
docs/
  project-history/
    REMEMBER.md
    GRAND_LINE_ARCHIVE_MASTER_PROJECT_HISTORY.md
    checkpoints/
    testing/
    deployments/
```

If repository conventions already use another project-history path, inspect and preserve it rather than creating duplicate competing archives.

Each completed prompt should produce:
1. Updated `REMEMBER.md`.
2. Updated chronological master history.
3. Individual dated checkpoint.
4. Downloadable Markdown checkpoint for the user.
5. Exact branch name and commit SHA.
6. Changed-file list.
7. Test commands and actual results.
8. Outstanding issues and next action.
9. Explicit statement of whether production, databases, secrets, settings or deployments were changed.

The `REMEMBER.md` is the concise but comprehensive recovery brain. The master history is chronological. Individual checkpoints provide stage-specific evidence.

---

## 11. Immediate next actions — Prompt 4

Do these in order, read-only first:

1. Read the current repository state and existing project-history/checkpoint files. Search the repository for any prior `REMEMBER`, recovery, handover, deployment or project-history document.
2. Re-fetch current `master`, integration branch, PR #26, #27, #28, #5 and any recovery branches. Record full SHAs and merge bases.
3. Inspect Cloudflare Worker configuration, deployment history, build source SHAs, branch/environment settings and current preview deployments. Identify which historical build most closely matches the original working shop.
4. Inspect both Supabase projects read-only: schema, migration history, products, sets, categories, profiles, homepage settings, storage buckets and object metadata. Never expose credentials or personal data unnecessarily.
5. Trace the original homepage, login flow, Card of the Week setting, Brook/Loki image paths and product rendering through source code and database records.
6. Compare the original deployed source with current `master`, PR #26 and PR #27. Create a file-by-file preservation/integration map.
7. Identify why the previous preview differed (e.g. demo-mode routing, wrong app entry point, missing seed data, wrong environment variables, auth/profile mismatch, missing storage objects, or stale deployment). Prove the cause rather than guessing.
8. Propose a safe testing-data/auth plan. Do not copy production data or users until the user has reviewed and approved the specific plan.
9. Build the integration candidate on a separate branch only after the comparison is complete. Do not alter `master`, production Supabase or the live Worker.
10. Run checks on the candidate and save exact evidence. If any checks are unavailable, state that clearly.
11. Update this file and the checkpoint. Only then decide whether Prompt 4 is complete and tell the user when Prompt 5 is appropriate.

### Prompt 4 acceptance criteria
Prompt 4 is not complete merely because a branch exists or a preview URL loads. It is complete only when:
- The original website/build lineage is identified with evidence.
- The reason for the preview mismatch is established or clearly bounded as unresolved.
- Original product/image/admin/homepage data dependencies are mapped and preserved.
- New features to retain are mapped and conflicts resolved in the candidate.
- A separate integration candidate exists without production changes.
- The candidate's build and basic checks have actual recorded results.
- The checkpoint and master recovery file are updated.

---

## 12. Open risks and unknowns

- Whether the previously reported production Worker and preview URLs are still active.
- Full SHA for the original first deployment commit `5fc4dc5`.
- Whether the current `master`, integration branch and PR heads still match the historical SHAs above.
- Whether PR #28 remains open/draft and what it currently contains.
- Whether the production database still has exactly 32 products, 23 sets, 5 categories, 2 administrator profiles and 9 image records.
- Whether Brook and Loki still exist with the reported card numbers and working image objects.
- Why `card_of_the_week_product_id` was empty and how the homepage chooses the featured card.
- Whether the two original administrator profiles map correctly to Supabase Auth users and current application role checks.
- Whether the preview runtime truly uses only testing Supabase; dashboard variable names alone are insufficient.
- Whether image references in production point to existing public/private storage objects and whether the preview can safely use seeded copies.
- Whether the original storefront and the scanner feature branch can be combined without overwriting changes.
- Whether third-party card image sources permit reuse or redistribution.
- Whether current CI, lint, tests, build and browser acceptance tests pass on the latest candidate.

---

## 13. Conversation recovery instructions for the assistant

When this file is uploaded:
1. Acknowledge that this is the Grand Line Archive recovery file.
2. Read it fully before asking the user to repeat project details.
3. Treat the latest status as a historical checkpoint dated 25 Nov 2026, not guaranteed current state.
4. Use connected GitHub, Cloudflare and Supabase tools to re-verify the relevant state before making changes.
5. Search for and read the latest repository checkpoint and master history.
6. Continue from Prompt 4 unless a newer checkpoint explicitly records a later prompt.
7. Do not restart Prompts 1–3 unless evidence shows their findings have materially changed.
8. Keep the user informed of meaningful findings, blockers, approvals and completed stages.
9. Never claim background work is happening between messages unless an actual supported automation/task is configured.
10. Never claim that a file was saved in GitHub or a deployment was made unless the relevant tool confirms it.

**The user's desired collaboration style:** clear, practical explanations; step-by-step progress; one complete working preview rather than disconnected demos; careful preservation of the original shop; and the light-hearted Batman/Robin theme. Use the theme naturally, without letting it obscure technical facts.

---

## 14. Latest known state at time this file was created

- Date in conversation: 25 November 2026.
- User has supplied Prompt 4 scope and requested this `REMEMBER` file as the durable memory of the entire project.
- The current task is to create this recovery file. It has not yet been confirmed saved to the GitHub repository.
- The user has not supplied an existing `REMEMBER` file; this document is being created as the first consolidated recovery record.
- No new GitHub, Cloudflare or Supabase inspection has been performed as part of creating this document.
- No branch, PR, database, secret, Cloudflare setting or deployment has been changed as part of creating this document.
- **Next action:** Use this file as the recovery baseline and begin Prompt 4's read-only investigation. Save a repository copy after checking current repository structure and permissions.

**End of REMEMBER master recovery file.**

---

## 15. Prompt 4 — live investigation update (25 November 2026, Europe/Gibraltar)

### Current state
Prompt 4 remains **IN PROGRESS**. No production deployment, production database change, migration, data transfer, merge to `master`, or Cloudflare setting edit was performed in this investigation.

### Current GitHub snapshot
Fresh GitHub connector checks returned:
- PR #26: open, unmerged, not draft, mergeable; base `master` at `70029519438f2a15e6030523104325552d60674a`; head `feature/scanner-number-first-verification` at `8240334bc8b4bb008e7e75012389182ee8188532`; 69 changed files, 683 commits ahead reported by GitHub.
- PR #27: open, unmerged, draft; based on PR #26 head `8240334bc8b4bb008e7e75012389182ee8188532`; head `preview/safe-demo-mode` at `0c98feea685449bdaaae3b8c5eaeac845ba889b4`; exactly two changed files: `src/App.jsx`, `src/PreviewDemo.jsx`.
- PR #28: open, unmerged, draft; base `master` at `70029519438f2a15e6030523104325552d60674a`; head `integration/grand-line-archive-2026-11-25` at `281a9c8cd33162cdf3f206d23843c99b2906238d`; 72 changed files. It includes PR #26's 69-file source snapshot plus integration/audit/checkpoint documentation.
- PR #5: open, unmerged, not draft; old branch `setup/cloudflare-preview-deployments`; workflow file `.github/workflows/cloudflare-preview.yml`; it requests generic `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` secrets for PR previews. Do not merge this workflow unchanged.
- Comparing `master` to the current integration branch reports 688 commits ahead, 0 behind, merge base exactly current `master` SHA `70029519438f2a15e6030523104325552d60674a`.
- Comparing previously validated commit `6b335da39cd573a1cea04b5b09585a3a6b40f493` to current PR #28 head `281a9c8cd33162cdf3f206d23843c99b2906238d` shows four commits ahead, zero behind, with the remaining differences limited to `.github/workflows/verify.yml` and two documentation files (`docs/project-integration/2026-11-25-retry-lookup-results.md`, `docs/project-integration/2026-11-25-validation-results.md`). This is not evidence that the current head has its own CI status; the combined status query for `281a9c8...` returned no statuses.
- Existing validation report in the repository records commit `6b335da39cd573a1cea04b5b09585a3a6b40f493`, workflow run #846, 161 tests passed / 0 failed, lint passed with 8 warnings / 0 errors, and production Vite build passed. Main minified chunk was 767.36 kB (218.34 kB gzip). This is a prior validation commit, not the current PR #28 head. Report URL: https://github.com/andrew420t/the-grand-line-archive/blob/integration/grand-line-archive-2026-11-25/docs/project-integration/2026-11-25-validation-results.md
- PR #26's latest description also reports exact head `bc2d17b30c8a43fd4b442f1734ad6510a7355ea7` with workflow runs #741 and #742 passing. It explicitly says 100/100 sample image slots were load-verified; this is **not** proof of 100/100 physical-card OCR. Real physical-card OCR remained limited, with the reported Saint Shamrock sample failing number/name recognition. Confirm branch history and exact commit relationship before using these runs as current integration evidence.

### Cloudflare findings — live dashboard read-only audit
Worker:
- Name: `the-grand-line-archive`
- URL: https://the-grand-line-archive.andrew420-t27.workers.dev
- GitHub repo: `andrew420t/the-grand-line-archive`
- Production branch: `master`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: `/`
- Compatibility date: `2026-11-20`
- Static assets Worker; no worker bindings reported.
- Cloudflare dashboard reported latest production deployment commit prefix `81e1d12e` (full SHA not yet resolved; GitHub fetch using the short SHA returned no commit).
- Recent preview list included `integration/grand-line-archive-2026-11-25`, `integration/recovery-2026-11-25`, `preview/safe-demo-mode`, `audit/full-project-review`, scanner/catalogue feature branches and test branches.
- Dashboard production environment variable NAMES included `VITE_PREVIEW_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL`. Values were not inspected or recorded.
- Preview environment variable NAMES included `SUPABASE_PUBLISHABLE_KEY`, `VITE_PREVIEW_SUPABASE_ANON_KEY`, `VITE_PREVIEW_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`. Values were not inspected or recorded.
- Both required preview-specific variables are present. The extra generic `VITE_SUPABASE_ANON_KEY` and `SUPABASE_PUBLISHABLE_KEY` are present by name too, but source configuration must be checked to ensure they cannot be selected by a preview build.
- No Cloudflare settings were edited and no deployment was triggered.

### Integration preview browser inspection
Preview URL inspected:
https://integration-grand-line-archive-2026-11-2-the-grand-line-archive.andrew420-t27.workers.dev

Observed:
- It renders the full branded storefront shell, with Home, Archive/Shop, account sign-in, basket, Gibraltar local pickup messaging, and Captain's Quarters/admin access route.
- It displays 0 cards in stock and an empty featured haul / Card of the Week area.
- It has 25 sets.
- It displays a Cloudflare preview banner explaining that only `VITE_PREVIEW_SUPABASE_*` variables are exposed and that the preview database destination should be confirmed.
- No visible page/runtime errors were reported by the browser inspection.
- This inspected integration preview is **not** PR #27's demo overlay. PR #27 is a separate sample-card/local scanner workbench that deliberately has no Supabase session and no database writes.
- The empty integration storefront is consistent with the testing database having no products; it is not evidence that the original production product records were deleted.

### Supabase live read-only findings
Production project reference: `aknokkfeufkfsggdfsyi`.
Testing project reference: `ehzqsnfkmwphyllhaqhe`.

A fresh read-only query of the production project found:
- Brook `OP15-032`: active, has image URL.
- Loki `OP17-119`: one active record with image URL and `featured = true`; a second inactive Loki record without an image also exists.
- Two profile rows, both with `role = admin`.
- One `site_settings` row with `id = homepage`.
- `card_of_the_week_product_id` is empty.
- `featured_product_ids` is empty.
- Homepage heading is `Cards worth a bounty.`
- Public Storage bucket `product-card-images` contains 26 objects.

A fresh read-only count query of testing project found:
- 0 products
- 0 profiles
- 0 Supabase Auth users
- 25 sets
- 5 categories

The previous report of 9 image records refers to product image records in the earlier investigation; the latest direct storage count is 26 objects in `product-card-images`. Do not conflate product image rows and storage objects.

No production data was modified. No production data has been copied to testing.

### Source comparison findings
- `master/src/App.jsx` contains the original database-backed storefront application with public routes, shop, product detail, customer order history, basket/checkout, auth modal, and admin route.
- Integration `src/App.jsx` is a modification of that storefront, not a replacement with the PR #27 demo. It adds catalogue-reference image fallback, filters public storefront products to explicit `active` status, improved catalogue browsing, checkout/order guards, site-settings support and other PR #26 changes.
- Master `src/admin/AdminAccess.jsx` contains an additional four-digit access-code screen before Supabase email/password authentication. The literal code is hard-coded in source and is a weak additional gate; do not reproduce the code in this memory file or treat it as a secure substitute for authentication.
- Integration `src/admin/AdminAccess.jsx` removes that extra code screen but retains Supabase email/password authentication and requires the authenticated user's `profiles.role` to equal `admin`.
- Production currently has two profile rows with admin role. Auth user IDs/passwords and personal details are not recorded here. Verify that both profiles map to valid Auth users and check RLS before any login test.
- Integration `src/lib/buildEnvironment.js` determines preview status from `WORKERS_CI_BRANCH`, `CF_PAGES_BRANCH`, `GITHUB_HEAD_REF`, or `GITHUB_REF_NAME`; if Cloudflare CI metadata is present but branch metadata is absent, it fails closed to preview.
- Integration `src/lib/supabaseConfig.js` selects only `VITE_PREVIEW_SUPABASE_URL` and `VITE_PREVIEW_SUPABASE_ANON_KEY` for preview builds, and only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for production builds. Unit tests for config selection are included in the candidate. Still verify actual runtime network destination.
- `src/siteSettings.js` defaults `card_of_the_week_product_id` to an empty string; it also normalizes Gibraltar local-pickup wording and includes theme/homepage customization fields.
- `src/publicProducts.js` exposes only products with status `active`.
- Checkout helpers validate fresh product status, price and stock and prepare the `create_order_atomic` RPC request. Server-side RPC/schema and RLS must be verified before real checkout testing.
- Admin product editing, image upload, storage pagination, bulk import, scanner and catalogue features are present in PR #26's change set.
- SQL under `supabase/review-only/` is explicitly review-only and must not be applied to production or testing without a separate schema/RLS review and user approval.

### Important explanation for the previous broken preview
The strongest confirmed cause of the empty integration preview is the testing database's empty products/profiles/auth tables. The integration preview uses the preview-only Supabase configuration and renders a live storefront shell, but with no products it cannot show the original Brook/Loki stock, featured cards or original administrator profiles. A separate demo preview exists on PR #27 and is intentionally not database-backed. Do not confuse the demo URL with the full database-backed integration preview.

Still unknown:
- The exact current value/destination of Cloudflare preview URL variable (do not expose its anon key).
- Full SHA and complete source of Cloudflare's reported latest production deployment `81e1d12e`.
- Whether current production deployment source exactly matches the current GitHub `master` source.
- Whether the original Card of the Week logic expected a `featured` product flag or `card_of_the_week_product_id`; DB setting is empty while active Loki is `featured=true`.
- Whether the original admin access-code step was actively used by the user and whether removal is desired. Preserve strong Supabase admin-role verification regardless.
- Whether original images should be seeded into testing via copies or safe public URLs; design a reviewed plan, don't copy automatically.
- Current production order table/RPC/schema and whether the atomic checkout proposal matches live schema.
- Runtime network destination of the currently deployed integration preview.

### Prompt 4 next actions
1. Resolve Cloudflare's latest production deployment short SHA to a full commit and compare that exact deployed source with current `master` and PR #26.
2. Trace `site_settings` loading and homepage Card of the Week rendering in source; determine whether `featured` and `card_of_the_week_product_id` are both supported and how to restore Loki intentionally.
3. Inspect production `products`, `product_images`, storage object metadata, profile/auth relationships, orders/order_items and relevant RLS without exposing private customer data.
4. Inspect the testing project's migrations, schema, RLS, Storage and RPC functions. Draft (do not run) a minimal test seed plan for a small selection of products including Brook/Loki, copied image objects and a separate test admin user.
5. Compare the current PR #28 integration branch and PR #26 source with the original deployed commit. Record all source files that change admin login, home settings, product loading, images, checkout and inventory.
6. Decide whether to restore the original extra access-code UI or retain the more secure direct Supabase admin login. User's actual original login experience must be preserved, but do not weaken role checks.
7. Assemble a candidate on the isolated integration branch only after the comparison is complete. Do not modify master, production Supabase, or the live Cloudflare deployment.
8. Verify the exact candidate commit with tests/lint/build and browser-based staging. Existing 161/161 test report applies to `6b335da...`, not the current PR #28 head.
9. Update this file, master history and dated checkpoint. Only mark Prompt 4 complete when acceptance criteria in Section 11 are satisfied.

### Latest activity safety statement
This investigation included read-only GitHub, Cloudflare dashboard, browser preview and Supabase queries. It made no GitHub writes, no Cloudflare setting edits, no deployment, no Supabase data/schema changes, no migration execution and no production data transfer.
