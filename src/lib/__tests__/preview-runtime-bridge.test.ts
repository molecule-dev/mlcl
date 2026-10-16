/**
 * Preview runtime-failure detection bridge.
 *
 * Regression guard for the runtime faults NO baked per-template sender can report for
 * a CUSTOM build (one created with no template) — all delivered by ONE injected
 * `<script>` (injectPreviewRuntimeBridge) so they reach every flagship template AND
 * custom builds from a single source, mirroring the nav/snapshot drift-guards
 * (preview-nav-bridge.test.ts / preview-snapshot-bridge.test.ts):
 *
 *  - **Heartbeat (liveness):** a `setInterval` beat on the app's OWN thread posts
 *    `{ type: 'molecule:heartbeat' }`. Its SILENCE is the only way the embedding IDE's
 *    freeze watchdog can tell a render-looping/locked app apart from an idle one — a
 *    frozen thread can't post anything else.
 *  - **Runtime errors:** uncaught `error` events AND `unhandledrejection`s are forwarded
 *    as `{ type: 'molecule:runtime-error', message, source, line, column }` so the IDE
 *    can hand them to Synthase for an auto-fix.
 *  - **Blank render:** when the document finished loading but `#root` has NO children
 *    after a settle window, it posts `{ type: 'molecule:blank', message }` — the baked
 *    sender bails on 0 children, so this is the only signal for a truly blank app.
 *
 * These tests inject the bridge through the real scaffold helper and EXECUTE the
 * resulting HTML in a browser-like jsdom (running the injected inline `<script>`),
 * capturing the embedding parent's postMessage and driving the captured timer
 * callbacks. A missing/regressed heartbeat, error-forwarder, or blank-detector fails.
 *
 * @module
 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { JSDOM } from 'jsdom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  injectPreviewNavBridge,
  injectPreviewRuntimeBridge,
  injectPreviewSnapshotBridge,
} from '../scaffold.js'
import { inlinePreviewBridgeScripts } from './preview-bridge-test-utils.js'

interface PreviewMessage {
  type?: string
  message?: string
  source?: string
  line?: number
  column?: number
}

/**
 * A minimal flagship-style index.html carrying the EXISTING baked molecule:* sender
 * (heartbeat) but — exactly like the shipped templates — NO runtime-failure bridge.
 * `#root` starts EMPTY so the blank-render path can be driven in-test.
 */
const FLAGSHIP_LIKE_HTML = `<!doctype html>
<html lang="en">
  <head><title>demo</title></head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`

/** Same document but `#root` already has content at first paint (rendered case). */
const PRE_RENDERED_HTML = FLAGSHIP_LIKE_HTML.replace(
  '<div id="root"></div>',
  '<div id="root"><div class="app">hello</div></div>',
)

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-runtimebridge-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

/**
 * Write `html` to a temp index.html, run the scaffold injector, and return the
 * document a browser would EXECUTE — the injected bridge reference inlined from
 * the file the injector wrote next to it (jsdom fetches no subresources; see
 * {@link inlinePreviewBridgeScripts}).
 */
async function scaffoldHtml(html: string, name = 'index.html'): Promise<string> {
  const path = join(dir, name)
  await writeFile(path, html)
  await injectPreviewRuntimeBridge(path)
  return inlinePreviewBridgeScripts(await readFile(path, 'utf-8'), dir)
}

interface PreviewHarness {
  messages: PreviewMessage[]
  window: Window & typeof globalThis
  /** Invoke the captured `setInterval` beats (the heartbeat). */
  fireBeats: () => void
  /** Invoke the captured `setTimeout` callbacks (the blank-render settle check). */
  fireTimeouts: () => void
}

/**
 * Load `html` in a browser-like jsdom that executes inline scripts. The page's
 * `setInterval`/`setTimeout` are CAPTURED (not scheduled) so the test drives the
 * heartbeat beat and the blank-render settle deterministically. When `embedded`, the
 * embedding parent's postMessage is captured; otherwise `window.parent === window`
 * (the standalone/guard case, where the bridge must stay silent).
 */
