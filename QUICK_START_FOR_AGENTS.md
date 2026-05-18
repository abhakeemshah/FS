# Getting Started Guide

## For Team Members

### 1. Clone & Install (First Time)
```bash
git clone https://github.com/abhakeemshah/FS.git
cd FS-Communication
npm ci
```

### 2. Set Up Environment
```bash
# Copy template
cp .env.example .env.local

# Fill in any required values (most are already set for dev)
```

### 3. Start Development
```bash
npm run dev
```
Visit http://localhost:3000 in your browser.

### 4. Verify Setup
- [ ] Dev server starts without errors
- [ ] Can access login pages
- [ ] TypeScript/ESLint shows no errors: `npm run lint`

---

## For AI Agents & Automated Tools

### Code Structure
- **Pages:** `src/app/login/admin/` and `src/app/login/staff/`
- **Components:** `src/components/` (reusable React components)
- **Utils:** `src/lib/` (auth, data persistence, JWT)
- **API:** `src/app/api/` (backend routes)

### Key Files to Know
- `src/components/app-modal.tsx` — Modal component (used everywhere)
- `src/lib/staff-auth.ts` — Staff authentication helpers
- `src/lib/sales-utils.ts` — localStorage data management
- `prisma/schema.prisma` — Database schema
- `package.json` — Scripts: `dev`, `build`, `start`, `lint`, `seed`

### Common Tasks

#### Reading Code
```bash
# View TypeScript errors
npm run lint

# Compile check
npm run build

# Open database UI
npx prisma studio
```

#### Making Changes
1. Edit files in `src/`
2. Run `npm run lint` to verify
3. Test in browser at http://localhost:3000
4. Commit with: `git add . && git commit -m "type(scope): message"`

#### Understanding Modals
All modals in this app use the `AppModal` component:
```tsx
<AppModal 
  onClose={() => setOpen(false)}
  cardClassName="w-full max-w-5xl rounded-2xl border border-slate-300 shadow-2xl"
>
  <div>Modal content here</div>
</AppModal>
```

#### Authentication Pattern
```tsx
import { checkStaffAccess } from '@/lib/staff-auth';

// Check if user is admin
const isAdmin = checkStaffAccess(staffId, 'admin');

// Check if user is staff
const isStaff = checkStaffAccess(staffId, 'staff');
```

#### Data Persistence
```tsx
import { readStoredArray, writeStoredArray } from '@/lib/sales-utils';

// Read
const bills = readStoredArray('SALES_BILLS_STORAGE_KEY');

// Write
writeStoredArray('SALES_BILLS_STORAGE_KEY', updatedBills);
```

### Rules for Modifications
- ✅ TypeScript strict mode — all types must be correct
- ✅ Use `"use client"` only when necessary (client-side state/effects)
- ✅ Follow AppModal pattern for modals
- ✅ Use Tailwind CSS for styling
- ✅ No secrets in code (use environment variables)

### Debugging
```bash
# Type check
npm run lint

# Test build
npm run build

# Watch for changes
npm run dev

# Check database
npx prisma studio
```

---

## Project Details

**Framework:** Next.js 16 (App Router)  
**Language:** TypeScript  
**Styling:** Tailwind CSS  
**Database:** Prisma + SQLite  
**Auth:** NextAuth + JWT (custom)  

See `ARCHITECTURE.md` for full technical details.

