# Grand Line Archive — Integration Checkpoint
Date: 2026-11-25 (Europe/Gibraltar)

## Current safe integration candidate
- Candidate branch: `integration/grand-line-archive-2026-11-25`
- Candidate head at creation: `8240334bc8b4bb008e7e75012389182ee8188532`
- Source: PR #26, `feature/scanner-number-first-verification`
- PR #26 base: `master`
- PR #26 base SHA: `70029519438f2a15e6030523104325552d60674a`
- Current master SHA verified from PR metadata: `70029519438f2a15e6030523104325552d60674a`
- GitHub compare confirms candidate is ahead of master by 683 commits, behind by 0, with merge-base exactly equal to master.
- GitHub reports 69 changed files in PR #26. The large ahead-commit count is history, not 683 changed files.

## What has been done
- Re-fetched live metadata for PRs #26, #27 and #5.
- Confirmed PR #26 is open, unmerged, non-draft, and GitHub currently reports it mergeable.
- Confirmed PR #27 is open, draft, and based directly on PR #26 head `8240334bc8b4bb008e7e75012389182ee8188532`; its head is `0c98feea685449bdaaae3b8c5eaeac845ba889b4` and it adds only `src/App.jsx` and `src/PreviewDemo.jsx`.
- Confirmed PR #5 is open and its preview workflow still builds with generic `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; do not import that workflow unchanged.
- Created the isolated integration branch from the exact PR #26 head. No changes were made to master, PR branches, production, Cloudflare or Supabase.
- Retrieved and inspected `src/lib/buildEnvironment.js`, `src/lib/supabaseConfig.js` (continued review pending), `vite.config.js`, `package.json` and `.github/workflows/verify.yml`.
- Confirmed Vite uses `VITE_PREVIEW_` env prefix for preview builds and `VITE_` for production builds; Cloudflare CI with missing branch metadata is treated as preview (fail-closed).
- Exact-head combined status query for PR #26 head returned no status entries. The historical successful run references in the PR description do not prove the current head passed.

## 69-file scope
The PR includes app/storefront and admin changes, scanner/OCR/cropping and recognition memory, catalogue matching and image references, bulk import and Quick Add, image library/storage pagination, checkout/order helpers, Supabase environment configuration, tests, review-only SQL proposals, and scanner/audit documentation. Exact paths are available in PR #26's changed-files list.

## Critical safety notes
- Do not merge to master yet.
- Do not deploy this candidate to production.
- Do not apply any `supabase/review-only/` SQL to either database as part of this integration step.
- Do not use generic production Supabase variables in a preview build.
- PR #5's workflow needs rewriting to use dedicated preview-prefixed credentials and an explicitly isolated testing project before reuse.
- PR #27 is a demo overlay only; it must be evaluated separately after the core candidate is built and tested.

## Remaining work before calling this stage fully validated
1. Run tests, lint and production build against the candidate's exact head; the currently queried status endpoint returned no status entries.
2. Inspect all changed source/configuration and compare with current master for any subsequent master-only fixes; the PR base SHA currently equals master, so there are no master commits after the PR base in this snapshot.
3. Review the 69 files in logical groups and identify SQL proposals that remain review-only.
4. Inspect PR #27's two-file overlay separately and decide whether to include it in a separate demo-only preview.
5. Build a staging workflow using only dedicated preview Supabase settings; keep Cloudflare production untouched.

## Links
- Repository: https://github.com/andrew420t/the-grand-line-archive
- PR #26: https://github.com/andrew420t/the-grand-line-archive/pull/26
- PR #27: https://github.com/andrew420t/the-grand-line-archive/pull/27
- PR #5: https://github.com/andrew420t/the-grand-line-archive/pull/5
- Integration branch: https://github.com/andrew420t/the-grand-line-archive/tree/integration/grand-line-archive-2026-11-25

## Change log
2026-11-25: Created the isolated integration branch from PR #26's exact head. No merges, deployments, database writes, migrations, secret changes, or production changes.
