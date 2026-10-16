/**
 * Preview navigation bridge (PV2 URL bar + PV3 Back/Forward) — BIDIRECTIONAL.
 *
 * Regression guard for the audit finding "PV2/PV3": the host-side receiver +
 * provider (IframePreviewProvider.recordNavigation, PreviewPanel's
 * `molecule:navigate` listener) shipped and were unit-tested, but the scaffolded
 * preview ran NEITHER end of the protocol — it never SENT `molecule:navigate`
 * (so the URL bar never updated on client-side nav and Back/Forward stayed
 * disabled) NOR LISTENED for a Back/Forward nav-command (so even once wired the
 * only way Back could work was a host-side cold reload). API-/text-only tests
 * let it ship.
 *
 * These tests inject the bridge through the real scaffold helper and then EXECUTE
 * the resulting HTML in a browser-like jsdom (running the injected inline
 * `<script>`), asserting BOTH directions:
 *
 *  - **Sender:** posts `{ type: 'molecule:navigate', url, isReplace }` to its
 *    embedding parent on first load and on every client-side route change
 *    (pushState / replaceState / popstate / hashchange) — the exact shape
 *    PreviewPanel listens for. `isReplace` is `true` only for `replaceState` (so
 *    the host preserves the Forward stack on a redirect-on-load), `false` for the
 *    history-adding moves.
 *  - **Receiver:** on `{ type: 'molecule:nav-command', action: 'back' | 'forward' }`
 *    from the embedding parent, runs the iframe's own `history.back()`/`forward()`
 *    (a real client-side nav, not a cold reload), rejecting commands from any
 *    other window. The resulting popstate re-fires the sender so the URL follows.
 *
 * A missing/regressed sender OR receiver makes these fail.
 *
 * @module
 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { JSDOM } from 'jsdom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { injectPreviewNavBridge } from '../scaffold.js'
import { inlinePreviewBridgeScripts } from './preview-bridge-test-utils.js'

interface PreviewMessage {
  type?: string
  url?: string
  action?: string
}

/**
 * A minimal flagship-style index.html: it carries the EXISTING molecule:* preview
 * bridge (heartbeat) but — exactly like all 133 shipped flagship index.html files
 * did — NO `molecule:navigate` sender. This is the artifact the audit found.
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

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-navbridge-'))
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
  await injectPreviewNavBridge(path)
  return inlinePreviewBridgeScripts(await readFile(path, 'utf-8'), dir)
}

/**
 * Load `html` in a browser-like jsdom that executes inline scripts. When
 * `embedded`, mock the embedding parent so the bridge's postMessage is captured;
 * otherwise leave `window.parent === window` (the standalone/guard case). Every
 * captured message is returned via `messages`; resolves after the `load` event so
 * the initial-location report (fired on DOMContentLoaded) has run.
 */
async function runInPreview(
  html: string,
  { embedded }: { embedded: boolean },
): Promise<{ messages: PreviewMessage[]; window: Window & typeof globalThis }> {
  const messages: PreviewMessage[] = []
  const dom = new JSDOM(html, {
    url: 'http://localhost:3000/',
    runScripts: 'dangerously',
    beforeParse(window) {
      // Capture same-window posts (standalone case never posts, but be exhaustive).
      window.addEventListener('message', (event: MessageEvent) =>
        messages.push(event.data as PreviewMessage),
      )
      if (embedded) {
        Object.defineProperty(window, 'parent', {
          value: { postMessage: (data: PreviewMessage) => messages.push(data) },
          configurable: true,
        })
      }
    },
  })
  const window = dom.window as unknown as Window & typeof globalThis
  await new Promise<void>((resolve) => {
    if (window.document.readyState === 'complete') resolve()
    else window.addEventListener('load', () => resolve())
  })
  return { messages, window }
}

const navMessages = (messages: PreviewMessage[]): PreviewMessage[] =>
  messages.filter((m) => m?.type === 'molecule:navigate')

/**
 * Wait until the document's path reaches `path`. jsdom runs `history.back()`/
 * `forward()` traversal asynchronously (the resulting `popstate` lands a few
 * macrotasks later), so a positive Back/Forward assertion must poll rather than
 * flush a single tick. Throws on timeout so a regressed receiver fails loudly.
 */
async function waitForPath(
  window: Window & typeof globalThis,
  path: string,
  timeoutMs = 2000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (window.location.pathname !== path) {
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for path ${path}; still at ${window.location.pathname}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

/**
 * A fixed settle window for NEGATIVE assertions ("this command must NOT
 * navigate") — long enough that a wrongly-honored traversal (which lands within
 * ~100ms above) would have shown up, so asserting no-change after it is sound.
 */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 150))

/**
 * Simulate the host IDE posting a Back/Forward nav-command into the preview
 * iframe. `source` defaults to `window.parent` (the embedding host the receiver
 * trusts); pass a different object to exercise the security guard.
 */
