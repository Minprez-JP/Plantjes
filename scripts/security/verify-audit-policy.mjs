import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { outputDirectory, root, writeJson } from './common.mjs'

const audit = JSON.parse(readFileSync(resolve(outputDirectory, 'npm-audit-all.json'), 'utf8'))
const policy = JSON.parse(readFileSync(resolve(root, 'security-policies/audit.json'), 'utf8'))
const acceptances = new Map((policy.acceptedAdvisories ?? []).map((entry) => [entry.advisoryId, entry]))

function advisoryIds(vulnerability) {
  const ids = []
  for (const via of vulnerability.via ?? []) {
    if (typeof via === 'string') {
      ids.push(via)
      continue
    }
    const url = via.url ?? ''
    const match = url.match(/GHSA-[a-z0-9-]+/i)
    ids.push(match ? match[0] : via.name ?? via.title ?? vulnerability.name)
  }
  return [...new Set(ids)]
}

function validAcceptance(entry, today) {
  if (!entry) return false
  const fields = ['owner', 'reason', 'expiry', 'linkedIssue']
  if (fields.some((field) => !entry[field])) return false
  const expiry = new Date(`${entry.expiry}T23:59:59Z`)
  return !Number.isNaN(expiry.valueOf()) && expiry >= today
}

const today = new Date()
const blocking = []
const accepted = []
const findings = []

for (const [name, vulnerability] of Object.entries(audit.vulnerabilities ?? {})) {
  const ids = advisoryIds(vulnerability)
  findings.push({
    name,
    severity: vulnerability.severity,
    advisoryIds: ids,
    direct: vulnerability.isDirect,
  })
  if (vulnerability.severity === 'high' || vulnerability.severity === 'critical') {
    blocking.push(`${name}: ${vulnerability.severity} finding is never auto-accepted`)
    continue
  }
  const approvals = ids.map((id) => acceptances.get(id)).filter(Boolean)
  if (approvals.length !== ids.length || approvals.some((entry) => !validAcceptance(entry, today))) {
    blocking.push(
      `${name}: ${vulnerability.severity} finding needs a current acceptedAdvisories entry with owner, reason, expiry and linkedIssue`,
    )
  } else {
    accepted.push({ name, advisoryIds: ids })
  }
}

for (const entry of policy.acceptedAdvisories ?? []) {
  if (!validAcceptance(entry, today)) {
    blocking.push(`expired or incomplete acceptance for ${entry.advisoryId}`)
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  policy: 'security-policies/audit.json',
  summary: audit.metadata?.vulnerabilities ?? null,
  findings,
  accepted,
  blocking,
}
writeJson('audit-policy.json', report)

if (blocking.length) throw new Error(`Audit policy failed:\n${blocking.join('\n')}`)
console.log(`Audit policy passed (${findings.length} advisories, ${accepted.length} accepted)`)
