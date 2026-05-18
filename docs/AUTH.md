# Authentication & Authorization Guide

## Overview
FS-Communication has two authentication methods:
1. **Admin login** — NextAuth with JWT (in `src/app/(internal)/login/admin/`)
2. **Staff login** — Local authentication (in `src/lib/staff-auth.ts`)

## Staff Authentication

### Understanding Staff Access
Staff authentication is **local** and uses helper functions in `src/lib/staff-auth.ts`.

### Check Access
```tsx
import { checkStaffAccess } from '@/lib/staff-auth';

// Returns true if staff is admin
const isAdmin = checkStaffAccess(staffId, 'admin');

// Returns true if staff is staff member
const isStaff = checkStaffAccess(staffId, 'staff');

// Returns true if staff is either admin or staff
const hasAccess = isAdmin || isStaff;
```

### Staff Roles
- **admin** — Full access to admin dashboard and all features
- **staff** — Limited access to staff dashboard (sales, purchases)
- **default** — No access (login page only)

### Login Flow (Staff)
1. User enters credentials on staff login page
2. System validates using `checkStaffAccess()`
3. If valid, user redirected to staff dashboard
4. **Note:** No persistent session stored (stateless for dev/demo)

## Admin Authentication

### JWT Tokens
JWT tokens are custom-implemented in `src/lib/jwt.ts`:
```tsx
import { createToken, verifyToken } from '@/lib/jwt.ts';

// Create token
const token = createToken({ id: 'admin-1', role: 'admin' });

// Verify token
const payload = verifyToken(token);
```

### Secret
- **Location:** `.env.local` → `NEXTAUTH_SECRET`
- **Current value:** Used for NextAuth and JWT signing
- **Important:** Rotate immediately if exposed (see SECURITY.md)

### Admin Login Flow
1. User accesses `/login/admin`
2. NextAuth redirects to login form
3. On submit, token is created and stored
4. User redirected to admin dashboard
5. Protected pages verify token on each request

## Authorization Patterns

### Page-Level Authorization
```tsx
import { checkStaffAccess } from '@/lib/staff-auth';

export default function StaffSalesPage() {
  const staffId = 'staff-123'; // Get from session/context
  
  if (!checkStaffAccess(staffId, 'staff')) {
    return <div>Access Denied</div>;
  }
  
  return <div>Staff Sales Dashboard</div>;
}
```

### Component-Level Authorization
```tsx
import { checkStaffAccess } from '@/lib/staff-auth';

export function AdminButton({ staffId }) {
  if (!checkStaffAccess(staffId, 'admin')) {
    return null; // Hide button for non-admins
  }
  
  return <button>Admin Action</button>;
}
```

### API-Level Authorization
```tsx
// src/app/api/admin/action/route.ts
import { checkStaffAccess } from '@/lib/staff-auth';

export async function POST(request) {
  const staffId = request.headers.get('x-staff-id');
  
  if (!checkStaffAccess(staffId, 'admin')) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  // Process admin action
  return Response.json({ success: true });
}
```

## Session Management

### Current Implementation
- **Session type:** Stateless (dev/demo mode)
- **Storage:** In-memory or localStorage
- **Persistence:** No automatic session persistence between page reloads
- **Note:** For production, implement persistent session store (database, Redis, etc.)

### Adding Persistent Sessions (Future)
To add database-backed sessions:
1. Update `src/lib/staff-auth.ts` to store sessions in Prisma
2. Add `Session` model to `prisma/schema.prisma`
3. Validate session ID instead of staffId on each request
4. Set secure HTTP-only cookies for session storage

## Security Best Practices

### Do's
- ✅ Always check authorization before sensitive operations
- ✅ Validate on both client and server
- ✅ Use `checkStaffAccess()` for role-based access
- ✅ Rotate secrets if exposed (see SECURITY.md)
- ✅ Use environment variables for sensitive values

### Don'ts
- ❌ Trust client-side authorization alone
- ❌ Store secrets in code
- ❌ Expose tokens in URLs (use headers)
- ❌ Commit `.env.local` to git
- ❌ Use default/weak secret values

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXTAUTH_SECRET` | Signs JWT tokens | `tjOX8ychAYrF8ZLYxk2G3...` |

See `.env.example` for full list.

## Troubleshooting

### "Access Denied" on Admin Page
- Check if `staffId` is being passed correctly
- Verify `checkStaffAccess()` returns `true`
- Check console for errors in `src/lib/staff-auth.ts`

### Token Verification Fails
- Verify `NEXTAUTH_SECRET` is set in `.env.local`
- Check token hasn't expired
- Ensure token was signed with same secret used to verify

### Session Lost on Page Reload
- This is expected in current dev implementation
- For persistence, implement session store in database
- See "Adding Persistent Sessions" section above

## Testing Authorization

### Manual Testing
```bash
# Start dev server
npm run dev

# Test staff login
1. Visit http://localhost:3000/login/staff
2. Use test staff credentials
3. Verify access to staff pages

# Test admin login
1. Visit http://localhost:3000/login/admin
2. Use test admin credentials
3. Verify access to admin pages
```

### Testing with Different Roles
```tsx
// In component for testing
import { checkStaffAccess } from '@/lib/staff-auth';

console.log('Is admin:', checkStaffAccess('staff-1', 'admin'));
console.log('Is staff:', checkStaffAccess('staff-1', 'staff'));
```

## References
- [SECURITY.md](SECURITY.md) — Security vulnerability reporting
- [ARCHITECTURE.md](ARCHITECTURE.md) — Technical architecture details
- `src/lib/staff-auth.ts` — Implementation source code
- `src/lib/jwt.ts` — JWT token implementation
