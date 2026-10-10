// @vitest-environment jsdom
/**
 * Effects that refetch on a CHANGING key (a page, a slug) must drop the
 * superseded response — otherwise the LATE one wins and the UI shows the wrong
 * record under the current URL.
 *
 * Two shipped examples had the fetch and no guard:
 *
 * - `sortable-table`'s `OrdersPage` refetches `GET /api/orders?offset=…` from an
 *   effect keyed on `[pageIndex, sort, statusFilter]`. Two quick "Next" clicks
 *   leave two requests in flight; page 1's rows landing after page 2's leaves the
 *   table showing page 1 while the paginator (driven by `pageIndex`) reads page
 *   2 — the same race the `paginated-user-list` example already guards with a
 *   `cancelled` flag.
 * - `markdown-blog`'s `PostPage` refetches `GET /api/posts/:slug` from an effect
 *   keyed on `[slug]` and BOTH wrote the response straight into state with no
 *   cancellation AND set `notFound` without ever clearing it — so a late post
 *   could render under a different post's URL, and a single 404 pinned the page
 *   on "Post not found" for every post visited afterwards.
 *
 * These render the REAL example components into REAL DOM (jsdom), resolving the
 * requests by hand and out of order. The UI primitives / ClassMap / markdown bond
 * are reduced to plain elements — the effect, the state and the ordering are the
 * shipped code.
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface Pending {
  url: string
  answered: boolean
  respond: (status: number, body: unknown) => void
}

/** Every request the components made, in order, with a handle to answer it. */
const pending = vi.hoisted(() => ({ requests: [] as Pending[] }))

// Styling only: every ClassMap helper collapses to one token.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => 'stub' }),
}))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    // Renders the English fallback with its `{{placeholders}}` filled in, so an
    // assertion can read a real value (e.g. the average) out of the DOM.
    t: (key: string, values?: Record<string, unknown>, options?: { defaultValue?: string }) =>
      (options?.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_match, name: string) =>
        String(values?.[name] ?? ''),
      ),
  }),
}))

// The markdown bond is not what is under test; rendering nothing is enough.
vi.mock('@molecule/app-markdown', () => ({
  requireProvider: () => ({ render: () => ({ html: '' }) }),
}))

// Render each row through its columns' cell fns so the table shows real values.
vi.mock('@molecule/app-data-table-ui-react', () => ({
  DataTableCard: (props: {
    columns: Array<{ cell: (row: unknown) => unknown }>
    rows: unknown[]
  }) =>
    createElement(
      'ul',
      null,
      props.rows.map((row, i) =>
        createElement('li', { key: i }, props.columns.map((c) => String(c.cell(row))).join(' ')),
      ),
    ),
}))

// The rating display is not what is under test; the value is rendered as text
// (its own span, so an assertion can read exactly what the widget shows) and an
// interactive star control drives the real `onChange`.
vi.mock('@molecule/app-rating-display-react', () => ({
  RatingDisplay: (props: { value: number; onChange?: (stars: number) => void }) =>
    createElement(
      'div',
      null,
      createElement('span', null, String(props.value)),
      props.onChange
        ? [1, 2, 3, 4, 5].map((stars) =>
            createElement(
              'button',
              {
                key: stars,
                type: 'button',
                'aria-label': `Rate ${stars}`,
                onClick: () => props.onChange?.(stars),
              },
              `${stars}★`,
            ),
          )
        : null,
    ),
}))

// One reachable "Next page" control that drives the real onPageChange.
vi.mock('@molecule/app-pagination-bar-react', () => ({
  PaginationBar: (props: { page: number; onPageChange: (page: number) => void }) =>
    createElement(
      'button',
      {
        type: 'button',
        'aria-label': 'Next page',
        onClick: () => props.onPageChange(props.page + 1),
      },
      'Next',
    ),
}))

// The dropzone is not what is under test — the panel's own list render is.
vi.mock('@molecule/app-file-dropzone-react', () => ({ FileDropzone: () => null }))

const { OrdersPage } =
  (await import('../../../templates/.agents/skills/examples/data-display/sortable-table/app/pages/OrdersPage')) as {
    OrdersPage: (props: object) => ReactNode
  }
const { PostPage } =
  (await import('../../../templates/.agents/skills/examples/content/markdown-blog/app/pages/PostPage')) as {
    PostPage: (props: { slug: string }) => ReactNode
  }
const { RatingWidget } =
  (await import('../../../templates/.agents/skills/examples/ratings/star-ratings/app/components/RatingWidget')) as {
    RatingWidget: (props: { subjectId: string; canRate: boolean }) => ReactNode
  }
const { AttachmentsPanel } =
  (await import('../../../templates/.agents/skills/examples/uploads/file-attachments/app/components/AttachmentsPanel')) as {
    AttachmentsPanel: (props: { parentId: string }) => ReactNode
  }