async function runInPreview(
  html: string,
  { embedded }: { embedded: boolean },
): Promise<PreviewHarness> {
  const messages: PreviewMessage[] = []
  const intervalFns: Array<() => void> = []
  const timeoutFns: Array<() => void> = []
  const dom = new JSDOM(html, {
    url: 'http://localhost:3000/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.addEventListener('message', (event: MessageEvent) =>
        messages.push(event.data as PreviewMessage),
      )
      if (embedded) {
        Object.defineProperty(window, 'parent', {
          value: { postMessage: (data: PreviewMessage) => messages.push(data) },
          configurable: true,
        })
      }
      // Capture (don't schedule) the heartbeat beat so the test can drive it.
      window.setInterval = ((fn: () => void) => {
        intervalFns.push(fn)
        return 0
      }) as typeof window.setInterval
      // Capture (don't schedule) the blank-render settle callback (4s in the bridge).
      window.setTimeout = ((fn: () => void) => {
        timeoutFns.push(fn)
        return 0
      }) as typeof window.setTimeout
    },
  })
  const window = dom.window as unknown as Window & typeof globalThis
  await new Promise<void>((resolve) => {
    if (window.document.readyState === 'complete') resolve()
    else window.addEventListener('load', () => resolve())
  })
  return {
    messages,
    window,
    fireBeats: () => intervalFns.forEach((fn) => fn()),
    fireTimeouts: () => timeoutFns.forEach((fn) => fn()),
  }
}

const ofType = (messages: PreviewMessage[], type: string): PreviewMessage[] =>
  messages.filter((m) => m?.type === type)

/** Dispatch an uncaught `error` event the way the browser would. */
function dispatchError(
  window: Window & typeof globalThis,
  detail: { message: string; filename?: string; lineno?: number; colno?: number },
): void {
  const evt = new window.Event('error') as Event & Record<string, unknown>
  Object.assign(evt, detail)
  window.dispatchEvent(evt)
}

/** Dispatch an `unhandledrejection` event carrying a reason. */
function dispatchRejection(window: Window & typeof globalThis, reason: unknown): void {
  const evt = new window.Event('unhandledrejection') as Event & Record<string, unknown>
  evt.reason = reason
  window.dispatchEvent(evt)
}

describe('injectPreviewRuntimeBridge (injection mechanics)', () => {
  it('inserts the runtime bridge before </body>, after #root', async () => {
    const out = await scaffoldHtml(FLAGSHIP_LIKE_HTML)
    expect(out).toContain('mol:runtime-bridge')
    expect(out).toContain("post('molecule:heartbeat')")
    expect(out).toContain("post('molecule:runtime-error'")
    expect(out).toContain("post('molecule:blank'")
    expect(out.indexOf('mol:runtime-bridge')).toBeLessThan(out.lastIndexOf('</body>'))
    expect(out.indexOf('mol:runtime-bridge')).toBeGreaterThan(out.indexOf('<div id="root">'))
  })

  it('is idempotent — a second run does not double-insert', async () => {
    const path = join(dir, 'index.html')
    await writeFile(path, FLAGSHIP_LIKE_HTML)
    expect(await injectPreviewRuntimeBridge(path)).toBe(true)
    expect(await injectPreviewRuntimeBridge(path)).toBe(false)
    const out = await readFile(path, 'utf-8')
    expect(out.match(/mol:runtime-bridge/g)).toHaveLength(1)
  })

  it('coexists with the nav + snapshot bridges (all three inject independently)', async () => {
    const path = join(dir, 'index.html')
    await writeFile(path, FLAGSHIP_LIKE_HTML)
    expect(await injectPreviewNavBridge(path)).toBe(true)
    expect(await injectPreviewSnapshotBridge(path)).toBe(true)
    expect(await injectPreviewRuntimeBridge(path)).toBe(true)
    const out = await readFile(path, 'utf-8')
    expect(out).toContain('mol:nav-bridge')
    expect(out).toContain('mol:snapshot-bridge')
    expect(out).toContain('mol:runtime-bridge')
  })

  it('returns false for a missing file', async () => {
    expect(await injectPreviewRuntimeBridge(join(dir, 'nope.html'))).toBe(false)
  })

  it('skips a document with no </body> rather than corrupting it', async () => {
    const fragment = '<div>no document here</div>'
    const path = join(dir, 'fragment.html')
    await writeFile(path, fragment)
    expect(await injectPreviewRuntimeBridge(path)).toBe(false)
    expect(await readFile(path, 'utf-8')).toBe(fragment)
  })
})

