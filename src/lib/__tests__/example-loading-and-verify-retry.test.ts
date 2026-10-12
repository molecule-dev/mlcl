// @vitest-environment jsdom
/**
 * Two failure/loading states in the shipped example slices that answered with
 * something that was not true yet:
 *
 * 1. `sortable-table`'s `OrdersPage` started with `loading: false` while its
 *    rows were still empty, so the FIRST paint took the empty branch of
 *    `DataTableCard` — "No orders found." — for a list nobody had read yet.
 *    (The sibling `Leaderboard` slice states the rule: a pending load gets its
 *    own answer, never the empty state.)
 * 2. `email-verification`'s `VerifyEmailPage` reported an UNCOMPLETED check as
 *    "Invalid link": a rejected fetch (offline, server restart) and a 5xx both
 *    landed on the invalid branch, which renders a verdict on the token and
 *    offers nothing to click. The token is still valid server-side — the reader
 *    was told it was worthless with no way to try again.
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('@molecule/app-data-table-ui-react', () => ({
  DataTableCard: (props: { rows: Array<{ id: string }>; loading?: boolean }) =>
    createElement(
      'ul',
      { 'data-loading': String(Boolean(props.loading)) },
      props.rows.map((r) => createElement('li', { key: r.id }, r.id)),
    ),
}))

vi.mock('@molecule/app-pagination-bar-react', () => ({
  PaginationBar: (props: { page: number; onPageChange: (page: number) => void }) =>
    createElement(
      'div',
      { 'data-page': String(props.page) },
      createElement(
        'button',
        {
          type: 'button',
          'aria-label': 'Next page',
          onClick: () => props.onPageChange(props.page + 1),
        },
        'Next',
      ),
    ),
}))

interface FetchCall {
  url: string
  method: string
  answered: boolean
  respond: (status: number, body: unknown) => void
  fail: (error: Error) => void
}

const fetches = vi.hoisted(() => ({ calls: [] as FetchCall[] }))

const { OrdersPage } =
  (await import('../../../templates/.agents/skills/examples/data-display/sortable-table/app/pages/OrdersPage.js')) as {
    OrdersPage: () => ReactNode
  }
const { VerifyEmailPage } =
  (await import('../../../templates/.agents/skills/examples/auth/email-verification/app/pages/VerifyEmailPage.js')) as {
    VerifyEmailPage: () => ReactNode
  }

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLElement
let root: Root

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve))
  })
}

async function mount(element: ReactNode): Promise<void> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(element)
  })
  await flush()
}

const text = (): string => container.textContent ?? ''

async function respond(fragment: string, status: number, body: unknown): Promise<void> {
  const call = fetches.calls.find((c) => !c.answered && c.url.includes(fragment))
  if (!call) throw new Error(`no pending fetch for ${fragment}`)
  call.answered = true
  await act(async () => {
    call.respond(status, body)
  })
  await flush()
}

async function rejectPending(fragment: string): Promise<void> {
  const call = fetches.calls.find((c) => !c.answered && c.url.includes(fragment))
  if (!call) throw new Error(`no pending fetch to reject for ${fragment}`)
  call.answered = true
  await act(async () => {
    call.fail(new Error('network down'))
  })
  await flush()
}

beforeEach(() => {
  fetches.calls.length = 0
  globalThis.fetch = ((input: unknown, init?: { method?: string }) =>
    new Promise((resolve, reject) => {
      fetches.calls.push({
        url: String(input),
        method: init?.method ?? 'GET',
        answered: false,
        respond: (status, body) =>
          resolve({ ok: status >= 200 && status < 300, status, json: async () => body }),
        fail: reject,
      })
    })) as typeof globalThis.fetch
})

afterEach(async () => {
  window.history.replaceState({}, '', '/')
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

describe('orders page — the first paint is the pending state, not an empty list', () => {
  it('shows the table as loading before the request answers', async () => {
    await mount(createElement(OrdersPage, {}))

    // Nothing has answered yet. `loading: false` made this first render take the
    // empty branch — the authoritative-looking "No orders found." for a list
    // nobody had read.
    expect(container.querySelector('ul')?.getAttribute('data-loading')).toBe('true')

    // The answer is a WELL-FORMED page: the row gate (`isOrder`) reports a row
    // missing total/status/created_at as a failed load, whose path also clears
    // the spinner — an assertion riding that branch proved nothing about the
    // success answer this test is named for.
    await respond('/api/orders', 200, {
      rows: [{ id: 'o-1', total: 100, status: 'open', created_at: '2026-01-01T00:00:00.000Z' }],
      total: 1,
    })
    expect(container.querySelector('ul')?.getAttribute('data-loading')).toBe('false')
  })
})

describe('verify-email — an uncompleted check is not a verdict on the link', () => {
  async function mountWithToken(token: string): Promise<void> {
    window.history.replaceState({}, '', `/verify?token=${token}`)
    await mount(createElement(VerifyEmailPage, {}))
  }

  it('a rejected check says the check failed and offers a retry, never "Invalid link"', async () => {
    await mountWithToken('good-token')
    await rejectPending('/api/verify')

    expect(text()).not.toContain('Invalid link')
    expect(text()).toContain('Could not check this link')

    // The retry re-runs the check, and the retry can still succeed.
    const retry = container.querySelector('[data-mol-id="verify-email-retry"]')
    expect(retry).not.toBeNull()
    await act(async () => {
      retry?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    await respond('/api/verify', 200, { ok: true })

    expect(text()).toContain('Email verified')
  })

  it('a 5xx is a failed check, not an invalid link', async () => {
    await mountWithToken('good-token')
    await respond('/api/verify', 503, { error: 'upstream down' })

    expect(text()).toContain('Could not check this link')
    expect(text()).not.toContain('Invalid link')
  })

  it('the positive twin: a 4xx on the token is still the invalid-link verdict', async () => {
    await mountWithToken('bad-token')
    await respond('/api/verify', 404, { error: 'Link not found' })

    expect(text()).toContain('Invalid link')
    expect(container.querySelector('[data-mol-id="verify-email-retry"]')).toBeNull()
  })
})