function postNavCommand(
  window: Window & typeof globalThis,
  action: string,
  source: unknown = window.parent,
): void {
  window.dispatchEvent(
    new window.MessageEvent('message', {
      data: { type: 'molecule:nav-command', action },
      source: source as MessageEventSource,
    }),
  )
}

describe('injectPreviewNavBridge', () => {
  it('inserts the molecule:navigate sender before </body>', async () => {
    const out = await scaffoldHtml(FLAGSHIP_LIKE_HTML)
    expect(out).toContain('molecule:navigate')
    // Anchored at the closing body, after the app entry, so it does not disturb head/meta.
    expect(out.indexOf('molecule:navigate')).toBeLessThan(out.lastIndexOf('</body>'))
    expect(out.indexOf('molecule:navigate')).toBeGreaterThan(out.indexOf('<div id="root">'))
    // Preserves the pre-existing molecule:* bridge.
    expect(out).toContain('molecule:heartbeat')
  })

  it('is idempotent — a second run does not double-insert', async () => {
    const path = join(dir, 'index.html')
    await writeFile(path, FLAGSHIP_LIKE_HTML)
    expect(await injectPreviewNavBridge(path)).toBe(true)
    expect(await injectPreviewNavBridge(path)).toBe(false)
    const out = await readFile(path, 'utf-8')
    // Count the SENTINEL, which is what the guard keys on and what a second
    // insertion would duplicate. Counting `type: 'molecule:navigate'` instead
    // measured how many senders one block happens to contain, so adding the
    // link-intent sender (`isIntent: true`) broke this while idempotency was
    // never in question.
    expect(out.match(/mol:nav-bridge/g)).toHaveLength(1)
    // Both senders survive one injection: the history patch and the link intent.
    // They live in the file the reference loads (the entry document carries only
    // the reference), which is what the browser executes — see
    // preview-bridge-test-utils.ts.
    const script = await readFile(join(dir, 'public', '__mol', 'bridges', 'nav-bridge.js'), 'utf-8')
    expect(script).toContain('isReplace: !!isReplace')
    expect(script).toContain('isIntent: true')
  })

  it('still injects when prose merely mentions "molecule:navigate" but the sentinel is absent', async () => {
    // The shared index.html.tpl carries a comment that NAMES the sender; the
    // idempotency guard must key on the injected sentinel, not that substring,
    // or custom builds written from the template would never get the bridge.
    const withProse = FLAGSHIP_LIKE_HTML.replace(
      '<div id="root"></div>',
      '<div id="root"></div>\n    <!-- the molecule:navigate sender is appended at scaffold time -->',
    )
    const out = await scaffoldHtml(withProse)
    expect(out).toContain('mol:nav-bridge')
    expect(out.match(/mol:nav-bridge/g)).toHaveLength(1)
  })

  it('returns false for a missing file', async () => {
    expect(await injectPreviewNavBridge(join(dir, 'nope.html'))).toBe(false)
  })

  it('skips a document with no </body> rather than corrupting it', async () => {
    const fragment = '<div>no document here</div>'
    const path = join(dir, 'fragment.html')
    await writeFile(path, fragment)
    expect(await injectPreviewNavBridge(path)).toBe(false)
    expect(await readFile(path, 'utf-8')).toBe(fragment)
  })
})

describe('scaffolded preview emits molecule:navigate (PV2/PV3 wiring)', () => {
  it('reports the initial location on first load (as a non-replace/push)', async () => {
    const html = await scaffoldHtml(FLAGSHIP_LIKE_HTML)
    const { messages } = await runInPreview(html, { embedded: true })
    expect(navMessages(messages)).toContainEqual({
      type: 'molecule:navigate',
      url: 'http://localhost:3000/',
      isReplace: false,
    })
  })

  it('reports the full URL on client-side history.pushState as isReplace:false (PV2/PV3)', async () => {
    const html = await scaffoldHtml(FLAGSHIP_LIKE_HTML)
    const { messages, window } = await runInPreview(html, { embedded: true })
    window.history.pushState({}, '', '/dashboard/settings')
    // pushState ADDS a history entry — reported as a push so the host truncates
    // the forward stack, exactly like a browser address-bar navigation.
    expect(navMessages(messages).at(-1)).toEqual({
      type: 'molecule:navigate',
      url: 'http://localhost:3000/dashboard/settings',
      isReplace: false,
    })
  })

  it('reports history.replaceState as isReplace:true so the host preserves Forward (PV3)', async () => {
    const html = await scaffoldHtml(FLAGSHIP_LIKE_HTML)
    const { messages, window } = await runInPreview(html, { embedded: true })
    window.history.replaceState({}, '', '/login?next=%2Fhome')
    // replaceState SWAPS the current entry (a redirect/canonicalization) — it must
    // carry isReplace:true so the host preserves the Forward stack instead of
    // truncating it (the PV3 redirect-on-load regression).
    expect(navMessages(messages).at(-1)).toEqual({
      type: 'molecule:navigate',
      url: 'http://localhost:3000/login?next=%2Fhome',
      isReplace: true,
    })
  })

  it('reports on popstate so Back/Forward update the URL bar (PV3)', async () => {
    const html = await scaffoldHtml(FLAGSHIP_LIKE_HTML)
    const { messages, window } = await runInPreview(html, { embedded: true })
    const before = navMessages(messages).length
    window.dispatchEvent(new window.Event('popstate'))
    expect(navMessages(messages).length).toBe(before + 1)
  })

  it('reports on hashchange (hash-based routing)', async () => {
    const html = await scaffoldHtml(FLAGSHIP_LIKE_HTML)
    const { messages, window } = await runInPreview(html, { embedded: true })
    const before = navMessages(messages).length
    window.dispatchEvent(new window.Event('hashchange'))
    expect(navMessages(messages).length).toBe(before + 1)
  })

  it('does nothing outside the IDE iframe (production runs standalone)', async () => {
    const html = await scaffoldHtml(FLAGSHIP_LIKE_HTML)
    const { messages, window } = await runInPreview(html, { embedded: false })
    // The guard (window.parent === window) returns before patching history, so a
    // client-side nav must NOT emit anything.
    window.history.pushState({}, '', '/should-not-report')
    window.dispatchEvent(new window.Event('popstate'))
    expect(navMessages(messages)).toHaveLength(0)
  })
})

