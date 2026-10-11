// @vitest-environment jsdom
/**
 * The `dark-mode` slice's README promises, under "Verify": "Toggle to System +
 * change OS theme → app follows along without reload". Its own file table says
 * `app/lib/theme.ts` "listens to `prefers-color-scheme`".
 *
 * `initThemeListener()` is the function that keeps that promise: it applies the
 * saved preference and subscribes to the `(prefers-color-scheme: dark)` `change`
 * event, re-applying the theme while the mode is 'system'. Nothing in the slice
 * ever CALLED it, so the helper — and the media-query subscription inside it —
 * was dead code: choosing System and then flipping the OS theme left the page on
 * the old palette until a manual reload. The toggle now wires it on mount.
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => undefined }),
}))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values?: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? _key,
  }),
}))

/**
 * A `ThemeToggle` bound to a FRESH copy of the slice's modules.
 *
 * `app/lib/theme.ts` holds a module-level `let initialized = false` — the
 * one-shot guard inside `initThemeListener()`. That guard is correct in an app
 * (the listener is registered once and never removed), but across the tests in
 * one file it is shared state: the first mount consumes it and every LATER
 * mount's `initThemeListener()` is a silent no-op, so a test asserting the
 * subscription exists fails for a reason that has nothing to do with the
 * component. `vi.resetModules()` plus a re-import gives each test its own copy.
 */
async function freshToggle(): Promise<() => ReactNode> {
  vi.resetModules()
  const mod =
    (await import('../../../templates/.agents/skills/examples/forms/dark-mode/app/components/ThemeToggle.js')) as {
      ThemeToggle: () => ReactNode
    }
  return mod.ThemeToggle
}

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/**
 * The `matchMedia` result the page sees. `change` listeners registered on it are
 * captured so a test can fire the OS-theme change jsdom cannot produce itself.
 */
const osTheme = {
  matches: false,
  listeners: [] as Array<() => void>,
}

/**
 * An in-memory `localStorage`. The host Node runtime installs its own
 * experimental global whose surface differs from the DOM Storage (no `clear`),
 * and the slice's theme helper reads the bare global — so the test provides the
 * exact Storage shape the module expects.
 */
const store = new Map<string, string>()
const fakeStorage = {
  getItem: (key: string): string | null => store.get(key) ?? null,
  setItem: (key: string, value: string): void => void store.set(key, value),
  removeItem: (key: string): void => void store.delete(key),
  clear: (): void => store.clear(),
  key: (index: number): string | null => [...store.keys()][index] ?? null,
  get length(): number {
    return store.size
  },
}

const originalMatchMedia = window.matchMedia

let container: HTMLElement
let root: Root

beforeEach(() => {
  osTheme.matches = false
  osTheme.listeners = []
  store.clear()
  // Both the bare global (what the helper reads) and `window` (what jsdom code
  // reads) point at the same in-memory Storage.
  Object.defineProperty(globalThis, 'localStorage', {
    value: fakeStorage,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(window, 'localStorage', {
    value: fakeStorage,
    configurable: true,
    writable: true,
  })
  window.matchMedia = ((query: string) =>
    ({
      matches: osTheme.matches,
      media: query,
      addEventListener: (_type: string, listener: () => void) => {
        osTheme.listeners.push(listener)
      },
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList) as typeof window.matchMedia
})

afterEach(async () => {
  window.matchMedia = originalMatchMedia
  store.clear()
  document.documentElement.classList.remove('dark')
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

describe('dark-mode toggle — the OS theme change is followed without a reload', () => {
  it('re-applies the theme when the OS flips to dark while the mode is System', async () => {
    const Toggle = await freshToggle()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(createElement(Toggle))
    })

    // Choose System — what the README's Verify step tells the reader to do.
    const system = Array.from(container.querySelectorAll('button')).find(
      (b) => (b.textContent ?? '').trim() === 'System',
    )
    if (!system) throw new Error('no System button rendered')
    await act(async () => {
      system.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    // The OS theme flips. Without the listener nothing subscribes to this event
    // and the document keeps the old palette until a reload.
    osTheme.matches = true
    await act(async () => {
      for (const listener of osTheme.listeners) listener()
    })

    expect(osTheme.listeners.length, 'the OS-theme listener was never registered').toBeGreaterThan(
      0,
    )
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('a later mount still subscribes — the module’s one-shot guard must not leak between tests', async () => {
    // The order-dependence this file would otherwise carry: `initThemeListener`
    // initializes once PER MODULE COPY, so a second test in the same file sees a
    // no-op unless the graph is reset (see freshToggle). Without the reset this
    // assertion fails — the failure mode a future test added below would hit.
    const Toggle = await freshToggle()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(createElement(Toggle))
    })

    expect(
      osTheme.listeners.length,
      'the subscription must be registered for every mount the test file makes',
    ).toBeGreaterThan(0)
  })
})
