import { readFileSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  commitSha,
  outputDirectory,
  root,
  run,
  sha256,
  shortCommitSha,
  writeJson,
} from './common.mjs'

const generatorPackage = JSON.parse(
  readFileSync(resolve(root, 'node_modules/@cyclonedx/cyclonedx-npm/package.json'), 'utf8'),
)
const lockfile = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8'))
const sha = commitSha()
const shortSha = shortCommitSha(sha)

const bin = resolve(
  root,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'cyclonedx-npm.cmd' : 'cyclonedx-npm',
)

function generate(kind, args) {
  const path = resolve(outputDirectory, `bom-${kind}.json`)
  const result = run(bin, [
    '--output-reproducible',
    '--no-validate',
    '--of',
    'JSON',
    '-o',
    path,
    ...args,
  ])
  if (result.status !== 0) {
    throw new Error(`cyclonedx-npm failed for ${kind}: ${result.stderr || result.stdout}`)
  }
  const bom = JSON.parse(readFileSync(path, 'utf8'))
  unlinkSync(path)
  return bom
}

function integrityToHash(integrity) {
  if (typeof integrity !== 'string' || !integrity.includes('-')) return null
  const [algorithm, encoded] = integrity.split('-', 2)
  return {
    alg: algorithm.replace(/^sha/, 'SHA-').toUpperCase(),
    content: Buffer.from(encoded, 'base64').toString('hex'),
  }
}

function componentPath(component) {
  return component.properties?.find((property) => property.name === 'cdx:npm:package:path')?.value
}

function enrich(bom, profile, target, status) {
  const enriched = JSON.parse(JSON.stringify(bom))
  enriched.metadata ??= {}
  enriched.metadata.properties = [
    ...(enriched.metadata.properties ?? []),
    { name: 'security:generator', value: `@cyclonedx/cyclonedx-npm@${generatorPackage.version}` },
    { name: 'security:profile', value: profile },
    { name: 'security:target', value: target },
    { name: 'security:platform-status', value: status },
    { name: 'security:commit', value: sha },
  ]

  const walk = (components) => {
    for (const component of components ?? []) {
      const path = componentPath(component)
      const lockEntry = path ? lockfile.packages?.[path] : null
      const hash = lockEntry ? integrityToHash(lockEntry.integrity) : null
      if (hash) component.hashes = [hash]

      // cyclonedx-npm cannot parse every SPDX expression in package-lock.json
      // (for example "(MIT OR CC0-1.0)"). Preserve the declared value instead.
      const hasDeclaredLicense = component.licenses?.some((entry) => entry.license?.id || entry.license?.name)
      if (!hasDeclaredLicense && lockEntry?.license) {
        component.licenses = [
          {
            license: {
              name: lockEntry.license,
              acknowledgement: 'declared',
            },
          },
        ]
      }
      walk(component.components)
    }
  }
  walk(enriched.components)
  return enriched
}

function validate(bom, label) {
  const errors = []
  if (bom.bomFormat !== 'CycloneDX') errors.push(`${label}: bomFormat is not CycloneDX`)
  if (bom.specVersion !== '1.7') errors.push(`${label}: unexpected specVersion ${bom.specVersion}`)

  const dependencyRefs = new Set((bom.dependencies ?? []).map((entry) => entry.ref))
  const walk = (components) => {
    for (const component of components ?? []) {
      const id = `${component.group ? `${component.group}/` : ''}${component.name}@${component.version}`
      if (!component.name || !component.version) errors.push(`${label}: component missing name/version`)
      if (!component.purl) errors.push(`${label}: ${id} missing purl`)
      if (!component.licenses?.some((entry) => entry.license?.id || entry.license?.name)) {
        errors.push(`${label}: ${id} missing declared licence`)
      }
      if (!component.hashes?.length) errors.push(`${label}: ${id} missing integrity hash`)
      if (!dependencyRefs.has(component['bom-ref'])) {
        errors.push(`${label}: ${id} missing dependency relationship`)
      }
      walk(component.components)
    }
  }
  walk(bom.components)

  if (errors.length) throw new Error(errors.join('\n'))
}

const desktopStatus = 'web bundle; no native desktop wrapper in this repository'
const androidStatus =
  'placeholder: no Capacitor/Android scaffold in this repository; npm component set mirrors desktop'

const full = generate('full', [])
const production = generate('production', ['--omit', 'dev', '--omit', 'optional'])

const outputs = [
  {
    name: `sbom-desktop-${sha}.json`,
    profile: 'desktop-full',
    target: 'desktop',
    status: desktopStatus,
    bom: full,
  },
  {
    name: `sbom-desktop-production-${sha}.json`,
    profile: 'desktop-production',
    target: 'desktop',
    status: desktopStatus,
    bom: production,
  },
  {
    name: `sbom-android-${sha}.json`,
    profile: 'android-full-placeholder',
    target: 'android',
    status: androidStatus,
    bom: full,
  },
  {
    name: `sbom-android-production-${sha}.json`,
    profile: 'android-production-placeholder',
    target: 'android',
    status: androidStatus,
    bom: production,
  },
]

const index = {
  generatedAt: new Date().toISOString(),
  commit: sha,
  generator: `@cyclonedx/cyclonedx-npm@${generatorPackage.version}`,
  note: 'Built from the npm install created by npm ci; Android files are placeholders until a Capacitor scaffold exists.',
  files: [],
}

for (const output of outputs) {
  const bom = enrich(output.bom, output.profile, output.target, output.status)
  validate(bom, output.name)
  const content = `${JSON.stringify(bom, null, 2)}\n`
  writeJson(output.name, JSON.parse(content))
  index.files.push({
    file: output.name,
    profile: output.profile,
    target: output.target,
    status: output.status,
    sha256: sha256(content),
  })
}

writeJson('sbom-index.json', index)
console.log(
  `Generated ${index.files.length} CycloneDX SBOMs with @cyclonedx/cyclonedx-npm@${generatorPackage.version} for ${shortSha}`,
)
