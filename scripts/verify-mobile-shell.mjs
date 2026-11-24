import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const read = (relativePath) => readFileSync(resolve(root, relativePath), 'utf8')

const indexHtml = read('index.html')
const manifest = read('android/app/src/main/AndroidManifest.xml')
const mainTsx = read('src/main.tsx')

const checks = [
  {
    name: 'viewport-fit=cover',
    ok: /<meta\s+name="viewport"[^>]*viewport-fit=cover/.test(indexHtml),
  },
  {
    name: 'interactive-widget=resizes-content',
    ok: /<meta\s+name="viewport"[^>]*interactive-widget=resizes-content/.test(indexHtml),
  },
  {
    name: 'Android manifest resizes for the keyboard',
    ok: /android:windowSoftInputMode="adjustResize"/.test(manifest),
  },
  {
    name: 'no INTERNET permission',
    ok: !/android\.permission\.INTERNET/.test(manifest),
  },
  {
    name: 'mobile stylesheet is imported after the shared stylesheet',
    ok: mainTsx.indexOf("import './mobile.css'") > mainTsx.indexOf("import './styles.css'"),
  },
]

const failures = checks.filter((check) => !check.ok)
if (failures.length) {
  throw new Error(`Mobile shell checks failed:\n${failures.map(({ name }) => `- ${name}`).join('\n')}`)
}

console.log(`Mobile shell checks passed (${checks.length} checks)`)
