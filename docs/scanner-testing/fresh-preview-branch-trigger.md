# Fresh scanner staging Preview

This branch exists solely to create a new Cloudflare Worker Preview after the Preview Base build variables were configured.

Base application source: feature/scanner-number-first-verification at 0aff5946579776a897f0aa543cd3e5d86545ceea.

Expected Preview-only Vite variables:
- VITE_PREVIEW_SUPABASE_URL (dedicated Grand Line Archive Testing project)
- VITE_PREVIEW_SUPABASE_ANON_KEY (Testing publishable/anon key)

This is a preview-only branch. Do not merge it to master or use the Production deploy command. Verify the built bundle uses Testing configuration before database or authentication testing.

The existing feature/scanner-number-first-verification branch and previous Preview are retained unchanged.
