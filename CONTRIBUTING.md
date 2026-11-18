# Contributing

Thank you for your interest in **Plantjes.** The project is maintained on a
best-effort basis, and code contributions are considered from accounts vetted
and approved by the maintainer.

## Before starting

- Read the [README](./README.md) to understand the app's local-first data model
  and privacy boundaries.
- For a bug or feature, use the repository's issue templates to describe the
  problem and proposed change.
- Contact the maintainer and wait for explicit approval before starting work
  intended for inclusion. A pull request from an account that has not been
  vetted and approved may be closed without review.
- For security vulnerabilities, do not open a public issue. Follow
  [SECURITY.md](./SECURITY.md) instead.

## Development and pull requests

Use Node.js 26, the version CI runs, with npm. From a clean checkout:

```sh
npm ci
npm test
npm run build
```

`npm ci` installs exactly the committed lockfile, so the reviewed dependency
graph is also what gets tested and built. `npm run dev` starts the local
development server, and `npm audit --audit-level=high` checks dependencies.

Keep changes focused on the approved issue, include or update tests when
behavior changes, and update user-facing documentation when needed. Open a pull
request against `main`, link the approved issue, explain the change, and include
the test results. The maintainer reviews and merges contributions.

Do not include credentials, real plant-journal data, private photos, or assets
without permission to redistribute them. Runtime assets must remain
self-hosted; see [SECURITY.md](./SECURITY.md) for the project's security and
privacy requirements.
