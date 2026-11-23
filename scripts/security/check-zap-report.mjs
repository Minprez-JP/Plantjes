import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REQUIRED_ENTRY_FIELDS = ['pluginId', 'site', 'owner', 'reason', 'issue', 'expires']

export function normalizeOrigin(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    return new URL(value.trim()).origin
  } catch {
    return null
  }
}

function isHighRisk(alert) {
  const riskCode = Number(alert?.riskcode)
  if (Number.isFinite(riskCode)) return riskCode >= 3
  return /high|critical/i.test(String(alert?.riskdesc ?? ''))
}

function alertName(alert) {
  return String(alert?.name ?? alert?.alert ?? '(unnamed alert)')
}

function entryMatches(entry, alert, siteOrigin) {
  if (String(entry.pluginId) !== String(alert?.pluginid)) return false
  if (entry.site && normalizeOrigin(entry.site) !== siteOrigin) return false
  if (entry.alert && entry.alert !== alertName(alert)) return false
  return true
}

export function validateRiskAcceptance(document, expectedOrigin, now = new Date()) {
  const errors = []
  if (!document || document.version !== 1 || !Array.isArray(document.entries)) {
    return ['Risk acceptance file must be an object with version 1 and an entries array']
  }

  const expected = normalizeOrigin(expectedOrigin)
  const today = now.toISOString().slice(0, 10)
  const seen = new Set()

  document.entries.forEach((entry, index) => {
    const label = `risk acceptance entry ${index + 1}`
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`${label} must be an object`)
      return
    }

    for (const field of REQUIRED_ENTRY_FIELDS) {
      if (typeof entry[field] !== 'string' || !entry[field].trim()) {
        errors.push(`${label} is missing ${field}`)
      }
    }

    const entryOrigin = normalizeOrigin(entry.site)
    if (!entryOrigin) {
      errors.push(`${label} has an invalid site URL`)
    } else if (entryOrigin !== expected) {
      errors.push(`${label} site ${entry.site} is outside the preview origin ${expectedOrigin}`)
    }

    if (typeof entry.expires === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.expires)) {
      const expires = new Date(`${entry.expires}T00:00:00Z`)
      if (Number.isNaN(expires.getTime())) {
        errors.push(`${label} has an invalid expiry date ${entry.expires}`)
      } else if (entry.expires < today) {
        errors.push(`${label} expired on ${entry.expires} and must be reviewed`)
      }
    } else if (typeof entry.expires === 'string' && entry.expires.trim()) {
      errors.push(`${label} expiry must use YYYY-MM-DD, got ${entry.expires}`)
    }

    const key = [entry.pluginId, entry.site, entry.alert ?? '*'].join('|')
    if (seen.has(key)) errors.push(`${label} duplicates an earlier acceptance (${key})`)
    seen.add(key)
  })

  return errors
}

export function evaluateZapReport(report, acceptance, expectedOrigin, now = new Date()) {
  const errors = []
  const expected = normalizeOrigin(expectedOrigin)
  if (!expected) errors.push(`Expected origin ${expectedOrigin ?? '(missing)'} is not a valid URL`)

  errors.push(...validateRiskAcceptance(acceptance, expectedOrigin, now))

  const sites = report?.site === undefined
    ? []
    : Array.isArray(report.site)
      ? report.site
      : [report.site]

  if (!sites.length) errors.push('ZAP report contains no scanned sites')

  const highRiskAlerts = []
  const acceptedAlerts = []
  const entries = Array.isArray(acceptance?.entries) ? acceptance.entries : []

  for (const site of sites) {
    const siteName = String(site?.['@name'] ?? '(unnamed site)')
    const siteOrigin = normalizeOrigin(siteName)
    if (!siteOrigin) {
      errors.push(`ZAP report site ${siteName} is not a valid URL`)
    } else if (siteOrigin !== expected) {
      errors.push(`ZAP report site ${siteName} is outside the preview origin ${expectedOrigin}`)
    }

    const alerts = Array.isArray(site?.alerts) ? site.alerts : []
    for (const alert of alerts) {
      if (!isHighRisk(alert)) continue

      const finding = {
        pluginId: String(alert.pluginid ?? ''),
        name: alertName(alert),
        site: siteName,
        instances: Array.isArray(alert.instances) ? alert.instances.length : null,
      }
      highRiskAlerts.push(finding)

      const entry = entries.find((candidate) =>
        candidate && typeof candidate === 'object' && entryMatches(candidate, alert, siteOrigin))
      if (entry) acceptedAlerts.push({ ...finding, owner: entry.owner, expires: entry.expires })
      else errors.push(`Unaccepted high-risk alert ${finding.pluginId} ${finding.name} at ${siteName}`)
    }
  }

  return {
    errors,
    sites: sites.map((site) => String(site?.['@name'] ?? '')),
    highRiskAlerts,
    acceptedAlerts,
  }
}

function main() {
  const [reportPath = 'artifacts/zap/zap-report.json', acceptancePath = 'security-policies/zap-risk-acceptance.json'] = process.argv.slice(2)
  const expectedOrigin = process.env.ZAP_TARGET_ORIGIN

  let report
  let acceptance
  try {
    report = JSON.parse(readFileSync(resolve(reportPath), 'utf8'))
  } catch (error) {
    throw new Error(`Could not read ZAP report ${reportPath}: ${error.message}`)
  }
  try {
    acceptance = JSON.parse(readFileSync(resolve(acceptancePath), 'utf8'))
  } catch (error) {
    throw new Error(`Could not read risk acceptance file ${acceptancePath}: ${error.message}`)
  }

  const result = evaluateZapReport(report, acceptance, expectedOrigin)
  console.log(
    `ZAP gate: ${result.sites.length} site(s), ${result.highRiskAlerts.length} high-risk alert(s), ` +
    `${result.acceptedAlerts.length} accepted, ${result.errors.length} error(s)`,
  )
  for (const finding of result.acceptedAlerts) {
    console.log(`  accepted: ${finding.pluginId} ${finding.name} (owner ${finding.owner}, expires ${finding.expires})`)
  }
  for (const error of result.errors) console.error(`  ERROR: ${error}`)
  if (result.errors.length) process.exitCode = 1
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : ''
if (invokedPath === fileURLToPath(import.meta.url)) main()
