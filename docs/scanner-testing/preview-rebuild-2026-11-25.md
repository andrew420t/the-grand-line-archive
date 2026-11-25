# Scanner Preview rebuild checkpoint — 25 November 2026

## Why a fresh Preview is required

The current deployment snapshot for scanner commit `8240334bc8b4bb008e7e75012389182ee8188532` still displays the Preview banner saying that Supabase is not configured. The application code intentionally uses only `VITE_PREVIEW_SUPABASE_URL` and `VITE_PREVIEW_SUPABASE_ANON_KEY` for Preview builds. It does not fall back to Production credentials.

Source reviewed:
- `vite.config.js` chooses the `VITE_PREVIEW_` env prefix for Cloudflare feature-branch builds.
- `src/lib/buildEnvironment.js` identifies non-`master`/non-`main` branches as Preview builds and fails closed if Cloudflare branch metadata is missing.
- `src/lib/supabaseConfig.js` reads the two Preview-specific Supabase variables only when the bundle is a Preview build.
- `.github/workflows/verify.yml` runs tests, lint and the Vite build, but does not itself provide the Cloudflare Preview environment variables. The Cloudflare Workers Build/Preview pipeline must perform the build with its Preview Base variables.

The previous deployment IDs `c776dab8` and `62ec2d7e` are immutable deployment snapshots. Adding or correcting build variables later does not modify those already-created deployments.

## Staging data restoration completed

User explicitly approved a selective copy from Production into the dedicated `Grand Line Archive Testing` Supabase project (`ehzqsnfkmwphyllhaqhe`).

Verified in Testing after the copy:
- 32 product rows: 5 active and 27 inactive.
- 9 `product_images` metadata rows.
- 26 objects in the `product-card-images` Storage bucket (29,623,164 bytes), including 17 Image Library images and 9 product-photo objects.
- 25 existing sets and 5 existing categories retained; source set and category foreign keys were mapped to matching Testing records by code/name without duplicate set creation.
- The original `homepage` site-settings record restored, including the original homepage text/sections and Gibraltar-local-pickup-only wording.
- Product and product-image URLs were changed to the Testing Supabase Storage host. Verification found 0 Production-host image URLs in those two tables.

No Production rows, objects, settings, users, profiles, credentials or orders were changed or copied.

A one-time image-transfer Edge Function remains present in Testing but has been locked: version 2 requires JWT and returns HTTP 410. It no longer contains the copy routine.

## Next verification

1. Let Cloudflare Workers Builds process this feature-branch update with the already-configured Preview Base build variables.
2. Confirm the new Preview no longer displays the "Supabase is disabled" banner.
3. Confirm the runtime Supabase URL is the Testing project, never the Production project.
4. Confirm the storefront reads the 5 active products and original homepage settings; verify image links resolve to Testing Storage.
5. Create/confirm a separate Testing admin account before admin or write tests. Do not copy Production auth users or profiles.
6. Resume scanner and full-site testing against Testing only.

## Safety boundary

- Keep `master` and the Production deployment/database untouched.
- Do not merge this PR or deploy to Production.
- Do not use Production credentials as a Preview fallback.
- Do not transfer customers, orders, auth users, profiles or secrets.
