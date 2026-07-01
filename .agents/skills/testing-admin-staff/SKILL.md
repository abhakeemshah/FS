---
name: testing-admin-staff
description: Test the FS admin panel locally, especially the Staff section (create/list/manage staff). Use when verifying admin auth, staff CRUD, or any /access/admin/* page.
---

# Testing the FS admin & staff panel

Next.js 16 (Turbopack) app. Admin panel lives under `/access/admin/*` (the source routes are under `src/app/login/admin/*`; `/login` is the sign-in page). `middleware.ts` gates admin/staff routes on the `auth-token` cookie's JWT role.

## Run locally WITHOUT a real database
The app does NOT need a live MySQL to test auth/staff flows. `ensureDbReady()` early-returns unless `FS_USE_DB=true`, and Prisma calls fall back to a JSON file store (`data/staff-accounts.json`, written via `src/lib/staff-store-server.ts`). So a dummy `DATABASE_URL` is enough (the PrismaClient constructor just needs the env var present; it never has to connect).

Create `.env.local` (local testing only — do NOT commit):
```
ADMIN_EMAIL=admin@fs-communication.com
ADMIN_PASSWORD=admin1234
NEXTAUTH_SECRET=test-secret-for-local-testing-only
DATABASE_URL=mysql://user:pass@127.0.0.1:3306/fsdb
```
Then: `PORT=3000 npm run dev` (deps install via normal `npm install`; `postinstall` runs `prisma generate`).

## Log in as admin (UI)
Go to `http://localhost:3000/login`, keep the **Admin** tab selected, enter the `ADMIN_EMAIL` / `ADMIN_PASSWORD` values, click **Sign in as Admin**. This sets both the server `auth-token` cookie (needed by middleware + `/api/auth/staff`) and a client `fs-communication:admin-session` cookie (needed for the admin pages to render). It redirects to `/access/admin/dashboard`. Then click **Staff** in the sidebar → `/access/admin/staff`.

## Staff section checks
- Create: fill Name / Email / Password (min 4 chars) → **Create Staff**. Expect "Staff account created for <name>.", Total staff increments, and a row in **Access Controls**.
- The staff list row renders via `getStaffAccessMetaKey(account)` during render; expanding a row reads `metaMap[getStaffAccessMetaKey(account)]` (Role, Active/Suspend, Module Access grid). These paths are good discriminators for import/render regressions on `src/app/login/admin/staff/page.tsx`.

## Before/after pattern for a fix (no node_modules duplication)
`next.config.js` has `typescript.ignoreBuildErrors: true`, so type errors (e.g. missing imports) ship silently and surface at runtime as "This page couldn't load". To prove a fix, run the broken branch alongside the fixed one:
```
git worktree add -f /home/ubuntu/FS-broken main
cp -al /home/ubuntu/FS/node_modules /home/ubuntu/FS-broken/node_modules   # hardlink; a symlink is REJECTED by Turbopack
# give it its own .env.local + data/, then: (cd /home/ubuntu/FS-broken && PORT=3002 npm run dev)
```
Seed `data/staff-accounts.json` with one record on the broken side to trigger load-time crashes that only happen when ≥1 account exists. Clean up: `pkill -f "next dev"` then `git worktree remove /home/ubuntu/FS-broken --force` (kill the dev server first or removal fails with "Directory not empty").

## Gotchas
- `npm run lint` may be misconfigured in some checkouts; rely on `npx tsc --noEmit` for type checks and runtime testing for behavior.
- File store persists in `data/` per working directory (cwd). Delete `data/staff-accounts.json` to reset to an empty staff list.
- There is no CI on the repo; deploy is a manual pull/rebuild on Hostinger.

## Devin Secrets Needed
None for local testing — `ADMIN_EMAIL` / `ADMIN_PASSWORD` can be any local values you set in `.env.local`. Production uses the real values configured on Hostinger.
