import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

/** File types that can load or trigger remote content in a static build. */
export const SCAN_EXTENSIONS = ['.html', '.css', '.js', '.svg', '.json']

/** Loadable remote references. Documentation-only URL strings are not matched. */
export const REMOTE_PATTERNS = {
  htmlExternalAsset: /\b(?:src|href|action|poster|xlink:href)\s*=\s*["'](?:https?:)?\/\/[^"']+/i,
  cssExternalUrl: /url\(\s*["']?(?:https?:)?\/\/[^)'"]+/i,
  jsExternalNetworkCall: /\b(?:fetch|sendBeacon|WebSocket|EventSource)\s*\(\s*["'`](?:https?:|wss?:)?\/\/[^"'`]+/i,
  jsExternalImport: /\bimport\(\s*["'](?:https?:)?\/\/[^"']+/i,
  domExternalSource: /\.(?:src|href)\s*=\s*["'`](?:https?:)?\/\/[^"'`]+/i,
}

function normalize(path) {
  return path.replaceAll('\\', '/')
}

/** Recursively lists every file below `directory`. */
export function listBuildFiles(directory) {
  const files = []
  const visit = (current) => {
    for (const entry of readdirSync(current)) {
      const path = join(current, entry)
      if (statSync(path).isDirectory()) {
        visit(path)
      } else {
        files.push(path)
      }
    }
  }
  visit(directory)
  return files
}

/**
 * Scans a built directory for remote asset/network references.
 * `base` controls the relative path used in findings so reports stay stable.
 */
export function scanBuildDirectory(directory, base = directory) {
  const files = []
  const findings = []

  for (const path of listBuildFiles(directory)) {
    if (!SCAN_EXTENSIONS.includes(extname(path))) continue

    const source = normalize(relative(base, path))
    const text = readFileSync(path, 'utf8')
    files.push(source)

    for (const [rule, pattern] of Object.entries(REMOTE_PATTERNS)) {
      const match = text.match(pattern)
      if (match) {
        findings.push({ source, rule, value: match[0].slice(0, 200) })
      }
    }
  }

  return { files, findings }
}
