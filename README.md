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

Photography upload requires a public `product-card-images` Storage bucket and a `product_images` table. Website customisation requires a `site_settings` table. Those objects are not present, and no database or Storage changes have been run. The review-only migration proposal must be checked for compatibility with the actual `public.is_admin()` signature and approved before it is applied. It adds admin-only write policies for the new objects while leaving existing policies untouched; product image URLs are publicly readable for active catalogue products.

OCR is browser-based and free; its worker and language data are downloaded on the first scan, so network access is required. Camera capture requires browser permission and HTTPS (or localhost). The photo studio accepts uploads, supports front/back/detail roles, rotation and card cropping, and compresses images in the browser.
