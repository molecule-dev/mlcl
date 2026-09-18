/**
 * Preview snapshot + self-healing-readiness bridge (P2-16 + P2-15).
 *
 * Regression guard for two preview faults the BAKED per-template sender can't fix
 * on its own — both delivered by ONE injected `<script>` (injectPreviewSnapshotBridge)
 * so they reach all 133 flagship templates AND custom builds from a single source,
 * mirroring the nav-bridge drift-guard (preview-nav-bridge.test.ts):
 *
 *  - **Snapshot (P2-16):** on a STABLE render the bridge self-rasterizes #root via
 *    an SVG `<foreignObject>` → offscreen canvas → downscaled JPEG and posts
 *    `{ type: 'molecule:snapshot', dataUrl }` to the embedding IDE so it can show a
 *    blurred "last working build" frame while the app is blank/rebuilding. The
 *    parent (cross-origin) cannot capture the iframe itself — this is the only path.
 *  - **Self-healing readiness (P2-15):** the IDE overlay clears ONLY on
 *    `molecule:ready`; the baked sender posts it once and SUPPRESSES it under a
 *    rapid ready/error storm, so a dropped/suppressed ready sticks the overlay
 *    forever. This bridge is an INDEPENDENT closure that re-sends `molecule:ready`
 *    on first render AND on a periodic "rendered+alive" beat while #root has content.
 *
 * These tests inject the bridge through the real scaffold helper and EXECUTE the
 * resulting HTML in a browser-like jsdom (running the injected inline `<script>`),
 * stubbing the canvas/Image/layout primitives jsdom lacks. A missing/regressed
 * snapshot sender OR ready self-heal makes these fail.
 *
 * @module
 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { JSDOM } from 'jsdom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { injectPreviewNavBridge, injectPreviewSnapshotBridge } from '../scaffold.js'

interface PreviewMessage {
  type?: string
  dataUrl?: string
}

/**
 * A minimal flagship-style index.html carrying the EXISTING baked molecule:* sender
 * (heartbeat) but — exactly like the shipped templates — NO snapshot/self-heal
 * bridge. `#root` starts EMPTY so a content transition can be driven in-test.
 */
const FLAGSHIP_LIKE_HTML = `<!doctype html>
<html lang="en">
  <head><title>demo</title></head>
  <body>
    <div id="root"></div>
    <script>
      (function () {
        if (!window.parent || window.parent === window) return;
        setInterval(function () {
          window.parent.postMessage({ type: 'molecule:heartbeat' }, '*');
        }, 3000);
      })();
    </script>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`

/** Same document but `#root` already has content at first paint (cold-load case). */
const PRE_RENDERED_HTML = FLAGSHIP_LIKE_HTML.replace(
  '<div id="root"></div>',
  '<div id="root"><div class="app">hello</div></div>',
)

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-snapbridge-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

/** Write `html` to a temp index.html, run the scaffold injector, return the result. */
async function scaffoldHtml(html: string, name = 'index.html'): Promise<string> {
  const path = join(dir, name)
  await writeFile(path, html)
  await injectPreviewSnapshotBridge(path)
  return readFile(path, 'utf-8')
}

interface PreviewHarness {
  messages: PreviewMessage[]
  window: Window & typeof globalThis
  /** Invoke the captured `setInterval` beat callbacks (the "rendered+alive" beat). */
  fireBeats: () => void
}

/**
 * Load `html` in a browser-like jsdom that executes inline scripts, stubbing the
 * canvas/Image/layout primitives jsdom lacks so the foreignObject→canvas→JPEG path
 * runs deterministically. When `embedded`, the embedding parent's postMessage is
 * captured; otherwise `window.parent === window` (the standalone/guard case).
 * `getBoundingClientRect` reports a non-zero height only when an element has
 * children, so "visible content" tracks `#root` having children. `taintCanvas`
 * makes `toDataURL` throw (cross-origin taint) to exercise graceful degradation.
 */