describe('heartbeat (liveness)', () => {
  it('posts molecule:heartbeat on each beat while embedded', async () => {
    const html = await scaffoldHtml(PRE_RENDERED_HTML)
    const { messages, fireBeats } = await runInPreview(html, { embedded: true })
    const before = ofType(messages, 'molecule:heartbeat').length
    fireBeats()
    expect(ofType(messages, 'molecule:heartbeat').length).toBe(before + 1)
  })
})

describe('runtime errors', () => {
  it('forwards an uncaught error with message/source/line/column', async () => {
    const html = await scaffoldHtml(PRE_RENDERED_HTML)
    const { messages, window } = await runInPreview(html, { embedded: true })
    dispatchError(window, {
      message: 'x is not defined',
      filename: 'http://localhost:3000/src/main.tsx',
      lineno: 42,
      colno: 7,
    })
    const errs = ofType(messages, 'molecule:runtime-error')
    expect(errs).toHaveLength(1)
    expect(errs[0].message).toBe('x is not defined')
    expect(errs[0].source).toBe('http://localhost:3000/src/main.tsx')
    expect(errs[0].line).toBe(42)
    expect(errs[0].column).toBe(7)
  })

  it('forwards an unhandled promise rejection (tagged source=unhandledrejection)', async () => {
    const html = await scaffoldHtml(PRE_RENDERED_HTML)
    const { messages, window } = await runInPreview(html, { embedded: true })
    dispatchRejection(window, new window.Error('boom in a promise'))
    const errs = ofType(messages, 'molecule:runtime-error')
    expect(errs).toHaveLength(1)
    expect(errs[0].message).toBe('boom in a promise')
    expect(errs[0].source).toBe('unhandledrejection')
  })
})

describe('blank render', () => {
  it('posts molecule:blank when #root is still empty after the settle window', async () => {
    const html = await scaffoldHtml(FLAGSHIP_LIKE_HTML)
    const { messages, fireTimeouts } = await runInPreview(html, { embedded: true })
    expect(ofType(messages, 'molecule:blank')).toHaveLength(0) // not yet — still settling
    fireTimeouts() // the 4s settle check fires
    expect(ofType(messages, 'molecule:blank')).toHaveLength(1)
  })

  it('does NOT post molecule:blank when #root has content', async () => {
    const html = await scaffoldHtml(PRE_RENDERED_HTML)
    const { messages, fireTimeouts } = await runInPreview(html, { embedded: true })
    fireTimeouts()
    expect(ofType(messages, 'molecule:blank')).toHaveLength(0)
  })
})

describe('standalone guard (production runs outside the IDE iframe)', () => {
  it('stays completely silent when window.parent === window', async () => {
    const html = await scaffoldHtml(FLAGSHIP_LIKE_HTML)
    const { messages, window, fireBeats, fireTimeouts } = await runInPreview(html, {
      embedded: false,
    })
    fireBeats()
    fireTimeouts()
    dispatchError(window, { message: 'should not surface' })
    dispatchRejection(window, new window.Error('nor this'))
    expect(messages).toHaveLength(0)
  })
})
