// @vitest-environment jsdom
/**
 * The bell's counted-read set stays bounded to the panel's page.
 *
 * `countedReadRef` exists to stop a read from being counted twice (a row's own
 * POST and its SSE echo of the same write can each arrive first — the read
 * endpoint is idempotent and re-BROADCASTS, so every request re-fires
 * `notification:read`). Each entry is added on an unread→read transition and
 * never removed, so without a prune the set kept one entry per notification
 * read for the whole life of the tab, while the panel itself is bounded to
 * NOTIFICATION_PAGE_SIZE.
 *
 * An id can only ever be re-counted while its row is on screen — both counters
 * return early unless the row is present AND unread — and the list only
 * PREPENDS, so an id that fell off the page can never come back this mount.
 * The component therefore prunes the set to the live page whenever the page
 * changes. The prune has no observable output (a fallen id behaves identically
 * through both guards), so the bound itself is pinned by a source gate below;
 * the behavioral assertions pin the race guard the set exists for, which the
 * prune must not break.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => 'stub' }),
}))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, values?: Record<string, unknown>, options?: { defaultValue?: string }) =>
      (options?.defaultValue ?? _key).replace(/\{\{(\w+)\}\}/g, (_match, name: string) =>
        String(values?.[name] ?? ''),
      ),
  }),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Button: (props: Record<string, unknown>) =>
    createElement('button', { ...props, type: 'button' } as never, String(props.children ?? '')),
}))
vi.mock('@molecule/app-notification-badge-react', () => ({
  NotificationWrapper: (props: { count: number; children?: ReactNode }) =>
    createElement('div', null, `unread:${props.count}`, props.children),
}))
vi.mock('@molecule/app-notification-center-react', () => ({
  // The row buttons carry the item's onClick — the real center's contract, and
  // the POST half of the counted-read race below. The real center also renders
  // each row's read/unread state from `read`; the double exposes it as
  // `data-read` so a test can see WHICH state a row was rendered in without
  // changing the row text the other assertions match on. `onMarkAllRead` gets
  // a button for the same reason: the mark-all POST is the other half of the
  // response-ordering race further down.
  NotificationCenter: (props: {
    items: Array<{ id: string; title: string; read: boolean; onClick: () => void }>
    onMarkAllRead?: () => void
  }) =>
    createElement(
      'div',
      null,
      props.onMarkAllRead
        ? createElement('button', { type: 'button', onClick: props.onMarkAllRead }, 'mark-all')
        : null,
      createElement(
        'ul',
        null,
        props.items.map((item) =>
          createElement(
            'li',
            { key: item.id, ...({ 'data-read': String(item.read) } as Record<string, string>) },
            createElement(
              'button',
              { type: 'button', onClick: item.onClick },
              `${item.id}:${item.title}`,
            ),
          ),
        ),
      ),
    ),
}))

const BELL_SOURCE = join(
  import.meta.dirname,
  '../../../templates/.agents/skills/examples/notifications/in-app-notifications/app/components/NotificationBell.tsx',
)

const { NotificationBellWidget } =
  (await import('../../../templates/.agents/skills/examples/notifications/in-app-notifications/app/components/NotificationBell')) as {
    NotificationBellWidget: (props: { userId: string }) => ReactNode
  }

/** One captured EventSource, with the test able to fire a named frame at it. */
interface FakeSource {
  url: string
  emit: (type: string, data: string) => void
  closed: boolean
}

let sources: FakeSource[] = []

class FakeEventSource {
  private readonly listeners = new Map<string, Array<(e: { data: string }) => void>>()
  private readonly source: FakeSource
  constructor(url: string) {
    const listeners = this.listeners
    this.source = {
      url,
      closed: false,
      emit: (type, data) => {
        for (const listener of listeners.get(type) ?? []) listener({ data })
      },
    }
    sources.push(this.source)
  }
  addEventListener(type: string, listener: (e: { data: string }) => void): void {
    const list = this.listeners.get(type) ?? []
    list.push(listener)
    this.listeners.set(type, list)
  }
  close(): void {
    this.source.closed = true
  }
}

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const originalFetch = globalThis.fetch
const originalEventSource = (globalThis as { EventSource?: unknown }).EventSource

