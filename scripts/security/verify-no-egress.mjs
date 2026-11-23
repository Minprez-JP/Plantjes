import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import { commitSha, outputDirectory, root, writeJson } from './common.mjs'

const dist = resolve(root, 'dist')
if (!existsSync(dist)) throw new Error('dist/ not found; run npm run build before npm run verify:no-egress')

const inventory = JSON.parse(readFileSync(resolve(outputDirectory, 'licence-inventory.json'), 'utf8'))
const forbiddenDependency = /(analytics|telemetry|firebase|crashlytics|google-play-services|play-services|admob)/i
const dependencyFindings = (inventory.components ?? [])
  .filter((component) => forbiddenDependency.test(component.name))
  .map((component) => ({ source: 'licence-inventory.json', value: component.name }))

const patterns = {
  htmlExternalAsset: /\b(?:src|href|action|poster|xlink:href)\s*=\s*["'](?:https?:)?\/\/[^"']+/i,
  cssExternalUrl: /url\(\s*["']?(?:https?:)?\/\/[^)'"]+/i,
  jsExternalNetworkCall: /\b(?:fetch|sendBeacon|WebSocket|EventSource)\s*\(\s*["'`](?:https?:|wss?:)?\/\/[^"'`]+/i,
  jsExternalImport: /\bimport\(\s*["'](?:https?:)?\/\/[^"']+/i,
}

const findings = [...dependencyFindings]
const scanned = []
const scan = (directory) => {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) {
      scan(path)
      continue
    }
    if (!['.html', '.css', '.js', '.svg', '.json'].includes(extname(entry))) continue
    const text = readFileSync(path, 'utf8')
    scanned.push(relative(root, path).replaceAll('\\', '/'))
    for (const [rule, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern)
      if (match) {
        findings.push({
          source: relative(root, path).replaceAll('\\', '/'),
          rule,
          value: match[0].slice(0, 200),
        })
      }
    }
  }
}
scan(dist)

const report = {
  generatedAt: new Date().toISOString(),
  commit: commitSha(),
  checkedDependencies: inventory.components?.length ?? 0,
  scannedBundleFiles: scanned.length,
  findings,
}
writeJson('no-egress.json', report)

if (findings.length) {
  throw new Error(`No-egress check failed:\n${JSON.stringify(findings, null, 2)}`)
}
console.log(`No-egress check passed for ${report.checkedDependencies} dependencies and ${scanned.length} bundle files`)
