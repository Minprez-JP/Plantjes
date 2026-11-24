// @vitest-environment node
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { build, preview } from 'vite'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const configFile = resolve(root, 'vite.config.ts')
const skipBrowserEgress = process.env.SKIP_BROWSER_EGRESS === '1'
const plantName = 'Browser egress plant'
const exportedAt = '2026-06-15T12:34:56.789Z'
const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9kAAAAASUVORK5CYII=',
  'base64',
)

let tempRoot
let outputDir
let downloadDir
let backupPath
let photoPath
let previewServer
let origin
let browser
let browserError
let browserStderr = ''
let client
let requests = []

function browserExecutable() {
  const configured = process.env.CHROME_PATH
  if (configured && existsSync(configured)) return configured

  const candidates = process.platform === 'win32'
    ? [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ]
    : [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/microsoft-edge',
      '/opt/google/chrome/chrome',
      '/snap/bin/chromium',
    ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }

  const locator = process.platform === 'win32' ? 'where' : 'which'
  for (const name of ['chrome', 'google-chrome', 'chromium', 'chromium-browser', 'msedge']) {
    const result = spawnSync(locator, [name], { encoding: 'utf8' })
    const found = result.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean)
    if (found && existsSync(found)) return found
  }

  throw new Error('No Chrome/Chromium/Edge binary found; set CHROME_PATH to run the browser egress test.')
}

class CdpClient {
  constructor(webSocket) {
    this.webSocket = webSocket
    this.nextId = 0
    this.pending = new Map()
    this.handlers = new Map()

    webSocket.addEventListener('message', (event) => {
      let message
      try {
        message = JSON.parse(event.data)
      } catch {
        return
      }

      if (message.id !== undefined && this.pending.has(message.id)) {
        const { resolve: resolvePending, reject: rejectPending } = this.pending.get(message.id)
        this.pending.delete(message.id)
        if (message.error) rejectPending(new Error(`${message.error.message} (${message.error.code})`))
        else resolvePending(message.result)
        return
      }

      for (const handler of this.handlers.get(message.method) ?? []) handler(message.params ?? {})
    })

    webSocket.addEventListener('close', () => {
      for (const { reject: rejectPending } of this.pending.values()) {
        rejectPending(new Error('Chrome DevTools connection closed.'))
      }
      this.pending.clear()
    })
  }

  static async connect(url) {
    const webSocket = new WebSocket(url)
    await new Promise((resolveOpen, rejectOpen) => {
      webSocket.addEventListener('open', resolveOpen, { once: true })
      webSocket.addEventListener('error', () => rejectOpen(new Error(`Could not connect to ${url}`)), { once: true })
    })
    return new CdpClient(webSocket)
  }

  send(method, params = {}) {
    const id = ++this.nextId
    return new Promise((resolveSend, rejectSend) => {
      this.pending.set(id, { resolve: resolveSend, reject: rejectSend })
      this.webSocket.send(JSON.stringify({ id, method, params }))
    })
  }

  on(event, handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, [])
    this.handlers.get(event).push(handler)
  }

  waitFor(event, predicate = () => true, timeout = 15_000) {
    return new Promise((resolveWait, rejectWait) => {
      const timer = setTimeout(() => {
        rejectWait(new Error(`Timed out waiting for ${event}`))
      }, timeout)
      const handler = (params) => {
        if (!predicate(params)) return
        clearTimeout(timer)
        resolveWait(params)
      }
      this.on(event, handler)
    })
  }

  close() {
    this.webSocket.close()
  }
}

async function evaluate(expression) {
  const response = await client.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text)
  }
  return response.result.value
}

async function waitForExpression(expression, timeout = 15_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return
    await sleep(100)
  }
  throw new Error(`Timed out waiting for: ${expression}`)
}

async function clickButton(text) {
  const expression = `(() => {
    const label = ${JSON.stringify(text)};
    const button = [...document.querySelectorAll('button')].find((element) =>
      element.offsetParent !== null &&
      !element.disabled &&
      (element.textContent.trim() === label || element.textContent.trim().includes(label))
    );
    if (!button) return false;
    button.click();
    return true;
  })()`
  expect(await evaluate(expression), `button "${text}" was not clickable`).toBe(true)
}

async function clickByAriaLabel(label) {
  const expression = `(() => {
    const element = document.querySelector('[aria-label=${JSON.stringify(label)}]');
    if (!element || element.disabled) return false;
    element.click();
    return true;
  })()`
  expect(await evaluate(expression), `element "${label}" was not clickable`).toBe(true)
}

