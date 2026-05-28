Handover summary for client testing

Status:
- Code: ✅ TypeScript checks passed and production build succeeds locally.
- Routes: ✅ API routes compiled and present (`/api/status`, `/api/auth/*`, `/api/catalog-state`, `/api/ledger-state`).
- Hosting: ❗ Hostinger WAF/Protection returned 403 for `/api/status` during checks; please follow the deployment checklist to disable/whitelist.

What I did from repo side:
- Added `DEPLOYMENT_CHECKLIST.md` and `README_DEPLOY.md` with environment and WAF steps.
- Added diagnostics script: `diagnostics/hostinger_diagnostics.sh`.
- Added Hostinger support request draft: `HOSTINGER_SUPPORT_REQUEST.txt`.

Tests for you to run after Hostinger changes:
- See `DEPLOYMENT_CHECKLIST.md` for curl commands and steps.

If you want, I can:
- Run smoke tests after you toggle WAF off.
- Prepare a small test user creation script or Seed SQL if you want demo data.