async function runInPreview(
  html: string,
  { embedded, taintCanvas = false }: { embedded: boolean; taintCanvas?: boolean },
): Promise<PreviewHarness> {
  const messages: PreviewMessage[] = []
  const intervalFns: Array<() => void> = []
  const dom = new JSDOM(html, {
    url: 'http://localhost:3000/',
    runScripts: 'dangerously',
    pretendToBeVisual: true, // provides requestAnimationFrame
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
      // Layout: an element is "visible" (height > 10) only once it has children.
      window.Element.prototype.getBoundingClientRect = function (this: Element): DOMRect {
        const h = this.children.length > 0 ? 600 : 0
        return {
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          right: 800,
          bottom: h,
          width: 800,
          height: h,
          toJSON: () => ({}),
        } as DOMRect
      }
      // Capture (don't schedule) the self-heal beat so the test can drive it.
      window.setInterval = ((fn: () => void) => {
        intervalFns.push(fn)
        return 0
      }) as typeof window.setInterval
      // Image: resolve `onload` asynchronously when `src` is assigned.
      class StubImage {
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        private _src = ''
        get src(): string {
          return this._src
        }
        set src(v: string) {
          this._src = v
          setTimeout(() => this.onload && this.onload(), 0)
        }
      }
      ;(window as unknown as { Image: unknown }).Image = StubImage
      // Canvas: jsdom has no 2d context / encoder — stub both.
      window.HTMLCanvasElement.prototype.getContext = (() => ({
        fillStyle: '',
        fillRect: () => {},
        drawImage: () => {},
      })) as unknown as HTMLCanvasElement['getContext']
      window.HTMLCanvasElement.prototype.toDataURL = (() => {
        if (taintCanvas) throw new Error('tainted canvas')
        return 'data:image/jpeg;base64,/9j/AAAA'
      }) as unknown as HTMLCanvasElement['toDataURL']
    },
  })
  const window = dom.window as unknown as Window & typeof globalThis
  await new Promise<void>((resolve) => {
    if (window.document.readyState === 'complete') resolve()
    else window.addEventListener('load', () => resolve())
  })
  return { messages, window, fireBeats: () => intervalFns.forEach((fn) => fn()) }
}

const ofType = (messages: PreviewMessage[], type: string): PreviewMessage[] =>
  messages.filter((m) => m?.type === type)

/** Poll until `predicate` holds (the snapshot path is async: rAF + debounce + img load). */
async function waitFor(predicate: () => boolean, timeoutMs = 2500): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('timed out waiting for condition')
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

describe('injectPreviewSnapshotBridge (injection mechanics)', () => {
  it('inserts the snapshot bridge before </body>, after #root', async () => {
    const out = await scaffoldHtml(FLAGSHIP_LIKE_HTML)
    expect(out).toContain('mol:snapshot-bridge')
    expect(out).toContain("type: 'molecule:snapshot'")
    expect(out.indexOf('mol:snapshot-bridge')).toBeLessThan(out.lastIndexOf('</body>'))
    expect(out.indexOf('mol:snapshot-bridge')).toBeGreaterThan(out.indexOf('<div id="root">'))
    // Preserves the pre-existing baked sender.
    expect(out).toContain('molecule:heartbeat')
  })

  it('is idempotent — a second run does not double-insert', async () => {
    const path = join(dir, 'index.html')
    await writeFile(path, FLAGSHIP_LIKE_HTML)
    expect(await injectPreviewSnapshotBridge(path)).toBe(true)
    expect(await injectPreviewSnapshotBridge(path)).toBe(false)
    const out = await readFile(path, 'utf-8')
    expect(out.match(/mol:snapshot-bridge/g)).toHaveLength(1)
    expect(out.match(/type: 'molecule:snapshot'/g)).toHaveLength(1)
  })

  it('coexists with the nav bridge (both inject independently)', async () => {
    const path = join(dir, 'index.html')
    await writeFile(path, FLAGSHIP_LIKE_HTML)
    expect(await injectPreviewNavBridge(path)).toBe(true)
    expect(await injectPreviewSnapshotBridge(path)).toBe(true)
    const out = await readFile(path, 'utf-8')
    expect(out).toContain('mol:nav-bridge')
    expect(out).toContain('mol:snapshot-bridge')
    expect(out).toContain("type: 'molecule:navigate'")
    expect(out).toContain("type: 'molecule:snapshot'")
  })

  it('returns false for a missing file', async () => {
    expect(await injectPreviewSnapshotBridge(join(dir, 'nope.html'))).toBe(false)
  })

  it('skips a document with no </body> rather than corrupting it', async () => {
    const fragment = '<div>no document here</div>'
    const path = join(dir, 'fragment.html')
    await writeFile(path, fragment)
    expect(await injectPreviewSnapshotBridge(path)).toBe(false)
    expect(await readFile(path, 'utf-8')).toBe(fragment)
  })
})

