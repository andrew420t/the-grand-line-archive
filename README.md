# Grand Line Archive

A dark, gold-accented React storefront for a One Piece TCG collector inventory. It uses Vite for development and Supabase for catalogue data, customer authentication, and order records.

## Run locally

The project expects `.env.local` with the Supabase project URL and browser-safe publishable/anon key:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Keep this file out of source control. Restart the Vite server after changing environment variables.

```sh
npm install
npm run dev
```

`npm run lint` and `npm run build` run the static checks and production build.

## Confirmed Supabase schema

The current integration uses the owner-confirmed columns:

- `products`: `id`, `name`, `slug`, `description`, `card_number`, `rarity`, `category_id`, `set_id`, `price`, `stock_quantity`, `image_url`, `featured`, `condition`, `status`, `created_at`, and `updated_at`.
- `categories`: `id`, `name`, `created_at`.
- `sets`: `id`, `name`, `code`, `description`, `created_at`.
- `profiles`: `id`, `display_name`, `role`, `created_at`.

The dashboard uses these existing tables for catalogue reads, product creation/editing/deletion, inventory changes, and set/category creation. Product inserts use `price`, resolve a scanned set code through `sets.code`, and store the resulting foreign key in `set_id`. Administrator access requires a signed-in user whose `profiles.id` matches the Auth user ID and whose `profiles.role` is `admin`.

The existing Row Level Security policies and `is_admin()` function are not changed by the app. Do not rely on browser route checks as a data-security boundary. Orders continue to use the current app integration; their schema was not part of the confirmed column list and should be checked separately before changing order/database behavior. Orders are recorded as pending; payment processing and transactional stock reservation are not configured.

## Admin card scanner and photography

The admin dashboard includes card scanning, quick inventory entry, product stock editing, and a photo studio. Scanning uses Tesseract.js in the browser; it has no paid API. The OCR worker and language data are loaded on the first scan, so that requires network access. OCR values are suggestions only and remain editable for manual verification.

Camera capture requires browser camera permission and a secure context (HTTPS, or localhost). The photo studio also accepts image uploads, supports front/back/detail roles, rotation, and card cropping. Images are compressed in the browser before upload.

The scanner extracts additional fields (`color`, `power`, `cost`, `card_type`, `effect_text`, `language`, `classification`, and `variant_label`). Those columns are not in the confirmed `products` schema, so the app preflights them and will not silently discard reviewed OCR values. A reviewed migration is needed to persist those fields. Set codes are matched to `sets.code`; no `set_code` product column is used.

### Bulk inventory category

The Inventory Book supports a separate `products.is_bulk` boolean. Existing products default to regular inventory; administrators can add or remove a product from Bulk in Quick Add, the Inventory Book row, or Edit Card. The Inventory Book defaults to regular inventory and has filters for Regular, Bulk only, and All inventory. This flag does not replace `category_id`, publication `status`, set, or card printing identity.

The reviewed SQL is `supabase/review-only/product-bulk-category.sql`. It has been applied and verified on the Testing Supabase project only. Apply it to Production before enabling Bulk classification there; the UI checks for the column and disables existing-product toggles until it is available.

Photography upload requires a public `product-card-images` Storage bucket and a `product_images` table. Website customisation requires a `site_settings` table. Those objects are not present, and no database or Storage changes have been run. The review-only migration proposal must be checked for compatibility with the actual `public.is_admin()` signature and approved before it is applied. It adds admin-only write policies for the new objects while leaving existing policies untouched; product image URLs are publicly readable for active catalogue products.

OCR is browser-based and free; its worker and language data are downloaded on the first scan, so network access is required. Camera capture requires browser permission and HTTPS (or localhost). The photo studio accepts uploads, supports front/back/detail roles, rotation and card cropping, and compresses images in the browser.

## Local-pickup order requests, messages and admin email

Checkout is an order request for local pickup in Gibraltar; it does not take an online payment. The storefront confirms the order only after `create_order_atomic` returns an order ID. The order row records a pickup method, customer details and email-notification status. Products are revalidated and stock is reserved in the same database transaction as the order and item rows.

Customer and admin messages are stored in `order_messages`. Reading is protected by RLS for the order owner and administrators; posting uses `send_order_message`, which derives the sender role from the authenticated user and only permits the customer who owns the order or an admin. Conversations close when an order is completed or cancelled.

The additive SQL proposal is `supabase/review-only/order-confirmation-messaging-email.sql`. It preserves legacy `orders.total`, `order_items.card_id`, and `price_at_purchase` columns while adding the fields required by the current storefront and conversation. It has been applied to the Testing Supabase project only; Production has not been migrated.

The `notify-new-order` Supabase Edge Function requires JWT verification. It emails administrator accounts resolved from admin profiles through Resend. Configure these Edge Function secrets on each intended project:
- `RESEND_API_KEY`: a Resend API key
- `ORDER_EMAIL_FROM`: a sender address on a domain verified in Resend

Never place these secrets in Vite variables, browser code, GitHub commits or chat. The function records `sent`, `not_configured` or `failed` on the order and uses an idempotency key to reduce duplicate email delivery. Admins can retry a failed or unconfigured notification from the Orders panel after secrets are configured.
