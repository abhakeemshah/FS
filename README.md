# FS-Communication

Short description

FS-Communication is the admin/staff sales and invoicing Next.js application used by our team. It contains the admin dashboard, staff interfaces, and shared components used for invoices, purchases, and staff management.

Quick start

Prerequisites:
- Node.js (recommended v18+)
- npm or pnpm

Clone and install:

```bash
git clone https://github.com/abhakeemshah/FS.git
cd FS-Communication
npm ci
```

Run development server:

```bash
npm run dev
```

Important files
- `src/app/login/admin/sales/invoices/page.tsx` — admin invoices page
- `src/app/login/staff/sales/page.tsx` — staff sales page
- `src/components/app-modal.tsx` — shared modal component
- `src/lib/staff-auth.ts` — local staff auth helpers

Environment variables

Contributing & workflow

Production Deployment (Hostinger)
- See [HOSTINGER_DEPLOYMENT.md](docs/HOSTINGER_DEPLOYMENT.md) for step-by-step deployment guide.
- Domain: admin.fs-communication.com
- Uses PM2 for process management and auto-restart.
- Requires Node.js 18+ on Hostinger.

- Create feature branches from `main` and open a PR for review; use the provided PR template.

Security & secrets
- Do not commit secrets. Use repository secrets or platform environment variables for production values.
- If a secret is accidentally committed, rotate it immediately and contact the team.

Support
- For questions, open an issue or ping the repository maintainer.