async function submitDialog(label) {
  const expression = `(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return false;
    const button = [...dialog.querySelectorAll('button')].find((element) =>
      element.offsetParent !== null &&
      !element.disabled &&
      element.textContent.trim().includes(${JSON.stringify(label)})
    );
    if (!button) return false;
    button.click();
    return true;
  })()`
  expect(await evaluate(expression), `dialog submit "${label}" was not clickable`).toBe(true)
}

async function setInputValue(selector, value) {
  const expression = `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return false;
    const setter = Object.getOwnPropertyDescriptor(element.constructor.prototype, 'value').set;
    setter.call(element, ${JSON.stringify(value)});
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`
  expect(await evaluate(expression), `input "${selector}" was not found`).toBe(true)
}

async function setFileInput(selector, filePath) {
  const { root: documentRoot } = await client.send('DOM.getDocument', { depth: -1 })
  const { nodeId } = await client.send('DOM.querySelector', {
    nodeId: documentRoot.nodeId,
    selector,
  })
  expect(nodeId, `file input "${selector}" was not found`).toBeTruthy()
  await client.send('DOM.setFileInputFiles', { files: [filePath], nodeId })
}

function isAllowedUrl(rawUrl) {
  if (/^(?:data|blob|about):/i.test(rawUrl)) return true
  try {
    return new URL(rawUrl).origin === origin
  } catch {
    return false
  }
}

function assertNoEgress(startIndex, phase) {
  const phaseRequests = requests.slice(startIndex)
  const external = phaseRequests.filter((request) => !isAllowedUrl(request.url))
  expect(external, `${phase} made a non-local request: ${JSON.stringify(external)}`).toEqual([])
}

function browserDiagnostics() {
  const stderr = browserStderr.trim()
  return stderr ? ` Chrome stderr:\n${stderr.slice(-4000)}` : ''
}

async function waitForDebugger(profileDir) {
  const portFile = join(profileDir, 'DevToolsActivePort')
  for (let attempt = 0; attempt < 300; attempt += 1) {
    if (existsSync(portFile)) {
      const [port, wsPath] = readFileSync(portFile, 'utf8').trim().split('\n')
      if (port && wsPath) return { port: Number(port), wsPath }
    }
    if (browserError) throw browserError
    if (browser?.exitCode !== null && browser?.exitCode !== undefined) {
      throw new Error(`Chrome exited before opening DevTools (code ${browser.exitCode}).${browserDiagnostics()}`)
    }
    await sleep(100)
  }
  throw new Error(`Chrome did not write DevToolsActivePort (exit code ${browser?.exitCode ?? 'unknown'}).${browserDiagnostics()}`)
}

