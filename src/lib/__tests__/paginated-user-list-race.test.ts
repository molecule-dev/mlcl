// @vitest-environment jsdom
/**
 * `UsersPage` (skills/examples/data-display/paginated-user-list) refetches
 * `GET /users?page=N` from an effect keyed on `page` and used to write the
 * response straight into state, with no cancellation. Two page requests can
 * therefore be in flight at once — the user clicks "Next page" twice — and the
 * LATE one wins: page 3's response lands first, then page 2's overwrites it, so
 * the table shows page 2's rows while the paginator (driven by the `page`
 * state) reads page 3. `.finally()` has the same hole: the first response to
 * settle clears `loading` for a request the user is still waiting on. It is the
 * race the sibling examples (`Leaderboard`, `MapView`, `VideoPlayerView`)
 * already guard against with a `cancelled` flag.
 *
 * This renders the REAL example component into REAL DOM (jsdom) and drives the
 * REAL `<PaginationBar>`'s next-page button, resolving the two requests out of
 * order. `useHttpClient` is replaced with a client whose requests the test
 * resolves by hand, and the UI primitives / ClassMap are reduced to plain
 * elements — everything else (the effect, the state, the ordering) is the
 * shipped code.
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface User {
  id: string
  name: string
  email: string
  created_at: string
}

interface UsersResponse {
  data: User[]
  total: number
  page: number
  limit: number
}

/** Every request the page made, in order, with a handle to resolve it later. */
const pending = vi.hoisted(() => ({
  requests: [] as Array<{ url: string; resolved: boolean; resolve: (body: UsersResponse) => void }>,
  /** The one client instance the mocked `useHttpClient` hands out. */
  client: null as null | { get: (url: string) => Promise<{ data: UsersResponse }> },
}))

// The UI primitives are not what is under test — plain elements suffice, and
// they make the paginator's next-page button reachable by its aria-label.
vi.mock('@molecule/app-ui-react', async () => {
  const { createElement } = await import('react')
  return {
    Button: (props: Record<string, unknown>) =>
      createElement('button', { ...props, type: 'button' } as never),
    Select: (props: Record<string, unknown>) => createElement('select', props as never),
  }
})

// Styling only: every ClassMap helper collapses to one token.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => 'stub' }),
}))

vi.mock('@molecule/app-react', () => ({
  // A STABLE client: the real `useHttpClient()` returns the same instance every
  // render, and the page keys its effect on it (`[http, page]`) — a fresh
  // object per render would refetch forever instead of on page changes.
  useHttpClient: () =>
    (pending.client ??= {
      get: (url: string) =>
        new Promise<{ data: UsersResponse }>((resolve) => {
          pending.requests.push({
            url,
            resolved: false,
            resolve: (body: UsersResponse) => resolve({ data: body }),
          })
        }),
    }),
  useTranslation: () => ({
    t: (_key: string, _values?: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? _key,
  }),
}))

const { default: UsersPage } =
  (await import('../../../templates/.agents/skills/examples/data-display/paginated-user-list/app/pages/UsersPage')) as {
    default: (props: object) => ReactNode
  }

const user = (id: string, page: number): User => ({
  id,
  name: `page-${page} user ${id}`,
  email: `u${id}@example.test`,
  created_at: '2026-01-01T00:00:00.000Z',
})

// react-dom's act() requires this flag outside the React test renderer.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLElement
let root: Root

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve))
  })
}

/** Mount the page; its first-page request is now pending. */
async function mount(): Promise<void> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(createElement(UsersPage, {}))
  })
  await flush()
}

/** Answer the (still pending) request for `page` with that page's rows. */
async function resolvePage(page: number, ids: string[]): Promise<void> {
  const request = pending.requests.find((r) => !r.resolved && r.url.includes(`page=${page}`))
  if (!request) throw new Error(`no pending request for page ${page}`)
  request.resolved = true
  await act(async () => {
    request.resolve({ data: ids.map((id) => user(id, page)), total: 60, page, limit: 20 })
  })
  await flush()
}

const rows = (): string[] =>
  [...container.querySelectorAll('li span:first-child')].map((el) => el.textContent ?? '')

const nextButton = (): HTMLButtonElement =>
  container.querySelector('button[aria-label="Next page"]') as HTMLButtonElement

const clickNext = async (): Promise<void> => {
  await act(async () => {
    nextButton().dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await flush()
}

const requested = (): string[] =>
  pending.requests.map((r) => r.url.replace(/^.*\?/, '').replace(/&limit=\d+$/, ''))

beforeEach(() => {
  pending.requests.length = 0
})

afterEach(async () => {
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

describe('paginated-user-list — a superseded page response must not win', () => {
  it('requests the handler at the path it is actually mounted on', async () => {
    // The app router is mounted at `/api` (`app.use('/api', router)`,
    // templates/api/server.ts.tpl) and the handler registers at
    // `router.use('/users', …)` — so the browser path is `/api/users`. Nothing
    // bonds the http client with a '/api' baseURL (its default is ''), and the
    // dev server proxies only `/api` and `/health`: a bare `/users` is served
    // the SPA's index.html, whose HTML the client installs as the body, so
    // `data.data.map` throws on the next render. The README's
    // `GET /users?page=1&limit=20` is the ROUTER-relative path under that mount.
    await mount()
    expect(pending.requests[0]?.url).toBe('/api/users?page=1&limit=20')
  })

  it('keeps the page the user is on when an older response lands last', async () => {
    await mount()
    await resolvePage(1, ['a', 'b'])
    expect(rows()).toEqual(['page-1 user a', 'page-1 user b'])

    // Two forward clicks while the first of the two requests is still in
    // flight: page 2 and page 3 are both awaited.
    await clickNext()
    await clickNext()
    expect(requested()).toEqual(['page=1', 'page=2', 'page=3'])

    // Page 3 answers first…
    await resolvePage(3, ['e', 'f'])
    expect(rows()).toEqual(['page-3 user e', 'page-3 user f'])

    // …and page 2's superseded response lands after it. It must be dropped:
    // the paginator says page 3, so the table has to show page 3's rows.
    await resolvePage(2, ['c', 'd'])
    expect(rows()).toEqual(['page-3 user e', 'page-3 user f'])
  })
})
