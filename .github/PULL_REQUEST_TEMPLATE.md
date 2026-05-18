### Summary

This PR merges the `safe-push-20260518-174625` snapshot branch into `main`.

### What I changed
- Added `.env.example` and stopped tracking `.env.local`.
- Hardened `.gitignore` to prevent envs, logs, and keys from being committed.
- Created a local rotated `NEXTAUTH_SECRET` (not committed).
- No code/UI/design files were removed or modified except for the safe housekeeping above.

### Checklist before merge (required)
- [ ] Rotate `NEXTAUTH_SECRET` and any other provider/API keys in deployments (Vercel/GitHub Secrets/Netlify).
- [ ] Run `npm ci` and `npm run build` in CI to verify the project builds.
- [ ] Smoke-test critical pages: admin sales, staff sales, modals.
- [ ] Confirm no other sensitive values are exposed in the repo history; rotate/revoke if found.

### Notes
- The old secret may still exist in git history. If you want it purged, we must run a history-rewrite (BFG/git filter-repo) and force-push — this is disruptive and requires coordination.

