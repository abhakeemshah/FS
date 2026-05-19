Title: Safe: snapshot + untrack .env.local + .env.example

Body:
This PR merges the `safe-push-20260518-174625` snapshot branch into `main`.

Summary of changes:
- Added `.env.example` placeholder
- Stopped tracking `.env.local` (secrets removed from index)
- Hardened `.gitignore`
- Local `NEXTAUTH_SECRET` rotated (local only; not in commit history)

Required actions before/after merge:
1. Rotate `NEXTAUTH_SECRET` and any provider credentials in deployments and CI (Vercel/GitHub Secrets/Netlify/Heroku).
2. Run CI build & tests.
3. QA core UI pages and modals.
4. Optionally, if you require removal from git history, coordinate a history-purge and inform all contributors.

