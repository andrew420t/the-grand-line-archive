# Grand Line Archive — Manual Test Checklist

Use this checklist only against a dedicated staging/test deployment and test Supabase project. Do not use production inventory, customer orders, storage objects, or live accounts for destructive or failure-injection tests.

## 0. Test-environment gate

- [ ] Confirm the tested frontend is built from the intended feature branch / PR commit.
- [ ] Confirm its environment variables point to the staging Supabase project, not production.
- [ ] Confirm a staging administrator account and a normal customer account are available.
- [ ] Review the proposed SQL in `supabase/review-only/` against the staging schema before applying anything. These scripts are proposals; this checklist does not authorize applying them.
- [ ] Review table-level and column-level grants for products, orders/order_items, product_images, site_settings, catalogue overrides, DON!! overrides, and Storage before applying restrictive guards or RPC write-path revokes.
- [ ] For atomic checkout/status RPCs, run the read-only trigger/schema preflight first; confirm existing triggers do not already reserve/restock stock, and verify `public.is_admin()` returns false (not NULL) for non-admins.
- [ ] Confirm the staging project has the required product columns, `product_images`, `site_settings`, catalogue override tables, DON!! override table, Storage bucket, and RLS policies before testing the corresponding features.
- [ ] Seed clearly labelled test products/cards and record their IDs so they can be removed after testing.
- [ ] Keep a copy of the test data and expected results.

## 1. Automated verification

- [x] Latest verified PR CI run **45224390314** on PR head `892cfb1eeba708cf144628c91c9609e26894d401`: tests, lint, and production build all passed.
- [ ] Re-check CI after any further code commit; the result must match the exact latest PR head.
- [ ] Do not treat a successful build as proof of physical scanner, browser camera, Supabase policy, or end-to-end checkout correctness.

## 2. Sign-in and access

- [ ] Sign in as a normal customer and confirm customer pages work.
- [ ] Sign in as the staging administrator and confirm the admin workspace opens.
- [ ] Confirm a non-admin account cannot access admin actions or write admin-only records.
- [ ] Confirm sign-out clears the authenticated/admin view.
- [ ] Confirm a failed profile/role lookup does not grant admin access.

## 3. Catalogue and scanner

Test several physical cards, not only screenshots:

- [ ] English card with a clear lower-right card number.
- [ ] Japanese card with a clear card number.
- [ ] OP, EB, and promotional card layouts where available.
- [ ] DON!! card with a catalogue sample image; confirm it is attributed to its source set where available, and does not show a pseudo card-number suffix or an unassigned-product label.
- [ ] Enable the required scanner crop; drag-select in both directions (top-left to bottom-right and reverse), adjust percentage fields, and reset to the full photo. Confirm scanning remains locked until a selection is made and explicitly confirmed, and that changing the crop/photo/toggle clears the confirmation.
- [ ] Confirm the crop is validated against normalized bounds and a 64-pixel minimum on each source dimension; tiny source/crop combinations must be rejected before OCR, not silently enlarged into confident-looking text.
- [ ] Confirm both number-area OCR and supporting full-card OCR use only the confirmed crop. The whole-frame OCR fallback must not be available; manual card-number search remains available.
- [ ] Test drag-selection with mouse, touch, and pen where available; verify pointer capture keeps the selection stable if the pointer exits the preview, and test selections touching each photo edge.
- [ ] Test a narrow/mobile viewport and a desktop viewport; confirm the preview's displayed aspect ratio matches the original photo and selection coordinates crop the intended pixels.
- [ ] Confirm the selected crop is used for both card-number OCR and supporting full-card text OCR, while the original photo remains the one saved to recognition memory.
- [ ] Try a crop that is too small or extends beyond the photo; confirm validation rejects it and no scan runs on a silently altered crop.
- [ ] A parallel/alternate-art printing that shares a card number with another version.
- [ ] A deliberately blurred, angled, or partially obscured card.
- [ ] A full-scene phone photo with tabletop/background margins and a card in a rigid holder (Saint Shamrock OP18-119 sample); verify the footer-region crops still include the card number or the scanner clearly requests a crop.

Expected behaviour:
- [ ] Scanner prioritises the lower-right card-number region and uses the full card as supporting evidence.
- [ ] Candidate results show enough set, number, language, and variant information to distinguish printings.
- [ ] Uncertain OCR remains a candidate for review; it must not silently confirm an incorrect printing.
- [ ] Official catalogue/reference imagery is visibly distinguishable from the user's own product photograph.
- [ ] A manual change to card number, set, language, variant, or selected set clears stale catalogue identity/reference-image values.
- [ ] Record false positives, missed reads, and camera/device details. Current OCR work does not claim robust automatic pixel-level photo matching or perspective correction for every camera angle.

## 4. Quick Add and duplicate protection

- [ ] Save a new card with a known existing set code.
- [ ] Confirm punctuation variants such as `OP17` / `OP-17` resolve to the same unique set.
- [ ] Confirm an ambiguous normalized set code does not select an arbitrary set.
- [ ] Confirm an exact same-language catalogue printing is blocked as a duplicate.
- [ ] Confirm a distinct printing key can be added as a separate printing.
- [ ] Confirm an ambiguous/legacy possible duplicate requires review and a variant label before a separate entry is allowed.
- [ ] Confirm extended card details trigger a schema preflight and fail before insertion when the required columns are unavailable.
- [ ] Double-click Save quickly and confirm only one product is created.
- [ ] Confirm a failed photo upload leaves the saved product recoverable for photo retry without creating a second product.

## 5. Product photographs and Image Library

