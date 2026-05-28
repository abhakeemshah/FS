Hostinger troubleshooting steps for FS-Communication

Problem summary

- Symptom: Some devices report HTTP 503 or "Server returned an unexpected response" when visiting the site or logging in.
- Cause: Hostinger WAF / Bot protection may be returning HTML challenge pages for API requests (POST /api/auth/login, /api/ledger-state, /api/catalog-state). The app expects JSON and surfaces a generic error when HTML is returned.

Immediate steps for Hostinger support

1. Disable Bot/WAF protection for the domain (fs-communication.com) or relax rules temporarily.
2. Whitelist the following API paths to bypass WAF:
   - /api/auth/*
   - /api/ledger-state
   - /api/catalog-state
   - /api/status
3. If Hostinger requires a specific header or token for health-checks, set an environment variable `HEALTH_CHECK_TOKEN` and configure the token in Hostinger. The app's `/api/status` will honor `X-Health-Check` header with that token.

Quick curl tests the site owner or support can run

Replace HOST with your site domain (e.g. fs-communication.com).

- Check status endpoint (should return JSON):

  curl -i https://HOST/api/status

- Emulate a login POST (this may return HTML if WAF blocks):

  curl -i -X POST https://HOST/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"x","role":"admin"}'

If the responses are text/html or contain a bot challenge, please adjust WAF rules and try again.

Optional troubleshooting steps

- Temporarily disable redirect/maintenance pages.
- Confirm that static assets are served with 200 and not blocked by the provider.
- If the site uses a CDN, ensure the CDN is forwarding necessary headers and cookies for POST requests.

What I changed in the codebase to help diagnosis

- Added `/api/status` health endpoint usage in the login flow to better surface host protection errors (client-side detection improved).
- Made the homepage container full-bleed to fix layout inconsistency across devices.

If you want, I can contact Hostinger support with the exact message below (copy-and-send):

<message>
Please disable or relax Bot Protection / WAF for our site HOST, or whitelist these paths so they are not challenged:

  - /api/auth/*
  - /api/ledger-state
  - /api/catalog-state
  - /api/status

Alternatively, allow the origin https://HOST and requests from normal browser user-agents.
</message>
