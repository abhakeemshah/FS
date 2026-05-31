# Project Handover (Short)

This file contains the minimal commands and notes to run, build, and deploy the project.

Local development

- Install dependencies:

  npm ci

- Development server (fast):

  npm run dev

Notes:
- By default development uses file-based snapshots. To force DB usage locally set `FS_USE_DB=true` and ensure `DATABASE_URL` points to a running MySQL.

Production (build + start)

- Build:

  npm run build

- Start production server (after build):

  npm start

Environment variables (important):

- `DATABASE_URL` — MySQL connection string (mysql://user:pass@host:3306/dbname). If unset the app uses file-based snapshots.
- `NEXTAUTH_SECRET` — required for authentication.
- `NEXTAUTH_URL` — full URL of the site (e.g. https://admin.example.com).
- `FS_USE_DB` — when `true` forces DB usage in non-production (useful for testing).
- `HEALTH_CHECK_TOKEN` — optional, used by the `/api/status` health endpoint in production.

Deploy notes (Hostinger / generic)

- Ensure Node.js app is created and environment variables are set in the host control panel.
- On the server run:

  npm ci
  npx prisma db push   # create tables if needed
  npm run build
  npm start

- If using `pm2`, you can run `pm2 start ecosystem.config.js --name fs-communication` instead of `npm start`.

Backups & restore

- Backup scripts are in `scripts/` (see `README_BACKUPS.md`).
- Restore CLI: `npx tsx src/scripts/restore-snapshot.ts` (requires proper env and confirmation).

Where to look for issues

- Server logs: `pm2 logs fs-communication` or host provider logs.
- Local logs: `.next/` and terminal output when running `npm run dev` / `npm start`.

Contact

- Leave any final questions in the repo issues or email the project owner.
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
