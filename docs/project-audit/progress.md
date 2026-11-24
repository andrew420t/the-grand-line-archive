# Grand Line Archive — Full Project Audit

Updated: 2026-11-24

## Audit status
- Started full audit from scanner feature branch head `775639fcae66b40547e3bb6d4b16ba4a6a7b6005`.
- Audit branch: `audit/full-project-review` (created from that commit; no production changes).
- Review covers user-facing functionality, scanner, catalogue/data/images, inventory, storefront, admin, Supabase and security, tests, performance/accessibility, and deployment.
- This document records evidence, not assumptions. Items marked “review needed” are not confirmed defects.

## Initial repository observations
1. `package.json` provides `npm test`, `npm run lint`, `npm run build`; the project uses React/Vite, Supabase JS, and browser Tesseract OCR.
2. CI workflow `.github/workflows/verify.yml` runs tests, lint, and build on pull requests to master and pushes to the two named feature branches. Audit branch currently is not included in the explicit push list, though PRs targeting master should trigger it.
3. README documents schema limitations: OCR-only extra fields (color, power, cost, card_type, effect_text, language, classification, variant_label) are not in the confirmed products schema and must not be silently discarded; photo studio requires product_images table and product-card-images bucket; customisation requires site_settings. Review-only migration compatibility and order/payment/stock transaction handling remain areas to inspect.
4. PR #26 scanner feature is open and not merged. Its summary documents number-first OCR, full-card/number-only modes, optional crop, catalogue confirmation, 8 supplemental samples, and a 100-case image matrix. It also explicitly says 100/100 image slots load-verified is not OCR evidence; real-photo OCR evidence remains 1 physical sample and failed recognition. OP18/EB05 are sample supplements, not full-set imports.
5. Supabase client resolves preview configuration through `supabaseConfig.js`; preview isolation and recognition-memory sharing require careful review. No production data writes or deployments will be performed during this audit.

## Priority audit queue
- [ ] Critical security/data-integrity and auth/RLS review.
- [ ] Scanner workflow and crop/manual fallback review; test gaps.
- [ ] Catalogue import completeness and set/language/variant/image coverage.
- [ ] Inventory add/edit/delete and empty-field-clearing workflow.
- [ ] Storefront/product/order flow and pickup-only messaging.
- [ ] Admin imports/image library and feature dependencies.
- [ ] Supabase schema/policies and migration proposals (read-only).
- [ ] Accessibility, performance, test coverage, deployment/preview safety.

## Findings and actions
No confirmed code defects yet. Continue review and record findings with file paths, evidence, severity, remediation, and verification.
