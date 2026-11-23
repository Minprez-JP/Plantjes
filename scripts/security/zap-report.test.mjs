// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { evaluateZapReport, normalizeOrigin, validateRiskAcceptance } from './check-zap-report.mjs'

const origin = 'http://127.0.0.1:4173'
const now = new Date('2026-11-23T00:00:00Z')

function report({ site = origin, alerts = [] } = {}) {
  return { site: [{ '@name': site, alerts }] }
}

function highAlert() {
  return {
    pluginid: '40012',
    name: 'Cross Site Scripting (Reflected)',
    riskcode: '3',
    riskdesc: 'High (Medium)',
    instances: [{ uri: `${origin}/` }],
  }
}

function acceptance(overrides = {}) {
  return {
    version: 1,
    entries: [{
      pluginId: '40012',
      site: origin,
      alert: 'Cross Site Scripting (Reflected)',
      owner: 'maintainer',
      reason: 'verified static local preview',
      issue: 'https://github.com/Minprez-JP/Plantjes/issues/21',
      expires: '2027-01-01',
      ...overrides,
    }],
  }
}

describe('ZAP report gate', () => {
  it('normalises origins without paths or query strings', () => {
    expect(normalizeOrigin(`${origin}/index.html?x=1`)).toBe(origin)
    expect(normalizeOrigin('not a url')).toBeNull()
  })

  it('accepts a local high-risk alert with a complete, unexpired acceptance', () => {
    const result = evaluateZapReport(report({ alerts: [highAlert()] }), acceptance(), origin, now)

    expect(result.errors).toEqual([])
    expect(result.highRiskAlerts).toHaveLength(1)
    expect(result.acceptedAlerts).toHaveLength(1)
    expect(result.acceptedAlerts[0]).toMatchObject({ pluginId: '40012', owner: 'maintainer' })
  })

  it('fails an unaccepted high-risk alert', () => {
    const result = evaluateZapReport(
      report({ alerts: [highAlert()] }),
      { version: 1, entries: [] },
      origin,
      now,
    )

    expect(result.errors).toEqual([
      `Unaccepted high-risk alert 40012 Cross Site Scripting (Reflected) at ${origin}`,
    ])
  })

  it('fails expired and incomplete acceptance entries', () => {
    const result = evaluateZapReport(
      report(),
      {
        version: 1,
        entries: [{
          pluginId: '40012',
          site: origin,
          owner: '',
          reason: '',
          issue: '',
          expires: '2026-11-22',
        }],
      },
      origin,
      now,
    )

    expect(result.errors).toContain('risk acceptance entry 1 is missing reason')
    expect(result.errors).toContain('risk acceptance entry 1 is missing issue')
    expect(result.errors).toContain('risk acceptance entry 1 expired on 2026-11-22 and must be reviewed')
  })

  it('rejects out-of-scope report sites and acceptance entries', () => {
    const result = evaluateZapReport(
      report({ site: 'https://example.com', alerts: [highAlert()] }),
      acceptance({ site: 'https://example.com' }),
      origin,
      now,
    )

    expect(result.errors).toContain(`ZAP report site https://example.com is outside the preview origin ${origin}`)
    expect(result.errors).toContain(`risk acceptance entry 1 site https://example.com is outside the preview origin ${origin}`)
  })

  it('does not gate low or medium alerts', () => {
    const result = evaluateZapReport(
      report({
        alerts: [
          { pluginid: '10096', name: 'Timestamp Disclosure', riskcode: '1' },
          { pluginid: '10015', name: 'Incomplete Cache Control', riskcode: '2' },
        ],
      }),
      { version: 1, entries: [] },
      origin,
      now,
    )

    expect(result.errors).toEqual([])
    expect(result.highRiskAlerts).toEqual([])
  })

  it('rejects malformed acceptance documents', () => {
    expect(validateRiskAcceptance({ entries: [] }, origin, now)).toEqual([
      'Risk acceptance file must be an object with version 1 and an entries array',
    ])
  })

  it('rejects an empty report', () => {
    const result = evaluateZapReport({}, { version: 1, entries: [] }, origin, now)

    expect(result.errors).toContain('ZAP report contains no scanned sites')
  })
})
