# Maintaining Plantjes.

This guide records the repository settings and release steps that are easy to
forget. It is written for the maintainer; contribution rules for everyone else
are in [CONTRIBUTING.md](./CONTRIBUTING.md) and the security policy is in
[SECURITY.md](./SECURITY.md).

## Repository safeguards

Some GitHub controls are unavailable on a private repository on the free plan.
The following settings should be enabled or re-checked immediately after the
repository is made public:

- [ ] **Default branch** — `main` is the default and contains the release
      commit. Merge or fast-forward pending release work before changing
      visibility.
- [ ] **Branch ruleset for `main`** — import
      [`.github/rulesets/main-branch.json`](./.github/rulesets/main-branch.json)
      to require a pull request, require the CI check **Audit, test, and
      build**, block force pushes and branch deletion, and require linear
      history. Branch protection is available once the repository is public.
- [ ] **Dependabot alerts** — enabled. Keep them enabled.
- [ ] **Dependabot security updates** — enabled. Keep them enabled.
- [ ] **Dependabot version updates** — `.github/dependabot.yml` covers npm and
      GitHub Actions on a weekly schedule.
- [x] **Secret scanning and push protection** — enabled. CI also runs pinned
      gitleaks with a checked-in allowlist (`#16`).
- [x] **Code scanning** — committed `.github/workflows/codeql.yml` analyses
      JavaScript/TypeScript and Actions and uploads SARIF (`#13`).
- [ ] **Private vulnerability reporting** — enable it and verify the report link
      in [SECURITY.md](./SECURITY.md) works.
- [ ] **Actions** — keep the default workflow token permission at **read-only**
      (the CI workflow also declares `contents: read`). Require approval for
      pull requests from outside collaborators, and do not add repository
      secrets to the CI workflow.
- [ ] **Branches** — delete merged release branches such as `V0.2.3` and
      `livegang-branch` so the public branch list only shows active work.

The CI workflow in `.github/workflows/ci.yml` installs from the lockfile, audits
dependencies, runs the tests, and builds the app. It does not use secrets and
does not run privileged pull-request workflows, so fork contributions can run
it safely.

### Importing the `main` ruleset

The file [`.github/rulesets/main-branch.json`](./.github/rulesets/main-branch.json)
is a ready-to-import GitHub repository ruleset for the default branch. It
enforces the following:

- Pull requests are required; direct pushes to `main` are blocked.
- The **Audit, test, and build** CI job must pass, and the branch must be up to
  date with `main` before merging.
- Force pushes and deletion of `main` are blocked.
- Linear history is required, so merge commits are not allowed. The ruleset
  permits squash and rebase merges only.
- No approval is required (`required_approving_review_count: 0`) so a solo
  maintainer can merge their own pull request. Raise it to `1` if other
  maintainers or reviewers are added.
- No actors have bypass rights. Repository admins can still edit or disable the
  ruleset from the repository settings.

Import it in the GitHub UI under **Settings → Rules → Rulesets → New ruleset →
Import a ruleset**, or with the GitHub CLI:

```sh
gh api --method POST repos/Minprez-JP/Plantjes/rulesets \
  --input .github/rulesets/main-branch.json
```

The ruleset can only be imported after the repository is public and rulesets
are available on the plan. After import, confirm the required check name matches
the job name in `.github/workflows/ci.yml` and that the ruleset targets the
default branch. The check is pinned to the GitHub Actions app
(`integration_id: 15368`) so another app cannot satisfy it; remove that field
if CI moves to a different provider. If merge commits are preferred, remove the
`required_linear_history` rule and add `"merge"` to `allowed_merge_methods`
before importing.

## Release checklist

1. Confirm the working tree is clean and `main` includes the intended release
   work.
2. Run the same checks as CI from a clean install:
   ```sh
   npm ci
   npm audit --audit-level=high
   npm test
   npm run build
   ```
3. Update `package.json` and the release notes in
   `.github/release-notes/<version>.md` if the version changes.
4. Tag the release from `main` with its immutable patch tag (for example
   `v1.2.1`) and publish the GitHub release.
5. Move the rolling minor-line and major tags (`v1.2`, `v1`) to the same commit.
6. Verify the built site over HTTPS and confirm the production CSP header/meta
   tag and the host response headers described in [SECURITY.md](./SECURITY.md).
7. After publication, re-check the repository safeguards above.

### Tag convention

Plantjes uses rolling tags for release lines plus immutable tags for published
GitHub releases:

- `v1` — latest stable 1.x release. Move it when a new stable 1.x release is
  published.
- `v1.2` — latest release in the 1.2.x line, including pre-releases. Move it
  when a new 1.2.x pre-release or patch is published.
- `v1.2.0`, `v1.2.1`, … — immutable provenance tags for each GitHub release.
  Never move or delete these; the release notes and APK hash are tied to them.

When starting a new minor or major line, create its rolling tag (`v1.3`, `v2`)
from the first release commit and move the `v1` major tag when the first stable
release in that line is published. Patch releases only move the existing
minor-line and major tags; they do not create new rolling tags.

GitHub Releases are one-to-one with Git tags, so two releases cannot share a
single tag. The rolling tags are aliases for humans and automation; published
releases stay on immutable patch tags.

## Pre-public cleanup notes

The history audit found no credentials, tokens, private URLs, environment files,
journal backups, or local configuration in the tracked history. The unreferenced
`src/testfiles/plant.png` fixture was removed from the current tree because it
was not used by the app or tests. Bundled photography and font provenance are
recorded in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

The following history items are intentional but worth reviewing before the
repository becomes public:

- The `v1.0.0` tag points to an early commit and has no corresponding release.
  Move or recreate it at the launch commit if that version number is meant for
  the public release.
- The `major` tag is not used by the release process.
- Some history contains automated "baseline checkpoint" commits with internal
  agent session identifiers. They are not credentials, but they are part of the
  public log unless history is rewritten.
- Commit author emails are part of the public history. Rewriting history to hide
  them would change every commit SHA, tag, and release, so do that only if it is
  worth the disruption.
