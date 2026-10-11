// @vitest-environment jsdom
/**
 * `full-text-search`'s `SearchPage` handed `SearchAutocomplete` a NEW
 * `onSearch` closure on every render (a plain function declared in the
 * component body). The shared component runs its debounced search from an
 * effect that lists the callback itself as a dependency
 * (`[value, onSearch, debounceMs, minChars]` in
 * `@molecule/app-search-autocomplete-react`), and each response wrote a fresh
 * array into `hits` — so `setHits` re-rendered the page, which minted a new
 * closure, which re-armed the effect, which scheduled the SAME search again.
 * Typing one character fetched `/api/search` roughly every debounce interval
 * (150 ms) for as long as the query stayed in the box. The handler is now
 * `useCallback`-stable, so one query is one search.
 *
 * This drives the REAL `SearchAutocomplete` (only the ClassMap, the i18n hook
 * and the `Input` primitive are stubbed) with the debounce running on REAL
 * timers, because the loop only exists between the component and its child.
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface FetchCall {
  url: string
  answered: boolean
  respond: (status: number, body: unknown) => void
}

const fetches = vi.hoisted(() => ({ calls: [] as FetchCall[] }))

const translate = (
  key: string,
  values?: Record<string, unknown>,
  options?: { defaultValue?: string },
): string =>
  (options?.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_m, name: string) =>
    String(values?.[name] ?? ''),
  )

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => undefined }),
}))

vi.mock('@molecule/app-react', () => ({ useTranslation: () => ({ t: translate }) }))

// The real autocomplete imports `Input`; a plain control forwards the
// `value`/`onChange` it is handed, which is all this test drives.
vi.mock('@molecule/app-ui-react', async () => {
  const { createElement: h } = await import('react')
  return { Input: (props: Record<string, unknown>) => h('input', { ...props } as never) }
})

const { SearchPage } =
  (await import('../../../templates/.agents/skills/examples/search/full-text-search/app/pages/SearchPage.js')) as {
    SearchPage: (props: { index: string }) => ReactNode
  }

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLElement
let root: Root

/**
 * Let real timers run.
 *
 * `SearchAutocomplete`'s own default is 200 ms (`debounceMs = 200` in
 * `@molecule/app-features-search-autocomplete-react`), but this page OVERRIDES
 * it: `SearchPage` passes `debounceMs={150}`. A fixed sleep just past it (this
 * file used 250 ms, and its comment said 150 while the variable said 200) left a
 * 50 ms margin on a real timer — under load the timer fires late, no request has
 * gone out, and `searchCalls()[0]` is `undefined` (a TypeError) or the length
 * assert sees zero. Anything that waits for the DEBOUNCE to fire therefore polls
 * for the request itself (see {@link waitForSearches}); a fixed sleep is only
 * used for a NEGATIVE window, where the delay itself is the assertion.
 */
async function wait(ms: number): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms))
  })
}

async function mount(element: ReactNode): Promise<void> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(element)
  })
  await wait(0)
}

const searchCalls = (): FetchCall[] => fetches.calls.filter((c) => c.url.includes('/api/search'))

/**
 * Wait until at least `count` searches have gone out.
 *
 * The debounce runs on REAL timers, so a fixed sleep past it is a race: poll
 * for the request the debounce fires instead of guessing how long it takes.
 * (Measured against the 150 ms this page passes to the component — see
 * {@link wait}.)
 *
 * @param count - How many `/api/search` requests must have been issued.
 */
async function waitForSearches(count: number): Promise<void> {
  await vi.waitFor(
    () => {
      expect(
        searchCalls().length,
        `fewer than ${count} search request(s) went out`,
      ).toBeGreaterThanOrEqual(count)
    },
    { timeout: 3_000 },
  )
}

/** Type into the real autocomplete's input the way a user's keystroke does. */
async function typeQuery(value: string): Promise<void> {
  const input = container.querySelector('input') as HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => {
  fetches.calls.length = 0
  globalThis.fetch = ((input: unknown) =>
    new Promise((resolve) => {
      fetches.calls.push({
        url: String(input),
        answered: false,
        respond: (status, body) =>
          resolve({ ok: status >= 200 && status < 300, status, json: async () => body }),
      })
    })) as typeof globalThis.fetch
})

