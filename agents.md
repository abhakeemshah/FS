# FS-Communication — AI Agent Operational Guidelines

This document establishes strict operational guidelines and context boundaries for any AI agent interacting with the FS-Communication repository. Follow these rules to maintain code quality, system stability, and architectural consistency.

---

## Table of Contents

1. [Coding Conventions & Guardrails](#1-coding-conventions--guardrails)
2. [Standardized Debugging Protocol](#2-standardized-debugging-protocol)
3. [Migration Playbook](#3-migration-playbook-legacy-html-to-nextjs)
4. [Immediate Task Backlog](#4-immediate-task-backlog)
5. [Emergency Procedures](#5-emergency-procedures)

---

## 1. Coding Conventions & Guardrails

### 1.1 File Generation Rules

#### DO:
- ✅ Place new pages in `src/app/` following Next.js App Router conventions
- ✅ Use `.tsx` extension for all React components
- ✅ Use `.ts` extension for utility modules (no `.js` for new code)
- ✅ Export components as `export default function ComponentName()`
- ✅ Use descriptive, PascalCase filenames for components
- ✅ Use kebab-case for directory names (e.g., `login/admin/`)
- ✅ Keep files under 500 lines; split larger files into sub-components
- ✅ Add `'use client';` directive only when hooks/browser APIs are needed

#### DON'T:
- ❌ Create files in the root directory (except configuration)
- ❌ Use `.js` extension for new TypeScript files
- ❌ Place components outside `src/components/` or page-specific subdirectories
- ❌ Generate files without proper type definitions
- ❌ Create circular dependencies between modules

### 1.2 App Router Standards

#### Server Components (Default)
```typescript
// src/app/some-route/page.tsx
export const dynamic = 'force-dynamic'; // If data changes frequently
export const revalidate = 0; // No caching

export default async function Page() {
  // Fetch data directly (no useEffect needed)
  const data = await fetch('...', { cache: 'no-store' });
  return <div>{/* render */}</div>;
}
```

#### Client Components (When Needed)
```typescript
// src/app/some-route/page-client.tsx
'use client';

import { useState, useEffect } from 'react';

export default function PageClient({ initialData }: { initialData: any }) {
  const [data, setData] = useState(initialData);
  
  // Use hooks, browser APIs, event handlers
  return <div>{/* interactive UI */}</div>;
}
```

#### Pattern: Server → Client Data Passing
```typescript
// page.tsx (Server Component)
export default async function Page() {
  const data = await fetchData();
  return <PageClient initialData={data} />;
}

// page-client.tsx (Client Component)
'use client';
export default function PageClient({ initialData }) {
  // Use initialData as starting state
}
```

### 1.3 Prisma Schema Update Hygiene

#### Before Modifying `prisma/schema.prisma`:

1. **Backup the database:**
   ```bash
   npm run db-backup
   # or manually copy dev.db
   ```

2. **Create a migration (not push in production):**
   ```bash
   npx prisma migrate dev --name description_of_change
   ```

3. **Regenerate Prisma Client:**
   ```bash
   npx prisma generate
   ```

4. **Test in development before deploying**

#### Schema Modification Rules:
- ✅ Always add `@updatedAt` to new models
- ✅ Use `String` with `@id @default(cuid())` for IDs
- ✅ Use `DateTime` with `@default(now())` for timestamps
- ✅ Add indexes for frequently queried fields
- ✅ Document field purposes with `///` comments
- ❌ Never remove fields without verifying no code references them
- ❌ Never change field types without a migration strategy
- ❌ Never use `prisma db push` in production (use migrations)

### 1.4 Tailwind Styling Consistency

#### Design System Tokens:
```typescript
// Colors (from existing patterns)
- Primary: `indigo-600` (admin), `emerald-600` (staff)
- Backgrounds: `slate-50`, `white`
- Borders: `slate-200`, `blue-200` (active states)
- Text: `slate-900` (primary), `slate-500` (secondary)
- Danger: `rose-600`, `rose-50` (background)

// Spacing
- Page padding: `p-2 pt-2` with `space-y-3` gaps
- Component padding: `px-4 py-2` or `px-3 py-2.5`
- Section gaps: `space-y-3` or `space-y-4`

// Typography
- Headings: `font-['Manrope'] font-black tracking-tighter`
- Body: `text-sm` or `text-xs` (compact UI)
- Labels: `text-xs text-slate-700 font-semibold`

// Borders & Shadows
- Cards: `border border-slate-200 rounded-xl shadow-sm`
- Buttons: `rounded-full` or `rounded-lg`
- Hover: `hover:scale-[1.01] hover:shadow-md`
- Active: `active:scale-[0.98]`
```

#### Styling Rules:
- ✅ Use utility classes exclusively (no custom CSS unless absolutely necessary)
- ✅ Follow existing component patterns in `src/components/`
- ✅ Use `className` (not `class`) for JSX
- ✅ Leverage template literals for conditional classes
- ❌ Don't use inline `style={{}}` except for dynamic values
- ❌ Don't create custom CSS files in `src/` (use `globals.css` only)
- ❌ Don't override Tailwind with `!important`

### 1.5 Type Safety Requirements

#### Always define types for:
```typescript
// Props
type ComponentProps = {
  title: string;
  onClick?: () => void;
  children?: ReactNode;
};

// API responses
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Database records
type UserRecord = {
  id: string;
  email: string;
  role: 'admin' | 'staff';
};
```

#### Never use `any`:
```typescript
// BAD
function process(data: any) { }

// GOOD
function process(data: unknown) {
  if (typeof data === 'object' && data !== null && 'id' in data) {
    // Type guard
  }
}
```

---

## 2. Standardized Debugging Protocol

### 2.1 Error Discovery Workflow

When encountering a build or runtime error, follow this systematic approach:

#### Step 1: Identify Error Source
```bash
# Run build to capture errors
npm run build 2>&1 | tee build-log.txt

# Check TypeScript errors
npx tsc --noEmit

# Check for runtime errors in development
npm run dev
```

#### Step 2: Classify Error Type

| Error Category | Indicators | Resolution Path |
|----------------|------------|-----------------|
| **TypeScript** | `TS2304`, `TS2339`, `TS7006` | Fix type definitions, add type guards |
| **Import/Module** | `Cannot find module`, `Module not found` | Check file paths, verify exports |
| **Runtime** | `TypeError`, `ReferenceError` in console | Add null checks, verify data flow |
| **Database** | `PrismaClientInitializationError` | Check `DATABASE_URL`, run migrations |
| **Build** | `Compilation failed`, `Module build failed` | Check syntax, dependencies, config |
| **Authentication** | `401`, `403`, redirect loops | Verify JWT, cookies, middleware |

#### Step 3: Consult Log Files

```bash
# Recent build output
cat build-output.txt
cat build_output.txt

# Development server logs
cat dev.log

# PM2 production logs (if deployed)
pm2 logs fs-communication
cat logs/pm2-error.log
cat logs/pm2-out.log
```

#### Step 4: Apply Fix & Verify

```bash
# After making changes:
npm run build  # Verify build passes
npm run dev    # Test in development
npm run lint   # Check for linting errors
```

### 2.2 Common Error Patterns & Solutions

#### Error: `Cannot find module '@prisma/client'`
```bash
# Solution: Regenerate Prisma client
npx prisma generate
```

#### Error: `DATABASE_URL is not defined`
```bash
# Solution: Create .env file
echo "DATABASE_URL=\"file:./dev.db\"" > .env
# or for MySQL:
echo "DATABASE_URL=\"mysql://user:password@localhost:3306/db\"" > .env
```

#### Error: `JWT_SECRET is not set` (production)
```bash
# Solution: Set a strong secret
echo "JWT_SECRET=\"your-32-char-random-secret-here\"" >> .env
```

#### Error: TypeScript errors in `.next/` directory
```bash
# Solution: Clear build cache
rm -rf .next
npm run build
```

#### Error: Middleware redirect loops
```bash
# Solution: Check middleware.ts matcher config
# Ensure login page is excluded from auth checks
```

#### Error: `cookies() was called outside a request context`
```bash
# Solution: Use async/await with cookies() in App Router
const cookieStore = await cookies();
```

### 2.3 Automated Error Detection Script

Create a diagnostic script for future use:

```bash
#!/bin/bash
# scripts/diagnostics.sh

echo "=== FS-Communication Diagnostics ==="
echo ""

echo "1. Checking Node.js version..."
node --version

echo "2. Checking TypeScript compilation..."
npx tsc --noEmit --pretty

echo "3. Checking Prisma status..."
npx prisma validate

echo "4. Checking for .env file..."
if [ -f .env ]; then
  echo "✓ .env exists"
else
  echo "✗ .env missing"
fi

echo "5. Checking database connectivity..."
npx prisma db pull --check

echo "6. Running build test..."
npm run build

echo "7. Checking for common issues..."
grep -r "any" src/ --include="*.ts" --include="*.tsx" | head -10

echo ""
echo "=== Diagnostics Complete ==="
```

---

## 3. Migration Playbook: Legacy HTML to Next.js

### 3.1 Migration Strategy Overview

The repository contains legacy HTML files that need to be converted to Next.js App Router components:

| Legacy File | Target Route | Priority |
|-------------|--------------|----------|
| `staff.html` | `/login` + `/login/staff/*` | ✅ Complete |
| `invoices.html` | `/login/admin/sales/invoices` | High |
| `editor.html` | Various `*/editor` routes | Medium |

### 3.2 Step-by-Step Migration Process

#### Phase 1: Analysis & Preparation

1. **Read the legacy HTML file completely**
2. **Identify functional components:** forms, tables, modals, navigation, JavaScript interactions
3. **Map to existing patterns:** Check `src/components/` for similar UI patterns
4. **Plan the component structure** as server + client components

#### Phase 2: HTML to JSX Conversion

Key conversions:
- `class` → `className`
- `onchange` → `onChange`
- `onclick` → `onClick`
- `onsubmit` → `onSubmit`
- Self-close all tags (`<input>` → `<input />`)
- `style` objects: `style="color: red"` → `style={{ color: 'red' }}`

#### Phase 3: State Management Integration

Use React hooks for stateful elements:
- Form inputs → `useState`
- Modal open/close → `useState`
- Selected items → `useState`
- Loading states → `useState`

Connect to existing stores:
- `catalog-store.ts` for product data
- `ledger-store.ts` for sales/invoice data
- `staff-auth.ts` for user context

#### Phase 4: API Integration

Replace hardcoded data with API calls to existing endpoints:
- `/api/ledger-state` for sales and invoices
- `/api/catalog-state` for product catalog
- `/api/auth/staff` for staff management

#### Phase 5: Styling Migration

Convert CSS classes to Tailwind utilities following the design system tokens in section 1.4.

#### Phase 6: Testing & Validation

- Test all user interactions
- Verify form submissions
- Check navigation flows
- Validate data persistence
- Compare with original HTML file for visual consistency

---

## 4. Immediate Task Backlog

### Priority 1: Critical Stability (Do First)

1. **Enable TypeScript strict mode**
   - Change `"strict": false` to `"strict": true` in `tsconfig.json`
   - Fix all resulting type errors
   - Remove `ignoreBuildErrors: true` from `next.config.js`

2. **Update Prisma to latest stable version**
   - Current: 5.22.0 → Target: 7.x.x (follow upgrade guide)
   - Run `npx prisma migrate dev` after update
   - Test all database operations

3. **Implement proper error boundaries**
   - Add `error.tsx` files to route groups
   - Create global error handler component
   - Add proper error logging

### Priority 2: Feature Completeness

4. **Complete invoices migration**
   - Migrate `invoices.html` to `/login/admin/sales/invoices`
   - Implement full CRUD operations
   - Add search, filter, and pagination

5. **Complete editor routes**
   - Migrate `editor.html` patterns to `*/editor` routes
   - Standardize editor component API
   - Add validation and error handling

### Priority 3: Performance & Optimization

6. **Implement proper caching**
   - Add `revalidate` values where appropriate
   - Implement ISR for static content
   - Add React Query or SWR for client-side caching

7. **Optimize bundle size**
   - Analyze with `@next/bundle-analyzer`
   - Code-split large components
   - Remove unused dependencies

### Priority 4: Security Hardening

8. **Implement rate limiting**
   - Add rate limiting to auth endpoints
   - Protect against brute force attacks
   - Add CSRF protection

9. **Add input validation**
   - Validate all API inputs with Zod or Joi
   - Sanitize user input
   - Add SQL injection protection (Prisma handles this)

### Priority 5: Developer Experience

10. **Improve documentation**
    - Add inline JSDoc comments
    - Create API documentation
    - Add architecture diagrams

---

## 5. Emergency Procedures

### 5.1 Database Recovery

If the database becomes corrupted:

```bash
# 1. Stop the application
pm2 stop fs-communication

# 2. Restore from backup
cp .db_backup_env.template .env
# Or restore from a specific backup file
cp backups/dev-YYYY-MM-DD.db dev.db

# 3. Regenerate Prisma client
npx prisma generate

# 4. Restart application
pm2 start fs-communication
```

### 5.2 Build Failure Recovery

If the build fails in production:

```bash
# 1. Check build logs
pm2 logs fs-communication --err

# 2. Revert to previous version
git checkout <previous-commit>
npm run build

# 3. If build still fails, check for common issues:
#    - Missing environment variables
#    - Prisma client not generated
#    - TypeScript errors

# 4. As last resort, clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### 5.3 Authentication System Failure

If authentication breaks:

```bash
# 1. Check JWT_SECRET is set
echo $JWT_SECRET

# 2. Verify ADMIN_EMAIL and ADMIN_PASSWORD
echo $ADMIN_EMAIL
echo $ADMIN_PASSWORD

# 3. Clear auth cookies in browser
# 4. Check middleware.ts for errors
# 5. Verify database connection for user lookups
```

### 5.4 Rollback Procedure

To rollback to a previous deployment:

```bash
# 1. List PM2 processes
pm2 list

# 2. Stop current version
pm2 stop fs-communication

# 3. Checkout previous version
git checkout <previous-tag-or-commit>

# 4. Rebuild
npm run build

# 5. Restart
pm2 restart fs-communication

# 6. Verify
pm2 logs fs-communication
```

---

## Appendix A: Quick Reference Commands

```bash
# Development
npm run dev                    # Start development server
npm run build                  # Build for production
npm run start                  # Start production server
npm run lint                   # Run ESLint
npm run seed                   # Run database seed

# Database
npx prisma generate            # Generate Prisma client
npx prisma migrate dev         # Create and apply migration
npx prisma migrate deploy      # Apply migrations in production
npx prisma db push             # Push schema to DB (dev only)
npx prisma studio              # Open Prisma Studio GUI

# PM2 (Production)
npm run pm2:start              # Start PM2 process
npm run pm2:stop               # Stop PM2 process
npm run pm2:restart            # Restart PM2 process
npm run pm2:logs               # View PM2 logs

# Backup
bash scripts/db-backup.sh      # Create database backup
```

---

## Appendix B: File Structure Reference

```
fs-communication/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── login/              # Authentication pages
│   │   │   ├── admin/          # Admin dashboard routes
│   │   │   └── staff/          # Staff portal routes
│   │   ├── api/                # API routes
│   │   ├── categories/         # Product categories
│   │   └── sales/              # Sales/invoice routes
│   ├── components/             # Reusable React components
│   │   ├── admin-shell.tsx     # Main admin layout
│   │   ├── app-modal.tsx       # Modal component
│   │   ├── staff-page-frame.tsx # Staff permission guard
│   │   └── ...
│   └── lib/                    # Utility modules
│       ├── auth.ts             # Authentication utilities
│       ├── db.ts               # Prisma client
│       ├── staff-auth.ts       # Staff authentication
│       ├── ledger-server.ts    # Ledger operations
│       └── ...
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Database seed script
├── public/                     # Static assets
├── scripts/                    # Utility scripts
├── design.md                   # Architecture documentation
├── agents.md                   # This file
└── package.json                # Dependencies
```

---

*Document generated from repository analysis. Last updated: 2026-06-16*