/** Every fetch() the component made, each with a handle to answer it. */
interface CapturedRequest {
  url: string
  answered: boolean
  respond: (body?: unknown, status?: number) => void
}
const httpRequests: CapturedRequest[] = []

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

/** The read/unread state the centre was handed for the one row on screen. */
const rowState = (): string | null =>
  container.querySelector('li')?.getAttribute('data-read') ?? null

/** The read/unread state of EVERY rendered row, keyed by the row's id. */
const rowStates = (): Map<string, string> => {
  const states = new Map<string, string>()
  for (const li of container.querySelectorAll('li')) {
    const id = (li.querySelector('button')?.textContent ?? '').split(':')[0] ?? ''
    states.set(id, li.getAttribute('data-read') ?? '')
  }
  return states
}

/** Fire one SSE frame at the bell's subscription. */
async function frame(type: string, data: string): Promise<void> {
  const source = sources[0]
  if (!source) throw new Error('the bell opened no EventSource')
  await act(async () => {
    source.emit(type, data)
  })
  await flush()
}

/** Open the dropdown (the toggle is the page's first button). */
async function openBell(): Promise<void> {
  await act(async () => {
    container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await flush()
}

/** Click the notification row whose text starts with `id:` (the POST path). */
async function clickRow(id: string): Promise<void> {
  const row = [...container.querySelectorAll('button')].find((b) =>
    b.textContent?.startsWith(`${id}:`),
  )
  if (!row) throw new Error(`no rendered row ${id}`)
  await act(async () => {
    row.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await flush()
}

/** Answer the (single) pending POST for `suffix`, e.g. `/api/notifications/n3/read`. */
async function answerPost(suffix: string): Promise<void> {
  const request = httpRequests.find((r) => r.url.endsWith(suffix) && !r.answered)
  if (!request) throw new Error(`no pending request for ${suffix}`)
  request.answered = true
  await act(async () => {
    request.respond({}, 200)
  })
  await flush()
}

/** Press the mark-all-read control (the centre's onMarkAllRead). */
async function clickMarkAll(): Promise<void> {
  const button = [...container.querySelectorAll('button')].find((b) =>
    b.textContent?.includes('mark-all'),
  )
  if (!button) throw new Error('no mark-all button rendered')
  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await flush()
}

beforeEach(() => {
  sources = []
  httpRequests.length = 0
  ;(globalThis as { EventSource?: unknown }).EventSource = FakeEventSource
  // Every fetch stays pending until a test answers it, so state is only what
  // the frames / clicks below wrote.
  globalThis.fetch = ((input: unknown) =>
    new Promise((resolve) => {
      const entry: CapturedRequest = {
        url: String(input),
        answered: false,
        respond: (body: unknown = {}, status = 200) =>
          resolve({
            ok: status >= 200 && status < 300,
            status,
            json: async () => body,
          }),
      }
      httpRequests.push(entry)
    })) as typeof globalThis.fetch
})

afterEach(async () => {
  globalThis.fetch = originalFetch
  ;(globalThis as { EventSource?: unknown }).EventSource = originalEventSource
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

describe('the bell counted-read set', () => {
  it('is pruned to the live page (source gate — the set is deliberately unobservable)', () => {
    const source = readFileSync(BELL_SOURCE, 'utf8')
    // The prune: an effect keyed on the page deletes every counted id the
    // page no longer carries. Removing the prune (or keying it on something
    // that does not track the page) fails here.
    expect(
      source,
      'NotificationBell must prune countedReadRef to the live page — see the effect on [items]',
    ).toMatch(
      /useEffect\(\(\) => \{[\s\S]*?countedReadRef\.current\.delete\(id\)[\s\S]*?\}, \[items\]\)/,
    )
  })

  it('counts each unread→read transition once — via echo, via POST, never twice', async () => {
    await mount(createElement(NotificationBellWidget, { userId: 'u1' }))
    expect(sources[0]?.url).toContain('room=user%3Au1')
    await openBell()

    // Fill past the page bound: n1/n2 are pushed off by the newer arrivals and
    // stay UNREAD off-page; n3..n22 are the live page.
    for (let i = 1; i <= 22; i++) {
      await frame(
        'notification:created',
        JSON.stringify({ id: `n${i}`, type: 'mention', read_at: null }),
      )
    }
    expect(text()).toContain('unread:22')

    // Read every live row EXCEPT n3 via the SSE echo: 19 transitions counted.
    for (let i = 4; i <= 22; i++) {
      await frame('notification:read', JSON.stringify({ id: `n${i}` }))
    }
    expect(text()).toContain('unread:3')

    // A read echo for a row that fell off the page counts nothing: the guards
    // require the row to be present AND unread. (An echo like this is the only
    // thing a fallen id could still be consulted for.)
    await frame('notification:read', JSON.stringify({ id: 'n1' }))
    expect(text()).toContain('unread:3')

    // The live unread row n3 goes read through the POST path…
    await clickRow('n3')
    await answerPost('/api/notifications/n3/read')
    expect(text()).toContain('unread:2')
    // …and the echo of that same write arrives AFTER the POST resolved — the
    // exact race the set exists to close — counting nothing a second time.
    await frame('notification:read', JSON.stringify({ id: 'n3' }))
    expect(text()).toContain('unread:2')
  })

  it('a click on an already-read row (and its echo) moves the badge nowhere', async () => {
    await mount(createElement(NotificationBellWidget, { userId: 'u1' }))
    await openBell()
    await frame(
      'notification:created',
      JSON.stringify({ id: 'a1', type: 'mention', read_at: null }),
    )
    expect(text()).toContain('unread:1')

    // Read via the echo first…
    await frame('notification:read', JSON.stringify({ id: 'a1' }))
    expect(text()).toContain('unread:0')
    // …then click the row anyway: the POST fires (the endpoint is idempotent
    // and re-broadcasts), but neither its handler nor the fresh echo may
    // decrement for a row that is not unread→read.
    await clickRow('a1')
    await answerPost('/api/notifications/a1/read')
    await frame('notification:read', JSON.stringify({ id: 'a1' }))
    expect(text()).toContain('unread:0')
  })

  it('a frame with no read_at is unread in BOTH the badge and the row — and its click clears it', async () => {
    // The parser requires only the `id`, so a hand-rolled broadcast (or another
    // writer in the room) can deliver a frame with no `read_at`. `undefined` is
    // not `null`: every `read_at !== null` check in the component read such a
    // frame as already READ, so the badge counted it unread while the row
    // rendered as read, and neither the click nor the SSE echo could ever
    // decrement it. One notification, stuck in the badge for the life of the
    // mount — the two representations of the same fact must agree.
    await mount(createElement(NotificationBellWidget, { userId: 'u1' }))
    await openBell()
    await frame('notification:created', JSON.stringify({ id: 'm1', type: 'mention' }))

    expect(text()).toContain('unread:1')
    expect(rowState(), 'the badge counts it unread, so the row must render unread').toBe('false')

    await clickRow('m1')
    await answerPost('/api/notifications/m1/read')
    expect(text()).toContain('unread:0')
    expect(rowState()).toBe('true')
  })

  it('a frame that arrives already read is counted nowhere', async () => {
    await mount(createElement(NotificationBellWidget, { userId: 'u1' }))
    await openBell()
    await frame(
      'notification:created',
      JSON.stringify({ id: 'r1', type: 'mention', read_at: '2026-01-01T00:00:00.000Z' }),
    )

    // No unread→read transition to count, and the row is read: offering it as
    // unread left the badge one above the rows with nothing able to bring it
    // down (the read guards return early for a row that is not unread).
    expect(text()).toContain('unread:0')
    expect(rowState()).toBe('true')
  })

  it('an id the prune dropped is counted again when its row returns to the page', async () => {
    // The prune's observable half — it is not only a source-text promise. An id
    // can only be re-counted while its row is on screen, so pruning is invisible
    // for a read row that fell off the page … until that row comes BACK: a
    // re-delivered `notification:created` frame puts it on screen unread, and its
    // read receipt must then count the transition. Keeping the dropped id would
    // make that echo return early and leave the badge stuck one above the rows —
    // the defect the counted-read set exists to prevent, mirrored.
    await mount(createElement(NotificationBellWidget, { userId: 'u1' }))
    await openBell()
    await frame(
      'notification:created',
      JSON.stringify({ id: 'p1', type: 'mention', read_at: null }),
    )
    await frame('notification:read', JSON.stringify({ id: 'p1' }))
    expect(text()).toContain('unread:0')

    // Push p1 off the page: a full page of new arrivals, each unread.
    for (let i = 1; i <= 20; i++) {
      await frame(
        'notification:created',
        JSON.stringify({ id: `q${i}`, type: 'mention', read_at: null }),
      )
    }
    expect(text(), 'p1 is off the page now').toContain('unread:20')
    // …p1 comes back (the re-delivery above) and is unread again.
    await frame(
      'notification:created',
      JSON.stringify({ id: 'p1', type: 'mention', read_at: null }),
    )
    expect(text()).toContain('unread:21')

    // Its read receipt must decrement: the id the prune dropped is what lets
    // this count, and a set that kept it would refuse here (badge stuck at 21
    // over 20 rows of unread state).
    await frame('notification:read', JSON.stringify({ id: 'p1' }))
    expect(text()).toContain('unread:20')
  })

  it('a notification delivered while the mark-all POST is in flight stays unread', async () => {
    // An HTTP response has no ordering: a notification created after the
    // server's mark-all write is UNREAD server-side, but a response handler
    // that marks "everything now on screen" read clobbers it anyway — the row
    // rendered read under a badge it had just raised, and the reader missed it
    // until a reload. The response may only flip the rows the request covered
    // (the ones on screen when the button was pressed); the SSE
    // `notification:all-read` frame needs no such scoping, because frames
    // arrive in publish order.
    await mount(createElement(NotificationBellWidget, { userId: 'u1' }))
    await openBell()
    await frame(
      'notification:created',
      JSON.stringify({ id: 'a1', type: 'mention', read_at: null }),
    )
    expect(text()).toContain('unread:1')

    // The mark-all POST fires and stays pending. WHILE it is in flight, a new
    // notification is created (after the server's write) and delivered.
    await clickMarkAll()
    await frame(
      'notification:created',
      JSON.stringify({ id: 'b1', type: 'mention', read_at: null }),
    )
    expect(text()).toContain('unread:2')

    // The response lands AFTER that frame. It must flip exactly a1: the badge
    // drops by one, b1 keeps its badge and renders unread.
    await answerPost('/api/notifications/mark-all-read')
    expect(text(), 'the covered row flipped; the late arrival did not').toContain('unread:1')
    const states = rowStates()
    expect(states.get('a1'), 'a1 was on screen when mark-all was pressed').toBe('true')
    expect(states.get('b1'), 'b1 was created after the server marked all read').toBe('false')
  })

  it('a failed mark-all POST marks nothing read', async () => {
    await mount(createElement(NotificationBellWidget, { userId: 'u1' }))
    await openBell()
    await frame(
      'notification:created',
      JSON.stringify({ id: 'a1', type: 'mention', read_at: null }),
    )
    expect(text()).toContain('unread:1')

    await clickMarkAll()
    const request = httpRequests.find(
      (r) => r.url.endsWith('/api/notifications/mark-all-read') && !r.answered,
    )
    if (!request) throw new Error('no pending mark-all request')
    request.answered = true
    await act(async () => {
      request.respond({ error: 'boom' }, 500)
    })
    await flush()
    expect(text()).toContain('unread:1')
    expect(rowStates().get('a1')).toBe('false')
  })
})
