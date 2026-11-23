import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { commitSha, outputDirectory, root, writeJson, writeText } from './common.mjs'

const sha = commitSha()
const policy = JSON.parse(readFileSync(resolve(root, 'security-policies/licences.json'), 'utf8'))
const licenseText = readFileSync(resolve(root, 'LICENSE'), 'utf8')
const bom = JSON.parse(
  readFileSync(resolve(outputDirectory, `sbom-desktop-production-${sha}.json`), 'utf8'),
)

const allowed = new Set(policy.allowedLicenses ?? [])
const deniedPatterns = (policy.deniedPatterns ?? []).map((pattern) => new RegExp(pattern, 'i'))

function declaredLicense(component) {
  const entry = component.licenses?.find((item) => item.license?.id || item.license?.name)
  if (!entry) return 'UNKNOWN'
  return entry.license.id ?? entry.license.name
}

function licenseTokens(license) {
  return license
    .split(/\s+(?:OR|AND|WITH)\s+|\(|\)/i)
    .map((token) => token.trim())
    .filter(Boolean)
}

function approvalFor(license) {
  return (policy.approvals ?? []).find((approval) => approval.license === license)
}

function validApproval(approval, today) {
  if (!approval) return false
  const fields = ['owner', 'reason', 'expiry', 'linkedIssue']
  if (fields.some((field) => !approval[field])) return false
  const expiry = new Date(`${approval.expiry}T23:59:59Z`)
  return !Number.isNaN(expiry.valueOf()) && expiry >= today
}

const today = new Date()
const components = []
const seen = new Set()
const walk = (items) => {
  for (const component of items ?? []) {
    if (!seen.has(component.purl)) {
      seen.add(component.purl)
      components.push({
        name: component.group ? `${component.group}/${component.name}` : component.name,
        version: component.version,
        purl: component.purl,
        license: declaredLicense(component),
        acknowledgement:
          component.licenses?.[0]?.license?.acknowledgement ?? 'unknown',
      })
    }
    walk(component.components)
  }
}
walk(bom.components)
components.sort((a, b) => a.purl.localeCompare(b.purl))

const violations = []
for (const component of components) {
  const tokens = licenseTokens(component.license)
  const denied = tokens.some((token) => deniedPatterns.some((pattern) => pattern.test(token)))
  const allowedToken = tokens.some((token) => allowed.has(token))
  const approved = validApproval(approvalFor(component.license), today)

  if (denied && !approved) {
    violations.push({
      ...component,
      reason: 'denied licence family without a current reviewed approval',
    })
  } else if (!allowedToken && !approved) {
    violations.push({
      ...component,
      reason: 'unknown licence without a current reviewed approval',
    })
  }
}

for (const approval of policy.approvals ?? []) {
  if (!validApproval(approval, today)) {
    violations.push({
      license: approval.license,
      reason: 'approval is expired or missing owner, reason, expiry or linked issue',
    })
  }
}

const inventory = {
  generatedAt: new Date().toISOString(),
  commit: sha,
  source: 'sbom-desktop-production-<commit>.json',
  policy: 'security-policies/licences.json',
  checkedLicenses: components.length,
  components,
  violations,
}
writeJson('licence-inventory.json', inventory)

const table = [
  '| Package | Version | Licence | PURL |',
  '| --- | --- | --- | --- |',
  ...components.map(
    (item) =>
      `| \`${item.name}\` | ${item.version} | ${item.license} | \`${item.purl}\` |`,
  ),
].join('\n')
writeText(
  'licence-inventory.md',
  `# Licence inventory\n\nGenerated from the production SBOM for commit \`${sha}\`.\n\n${table}\n`,
)

const notices = [
  '# Third-party notices (generated)',
  '',
  `Generated from the production dependency graph at commit \`${sha}\`. Bundled fonts and photography remain documented in the checked-in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).`,
  '',
  '## Application licence',
  '',
  '```text',
  licenseText.trimEnd(),
  '```',
  '',
  '## npm runtime dependencies',
  '',
  table,
  '',
].join('\n')
writeText('THIRD_PARTY_NOTICES.generated.md', notices)

if (violations.length) {
  throw new Error(`Licence policy violations:\n${JSON.stringify(violations, null, 2)}`)
}
console.log(`Licence policy passed for ${components.length} production components`)
