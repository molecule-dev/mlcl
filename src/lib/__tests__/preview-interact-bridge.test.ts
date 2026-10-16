/**
 * Preview interaction (live-control) bridge.
 *
 * Regression guard for the channel that lets Synthase DRIVE a scaffolded app's preview
 * — read the on-screen UI (interactive elements by `data-mol-id`) and click/fill it —
 * so a feature can be verified end-to-end with NO headless browser. Delivered by ONE
 * injected `<script>` (injectPreviewInteractBridge) so it reaches every flagship template
 * AND custom builds from a single source, mirroring the nav/snapshot/runtime bridges.
 *
 * The script itself is a byte-for-byte mirror of molecule-dev's canonical
 * PREVIEW_INTERACT_BRIDGE_SCRIPT (the imported-app proxy bundle); that identity is
 * enforced by a drift-guard in molecule-dev's preview-proxy-asset.test.ts. These tests
 * cover the mlcl-specific INJECTION MECHANICS and EXECUTE the injected inline `<script>`
 * in a browser-like jsdom to prove the delivered bridge actually snapshots + drives the
 * live DOM and stays silent standalone.
 *
 * Protocol: host posts `{ type:'molecule:ui-command', id, action, molId?, selector?,
 * value? }` (source must be the embedding parent); the bridge replies
 * `{ type:'molecule:ui-result', id, ok, snapshot?, error? }`.
 *
 * @module
 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { JSDOM } from 'jsdom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  injectPreviewInteractBridge,
  injectPreviewNavBridge,
  injectPreviewRuntimeBridge,
  injectPreviewSnapshotBridge,
} from '../scaffold.js'
import { inlinePreviewBridgeScripts } from './preview-bridge-test-utils.js'

interface UiResult {
  type?: string
  id?: string
  ok?: boolean
  error?: string
  found?: boolean
  stillSettling?: string
  snapshot?: {
    url: string
    title: string
    elements: Array<{ molId: string | null; tag: string; name: string; value: string }>
  }
}

/** A minimal app shell carrying a couple of data-mol-id interactive elements. */
const APP_HTML = `<!doctype html>
<html lang="en">
  <head><title>demo</title></head>
  <body>
    <div id="root">
      <button data-mol-id="setup-2fa">Set up 2FA</button>
      <input data-mol-id="code" placeholder="6-digit code" />
      <span data-mol-id="not-interactive-noise">ignored text</span>
    </div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-interactbridge-'))
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
  await injectPreviewInteractBridge(path)
  return inlinePreviewBridgeScripts(await readFile(path, 'utf-8'), dir)
}

interface PreviewHarness {
  replies: UiResult[]
  window: Window & typeof globalThis
  /** Post a ui-command from the (mock) embedding parent + flush any delayed replies. */
  send: (cmd: Record<string, unknown>) => void
  /** Post a ui-command WITHOUT draining — to observe what the bridge answers immediately. */
  post: (cmd: Record<string, unknown>) => void
  /** Jump the mocked clock (e.g. to age the page past its boot grace). */
  advance: (ms: number) => void
  /**
   * Drain the captured `setTimeout` callbacks, including the ones they schedule in turn —
   * the bridge's settle path is a chain of re-scheduled polls (present → target → quiet),
   * so a single pass would leave a command hanging mid-settle.
   */
  fireTimeouts: () => void
}

/**
 * Load `html` in a browser-like jsdom that executes inline scripts. `setTimeout` is
 * CAPTURED so the test drives the bridge's delayed post-action reply deterministically.
 * `getBoundingClientRect` is stubbed non-zero so `visible()` sees laid-out elements
 * (jsdom has no layout). When `embedded`, `window.parent` is a mock whose `postMessage`
 * captures replies AND is used as the command `source`; otherwise `parent === window`
 * (the standalone/guard case, where the bridge must stay silent).
 */
async function runInPreview(
  html: string,
  { embedded }: { embedded: boolean },
): Promise<PreviewHarness> {
  const replies: UiResult[] = []
  const timeoutFns: Array<() => void> = []
  const clock = { now: 0 }
  const parentMock = { postMessage: (data: UiResult) => replies.push(data) }
  const dom = new JSDOM(html, {
    url: 'http://localhost:3000/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      if (embedded) {
        Object.defineProperty(window, 'parent', { value: parentMock, configurable: true })
      }
      // jsdom performs no layout, so getBoundingClientRect is all-zero → visible() would
      // reject every element. Give laid-out elements a real box.
      window.Element.prototype.getBoundingClientRect = function (): DOMRect {
        return {
          width: 120,
          height: 32,
          top: 0,
          left: 0,
          right: 120,
          bottom: 32,
          x: 0,
          y: 0,
        } as DOMRect
      }
      // Capture (don't schedule) the post-action reply + highlight timers.
      window.setTimeout = ((fn: () => void) => {
        timeoutFns.push(fn)
        return 0
      }) as typeof window.setTimeout
      // Mock the clock. It creeps forward on every read so the bridge's bounded polls
      // always terminate, but slowly enough that the PAGE-AGE budget (the boot grace
      // for an empty root) isn't burned just by loading — tests jump that explicitly
      // with `advance()`, which is what makes "still booting" vs "simply blank"
      // testable at all.
      clock.now = 1_000_000
      window.Date.now = () => {
        clock.now += 50
        return clock.now
      }
    },
  })
  const window = dom.window as unknown as Window & typeof globalThis
  await new Promise<void>((resolve) => {
    if (window.document.readyState === 'complete') resolve()
    else window.addEventListener('load', () => resolve())
  })
  // Drain re-scheduled timers too (the settle chain polls itself), bounded so a bug can
  // never hang the suite. The mocked clock jumps 400ms per Date.now(), so every bounded
  // poll in the bridge runs out of budget within a handful of passes.
  const fireTimeouts = (): void => {
    for (let pass = 0; timeoutFns.length && pass < 200; pass++) {
      timeoutFns.splice(0).forEach((fn) => fn())
    }
  }
  const post = (cmd: Record<string, unknown>): void => {
    const evt = new window.Event('message') as Event & Record<string, unknown>
    // The bridge gates on event.source === window.parent; assign it our mock parent.
    Object.assign(evt, { data: { type: 'molecule:ui-command', ...cmd }, source: parentMock })
    window.dispatchEvent(evt)
  }
  return {
    replies,
    window,
    fireTimeouts,
    post,
    advance: (ms) => {
      clock.now += ms
    },
    send: (cmd) => {
      post(cmd)
      fireTimeouts()
    },
  }
}

const results = (harness: PreviewHarness, id: string): UiResult[] =>
  harness.replies.filter((m) => m?.type === 'molecule:ui-result' && m.id === id)

describe('injectPreviewInteractBridge (injection mechanics)', () => {
  it('inserts the interact bridge before </body>, after #root', async () => {
    const out = await scaffoldHtml(APP_HTML)
    expect(out).toContain('mol:interact-bridge')
    expect(out).toContain("d.type !== 'molecule:ui-command'")
    expect(out).toContain("'molecule:ui-result'")
    expect(out).toContain('data-mol-id="')
    expect(out.indexOf('mol:interact-bridge')).toBeLessThan(out.lastIndexOf('</body>'))
    expect(out.indexOf('mol:interact-bridge')).toBeGreaterThan(out.indexOf('<div id="root">'))
  })

  it('is idempotent — a second run does not double-insert', async () => {
    const path = join(dir, 'index.html')
    await writeFile(path, APP_HTML)
    expect(await injectPreviewInteractBridge(path)).toBe(true)
    expect(await injectPreviewInteractBridge(path)).toBe(false)
    const out = await readFile(path, 'utf-8')
    expect(out.match(/mol:interact-bridge/g)).toHaveLength(1)
  })

  it('coexists with the nav + snapshot + runtime bridges (all four inject independently)', async () => {
    const path = join(dir, 'index.html')
    await writeFile(path, APP_HTML)
    expect(await injectPreviewNavBridge(path)).toBe(true)
    expect(await injectPreviewSnapshotBridge(path)).toBe(true)
    expect(await injectPreviewRuntimeBridge(path)).toBe(true)
    expect(await injectPreviewInteractBridge(path)).toBe(true)
    const out = await readFile(path, 'utf-8')
    expect(out).toContain('mol:nav-bridge')
    expect(out).toContain('mol:snapshot-bridge')
    expect(out).toContain('mol:runtime-bridge')
    expect(out).toContain('mol:interact-bridge')
  })

  it('returns false for a missing file', async () => {
    expect(await injectPreviewInteractBridge(join(dir, 'nope.html'))).toBe(false)
  })

  it('skips a document with no </body> rather than corrupting it', async () => {
    const fragment = '<div>no document here</div>'
    const path = join(dir, 'fragment.html')
    await writeFile(path, fragment)
    expect(await injectPreviewInteractBridge(path)).toBe(false)
    expect(await readFile(path, 'utf-8')).toBe(fragment)
  })
})

describe('snapshot (what Synthase reads to decide what to touch)', () => {
  it('returns visible interactive elements keyed by data-mol-id', async () => {
    const html = await scaffoldHtml(APP_HTML)
    const harness = await runInPreview(html, { embedded: true })
    harness.send({ id: 'r1', action: 'snapshot' })
    const [res] = results(harness, 'r1')
    expect(res?.ok).toBe(true)
    const ids = res?.snapshot?.elements.map((e) => e.molId)
    expect(ids).toContain('setup-2fa')
    expect(ids).toContain('code')
    // The button's accessible label is captured so a weak model can pick it by name.
    const btn = res?.snapshot?.elements.find((e) => e.molId === 'setup-2fa')
    expect(btn?.name).toBe('Set up 2FA')
  })
})

describe('interaction (drives the live DOM the user is watching)', () => {
  it('click posts a click on the target + replies ok with the resulting snapshot', async () => {
    const html = await scaffoldHtml(APP_HTML)
    const harness = await runInPreview(html, { embedded: true })
    let clicked = false
    harness.window.document
      .querySelector('[data-mol-id="setup-2fa"]')!
      .addEventListener('click', () => {
        clicked = true
      })
    harness.send({ id: 'r2', action: 'click', molId: 'setup-2fa' })
    expect(clicked).toBe(true)
    const [res] = results(harness, 'r2')
    expect(res?.ok).toBe(true)
    expect(res?.snapshot).toBeTruthy()
  })

  it('dedups a RETRIED command by id — the click fires ONCE, retries get the cached reply', async () => {
    // The host re-sends a command until the bridge replies (the iframe may be mid-mount/reload when
    // it first fires). Dedup MUST make that safe: a mutating click must execute exactly once.
    const html = await scaffoldHtml(APP_HTML)
    const harness = await runInPreview(html, { embedded: true })
    let clicks = 0
    harness.window.document
      .querySelector('[data-mol-id="setup-2fa"]')!
      .addEventListener('click', () => {
        clicks++
      })
    // Same id sent twice, as a retry would.
    harness.send({ id: 'dup-1', action: 'click', molId: 'setup-2fa' })
    harness.send({ id: 'dup-1', action: 'click', molId: 'setup-2fa' })
    expect(clicks).toBe(1) // executed exactly once despite the retry
    const replies = results(harness, 'dup-1')
    expect(replies.length).toBeGreaterThanOrEqual(2) // the retry still gets a reply (from cache)
    expect(replies.every((r) => r.ok === true)).toBe(true)
  })

  it('fill sets the value via the native setter + fires input/change', async () => {
    const html = await scaffoldHtml(APP_HTML)
    const harness = await runInPreview(html, { embedded: true })
    const input = harness.window.document.querySelector('[data-mol-id="code"]') as HTMLInputElement
    const events: string[] = []
    input.addEventListener('input', () => events.push('input'))
    input.addEventListener('change', () => events.push('change'))
    harness.send({ id: 'r3', action: 'fill', molId: 'code', value: '123456' })
    expect(input.value).toBe('123456')
    expect(events).toEqual(['input', 'change'])
    expect(results(harness, 'r3')[0]?.ok).toBe(true)
  })

  it('replies ok:false with an actionable error when the target is not found', async () => {
    const html = await scaffoldHtml(APP_HTML)
    const harness = await runInPreview(html, { embedded: true })
    harness.send({ id: 'r4', action: 'click', molId: 'does-not-exist' })
    const [res] = results(harness, 'r4')
    expect(res?.ok).toBe(false)
    expect(res?.error).toContain('element not found')
    expect(res?.error).toContain('does-not-exist')
  })
})

describe('settle gate (the executor must not read a half-loaded page as a broken one)', () => {
  /** The same shell, but nothing rendered yet — a page mid-boot. */
  const BOOTING_HTML = APP_HTML.replace(/<div id="root">[\s\S]*?<\/div>/, '<div id="root"></div>')

  it('does NOT answer a snapshot while a JUST-LOADED page is still empty', async () => {
    const html = await scaffoldHtml(BOOTING_HTML)
    const harness = await runInPreview(html, { embedded: true })
    harness.advance(400) // clear the DOM-quiescence window; the page is still young
    harness.post({ id: 's1', action: 'snapshot' })
    // The regression: this used to reply synchronously with an empty page, and the executor
    // concluded the route was broken while the framework was simply still booting.
    expect(results(harness, 's1')).toHaveLength(0)
  })

  it('answers once the boot grace runs out, and says WHY it may be incomplete', async () => {
    const html = await scaffoldHtml(BOOTING_HTML)
    const harness = await runInPreview(html, { embedded: true })
    harness.send({ id: 's2', action: 'snapshot' })
    const [res] = results(harness, 's2')
    // Bounded, never hanging: a genuinely blank page still gets an answer...
    expect(res?.ok).toBe(true)
    // ...but one that distinguishes "waited and it never rendered" from "settled and empty".
    expect(res?.stillSettling).toContain('EMPTY')
    expect(res?.stillSettling).toContain('INCOMPLETE')
  })

  it('answers a LONG-blank page immediately — the grace is per page load, not per call', async () => {
    // The performance regression this guards: the paint gate was budgeted from the COMMAND,
    // so a page that was simply blank re-paid the full boot grace on EVERY read — and a
    // blank preview is exactly what the executor inspects most while debugging one.
    const html = await scaffoldHtml(BOOTING_HTML)
    const harness = await runInPreview(html, { embedded: true })
    harness.advance(30_000) // this page has been up a while and never rendered
    harness.post({ id: 's2b', action: 'snapshot' })
    const [res] = results(harness, 's2b')
    expect(res?.ok).toBe(true) // answered with ZERO deferred timers
    expect(res?.stillSettling).toContain('blank, not still loading')
  })

  it('answers a settled page immediately, with no stillSettling note', async () => {
    const html = await scaffoldHtml(APP_HTML)
    const harness = await runInPreview(html, { embedded: true })
    harness.advance(400)
    harness.post({ id: 's3', action: 'snapshot' })
    const [res] = results(harness, 's3')
    expect(res?.ok).toBe(true)
    expect(res?.stillSettling).toBeUndefined()
  })

  it('an OUTGOING document never answers a navigation snapshot', async () => {
    // minLoadedAt is what stops the page being navigated AWAY from — still sitting in the
    // iframe when the command arrives — from answering with a pre-navigation snapshot. The
    // executor otherwise "verified" the screen it had just left. It must stay silent so the
    // host's re-post reaches the document the navigation actually loads.
    const html = await scaffoldHtml(APP_HTML)
    const harness = await runInPreview(html, { embedded: true })
    harness.send({ id: 's4', action: 'snapshot', minLoadedAt: Date.now() + 60_000 })
    expect(results(harness, 's4')).toHaveLength(0)
  })

  it('the document the navigation loaded answers normally', async () => {
    const html = await scaffoldHtml(APP_HTML)
    const harness = await runInPreview(html, { embedded: true })
    harness.advance(400)
    // Stamped before this document loaded — i.e. this IS the page that navigation produced.
    harness.post({ id: 's5', action: 'snapshot', minLoadedAt: 1 })
    const [res] = results(harness, 's5')
    expect(res?.ok).toBe(true)
    expect(res?.stillSettling).toBeUndefined()
  })

  it('auto-waits for a target that mounts a moment later instead of "not found"', async () => {
    const html = await scaffoldHtml(APP_HTML)
    const harness = await runInPreview(html, { embedded: true })
    harness.post({ id: 's6', action: 'click', molId: 'late-button' })
    expect(results(harness, 's6')).toHaveLength(0)
    // The lazy route chunk lands (or the data-gated render finally happens).
    const late = harness.window.document.createElement('button')
    late.setAttribute('data-mol-id', 'late-button')
    let clicked = false
    late.addEventListener('click', () => {
      clicked = true
    })
    harness.window.document.querySelector('#root')!.appendChild(late)
    harness.fireTimeouts()
    expect(clicked).toBe(true)
    expect(results(harness, 's6')[0]?.ok).toBe(true)
  })
})

describe('standalone guard (production runs outside the IDE iframe)', () => {
  it('never wires a listener when window.parent === window', async () => {
    const html = await scaffoldHtml(APP_HTML)
    const harness = await runInPreview(html, { embedded: false })
    harness.send({ id: 'r5', action: 'snapshot' })
    expect(harness.replies).toHaveLength(0)
  })
})
