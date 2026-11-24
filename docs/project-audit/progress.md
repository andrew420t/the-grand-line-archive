# Grand Line Archive — Full Project Audit

Updated: 2026-11-24

## Audit status
- Full audit started from scanner feature branch head `775639fcae66b40547e3bb6d4b16ba4a6a7b6005`.
- Audit branch: `audit/full-project-review`; all review work remains off `master`.
- Current scanner PR #26 head: `8240334bc8b4bb008e7e75012389182ee8188532`; PR remains open and unmerged.
- Review covers user-facing functionality, scanner, catalogue/data/images, inventory, storefront, admin, Supabase/security, tests, performance/accessibility, and deployment.
- This document records evidence, not assumptions. Items marked “review needed” are not confirmed defects.

## Initial repository observations
1. `package.json` provides `npm test`, `npm run lint`, and `npm run build`; the project uses React/Vite, Supabase JS, and browser Tesseract OCR.
2. CI workflow `.github/workflows/verify.yml` runs tests, lint, and build on pull requests to master and pushes to the two named feature branches. Audit branch is not included in the explicit push list, though PRs targeting master should trigger it.
3. README documents schema limitations: OCR-only extra fields (color, power, cost, card_type, effect_text, language, classification, variant_label) are not in the confirmed products schema and must not be silently discarded; photo studio requires `product_images` table and `product-card-images` bucket; customisation requires `site_settings`. Migration compatibility and order/payment/stock transaction handling remain review areas.
4. PR #26 documents number-first OCR, full-card/number-only modes, optional crop, catalogue confirmation, 8 supplemental samples, and a 100-case image matrix. 100/100 image slots load-verified is not OCR evidence; real-photo OCR evidence remains one physical sample with failed recognition. OP18/EB05 are sample supplements, not full-set imports.
5. Preview configuration in `src/lib/supabaseConfig.js` deliberately reads only `VITE_PREVIEW_SUPABASE_URL` and `VITE_PREVIEW_SUPABASE_ANON_KEY` for preview builds; absent values resolve to empty strings rather than falling back to production variables. The actual Cloudflare Preview variable values are not visible through repository source and remain unverified.

## Preview checkpoint (2026-11-24)
- Cloudflare's PR #26 bot comment reports a successful build and deployment for exact commit `8240334`.
- Latest immutable deployment URL: https://c776dab8-the-grand-line-archive.andrew420-t27.workers.dev
- Branch preview alias: https://feature-scanner-number-first-verificatio-the-grand-line-archive.andrew420-t27.workers.dev
- GitHub Actions test/lint/build checks for `8240334` completed successfully.
- A direct request from the available verification environment failed DNS resolution. This does not establish whether the link is reachable from the user's browser; app rendering and browser interaction are not yet verified.
- Do not sign in, upload images, or perform database-backed tests until Cloudflare Preview variables are confirmed to point to an isolated staging Supabase project/storage. Viewing static pages may be possible, but the actual preview environment configuration is unknown.
- No Cloudflare settings, secrets, Supabase resources, production data, merge, or production deployment were changed.

## Priority audit queue
- [ ] Critical security/data-integrity and auth/RLS review.
- [ ] Scanner workflow and crop/manual fallback review; real-photo test gaps.
- [ ] Catalogue import completeness and set/language/variant/image coverage.
- [ ] Inventory add/edit/delete and empty-field-clearing workflow.
- [ ] Storefront/product/order flow and pickup-only messaging.
- [ ] Admin imports/image library and feature dependencies.
- [ ] Supabase schema/policies and migration proposals (read-only).
- [ ] Accessibility, performance, test coverage, deployment/preview safety.

## Findings and actions
- Confirmed preview deployment exists for PR #26 head `8240334`; actual browser reachability and environment isolation remain unverified.
- No production changes were made. Continue with code-level review and safe preview verification; record severity, paths, evidence, remediation, and test results.
