Deployment checklist for fs-communication.com

1) Build & Typecheck (local)

- Run:

```bash
npx tsc --noEmit
npm run build
```

- Confirm build completes and routes are listed.

2) Health-check token (optional but recommended)

- Set an environment variable `HEALTH_CHECK_TOKEN` on Hostinger (in hPanel > Advanced > Environment Variables).
- The app accepts the token via header `X-Health-Check: <TOKEN>` for `/api/status` to bypass WAF checks if you configure Hostinger to accept this header.

3) WAF / Bot Protection (Hostinger)

- Temporarily disable WAF/Bot Protection/Imunify360/ModSecurity in Hostinger hPanel.
- If your plan allows, add allow rules for these paths:
  - `/api/auth/*`
  - `/api/catalog-state`
  - `/api/ledger-state`
  - `/api/status`

4) Deploy & restart

- After making WAF changes, redeploy the site from the Hosting dashboard and restart.

5) Smoke tests (from your machine)

```bash
curl -i https://fs-communication.com/api/status
curl -i -X POST https://fs-communication.com/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"x","role":"admin"}'
curl -i https://fs-communication.com/api/catalog-state
curl -i https://fs-communication.com/api/ledger-state
```

- Expect JSON responses (200 or 401 for login with invalid creds), not HTML challenge pages or 503/403 errors.

6) Login regression tests

- Attempt login from a fresh browser profile or Incognito on mobile and desktop.
- Ensure admin & staff dashboards render and API calls succeed.

7) Final handoff

- Commit any final changes and tag the commit (e.g., `v1.0.0-deploy-ready`).
- Provide Hostinger support transcript if needed (use `HOSTINGER_SUPPORT_REQUEST.txt`).