afterEach(async () => {
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

describe('search page — one query is one search, however often the page re-renders', () => {
  it('does not re-arm the debounced search after its own response lands', async () => {
    await mount(createElement(SearchPage, { index: 'products' }))

    const input = container.querySelector('input') as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      setter?.call(input, 'cat')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    // Past the debounce: exactly one search went out.
    await waitForSearches(1)
    expect(searchCalls()).toHaveLength(1)

    // Answer it. The response re-renders the page with new hits — and, with an
    // inline handler, that render handed the autocomplete a new `onSearch`,
    // re-arming the same query.
    const call = searchCalls()[0]
    call.answered = true
    await act(async () => {
      call.respond(200, { hits: [{ id: 'c', title: 'cat hit' }] })
    })
    // Ten debounce intervals (150 ms each — the value SearchPage passes): a
    // re-armed search lands ~150 ms after the response, so this window is the
    // assertion, not a wait for one. It is deliberately WIDE: a negative
    // assertion on a wall clock can only be wrong in one direction — a stall
    // longer than the window lets a re-armed search land after the check and
    // the test passes over the bug — so the margin is ~10× the interval that
    // would expose it rather than the 1× a tight sleep would allow.
    await wait(1_500)

    // Still one. A second here is the unbounded loop: another every debounce
    // interval (150 ms) for as long as the query stays in the box.
    expect(searchCalls()).toHaveLength(1)
    expect(container.textContent).toContain('cat hit')
  })

  it('still searches again when the query itself changes', async () => {
    await mount(createElement(SearchPage, { index: 'products' }))

    const input = container.querySelector('input') as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set

    await act(async () => {
      setter?.call(input, 'cat')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await waitForSearches(1)
    const first = searchCalls()[0]
    first.answered = true
    await act(async () => {
      first.respond(200, { hits: [{ id: 'c', title: 'cat hit' }] })
    })

    await act(async () => {
      setter?.call(input, 'cats')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await waitForSearches(2)

    expect(searchCalls()).toHaveLength(2)
    expect(searchCalls()[1].url).toContain('q=cats')
  })
})

describe('search page — an answer is never asserted before it exists', () => {
  it('does not claim "No matches" for a query that has not been answered', async () => {
    await mount(createElement(SearchPage, { index: 'products' }))

    await typeQuery('cat')
    // Nothing is in flight yet (the debounce has not fired) and nothing has
    // answered — the page must not report a result. The results list starts
    // empty, so the empty state used to render here (and for the whole request
    // below) as a definitive "No matches for "cat"".
    expect(container.textContent).not.toContain('No matches for')

    // …nor while the request it does fire is parked.
    await waitForSearches(1)
    expect(searchCalls()).toHaveLength(1)
    expect(container.textContent).not.toContain('No matches for')

    // The answer is what makes the empty result set true.
    const call = searchCalls()[0]
    call.answered = true
    await act(async () => {
      call.respond(200, { hits: [] })
    })
    expect(container.textContent).toContain('No matches for "cat"')
  })

  it('reports a FAILED search as a failure, not as "No matches"', async () => {
    await mount(createElement(SearchPage, { index: 'products' }))
    await typeQuery('cat')
    await waitForSearches(1)

    // A 500 body carries no `hits`, so the coerced empty list said the query
    // matched nothing — the wrong answer for a search that never ran.
    const call = searchCalls()[0]
    call.answered = true
    await act(async () => {
      call.respond(500, { error: 'boom' })
    })

    expect(container.textContent).toContain('Search failed')
    expect(container.textContent).not.toContain('No matches for')
  })

  it('never renders a previous query’s hits under the new query', async () => {
    await mount(createElement(SearchPage, { index: 'products' }))
    await typeQuery('cat')
    await waitForSearches(1)
    const catCall = searchCalls()[0]
    catCall.answered = true
    await act(async () => {
      catCall.respond(200, { hits: [{ id: 'c', title: 'cat hit' }] })
    })
    // The page's own list holds "cat hit" (the page renders one <h3> per hit;
    // the shared popover renders <li role="option">, which carries no heading).
    expect(container.querySelectorAll('h3')).toHaveLength(1)

    // The reader edits the query: the answer on screen belongs to "cat", so
    // "No matches for dog" — or "cat"'s hits — must not be asserted for "dog".
    // The results list was keyed on nothing, so the previous query's hits stayed
    // rendered under the new one until "dog"'s own response landed.
    await typeQuery('dog')
    expect(container.textContent).toContain('Searching…')
    expect(container.querySelectorAll('h3')).toHaveLength(0)
    expect(container.textContent).not.toContain('No matches for')

    // …and "dog"'s own answer then replaces it.
    await waitForSearches(2)
    const dogCall = searchCalls().find((c) => c.url.includes('q=dog'))
    expect(dogCall).toBeDefined()
    dogCall!.answered = true
    await act(async () => {
      dogCall!.respond(200, { hits: [{ id: 'd', title: 'dog hit' }] })
    })
    expect(container.textContent).toContain('dog hit')
    expect(container.querySelectorAll('h3')).toHaveLength(1)
  })
})