describe('self-healing readiness (P2-15)', () => {
  it('re-sends molecule:ready immediately when #root already has content (cold load)', async () => {
    const html = await scaffoldHtml(PRE_RENDERED_HTML)
    const { messages } = await runInPreview(html, { embedded: true })
    expect(ofType(messages, 'molecule:ready').length).toBeGreaterThanOrEqual(1)
  })

  it('re-sends molecule:ready when a render first appears (empty → content)', async () => {
    const html = await scaffoldHtml(FLAGSHIP_LIKE_HTML)
    const { messages, window } = await runInPreview(html, { embedded: true })
    expect(ofType(messages, 'molecule:ready')).toHaveLength(0) // empty root: nothing yet
    const root = window.document.getElementById('root')!
    const child = window.document.createElement('div')
    child.textContent = 'rendered'
    root.appendChild(child)
    await waitFor(() => ofType(messages, 'molecule:ready').length >= 1)
  })

  it('beats molecule:ready while content is present so a dropped ready self-heals', async () => {
    const html = await scaffoldHtml(PRE_RENDERED_HTML)
    const { messages, fireBeats } = await runInPreview(html, { embedded: true })
    const before = ofType(messages, 'molecule:ready').length
    fireBeats() // simulate the periodic "rendered+alive" beat
    expect(ofType(messages, 'molecule:ready').length).toBe(before + 1)
  })

  it('does nothing outside the IDE iframe (production runs standalone)', async () => {
    const html = await scaffoldHtml(PRE_RENDERED_HTML)
    const { messages, window, fireBeats } = await runInPreview(html, { embedded: false })
    const root = window.document.getElementById('root')!
    root.appendChild(window.document.createElement('div'))
    fireBeats()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(ofType(messages, 'molecule:ready')).toHaveLength(0)
    expect(ofType(messages, 'molecule:snapshot')).toHaveLength(0)
  })
})

describe('last-good-frame snapshot (P2-16)', () => {
  it('posts molecule:snapshot with a data:image JPEG on a stable render', async () => {
    const html = await scaffoldHtml(FLAGSHIP_LIKE_HTML)
    const { messages, window } = await runInPreview(html, { embedded: true })
    const root = window.document.getElementById('root')!
    const child = window.document.createElement('div')
    child.textContent = 'a rendered app'
    root.appendChild(child)
    await waitFor(() => ofType(messages, 'molecule:snapshot').length >= 1)
    const snap = ofType(messages, 'molecule:snapshot')[0]
    expect(typeof snap.dataUrl).toBe('string')
    expect(snap.dataUrl!.startsWith('data:image/jpeg')).toBe(true)
  })

  it('swallows a tainted canvas (cross-origin image) — no snapshot, no throw', async () => {
    const html = await scaffoldHtml(FLAGSHIP_LIKE_HTML)
    const { messages, window } = await runInPreview(html, { embedded: true, taintCanvas: true })
    const root = window.document.getElementById('root')!
    root.appendChild(window.document.createElement('div'))
    // Give the rAF + debounce + img-load + (throwing) toDataURL path time to run.
    await new Promise((resolve) => setTimeout(resolve, 900))
    expect(ofType(messages, 'molecule:snapshot')).toHaveLength(0)
    // Readiness still heals even when the snapshot can't be produced.
    expect(ofType(messages, 'molecule:ready').length).toBeGreaterThanOrEqual(1)
  })
})
