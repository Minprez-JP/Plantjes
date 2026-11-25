<!-- BEGIN AWS Agent Toolkit rules -->
# AWS Guidance for the new AWS experience

This user has signed up for the new AWS experience. This experience lets you sign into AWS using a social provider and requires the following additional context.

Where this guidance conflicts with the project's own instructions, the project's instructions take precedence.

## Context

### Terminology:

- Say "project" instead of "account" — a project contains an AWS account and settings for sharing with other collaborators
- Say "team member" instead of "IAM user" — users are invited by email, not created or federated in IAM
- Say "AWS Settings" when referring to management tasks at [settings.aws.com](https://settings.aws.com/) (project management, billing, team members, spend limits). Users view their actual AWS resources in the AWS Management Console.
- Say "selected Region" when referring to the user's Region — not "home Region"
- The user has a managed IAM experience. This includes a managed service control policies (SCP) and resource control policies (RCP) that govern the use of AWS. They will still need to use IAM to create policies to let services work with each other. If there are questions about the SCPs or RCPs, go to the documentation at https://docs.aws.amazon.com/accounts/latest/reference/scps-and-rcps-for-projects.html

### Constraints:

- All projects share a single AWS Region determined by the user's contact address. Resources cannot be created in other Regions
- When developing:
  - MUST create all Regional resources in the project's assigned Region
  - You CAN create AWS WAF and Cloudwatch Logs resources in us-east-1 when there are global resources (like a global WAF instance) that require a connection to dependencies in us-east-1. You should not use these for any other reason, because resources in the selected Region will provide lower cost (due to no cross-Region traffic), increased availability (due to no cross-Region traffic), and easier manageability (due to not needing to look in another Region). When you need to do an inventory of resources, you need to look in both the selected Region and us-east-1 for Cloudwatch Logs or WAF resources.
  - MUST NOT attempt to create Lambda, API Gateway, or other Regional resources in any other Region
  - MUST direct users to confirm their Region in AWS Settings > View all projects > Overview > Additional Info > Region. If the user cannot confirm their Region, check in ~/.aws/config
  - MUST NOT use Lambda@Edge — excluded from both Lambda and CloudFront
  - MUST NOT use CloudFormation StackSets — no multi-account or multi-Region deployments
  - MUST NOT attempt cross-Region actions — no cross-Region replication for DynamoDB/S3/RDS, no multi-Region KMS keys
  - MUST NOT use Route 53 cross-Region routing — geolocation, latency-based, and failover routing policies are not available
  - CloudFront is a global service and its actions ARE allowed in `us-east-1`. A user can create a CloudFront distribution pointing to their project-region Lambda function URL or API Gateway. However, Lambda and API Gateway themselves MUST NOT be created in `us-east-1` — they must be in the project Region.
  - Reduced availability in `eu-north-1` specifically: Amazon Rekognition, Amazon Textract, Amazon Personalize, AWS App Runner are not available in that Region.
- IAM permissions for human access are managed by AWS. Don't assign roles to team members unless absolutely necessary
- The user may have a spend limit if they are on the paid plan. The limit that pauses their project if it's exceeded. If resources suddenly become inaccessible, ask if they have a spend limit configured. Only project owners can modify a spend limit.
- When developing:
  - MUST ask about spend limit status if the user reports sudden "Access Denied" errors on operations that previously worked
  - MUST direct users to check spend status in AWS Settings > Billing
  - MUST check if a user has upgraded their account to the paid plan
  - MUST ask the user if they want to clean up the successfully created resources or keep them to reduce cost
- The user sets up billing, creates spend limits, and retrieves and pays invoices in AWS Settings. The user creates budgets and optimizes their costs in the AWS Billing and Cost Management console
- Not all AWS services are available. If a service isn't working, do the following:
  1. Run the command `aws freetier get-account-plan-state`
  2. If accountPlanType": "FREE", check the [Free Tier supported services list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#supported-services-free-tier) next,
  3. If accountPlanType": "PAID", check the [Paid Tier supported services list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#supported-services-paid-plan).
  4. If neither list shows the service, check the [Not supported for this experience list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#unsupported-services). The user will need to activate advanced features to access this service.
- Users can activate advanced AWS services and capabilities for their account.
- For any AWS task or question — building, configuring, migrating, debugging, or operating a service, writing SDK code, authoring CDK/CloudFormation, or answering how a service works — first call `aws___search_documentation` with topic `agent_skills` and load the matching skill with `aws___retrieve_skill`. Do this even when you believe you know the answer: skills carry current service behavior that your training may not. Prefer the skill's guidance over general knowledge. Skip it only for work that does not involve AWS.

### Help level

- help_level (required): LOW, MEDIUM, or HIGH. While a user is building, you MUST ask the user: "How much guidance would you like from me? Low (I only flag security risks), medium (I ask a couple of clarifying questions if something seems off), or high (I explain what I'm doing, suggest alternatives, and flag best practices)."

You CAN update this rule file to save a user's help_level.

Constraints for each level:

**LOW:**

- MUST follow all constraints in this context file
- MUST execute the user’s request without modification
- MUST NOT ask clarifying questions unless the action would create a security vulnerability
- MUST NOT suggest alternatives or improvements

**MEDIUM:**

- MUST execute the user's request
- MAY ask up to two clarifying questions per task if the request has an ambiguity or a potential issue
- MUST NOT repeat a question or suggestion the user has already dismissed
- MUST NOT explain trade-offs or alternatives unless the user asks

**HIGH:**

- MUST explain what each step does and why before executing it
- MUST suggest alternatives when a better approach exists
- MUST flag best practices and explain trade-offs
- MUST still execute the user's choice if they disagree with a suggestion
<!-- END AWS Agent Toolkit rules -->

<!-- BEGIN Plantjes project guidance -->
# Plantjes project guidance

This section applies to application, mobile and tooling work in this
repository. It supplements the AWS rules above; for non-AWS work it takes
precedence. The authoritative references are `DEVELOPER.md`,
`MOBILE_RELEASE.md`, `SECURITY_TESTING.md` and `docs/mobile-apk/`. If a specific
document disagrees with this section, follow the document and update this
section.

## Working agreement

- Help level: HIGH. Explain the step and why, suggest a better approach when
  one exists, flag best practices, then implement the user's choice.
- Do not commit, push or merge unless asked. Leave unrelated files and
  untracked files untouched.
- Read a file and its neighbours before editing. Make the smallest change that
  solves the approved issue; do not reformat unrelated code.
- Keep gates green by fixing the cause. Never relax a check, test, CSP rule,
  permission or policy just to make CI pass.
- Ask first when a request is ambiguous or would weaken the local-first,
  no-egress model.

## Source of truth and workflow

- `main` is the single protected branch for the shared React/Vite application
  and the committed Capacitor `android/` folder. There is no second long-lived
  mobile branch; `archive/*` is read-only history.
- Work on short-lived topic branches (`feature/...`, `mobile/...`, `fix/...`),
  open a PR into `main`, link the approved issue, and keep the branch up to date
  so required checks run on the current merge ref. Squash merge, then delete
  the topic branch.
- Commit messages use `<type>(<scope>): <description> (#<issue>)`, for example
  `feat(mobile): compact collection toolbar (#93)`. Keep the existing types
  (`feat`, `fix`, `chore`, `docs`, `test`, `ci`, `release`, `refactor`), write
  the subject in the imperative, and keep it under 72 characters.
- Use Node.js 26 and `npm ci`. Before opening a PR run `npm test`,
  `npm run build`, `npm run security:check` (audit, reports, tests, build,
  mobile-shell and no-egress) and `npm run lint:security`. CI also runs install
  integrity, gitleaks, browser egress, ZAP and CodeQL.
- Dependabot updates go through the same gates as any PR. There is no separate
  lockfile hash baseline: `package-lock.json` is the source of truth, and the
  frozen install, audited diff and checks provide the integrity evidence.
- Every PR touching `src/**`, `vite.config.ts`, `package.json`, the lockfile,
  CI, CSP, Dexie schema, import/export, image handling or security controls
  must state its mobile impact. Use the checklist in
  `docs/mobile-apk/process.md`.

## TypeScript and React

- Keep strict mode on (`strict`, `noUnusedLocals`, `noUnusedParameters`,
  `noFallthroughCasesInSwitch`). Avoid `any`, unchecked casts and new
  `@ts-ignore` comments; prefer `unknown` plus narrowing. The existing CSS
  side-effect imports in `src/main.tsx` are the only suppressions.
- Match the source style: single quotes, two-space indentation, no semicolons,
  trailing commas in multiline literals, `import type` for types, and
  extensionless relative imports inside `src/`.
- Preserve the layering: `src/components/` is presentational and side-effect
  free, `src/hooks/` owns state and persistence, `src/lib/` holds pure
  framework-free logic, and shared types live in `src/types.ts` and
  `src/db.ts`.
- Use function components with named exports; `App` is the default-export
  exception. Prefer native controls and `FormData`, keep state at the lowest
  owner that needs it, and memoize derived rows and filters instead of
  storing them twice.
- Accessibility is part of done: labelled controls, `aria-pressed` /
  `aria-selected` / `aria-controls`, roving `tabIndex`, Escape to close, focus
  restoration, visible focus rings, and state never conveyed by color alone.
- Validate at the boundary: reuse the limits and allowlists in
  `src/lib/constants.ts`, plus `parsePlantForm`, `parseNote`, `parseCareForm`
  and location normalization. Map hidden-panel errors back to their tab and
  field.
- The custom security lint rules are blocking: no `dangerouslySetInnerHTML`,
  dynamic code, dynamic imports or unsafe navigation. Add a fixture and a test
  when introducing a new rule.

## CSS

- `src/styles.css` is one token-driven system in this order: fonts, design
  tokens, base/reset, shared type patterns, shell/header, buttons, page frame,
  overview, layout, grid/cards, sidebar, footer, states, dialog/form, motion,
  responsive rules. Put new rules in the matching section.
- Use existing custom properties for every color, font size, weight, line
  height, spacing, radius, shadow and transition. Add a token in `:root`
  rather than a one-off value. Keep the five typography roles: Fraunces 500
  display, Fraunces 400 italic accent, DM Sans 700 uppercase labels, DM Sans
  600 emphasis, DM Sans 400 body.
- Mobile overrides live in `src/mobile.css`, imported after `styles.css`, and
  every selector is scoped to `.mobile-shell`. Use logical properties, `dvh`
  with a `vh` fallback, and `env(safe-area-inset-*)` through the
  `--mobile-safe-*` tokens. Verify at 360dp, with the keyboard open and in
  both orientations.
- Use kebab-case class names (`mobile-appbar`, `filter-tab`) with `is-*`
  state classes, and prefixed kebab-case tokens (`--text-lg`, `--green-soft`).
  Avoid utility-class soup and inline styles.

## Mobile (Capacitor Android)

- Android is a packaging target for the same bundle, not a separate product:
  no remote `server.url`, no native rewrite of React or Dexie, no cloud sync
  or telemetry. Desktop and Android builds come from the same commit.
- Keep the WebView shell checks passing: `viewport-fit=cover`,
  `interactive-widget=resizes-content`, `windowSoftInputMode="adjustResize"`,
  no `INTERNET` permission, and the CSS import order in `src/main.tsx`.
- Preserve offline behavior and on-device persistence: IndexedDB/Dexie,
  object-URL photo previews and `.plantjes` export/import must work after a
  force-stop and restart. Test lifecycle events, back navigation and file
  inputs on a device, not only in the browser.
- Keep permissions minimal; cleartext and third-party requests stay denied.
  Signing keystores and passwords stay outside the repository. Keep
  `versionName` aligned with `package.json` and increment `versionCode` for
  every release.
- Platform-specific behavior belongs in `android/`, `capacitor.config.ts` and
  `src/mobile.css`. Shared security and no-egress guarantees are never relaxed
  for packaging convenience. Record any accepted risk in the risk log with an
  owner and review date.

## Security-first defaults

- No third-party runtime requests. Fonts, images and icons are self-hosted;
  never add Google Fonts, Unsplash URLs, CDNs, analytics or remote config.
- The production CSP in `vite.config.ts` stays same-origin, with `img-src`
  limited to `data:` and `blob:`. Keep sourcemaps off, `referrer=no-referrer`,
  and inject the CSP in builds only so Vite HMR still works.
- Never log plant data or photos; `ErrorBoundary` reports only the error and
  component stack. Validate files, backups and blobs before use, and keep
  writes transactional where a partial update would corrupt data.
- Dependencies are pinned and CI installs from the committed lockfile. Keep
  the runtime set minimal and review new transitive packages and registry
  changes in the PR diff. Audit acceptances need an owner, reason, expiry and
  linked issue; High/Critical findings always fail.
- Secrets, credentials, real journal data and unlicensed assets never enter
  the repository. Keep CI actions pinned to full SHAs and workflow
  permissions at `contents: read` unless a job needs more.

## Clear writing and uniformity

- Write short, active sentences. State the behavior first, then the reason
  when it is not obvious. Avoid filler and one-off terminology; use the
  project's terms (`plant journal`, `.plantjes`, `Saved on this device`).
- Comments and docs explain *why* a constraint exists, not *what* obvious code
  does. Update nearby documentation in the same change, and keep tables, log
  rows and checklists consistent with owners and review dates.
- Copy the formatting of the file being edited: heading style, list markers,
  quote style and line width. Prefer one naming convention per concept:
  `PascalCase.tsx` for components, `camelCase.ts` for helpers,
  `useCamelCase.ts` for hooks, `*.test.*` beside the code or in `__tests__/`,
  `is*` / `has*` for booleans, `on*` for callback props, and descriptive names
  over abbreviations.
- Keep diffs focused and evidence explicit: link the issue, state platform
  impact, and list the commands run with their results. Green checks mean the
  gates passed at that commit, not that further review is unnecessary.
<!-- END Plantjes project guidance -->
