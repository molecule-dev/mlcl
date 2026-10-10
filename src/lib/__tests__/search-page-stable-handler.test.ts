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

/** Let real timers run — the autocomplete's debounce is 150 ms. */
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
    await wait(250)
    expect(searchCalls()).toHaveLength(1)

    // Answer it. The response re-renders the page with new hits — and, with an
    // inline handler, that render handed the autocomplete a new `onSearch`,
    // re-arming the same query.
    const call = searchCalls()[0]
    call.answered = true
    await act(async () => {
      call.respond(200, { hits: [{ id: 'c', title: 'cat hit' }] })
    })
    await wait(400)

    // Still one. A second here is the unbounded loop: another every 150 ms.
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
    await wait(250)
    const first = searchCalls()[0]
    first.answered = true
    await act(async () => {
      first.respond(200, { hits: [{ id: 'c', title: 'cat hit' }] })
    })

    await act(async () => {
      setter?.call(input, 'cats')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await wait(250)

    expect(searchCalls()).toHaveLength(2)
    expect(searchCalls()[1].url).toContain('q=cats')
  })
})
