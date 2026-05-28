Quick deploy instructions

1. Ensure env vars are set in Hostinger:
- `DATABASE_URL` (if using Prisma)
- `JWT_SECRET`
- Optional: `HEALTH_CHECK_TOKEN`

2. Build command (Hostinger): `npm run build`
3. Start command (Hostinger): `npm start` or rely on Hostinger's Next.js integration

4. If you see HTML bot-challenge pages on API POSTs, disable WAF or whitelist API routes as described in `DEPLOYMENT_CHECKLIST.md`.

5. Use `diagnostics/hostinger_diagnostics.sh` from this repo to run quick smoke tests after deployment.
