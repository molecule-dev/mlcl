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

    // The write-back itself is not an edit: no second lookup for it. The wait
    // must clear the component's own debounce (300 ms) by a real margin — on a
    // loaded machine a REGRESSION's lookup fires when the debounce timer finally
    // runs, and a wait that barely outlasts the debounce can be overtaken by
    // exactly the scheduling delay that made it slow, so the assertion below
    // passes over the missing guard it exists to catch.
    await new Promise((resolve) => setTimeout(resolve, 1_200))
    await flush()
    expect(pending.requests).toHaveLength(1)
  })
})

describe('AddressInput — a suggestion belongs to the query it answered', () => {
  it('drops the previous query’s suggestion while the next lookup is in flight', async () => {
    // The suggestion was left in place when the text changed: `setStatus
    // ('loading')` ran for the new query but the OLD button stayed rendered (and
    // enabled) for the whole debounce + request. Clicking it emitted the previous
    // place upward and rewrote the field to it — the reader's typed address was
    // discarded by a button that answered a different question.
    await mount()

    await type('Paris')
    await waitForRequest(0)
    await respond(0, { lat: 48.85, lng: 2.35, formatted: 'Paris, France' })
    expect(suggestionButton()?.textContent).toBe('Paris, France')

    // The reader keeps typing: a new lookup starts for the new text, and the
    // Paris suggestion must not still be on offer while it runs.
    await type('Berlin')
    expect(
      suggestionButton(),
      'the superseded query’s suggestion must not stay clickable',
    ).toBeNull()

    await waitForRequest(1)
    expect(pending.requests[1]?.body).toEqual({ address: 'Berlin' })
    // …and the fresher answer is the one offered.
    await respond(1, { lat: 52.52, lng: 13.4, formatted: 'Berlin, Germany' })
    expect(suggestionButton()?.textContent).toBe('Berlin, Germany')
  })
})

describe('AddressInput — a 2xx body that is not a place', () => {
  it.each([
    ["an empty object (the mock API server's unmatchedFixtureResponse)", {}],
    ['an error envelope a proxy rewrote into a 200', { error: 'geocoder down' }],
    ['a place missing its coordinates', { formatted: '123 Main St' }],
    ['a place with a null label', { lat: 1, lng: 2, formatted: null }],
  ])('does not offer %s as a suggestion', async (_name, body) => {
    await mount()

    await type('123 Main')
    await waitForRequest(0)
    await respond(0, body)

    // The unvalidated body was installed as the suggestion: an empty button
    // rendered from `{}.formatted`, whose click handed `onSelect` — and the
    // input's value — `undefined` coordinates. It must be dropped and surfaced
    // as the same retryable failure a failed lookup gets.
    expect(suggestionButton()).toBeNull()
    expect(container.querySelector('[data-mol-id="address-input"]')?.getAttribute('value')).toBe(
      '123 Main',
    )
    expect(container.textContent).toContain('No match for that address')
  })

  it('still renders the next valid answer after an invalid one', async () => {
    await mount()

    await type('123 Main')
    await waitForRequest(0)
    await respond(0, {})
    expect(suggestionButton()).toBeNull()

    // The next keystroke geocodes again and a well-formed place is offered —
    // the dropped body must not wedge the component.
    await type('123 Main Street')
    await waitForRequest(1)
    await respond(1, { lat: 1, lng: 2, formatted: '123 Main Street, Springfield' })
    const suggestion = suggestionButton()
    expect(suggestion, 'a valid place must be offered').not.toBeNull()
    expect(suggestion?.textContent).toBe('123 Main Street, Springfield')
  })
})
