## Contributing

Thank you for contributing. This document describes the workflow and standards we use.

Branching
- Create topic branches from `main`: `feature/<short-desc>`, `fix/<short-desc>`, `chore/<short-desc>`.

Commits
- Use conventional commit style for clear history (e.g., `feat: add invoice export`, `fix: correct modal z-index`).

Pull Requests
- Open a PR against `main` and assign reviewers.
- Include a short description, testing steps, and link related issues.
- Use the PR template in `.github/PULL_REQUEST_TEMPLATE.md`.

Code style
- Keep code formatting consistent. Run `npm run format` if available.

Tests & CI
- Ensure `npm ci && npm run build` passes locally before opening a PR.

Security
- Never commit credentials or private keys.
