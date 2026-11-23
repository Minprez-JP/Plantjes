// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { build, resolveConfig } from 'vite'
import { CONTENT_SECURITY_POLICY } from '../../src/lib/contentSecurityPolicy.ts'
import { listBuildFiles, scanBuildDirectory } from './scan-build.mjs'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const configFile = resolve(root, 'vite.config.ts')
const loadableAttributes = new Set(['src', 'href', 'action', 'poster', 'xlink:href'])

let tempRoot
let outputDir
let resolvedConfig
let html
let document
let scan

function assertLocalAsset(value, attribute) {
  expect(value, `${attribute} must be present`).toBeTruthy()
  if (/^(?:data|blob):/i.test(value) || value.startsWith('#')) return

  expect(value, `${attribute}="${value}" must not be remote`).not.toMatch(
    /^(?:[a-z][a-z0-9+.-]*:)?\/\//i,
  )
  expect(value.startsWith('/'), `${attribute}="${value}" must be root-relative`).toBe(true)

  const file = join(outputDir, decodeURIComponent(value.slice(1)))
  expect(existsSync(file), `${value} must resolve inside the build output`).toBe(true)
}

beforeAll(async () => {
  tempRoot = mkdtempSync(join(tmpdir(), 'plantjes-production-build-'))
  outputDir = join(tempRoot, 'dist')

  resolvedConfig = await resolveConfig(
    { configFile, logLevel: 'silent' },
    'build',
    'production',
  )
  expect(resolvedConfig.build.sourcemap).toBe(false)

  await build({
    configFile,
    logLevel: 'silent',
    build: { outDir: outputDir, emptyOutDir: true },
  })

  html = readFileSync(join(outputDir, 'index.html'), 'utf8')
  document = new JSDOM(html).window.document
  scan = scanBuildDirectory(outputDir, outputDir)
}, 60_000)

afterAll(() => {
  if (tempRoot) rmSync(tempRoot, { recursive: true, force: true })
})

describe('production build security controls', () => {
  it('injects the exact exported CSP into the built HTML', () => {
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')

    expect(meta).not.toBeNull()
    expect(meta.getAttribute('content')).toBe(CONTENT_SECURITY_POLICY)
  })

  it('disables source maps and emits no source map files or references', () => {
    expect(resolvedConfig.build.sourcemap).toBe(false)
    expect(listBuildFiles(outputDir).filter((file) => file.endsWith('.map'))).toEqual([])
    expect(html).not.toMatch(/sourceMappingURL/i)

    for (const file of scan.files.filter((name) => /\.(?:css|js)$/i.test(name))) {
      const text = readFileSync(join(outputDir, file), 'utf8')
      expect(text, `${file} must not contain a source map reference`).not.toMatch(/sourceMappingURL/i)
    }
  })

  it('loads only same-origin, resolvable assets and no inline scripts', () => {
    const scripts = [...document.querySelectorAll('script')]
    expect(scripts.length).toBeGreaterThan(0)

    for (const script of scripts) {
      assertLocalAsset(script.getAttribute('src'), 'script src')
      expect(script.textContent?.trim(), 'scripts must be external files').toBe('')
    }

    for (const element of document.querySelectorAll('*')) {
      for (const attribute of element.attributes) {
        const name = attribute.name.toLowerCase()
        expect(name.startsWith('on'), `inline handler ${name} is forbidden`).toBe(false)
        if (loadableAttributes.has(name)) assertLocalAsset(attribute.value, name)
      }
    }
  })

  it('finds no CDN or telemetry references in the built HTML, CSS, or JS', () => {
    expect(scan.files.some((file) => file.endsWith('.html'))).toBe(true)
    expect(scan.files.some((file) => file.endsWith('.js'))).toBe(true)
    expect(scan.findings).toEqual([])
  })

  it('detects an injected remote asset and telemetry call', () => {
    const negativeDir = join(tempRoot, 'negative')
    mkdirSync(negativeDir, { recursive: true })
    writeFileSync(
      join(negativeDir, 'index.html'),
      '<script src="https://cdn.example.com/app.js"></script>',
    )
    writeFileSync(
      join(negativeDir, 'app.js'),
      "fetch('https://telemetry.example.com/collect')",
    )

    const rules = scanBuildDirectory(negativeDir, negativeDir).findings.map((finding) => finding.rule)

    expect(rules).toContain('htmlExternalAsset')
    expect(rules).toContain('jsExternalNetworkCall')
  })
})