async function connectToPage(debugPort) {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`)
      const targets = await response.json()
      const page = targets.find((target) => target.type === 'page')
      if (page) return CdpClient.connect(page.webSocketDebuggerUrl)
    } catch {
      // Chrome is still starting.
    }
    await sleep(100)
  }
  throw new Error(`No Chrome page target was available.${browserDiagnostics()}`)
}

async function stopBrowser() {
  if (!browser || browser.exitCode !== null) return
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(browser.pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    process.kill(-browser.pid, 'SIGTERM')
  }
  await sleep(200)
}

async function waitForDownload() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const file = readdirSync(downloadDir).find((name) => name.endsWith('.plantjes'))
    if (file) return file
    await sleep(100)
  }
  throw new Error(`No .plantjes download was written to ${downloadDir}`)
}

if (skipBrowserEgress) {
  describe.skip('browser no-egress regression', () => {
    it('runs when SKIP_BROWSER_EGRESS is not set and Chrome is available', () => {})
  })
} else {
beforeAll(async () => {
  tempRoot = mkdtempSync(join(tmpdir(), 'plantjes-browser-egress-'))
  outputDir = join(tempRoot, 'dist')
  downloadDir = join(tempRoot, 'downloads')
  mkdirSync(downloadDir, { recursive: true })
  backupPath = join(tempRoot, 'browser.plantjes')
  photoPath = join(tempRoot, 'plant.png')

  writeFileSync(backupPath, JSON.stringify({
    format: 'plantjes',
    version: 1,
    exportedAt,
    locations: ['Browser shelf'],
    plants: [{
      name: plantName,
      species: 'Test species',
      environment: 'Indoor',
      location: 'Browser shelf',
      light: 'Bright indirect',
      waterEveryDays: 7,
      lastWateredAt: exportedAt,
      createdAt: exportedAt,
      notes: '',
      edibility: 'No',
      toxicity: 'No',
      origin: '',
    }],
  }))
  writeFileSync(photoPath, tinyPng)

  await build({ configFile, logLevel: 'silent', build: { outDir: outputDir, emptyOutDir: true } })
  previewServer = await preview({
    configFile,
    logLevel: 'silent',
    build: { outDir: outputDir },
    preview: { host: '127.0.0.1', port: 0, strictPort: false },
  })
  const address = previewServer.httpServer.address()
  origin = `http://127.0.0.1:${address.port}`

  const profileDir = join(tempRoot, 'chrome-profile')
  const executable = browserExecutable()
  browserStderr = ''
  browser = spawn(executable, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-sync',
    '--metrics-recording-only',
    '--no-pings',
    '--disable-features=Translate,OptimizationHints,MediaRouter',
    '--remote-allow-origins=*',
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'], detached: process.platform !== 'win32' })
  browser.on('error', (error) => { browserError = error })
  browser.stderr?.on('data', (chunk) => { browserStderr += chunk.toString() })

  const { port, wsPath } = await waitForDebugger(profileDir)
  client = await connectToPage(port)
  // Keep the export check real, but send the downloaded backup into the test's
  // temp directory so it is removed with tempRoot in afterAll.
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadDir,
  })
  await client.send('Page.enable')
  await client.send('Network.enable')
  await client.send('Runtime.enable')
  client.on('Network.requestWillBeSent', ({ request }) => requests.push(request))
  client.on('Network.webSocketCreated', ({ url }) => requests.push({ url, type: 'WebSocket' }))

  const loaded = client.waitFor('Page.loadEventFired')
  await client.send('Page.navigate', { url: `${origin}/` })
  await loaded
  await waitForExpression(`document.body.innerText.includes('Import')`)
}, 120_000)

afterAll(async () => {
  client?.close()
  await stopBrowser()
  if (previewServer) {
    await new Promise((resolveClose) => previewServer.httpServer.close(resolveClose))
  }
  if (tempRoot) rmSync(tempRoot, { recursive: true, force: true })
}, 30_000)

describe('browser no-egress regression', () => {
  it('records only local requests through import, photo and export flows', async () => {
    assertNoEgress(0, 'initial load')

    let mark = requests.length
    await clickButton('Import')
    await waitForExpression(`!!document.querySelector('input[type="file"]')`)
    await setFileInput('input[type="file"]', backupPath)
    await waitForExpression(`document.body.innerText.includes('Backup validated.')`)
    await clickButton('Replace collection')
    await waitForExpression(`document.body.innerText.includes(${JSON.stringify(plantName)})`)
    await sleep(500)
    assertNoEgress(mark, 'backup import')

    mark = requests.length
    await clickByAriaLabel(`Edit ${plantName}`)
    await waitForExpression(`!!document.querySelector('[role="dialog"] input[name="name"]')`)
    await clickButton('Picture')
    await waitForExpression(`!!document.querySelector('input[name="imageFile"]')`)
    await setFileInput('input[name="imageFile"]', photoPath)
    await submitDialog('Save changes')
    await waitForExpression(`!document.querySelector('[role="dialog"]')`)
    await sleep(500)
    assertNoEgress(mark, 'photo add')

    mark = requests.length
    await clickByAriaLabel(`Edit ${plantName}`)
    await waitForExpression(`!!document.querySelector('[role="dialog"] input[name="name"]')`)
    await clickButton('Picture')
    await waitForExpression(`!!document.querySelector('input[name="removeImage"]')`)
    await evaluate(`(() => {
      const checkbox = document.querySelector('input[name="removeImage"]');
      checkbox.click();
      return checkbox.checked;
    })()`)
    await submitDialog('Save changes')
    await waitForExpression(`!document.querySelector('[role="dialog"]')`)
    await sleep(500)
    assertNoEgress(mark, 'photo remove')

    mark = requests.length
    await clickButton('Export')
    await waitForExpression(`!!document.querySelector('[role="dialog"]')`)
    await submitDialog('Export')
    const download = await waitForDownload()
    expect(download).toMatch(/plantjes-backup-.*\.plantjes$/)
    assertNoEgress(mark, 'backup export')

    expect(requests.length).toBeGreaterThan(0)
    expect(requests.some((request) => request.url.startsWith(origin))).toBe(true)
  }, 60_000)
})
}
