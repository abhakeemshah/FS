## Team setup

Steps for new team members:

1. Ask the repo owner to add you to the GitHub repository or team.
2. Clone the repo and install dependencies:

```bash
git clone https://github.com/abhakeemshah/FS.git
cd FS-Communication
npm ci
```

3. Copy environment variables from `.env.example` to `.env.local` and fill values (do not commit `.env.local`).
4. Follow `CONTRIBUTING.md` for branch and PR workflow.

Repository access notes for owners:
- Prefer GitHub Teams to grant group access. Add team members to the `FS` repo with `Write` permission for contributors and `Admin` for maintainers.
- Enable branch protection on `main` and require PR reviews before merge.
