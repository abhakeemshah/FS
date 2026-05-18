# Project Architecture

## Overview
FS-Communication is a Next.js 16 admin/staff invoicing and sales management application. It uses the App Router (Next.js 16.2.3), React 19, TypeScript, Tailwind CSS, and Prisma ORM with SQLite.

## Folder Structure

```
src/
├── app/                              # Next.js App Router
│   ├── api/                          # API routes
│   ├── (internal)/                   # Internal routes (no navbar)
│   │   └── login/
│   │       ├── admin/                # Admin login flow
│   │       └── staff/                # Staff login flow
│   ├── login/
│   │   ├── admin/                    # Admin dashboard
│   │   │   └── sales/
│   │   │       └── invoices/         # Invoice management
│   │   └── staff/                    # Staff dashboard
│   │       ├── sales/                # Staff sales listing
│   │       └── purchases/            # Staff purchases
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Landing page
│   └── globals.css                   # Global styles (animations)
├── components/                       # React components
│   └── app-modal.tsx                 # Shared modal component
├── lib/                              # Utility functions
│   ├── jwt.ts                        # JWT token helpers
│   ├── staff-auth.ts                 # Staff authentication
│   └── sales-utils.ts                # Sales data persistence
└── data/                             # Static data

prisma/
├── schema.prisma                     # Database schema
└── seed.ts                           # Database seeding

```

## Key Architectural Patterns

### 1. **Modal Component Pattern**
All modals use the centralized `AppModal` component (`src/components/app-modal.tsx`):
- Accepts `cardClassName` and `overlayClassName` for styling
- Uses React `createPortal` for DOM mounting
- Click on overlay triggers `onClose` handler
- **Example styling:** `cardClassName="w-full max-w-5xl max-h-[92vh] overflow-visible rounded-2xl border border-slate-300 shadow-2xl"`

### 2. **Authentication Flow**
- **Admin login:** NextAuth with JWT in `src/app/(internal)/login/admin/`
- **Staff login:** Local auth helpers in `src/lib/staff-auth.ts`
- **JWT handling:** Custom implementation in `src/lib/jwt.ts`
- **Check access:** Use `checkStaffAccess()` from `staff-auth.ts`

### 3. **Local Data Persistence**
Sales and purchase data stored in localStorage using helpers in `src/lib/sales-utils.ts`:
- `readStoredArray(SALES_BILLS_STORAGE_KEY)` — retrieve data
- `writeStoredArray(SALES_BILLS_STORAGE_KEY, data)` — save data
- Key: `'SALES_BILLS_STORAGE_KEY'`

### 4. **Component Organization**
- **Page components** (`page.tsx`): Route handlers, data fetching, layout setup
- **Shared components** (`src/components/`): Reusable UI (modals, shells, etc.)
- **Utility functions** (`src/lib/`): Auth, data persistence, JWT handling

## Technology Stack

| Layer | Tech | Version |
|-------|------|---------|
| Framework | Next.js | 16.2.3 |
| UI Library | React | 19.2.4 |
| Language | TypeScript | 5.8.3 |
| Styling | Tailwind CSS | 3.4.17 |
| Database | Prisma ORM | 5.22.0 |
| Database Engine | SQLite | (dev.db) |
| Auth | NextAuth + JWT | Custom impl |
| Password Hash | bcryptjs | 3.0.3 |

## Database

**Location:** `prisma/dev.db` (development)  
**Schema:** `prisma/schema.prisma`  
**Setup:** Run `npm run seed` to initialize database

### Common Queries
```bash
# View schema
npx prisma studio

# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name <migration_name>
```

## Development Workflow

```bash
# Start dev server (Turbopack)
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Run TypeScript/ESLint checks
npm run lint

# Seed database
npm run seed
```

Server runs on `http://localhost:3000`

## Common Development Tasks

### Adding a New Page
1. Create file in `src/app/login/<role>/<section>/page.tsx`
2. Import layout: `import Shell from '@/components/shell'`
3. Wrap content with Shell component
4. Export as React component

### Creating a Modal
1. Use `AppModal` component from `src/components/app-modal.tsx`
2. Set `cardClassName` with appropriate max-width and height
3. Pass `onClose` handler for overlay clicks
4. Example:
```tsx
<AppModal 
  onClose={() => setShowModal(false)}
  cardClassName="w-full max-w-2xl rounded-2xl border border-slate-300 shadow-2xl"
>
  {/* Modal content */}
</AppModal>
```

### Fetching/Storing Data
1. For localStorage data: Use `readStoredArray()` / `writeStoredArray()` from `src/lib/sales-utils.ts`
2. For database data: Query via Prisma in API routes or server components

### Checking Authentication
```tsx
import { checkStaffAccess } from '@/lib/staff-auth';

const isAdmin = checkStaffAccess(staffId, 'admin');
```

## Environment Variables

See `.env.example` for required variables:
- `NEXTAUTH_SECRET` — Must be rotated if exposed

## Performance Notes

- **Turbopack** enabled in dev for faster builds
- **Next.js 16 App Router** with server components by default
- Use `"use client"` only when client-side features needed (state, effects, event handlers)
- Modal animations in `src/app/globals.css`

## Testing & Validation

- **TypeScript strict mode** enabled — all code should compile without errors
- Run `npm run lint` before committing
- Test locally: `npm run dev`, then visit pages in browser

## Deployment Considerations

- [ ] Rotate `NEXTAUTH_SECRET` before production
- [ ] Set environment variables on hosting platform (Vercel, Netlify, etc.)
- [ ] Enable branch protection on `main` (require PR reviews)
- [ ] Run `npm run build` locally to catch build errors early
- [ ] See SECURITY.md for secret management best practices