/** One attachment row as `GET /api/attachments` returns it. */
const attachment = (id: string, filename: string): Record<string, unknown> => ({
  id,
  filename,
  mimetype: 'text/plain',
  size: 12,
  created_at: '2026-01-01T00:00:00.000Z',
})

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

async function mount(element: ReactNode): Promise<void> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(element)
  })
  await flush()
}

async function rerender(element: ReactNode): Promise<void> {
  await act(async () => {
    root.render(element)
  })
  await flush()
}

/** Answer the oldest unanswered request whose URL contains `fragment`. */
async function respond(fragment: string, status: number, body: unknown): Promise<void> {
  const request = pending.requests.find((r) => !r.answered && r.url.includes(fragment))
  if (!request) throw new Error(`no pending request for ${fragment}`)
  request.answered = true
  await act(async () => {
    request.respond(status, body)
  })
  await flush()
}

/**
 * Answer the oldest unanswered request whose URL is EXACTLY `url` — needed
 * where a substring would be ambiguous (the rating POST `/api/ratings` is a
 * prefix of the summary GET `/api/ratings/avg/<id>`).
 */
async function respondTo(url: string, status: number, body: unknown): Promise<void> {
  const request = pending.requests.find((r) => !r.answered && r.url === url)
  if (!request) throw new Error(`no pending request for ${url}`)
  request.answered = true
  await act(async () => {
    request.respond(status, body)
  })
  await flush()
}

const text = (): string => container.textContent ?? ''

/** What the rating display shows — the widget's first span. */
const ratingValue = (): string => container.querySelector('span')?.textContent ?? ''