- [ ] Upload front, back, and detail photographs to a staging product.
- [ ] Confirm uploaded files receive metadata and the front image becomes the product's catalogue image.
- [ ] Simulate an upload/metadata/front-image failure in staging and confirm the UI reports any cleanup/rollback failure rather than claiming full success.
- [ ] Confirm a concurrent newer front-image choice is not overwritten by an older upload's rollback.
- [ ] Add files to a queue while an upload is running and confirm they are not silently discarded.
- [ ] Search, filter, paginate, and change language in the Image Library quickly; confirm stale requests do not replace the latest results.
- [ ] In staging only, assign a DON!! card's source set, save, reload, and confirm the attribution/source note persists; verify a non-admin cannot read or write the override.
- [ ] Delete a saved library image and confirm the UI reports errors accurately.
- [ ] Delete a staging product and confirm the product row is deleted before Storage cleanup is attempted.
- [ ] If Storage cleanup fails, confirm the product deletion and remaining Storage cleanup warning are reported separately.

## 6. Bulk Import

- [ ] Download the CSV template and open it in a spreadsheet editor; confirm the header row contains only supported column names.
- [ ] Re-import a copy of the empty template with one valid test row added.
- [ ] Test quoted commas, doubled quotes, and multiline cells.
- [ ] Test numeric zero for power, cost, and counter; confirm zero is preserved and triggers extended-schema preflight.
- [ ] Test blank optional values and invalid negative/non-numeric price or quantity.
- [ ] Test normalized set-code matching and an unknown set code.
- [ ] Test duplicates within the CSV and against existing inventory; confirm the default skips them.
- [ ] Test a partial batch failure and confirm imported, skipped, and failed rows are reported accurately.
- [ ] Add a duplicate in staging after the CSV is loaded but before Import; confirm the import-time fresh paginated inventory check catches it and reports its row as skipped.
- [ ] Confirm imported non-zero-price products start as drafts and zero-price products start inactive.
- [ ] Confirm a missing extended schema blocks the batch before any rows are inserted.

## 7. Inventory and storefront

- [ ] Edit stock and price, including legitimate zero values.
- [ ] Confirm invalid stock quantities and prices are rejected.
- [ ] Publish and unpublish a staging product; confirm a zero-row/RLS-denied update is not shown as successful.
- [ ] Edit the full product form and confirm the saved row is verified.
- [ ] Confirm only explicitly active products appear in the public shop.
- [ ] Confirm draft, archived, blank-status, and unknown-status products are not public.
- [ ] Check product details, images, card number, set, rarity, language, condition, variant, and stock display.
- [ ] For a product without a seller photograph, confirm the catalogue reference image matches its printing ID/key or set+variant; if no exact match exists, show the placeholder instead of a different printing.
- [ ] Test search, set/category/rarity/language/condition/variant/stock filters, sorting, and pagination.

## 8. Basket, checkout, and orders

- [ ] Add multiple products to the basket and confirm totals.
- [ ] Change a product price in staging after it is in the basket; checkout must ask the customer to review the updated price.
- [ ] Reduce stock below the basket quantity; checkout must reject and refresh the displayed stock.
- [ ] Deactivate a product in the basket; checkout must reject it.
- [ ] Add duplicate cart lines for the same product and confirm their quantities are aggregated for stock validation.
- [ ] Double-submit checkout quickly and confirm the client prevents duplicate order creation.
- [ ] In staging only, simulate order-item insertion failure and confirm cleanup verifies that the pending order was actually deleted.
- [ ] Confirm successful checkout creates the order and its items and clears the basket.
- [ ] Confirm customer order history shows only that customer's orders.
- [ ] Confirm admin order status changes use the reviewed atomic RPC, verify the returned order ID, and enforce the allowed lifecycle transitions.
- [ ] Confirm the admin UI rejects invalid transitions before calling the RPC, and server-side checks still reject invalid transitions if the UI is bypassed.
- [ ] In staging, cancel a new pending/processing order with `stock_reserved=true` and confirm its stock is restored once; repeat the same cancellation and confirm no double-restock.
- [ ] Cancel a pre-migration legacy order with `stock_reserved=false` and confirm it does not restock inventory that was never reserved.
- [ ] Confirm shipped/completed orders cannot be cancelled/restocked and cancelled orders cannot be reopened.
- [ ] Review and apply the atomic checkout RPC proposal in staging only after verifying schema, existing stock triggers, RLS, grants, and order lifecycle.
- [ ] With the RPC enabled and client integrated in staging, test two concurrent checkouts for the same low-stock product; only one may succeed.
- [ ] Change the product price between the client's fresh price check and RPC call; the RPC must reject the stale expected price and ask the customer to review, not silently charge the new price.
- [ ] Send duplicate lines for one product with conflicting expected prices; reject before creating an order.
- [ ] Confirm successful checkout decrements/reserves stock exactly once and order + items + stock remain consistent if any insertion fails.
- [ ] Verify direct order/order-item insertion cannot bypass the approved stock reservation path, without breaking admin/order workflows.
- [ ] Do not run these concurrency/destructive tests against production.

## 9. Site settings and catalogue overrides

- [ ] Save homepage settings as the staging administrator and refresh to confirm persistence.
- [ ] Confirm a non-admin cannot write homepage settings.
- [ ] Save a catalogue override and confirm the conflict key distinguishes language, set, variant, and printing identity.
- [ ] Save English and Japanese DON!! source-set overrides for the same printing key and confirm they remain independent.
- [ ] Confirm missing override tables produce an actionable setup message rather than a false success.

## 10. Finish and record results

- [ ] Record browser, operating system, device, camera, and test date.
- [ ] Record each failed step with screenshots/logs and the relevant test product/order IDs.
- [ ] Remove only the labelled staging test data and files after results have been reviewed.
- [ ] Re-run the automated suite after any fixes.
- [ ] Do not merge or deploy until the PR has been reviewed and the user explicitly approves it.
