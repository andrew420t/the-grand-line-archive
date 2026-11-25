# Fresh scanner staging Preview

This branch exists solely to create a new Cloudflare Worker Preview after the Preview Base build variables were configured.

Base application source: feature/scanner-number-first-verification at 0aff5946579776a897f0aa543cd3e5d86545ceea.

Expected Preview-only Vite variables:
- VITE_PREVIEW_SUPABASE_URL (dedicated Grand Line Archive Testing project)
- VITE_PREVIEW_SUPABASE_ANON_KEY (Testing publishable/anon key)

This is a preview-only branch. Do not merge it to master or use the Production deploy command. Verify the built bundle uses Testing configuration before database or authentication testing.

The existing feature/scanner-number-first-verification branch and previous Preview are retained unchanged.


## Preview variable correction — 25 November 2026

The Cloudflare Previews Base settings were saved with:
- `VITE_PREVIEW_SUPABASE_URL` pointing to the dedicated Testing project.
- `VITE_PREVIEW_SUPABASE_ANON_KEY` updated to the active `sb_publishable_` key retrieved from the Testing project.

A previous fresh Preview recognized that preview configuration existed but returned `Invalid API key`, because the preview-specific key field still contained a legacy JWT-style value. The user has now replaced the correct Preview key field with the active Testing project's publishable key and confirmed that settings were saved.

This documentation-only commit is intended to trigger a brand-new Preview deployment after that settings save. The next step is to verify the unique deployment URL and confirm the client is connected to Testing. Do not merge or deploy this branch to Production.
