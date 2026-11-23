import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { commitSha, outputDirectory, root, writeJson } from './common.mjs'
import { scanBuildDirectory } from './scan-build.mjs'

const dist = resolve(root, 'dist')
if (!existsSync(dist)) throw new Error('dist/ not found; run npm run build before npm run verify:no-egress')

const inventory = JSON.parse(readFileSync(resolve(outputDirectory, 'licence-inventory.json'), 'utf8'))
const forbiddenDependency = /(analytics|telemetry|firebase|crashlytics|google-play-services|play-services|admob)/i
const dependencyFindings = (inventory.components ?? [])
  .filter((component) => forbiddenDependency.test(component.name))
  .map((component) => ({ source: 'licence-inventory.json', value: component.name }))

const { files: scanned, findings: bundleFindings } = scanBuildDirectory(dist, root)
const findings = [...dependencyFindings, ...bundleFindings]

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