describe('scaffolded preview obeys molecule:nav-command (PV3 Back/Forward receiver)', () => {
  it('runs the iframe’s own history.back() on a Back nav-command, and the URL bar follows', async () => {
    const html = await scaffoldHtml(FLAGSHIP_LIKE_HTML)
    const { messages, window } = await runInPreview(html, { embedded: true })
    // Build a 3-deep client-side history: / -> /a -> /b.
    window.history.pushState({}, '', '/a')
    window.history.pushState({}, '', '/b')
    expect(window.location.pathname).toBe('/b')

    // Host clicks Back -> posts a nav-command into the iframe.
    postNavCommand(window, 'back')

    // Real client-side Back (not a cold reload): the iframe traverses to /a, and
    // the resulting popstate re-fires the sender so the host URL bar follows.
    await waitForPath(window, '/a')
    // The traversal fires popstate → reported as a history-adding move (push).
    expect(navMessages(messages).at(-1)).toEqual({
      type: 'molecule:navigate',
      url: 'http://localhost:3000/a',
      isReplace: false,
    })
  })

  it('runs history.forward() on a Forward nav-command after going Back', async () => {
    const html = await scaffoldHtml(FLAGSHIP_LIKE_HTML)
    const { messages, window } = await runInPreview(html, { embedded: true })
    window.history.pushState({}, '', '/a')
    window.history.pushState({}, '', '/b')

    postNavCommand(window, 'back')
    await waitForPath(window, '/a')

    postNavCommand(window, 'forward')
    await waitForPath(window, '/b')
    expect(navMessages(messages).at(-1)).toEqual({
      type: 'molecule:navigate',
      url: 'http://localhost:3000/b',
      isReplace: false,
    })
  })

  it('ignores a nav-command from a window other than the embedding parent (security)', async () => {
    const html = await scaffoldHtml(FLAGSHIP_LIKE_HTML)
    const { messages, window } = await runInPreview(html, { embedded: true })
    window.history.pushState({}, '', '/a')
    window.history.pushState({}, '', '/b')
    const before = navMessages(messages).length

    // A malicious nested iframe / unrelated window must NOT be able to steer
    // navigation: source is some other object, not window.parent.
    postNavCommand(window, 'back', { notTheParent: true })
    await settle()
    expect(window.location.pathname).toBe('/b')
    expect(navMessages(messages).length).toBe(before)
  })

  it('ignores malformed and unknown-action nav-commands', async () => {
    const html = await scaffoldHtml(FLAGSHIP_LIKE_HTML)
    const { messages, window } = await runInPreview(html, { embedded: true })
    window.history.pushState({}, '', '/a')
    window.history.pushState({}, '', '/b')
    const before = navMessages(messages).length

    postNavCommand(window, 'sideways') // unknown action
    window.dispatchEvent(
      new window.MessageEvent('message', {
        data: { type: 'molecule:heartbeat' },
        source: window.parent,
      }),
    ) // wrong type (some other molecule:* message)
    window.dispatchEvent(new window.MessageEvent('message', { data: null, source: window.parent })) // no payload
    await settle()
    expect(window.location.pathname).toBe('/b')
    expect(navMessages(messages).length).toBe(before)
  })

  it('does not attach the receiver outside the IDE iframe (production runs standalone)', async () => {
    const html = await scaffoldHtml(FLAGSHIP_LIKE_HTML)
    const { window } = await runInPreview(html, { embedded: false })
    // The guard (window.parent === window) returns before adding the message
    // listener, so a Back command must NOT navigate the standalone document.
    window.history.pushState({}, '', '/a')
    window.history.pushState({}, '', '/b')
    postNavCommand(window, 'back')
    await settle()
    expect(window.location.pathname).toBe('/b')
  })
})
