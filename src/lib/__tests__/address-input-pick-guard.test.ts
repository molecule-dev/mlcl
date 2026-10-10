// @vitest-environment jsdom
/**
 * `AddressInput` debounces a geocode per keystroke and suppresses exactly ONE
 * run after the user picks a suggestion — the run for the address it just
 * wrote back into the field.
 *
 * That suppression was a bare boolean ref, consumed by the `[query]` effect:
 * `choose()` set it true and then called `setQuery(place.formatted)`. When the
 * picked suggestion's `formatted` IS what the field already holds, that
 * `setQuery` is a no-op — React bails out of the state update, the effect never
 * re-runs, and the flag is never consumed. The NEXT edit then hit the early
 * return instead: the reader typed three or more characters and got no lookup,
 * no suggestion and no error, until they typed again.
 *
 * The guard now holds the picked STRING and is consumed on every run, so a
 * stale value can never suppress a later, unrelated edit.
 *
 * The REAL component is rendered into REAL DOM (jsdom) — only the ClassMap /
 * i18n bonds and the network are stubbed, and the debounce is driven by real
 * timers (`vi.waitFor` waits for the request the debounce fires).
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface Pending {
  /** The parsed request body, so the test can assert WHICH address was looked up. */
  body: unknown
  answered: boolean
  respond: (status: number, body: unknown) => void
}

/** Every geocode request the component made, in order, with a handle to answer it. */
const pending = vi.hoisted(() => ({ requests: [] as Pending[] }))

// Styling only: the members the component actually uses, with the shape the
// real bond gives them (called helpers return a class string; the standalone
// `textMuted`/`textError` are strings, not helpers).
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    textMuted: 'stub',
    textError: 'stub',
    cn: (...parts: unknown[]) => parts.filter(Boolean).join(' '),
    flex: () => 'stub',
    input: () => 'stub',
    card: () => 'stub',
    sp: () => 'stub',
  }),
}))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (key: string, _values?: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))

const { AddressInput } =
  (await import('../../../templates/.agents/skills/examples/integrations/maps-location/app/components/AddressInput')) as {
    AddressInput: (props: { onSelect: (place: unknown) => void }) => ReactNode
  }

// react-dom's act() requires this flag outside the React test renderer.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const originalFetch = globalThis.fetch

let container: HTMLElement
let root: Root

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve))
  })
}

async function mount(): Promise<void> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(createElement(AddressInput, { onSelect: () => undefined }))
  })
  await flush()
}

/** Type into the field the way a user does (native value setter + input event). */
async function type(value: string): Promise<void> {
  const input = container.querySelector('[data-mol-id="address-input"]') as HTMLInputElement | null
  if (!input) throw new Error('the component rendered no address input')
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await flush()
}

/** Wait for the debounced request the component fires for the typed address. */
async function waitForRequest(index: number): Promise<void> {
  await vi.waitFor(
    () => {
      expect(pending.requests.length, `no request #${index} arrived`).toBeGreaterThan(index)
    },
    { timeout: 3_000 },
  )
}

/** Answer request `index` with a 2xx body. */
async function respond(index: number, body: unknown): Promise<void> {
  const request = pending.requests[index]
  if (!request) throw new Error(`no request #${index}`)
  request.answered = true
  await act(async () => {
    request.respond(200, body)
  })
  await flush()
}

const suggestionButton = (): HTMLButtonElement | null =>
  container.querySelector('[data-mol-id="address-suggestion"]') as HTMLButtonElement | null

beforeEach(() => {
  pending.requests.length = 0
  globalThis.fetch = ((_input: unknown, init?: { body?: unknown }) =>
    new Promise((resolve) => {
      pending.requests.push({
        body: JSON.parse(String(init?.body ?? '{}')) as unknown,
        answered: false,
        respond: (status, body) =>
          resolve({
            ok: status >= 200 && status < 300,
            status,
            json: async () => body,
          }),
      })
    })) as typeof globalThis.fetch
})

afterEach(async () => {
  globalThis.fetch = originalFetch
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

describe('AddressInput — picking a suggestion whose text is already the query', () => {
  it('still geocodes the NEXT edit instead of swallowing it', async () => {
    await mount()

    await type('123 Main St')
    await waitForRequest(0)
    // A geocoder that answers with EXACTLY what the reader typed — the state in
    // which the write-back is a no-op and the old guard stayed set.
    await respond(0, { lat: 1, lng: 2, formatted: '123 Main St' })

    const suggestion = suggestionButton()
    expect(suggestion, 'the resolved place must be offered as a suggestion').not.toBeNull()
    await act(async () => {
      suggestion?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()

    // One more keystroke: the field no longer holds the picked value, so this is
    // a new address to look up — it must reach the geocoder. (The old guard
    // swallowed this run, and `waitForRequest` would time out.)
    await type('123 Main Stx')
    await waitForRequest(1)
    expect(pending.requests[1]?.body).toEqual({ address: '123 Main Stx' })
  })

  it('does not re-look-up the address a pick was made from', async () => {
    await mount()

    await type('123 Main')
    await waitForRequest(0)
    await respond(0, { lat: 1, lng: 2, formatted: '123 Main Street, Springfield' })

    await act(async () => {
      suggestionButton()?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()

    // The write-back itself is not an edit: no second lookup for it.
    await new Promise((resolve) => setTimeout(resolve, 400))
    await flush()
    expect(pending.requests).toHaveLength(1)
  })
})