/** Click a star in the (mocked but interactive) rating display. */
async function clickRate(stars: number): Promise<void> {
  await act(async () => {
    container
      .querySelector(`button[aria-label="Rate ${stars}"]`)
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await flush()
}

const requestedOffsets = (): string[] =>
  pending.requests.map((r) => new URL(r.url, 'http://localhost').searchParams.get('offset') ?? '')

beforeEach(() => {
  pending.requests.length = 0
  globalThis.fetch = ((input: unknown) =>
    new Promise((resolve) => {
      pending.requests.push({
        url: String(input),
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

describe('a superseded fetch response must not win', () => {
  it('keeps the page the paginator is on when an older page response lands last', async () => {
    await mount(createElement(OrdersPage, {}))

    // First page's response.
    await respond('offset=0', 200, { rows: [{ id: 'a', total: 1, status: 'page-1' }], total: 60 })
    expect(text()).toContain('page-1')
    expect(text()).toContain('$0.01')

    // Two forward clicks while the first of the two requests is still in flight.
    await act(async () => {
      container
        .querySelector('button[aria-label="Next page"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    await act(async () => {
      container
        .querySelector('button[aria-label="Next page"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    expect(requestedOffsets()).toEqual(['0', '25', '50'])

    // Page 3 answers first…
    await respond('offset=50', 200, { rows: [{ id: 'e', total: 1, status: 'page-3' }], total: 60 })
    expect(text()).toContain('page-3')

    // …and page 2's superseded response lands after it. It must be dropped: the
    // paginator says page 3, so the table has to show page 3's rows.
    await respond('offset=25', 200, { rows: [{ id: 'c', total: 1, status: 'page-2' }], total: 60 })
    expect(text()).toContain('page-3')
    expect(text()).not.toContain('page-2')
  })

  it('clears a previous post once a later slug loads', async () => {
    await mount(createElement(PostPage, { slug: 'missing' }))
    await respond('/api/posts/missing', 404, { error: 'not found' })
    expect(text()).toContain('Post not found')

    // Navigating to a real post must leave the 404 behind (it used to stick:
    // `notFound` was set once and never reset).
    await rerender(createElement(PostPage, { slug: 'live' }))
    await respond('/api/posts/live', 200, {
      id: '1',
      title: 'Live post',
      body_markdown: 'body',
      published_at: '2026-01-01T00:00:00.000Z',
    })
    expect(text()).toContain('Live post')
    expect(text()).not.toContain('Post not found')
  })

  it('drops an older slug response that lands after the newer slug', async () => {
    await mount(createElement(PostPage, { slug: 'first' }))
    await rerender(createElement(PostPage, { slug: 'second' }))

    // The newer slug answers, then the older one — the older must not overwrite.
    await respond('/api/posts/second', 200, {
      id: '2',
      title: 'Second post',
      body_markdown: 'body',
      published_at: '2026-01-01T00:00:00.000Z',
    })
    expect(text()).toContain('Second post')

    await respond('/api/posts/first', 200, {
      id: '1',
      title: 'First post',
      body_markdown: 'body',
      published_at: '2026-01-01T00:00:00.000Z',
    })
    expect(text()).toContain('Second post')
    expect(text()).not.toContain('First post')
  })

  it('drops the previous subject summary when the newer subject answers first', async () => {
    await mount(createElement(RatingWidget, { subjectId: 'first', canRate: true }))
    await rerender(createElement(RatingWidget, { subjectId: 'second', canRate: true }))

    // The newer subject answers, then the older one — the older must not win,
    // or the widget shows the first subject's average under the second's name.
    await respond('/api/ratings/avg/second', 200, { average: 4.5, count: 10 })
    expect(text()).toContain('4.5')

    await respond('/api/ratings/avg/first', 200, { average: 1.2, count: 3 })
    expect(text()).toContain('4.5')
    expect(text()).not.toContain('1.2')
  })

  it('never lets an error body stand in for the orders page', async () => {
    await mount(createElement(OrdersPage, {}))

    // A 500 still carries JSON, so `r.json()` resolves with `{ error }` — no
    // `rows`, no `total`. It must not reach state: DataTableCard would call
    // `rows.map` on undefined and the paginator would compute `Math.ceil(NaN)`.
    await respond('offset=0', 500, { error: 'boom' })
    expect(container.querySelectorAll('li')).toHaveLength(0)
    expect(text()).not.toContain('NaN')

    // …and the page still works afterwards.
    await act(async () => {
      container
        .querySelector('button[aria-label="Next page"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    await respond('offset=25', 200, { rows: [{ id: 'b', total: 1, status: 'page-2' }], total: 60 })
    expect(text()).toContain('page-2')
  })

  it('does not carry the viewer’s own rating across to another subject', async () => {
    await mount(createElement(RatingWidget, { subjectId: 'first', canRate: true }))
    await respond('/api/ratings/avg/first', 200, { average: 2.0, count: 1 })

    // Rate the FIRST subject 4 stars: the display shows the viewer's rating.
    await clickRate(4)
    await respondTo('/api/ratings', 200, {})
    await respond('/api/ratings/avg/first', 200, { average: 4.0, count: 2 })
    expect(ratingValue()).toBe('4')

    // Switching subject must drop it: `myStars` is per-subject, and the display
    // prefers it over the average — leaving it set showed the previous
    // subject's stars as the viewer's rating on the new one.
    await rerender(createElement(RatingWidget, { subjectId: 'second', canRate: true }))
    await respond('/api/ratings/avg/second', 200, { average: 3.0, count: 5 })
    expect(ratingValue()).toBe('3')
    expect(text()).toContain('3.0 (5 reviews)')
  })

  it('does not roll a rating back when a SUPERSEDED rating request fails', async () => {
    await mount(createElement(RatingWidget, { subjectId: 's', canRate: true }))
    await respond('/api/ratings/avg/s', 200, { average: 0, count: 0 })

    // Two ratings in flight: 3★ then 5★ (the newer one wins).
    await clickRate(3)
    await clickRate(5)
    expect(pending.requests.filter((r) => r.url === '/api/ratings')).toHaveLength(2)

    // The 3★ POST fails AFTER the 5★ is recorded. Its rollback targets the
    // state from before the 3★ click, so applying it would blank a rating the
    // server did record.
    await respondTo('/api/ratings', 500, { error: 'boom' })
    await respondTo('/api/ratings', 200, {})
    await respond('/api/ratings/avg/s', 200, { average: 5.0, count: 1 })
    expect(ratingValue()).toBe('5')
  })

  it('clears the previous record’s attachments when the record changes', async () => {
    await mount(createElement(AttachmentsPanel, { parentId: 'a' }))
    await respond('parent_id=a', 200, [attachment('a1', 'a.txt')])
    expect(text()).toContain('a.txt')

    // The panel stays mounted while the selected record changes: record A's
    // files must not sit under record B.
    await rerender(createElement(AttachmentsPanel, { parentId: 'b' }))
    expect(text()).not.toContain('a.txt')

    await respond('parent_id=b', 200, [attachment('b1', 'b.txt')])
    expect(text()).toContain('b.txt')
    expect(text()).not.toContain('a.txt')
  })

  it('drops the previous record’s attachment response when it lands last', async () => {
    await mount(createElement(AttachmentsPanel, { parentId: 'a' }))
    // Record B is selected while A's request is still in flight.
    await rerender(createElement(AttachmentsPanel, { parentId: 'b' }))

    await respond('parent_id=b', 200, [attachment('b1', 'b.txt')])
    expect(text()).toContain('b.txt')

    // A's superseded response lands after B's and must not fill the panel.
    await respond('parent_id=a', 200, [attachment('a1', 'a.txt')])
    expect(text()).toContain('b.txt')
    expect(text()).not.toContain('a.txt')
  })
})
