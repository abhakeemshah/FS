# FS-Communication — Repository Mapping

## 1) Core Tech Stack

- **Frontend:** Next.js (App Router) + React, TypeScript. Tailwind-like utility classes used in components.
- **Backend / API:** Next.js API routes under `src/app/api/.../route.ts`. Prisma client available for DB access.
- **Database:** Prisma with SQLite (development) — see `prisma/schema.prisma`.

---

## 2) Project Structure (high-level)

- `prisma/` — Prisma schema, migrations, local SQLite DB.
- `src/`
  - `app/` — Next.js App Router pages and API routes.
    - `login/`
      - `admin/` — Admin pages and dashboards (wrapped with `AdminShell`). Examples:
        - `src/app/login/admin/page.tsx` (redirect)
        - `src/app/login/admin/dashboard/page.tsx`
        - `src/app/login/admin/products/page.tsx`
        - `src/app/login/admin/staff/page.tsx` (staff management; admin-only)
      - `staff/` — Staff panel pages (wrapped with `StaffPageFrame`).
    - `api/` — server API route handlers.
  - `components/`
    - `admin-shell.tsx` — admin layout, sidebar, client-side guard.
    - `staff-page-frame.tsx` — staff client guard + `readOnly` propagation.
    - `staff-account-manager.tsx`
    - `app-modal.tsx`
  - `lib/`
    - `staff-auth.ts` — session keys, permission helpers, localStorage read/write.
    - domain stores: `catalog-store.ts`, `ledger-store.ts`.
  - `data/` — seed/static data.

---

## 3) Authentication & State

- Sessions and permissions are primarily stored in **localStorage**.
  - `fs-communication:staff-session` — staff session object (saved/read via `saveStaffSession()` / `readStaffSession()`).
  - `fs-communication:staff-access-meta` — map of staff permission metadata per user.
  - An admin demo flag is used: `admin-session-active` (set by `markAdminSessionActive()` and checked by `hasAdminSession()`).
- Components listen to `window` `storage` events and a custom `STAFF_AUTH_EVENT` to update UI on permission/session changes.
- There is a server-assisted lookup helper `fetchCurrentStaffAccessMeta()` that tries `/api/auth/me` and falls back to `/api/staff-meta?username=...` to sync metadata, but UI gating is client-side.
- To avoid SSR hydration mismatches, the app defers localStorage reads to client effects and exposes client-only booleans like `isAdminActive` or `canEdit`.

---

## 4) User / Staff Schema (snippets)

- Prisma `User` model (server-side persistent model):

```prisma
model User {
  id        String     @id @default(cuid())
  email     String     @unique
  password  String
  name      String?
  role      String     @default("staff") // "admin" or "staff"
  staffAccessMetaJson String?
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}
```

- Staff types in `src/lib/staff-auth.ts` (TypeScript):

```ts
export type StaffAccount = {
  id: string;
  name: string;
  username: string;
  password: string;
  createdAt: string;
  createdBy: string;
};

export type StaffSession = {
  id: string;
  name: string;
  username: string;
  loggedInAt: string;
};

export type StaffAccessMeta = {
  role: 'cashier' | 'sales' | 'inventory' | 'supervisor';
  status: 'active' | 'suspended';
  permissions: Record<StaffModuleKey, StaffAccessLevel>; // module -> 'none'|'view'|'edit'
  allowedSettings: StaffSettingKey[];
  lastUpdatedAt: string;
};
```

---

## 5) Critical Routing Snippets

- Admin login redirect (App Router page-level redirect):

```ts
// src/app/login/admin/page.tsx
import { redirect } from 'next/navigation';

export default function AdminLoginRedirect() {
  redirect('/login');
}
```

- Client-side admin guard (layout-level, `AdminShell`) — client effect that redirects staff away from admin pages when no admin session is active:

```ts
// src/components/admin-shell.tsx (client)
useEffect(() => {
  const check = () => {
    const staff = readStaffSession();
    if (staff && !hasAdminSession()) {
      router.push('/login');
    }
  };
  check();
  window.addEventListener('storage', check);
  window.addEventListener(STAFF_AUTH_EVENT, check);
  return () => { ... };
}, [router]);
```

- Admin dashboard page uses the AdminShell layout:
  - `src/app/login/admin/dashboard/page.tsx` (wraps UI in `<AdminShell active="dashboard" title="Dashboard">...`)

---

## Notes & Recommendations

- Current enforcement is UI-side only (localStorage + client checks). For production-grade RBAC, move session storage to server-side HTTP-only cookies/JWTs and enforce authorization in API route handlers and server middleware.
- To avoid hydration mismatches: keep localStorage reads inside client effects and render stable SSR-safe placeholders. The repo already uses this pattern in `AdminShell` and product pages.

---

## Next Actions (suggested)

- Convert server endpoints to verify permissions server-side before mutating data.
- Migrate session handling to server-managed sessions and return permission snapshot during SSR to render authorized UI server-side.


---

*Generated from the repository at the time of export.*
