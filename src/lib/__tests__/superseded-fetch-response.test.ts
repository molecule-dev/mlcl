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
  /** The request's HTTP method — a list GET and an upload POST share one URL. */
  method: string
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
vi.mock('@molecule/app-file-dropzone-react', () => ({
  // One button hands the panel a File through the real `onFiles` prop, so a
  // test can drive an upload.
  FileDropzone: (props: { onFiles: (files: File[]) => void; disabled?: boolean }) =>
    createElement(
      'button',
      {
        type: 'button',
        'aria-label': 'drop-files',
        disabled: props.disabled,
        onClick: () => props.onFiles([new File(['x'], 'new.txt', { type: 'text/plain' })]),
      },
      'drop',
    ),
}))

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

/** The attachments panel's dropzone (its `disabled` prop is the upload guard). */
const dropzone = (): HTMLButtonElement =>
  container.querySelector('button[aria-label="drop-files"]') as HTMLButtonElement

/** The upload POSTs parked for `fragment` — a GET for the same URL is excluded. */
const uploads = (fragment: string): Pending[] =>
  pending.requests.filter((r) => r.method === 'POST' && r.url.includes(fragment))

beforeEach(() => {
  pending.requests.length = 0
  globalThis.fetch = ((input: unknown, init?: { method?: string }) =>
    new Promise((resolve) => {
      pending.requests.push({
        url: String(input),
        method: init?.method ?? 'GET',
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

  it('reports a 2xx body that is not a post instead of rendering a blank article', async () => {
    // The markdown-blog read path the sibling fix left behind: BlogIndexPage
    // checks the array and PostEditorPage the fields, but this one installed
    // whatever a 2xx carried. An endpoint with no fixture answers 200 `{}` (the
    // mock API server's unmatchedFixtureResponse) — as `post` that rendered a
    // blank title, `new Date(undefined)` → "Invalid Date" and `undefined` into
    // the markdown bond, instead of the failure it is.
    await mount(createElement(PostPage, { slug: 'hollow' }))

    await respond('/api/posts/hollow', 200, {})
    expect(text()).toContain('Could not load this post')
    expect(text()).not.toContain('Invalid Date')
    expect(text()).not.toContain('Loading…')

    // The page still works afterwards — a real post on the next slug renders.
    await rerender(createElement(PostPage, { slug: 'live' }))
    await respond('/api/posts/live', 200, {
      id: '1',
      title: 'Live post',
      body_markdown: 'body',
      published_at: '2026-01-01T00:00:00.000Z',
    })
    expect(text()).toContain('Live post')
    expect(text()).not.toContain('Could not load this post')
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

  it('keeps the last synced summary when the summary endpoint fails', async () => {
    await mount(createElement(RatingWidget, { subjectId: 's', canRate: true }))
    await respond('/api/ratings/avg/s', 200, { average: 4.2, count: 7 })
    expect(text()).toContain('4.2 (7 reviews)')

    // A rating resyncs the summary through the same loader. A 500 whose body is
    // `{ error }` parses happily, so without an `res.ok` gate it reached state
    // as "no average, no count" and the widget re-rendered "No ratings yet — be
    // the first" over a subject the reader had just voted on. The loader's own
    // contract is "a failed load keeps the last synced summary".
    await clickRate(5)
    await respondTo('/api/ratings', 200, {})
    await respond('/api/ratings/avg/s', 500, { error: 'boom' })

    expect(text()).toContain('4.2 (7 reviews)')
    expect(text()).not.toContain('No ratings yet')
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

  it('a rating that lands after the subject changed does not repaint the old average', async () => {
    await mount(createElement(RatingWidget, { subjectId: 'first', canRate: true }))
    await respond('/api/ratings/avg/first', 200, { average: 2.0, count: 1 })

    // Rate the FIRST subject — the POST parks — then switch subject.
    await clickRate(4)
    await rerender(createElement(RatingWidget, { subjectId: 'second', canRate: true }))
    await respond('/api/ratings/avg/second', 200, { average: 3.0, count: 5 })
    expect(text()).toContain('3.0 (5 reviews)')

    // The parked POST lands now. The rating belongs to the subject we LEFT: a
    // trailing summary refresh for it must not take the newest ticket and
    // repaint first's average under second.
    await respondTo('/api/ratings', 200, {})

    // In the unguarded flow the trailing refresh for 'first' is now pending —
    // answer it, so the test is deterministic in both worlds, and the
    // assertion below is what catches the bug.
    for (const request of pending.requests.filter(
      (r) => !r.answered && r.url.includes('/api/ratings/avg/first'),
    )) {
      request.answered = true
      await act(async () => {
        request.respond(200, { average: 5.0, count: 1 })
      })
    }
    await flush()

    expect(text()).toContain('3.0 (5 reviews)')
    expect(text()).not.toContain('5.0')
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

  it('an upload that lands after the record changed does not repaint the old record’s files', async () => {
    await mount(createElement(AttachmentsPanel, { parentId: 'a' }))
    await respond('parent_id=a', 200, [attachment('a1', 'a.txt')])
    expect(text()).toContain('a.txt')

    // An upload starts on record A and parks mid-POST…
    await act(async () => {
      container
        .querySelector('button[aria-label="drop-files"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()

    // …and the user switches to record B while it is in flight.
    await rerender(createElement(AttachmentsPanel, { parentId: 'b' }))
    await respond('parent_id=b', 200, [attachment('b1', 'b.txt')])
    expect(text()).toContain('b.txt')

    // The upload POST then lands. The files belong to record A: a trailing
    // refresh of A's list must not take the newest ticket and repaint A's
    // files under B's panel.
    await respondTo('/api/attachments?parent_id=a', 200, { id: 'a2' })

    // In the unguarded flow the trailing refresh for A is now pending — answer
    // it, so the test is deterministic in both worlds, and the assertion below
    // is what catches the bug.
    for (const request of pending.requests.filter(
      (r) => !r.answered && r.url.includes('parent_id=a') && r.url.includes('attachments?'),
    )) {
      request.answered = true
      await act(async () => {
        request.respond(200, [attachment('a1', 'a.txt')])
      })
    }
    await flush()

    expect(text()).toContain('b.txt')
    expect(text()).not.toContain('a.txt')
  })

  it('a list read already in flight does not resurrect a row the user just deleted', async () => {
    // The delete is the newest truth this panel holds, but a list read that was
    // issued BEFORE it committed carries the pre-delete snapshot — landing
    // after, it puts the deleted attachment back on screen until the next load.
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      await mount(createElement(AttachmentsPanel, { parentId: 'a' }))
      await respond('parent_id=a', 200, [attachment('a1', 'a.txt')])
      expect(text()).toContain('a.txt')

      // An upload finishes, and the refresh IT starts is the read in flight…
      await act(async () => {
        container
          .querySelector('button[aria-label="drop-files"]')
          ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })
      await flush()
      await respond('parent_id=a', 200, { id: 'a2' }) // the upload POST

      // …while the user deletes a row.
      await act(async () => {
        container
          .querySelector('[data-mol-id="attachment-delete"]')
          ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })
      await flush()
      await respond('/api/attachments/a1', 200, { ok: true })
      expect(text(), 'the deleted row is gone as soon as the delete commits').not.toContain('a.txt')

      // The refresh issued before the delete now lands with its stale snapshot.
      const stale = pending.requests.find(
        (r) => !r.answered && r.url.includes('attachments?parent_id=a'),
      )
      expect(stale, 'the upload’s refresh must still be in flight').toBeDefined()
      stale!.answered = true
      await act(async () => {
        stale!.respond(200, [attachment('a1', 'a.txt')])
      })
      await flush()

      expect(text(), 'a stale snapshot must not resurrect the deleted row').not.toContain('a.txt')
    } finally {
      confirmSpy.mockRestore()
    }
  })

  it('an upload parked on the previous record neither freezes nor releases the new dropzone', async () => {
    // `uploading` is one flag for the dropzone, and the panel outlives a
    // `parentId` change. The record reset cleared the list but not that flag: an
    // upload parked on record A kept B's dropzone `disabled` (files dropped
    // there were refused with no explanation) until A's request settled — and
    // when it settled its `finally` cleared the flag unconditionally, releasing
    // the guard around an upload B had started meanwhile (a second drop would
    // then upload concurrently). Both halves are asserted here.
    await mount(createElement(AttachmentsPanel, { parentId: 'a' }))
    await respond('parent_id=a', 200, [attachment('a1', 'a.txt')])
    expect(text()).toContain('a.txt')

    // An upload starts on record A and parks mid-POST.
    await act(async () => {
      dropzone().dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    expect(uploads('parent_id=a'), 'A’s upload POST is parked').toHaveLength(1)
    expect(dropzone().disabled, 'A’s upload is in flight').toBe(true)

    // The user switches records while it is parked.
    await rerender(createElement(AttachmentsPanel, { parentId: 'b' }))
    await respond('parent_id=b', 200, [])

    // B's dropzone must accept files: the parked upload belongs to A.
    expect(
      dropzone().disabled,
      'the previous record’s upload must not hold the new dropzone disabled',
    ).toBe(false)
    await act(async () => {
      dropzone().dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    expect(uploads('parent_id=b'), 'the new record uploads its own file').toHaveLength(1)

    // A's upload settles now. It must NOT release B's in-flight guard.
    await respondTo('/api/attachments?parent_id=a', 200, { id: 'a2' })
    expect(
      dropzone().disabled,
      'the abandoned upload must not release the new record’s in-flight guard',
    ).toBe(true)

    // …and B's own upload releases it when IT settles. The release comes after
    // the upload flow's trailing refresh (the guard covers the whole flow), so
    // that read is answered here.
    await respondTo('/api/attachments?parent_id=b', 200, { id: 'b2' })
    await respond('parent_id=b', 200, [attachment('b1', 'b.txt')])
    expect(dropzone().disabled, 'the guard is released by the upload that actually owns it').toBe(
      false,
    )
  })

  it('a delete that commits after the record changed does not drop the new record’s list', async () => {
    // The panel stays mounted while the selected record changes, so a delete
    // issued on record A can still be in flight when B's list load is. The
    // delete's invalidation (loadSeq) belongs to A — applied unconditionally it
    // takes the ticket B's OWN load is holding, so B's rows are discarded and
    // the panel sits on "No files attached yet" over a record that has files.
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      await mount(createElement(AttachmentsPanel, { parentId: 'a' }))
      await respond('parent_id=a', 200, [attachment('a1', 'a.txt')])
      expect(text()).toContain('a.txt')

      // Delete A's row — the DELETE parks in flight…
      await act(async () => {
        container
          .querySelector('[data-mol-id="attachment-delete"]')
          ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })
      await flush()

      // …and the user switches to record B before it commits. B's load is now
      // the read in flight.
      await rerender(createElement(AttachmentsPanel, { parentId: 'b' }))

      // The delete for A commits, then B's own load lands with B's rows.
      await respond('/api/attachments/a1', 200, { ok: true })
      await respond('parent_id=b', 200, [attachment('b1', 'b.txt')])

      expect(
        text(),
        'the new record’s list must survive a delete left on the previous record',
      ).toContain('b.txt')
      expect(text()).not.toContain('No files attached yet')
    } finally {
      confirmSpy.mockRestore()
    }
  })

  it('a delete that commits after the reader left and came back refetches the record’s list', async () => {
    // The same ownership rule, one navigation further: A → B → A while A's
    // DELETE is in flight. The panel is on A again, so the delete owns the
    // record — but the only read A has in flight was started BEFORE the delete
    // and carries the pre-delete snapshot, so it must be invalidated (it would
    // otherwise put the deleted row back) AND replaced by a fresh read, or the
    // panel keeps the empty list the switch left behind.
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      await mount(createElement(AttachmentsPanel, { parentId: 'a' }))
      await respond('parent_id=a', 200, [attachment('a1', 'a.txt')])

      await act(async () => {
        container
          .querySelector('[data-mol-id="attachment-delete"]')
          ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })
      await flush()

      await rerender(createElement(AttachmentsPanel, { parentId: 'b' }))
      await rerender(createElement(AttachmentsPanel, { parentId: 'a' }))

      // The delete commits: the stale read A has in flight is dropped and a
      // fresh one is issued.
      await respond('/api/attachments/a1', 200, { ok: true })

      // The pre-delete read lands first — with the row the user deleted.
      await respond('parent_id=a', 200, [attachment('a1', 'a.txt')])
      // …then the fresh read, with the server's post-delete list.
      await respond('parent_id=a', 200, [attachment('a2', 'a2.txt')])

      expect(text()).toContain('a2.txt')
      expect(text()).not.toContain('a.txt')
      expect(text(), 'the record’s list must be refetched after the delete').not.toContain(
        'No files attached yet',
      )
    } finally {
      confirmSpy.mockRestore()
    }
  })
})
