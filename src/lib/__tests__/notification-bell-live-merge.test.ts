// @vitest-environment jsdom
/**
 * A notification the live feed delivered while the initial page was still in
 * flight must survive the page landing.
 *
 * The mount effect clears the panel, starts `GET /api/notifications`, and opens
 * the SSE subscription. The response is a snapshot of the room taken BEFORE the
 * request answered, so a `notification:created` frame that arrives in between is
 * a row the page does not carry — and `setItems(page.items)` REPLACED the panel
 * with that page, so the row (and its badge increment) vanished until a reload:
 * the reader watched a notification appear and then disappear. This is the same
 * defect the sibling in-app-chat slice's history load fixed by MERGING
 * (`templates/.agents/skills/examples/messaging/in-app-chat/app/pages/ChatPage.tsx`).
 *
 * @module
 */

import { createElement, type ReactNode } from 'react'
import { act } from 'react'
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
  // With no rows the shared center renders ITS `emptyState` — the sentence the
  // bell hands it, which is what a failed load must not turn into a claim (see
  // the last describe block).
  NotificationCenter: (props: {
    items: Array<{ id: string; title: string; read: boolean; onClick: () => void }>
    emptyState?: string
  }) =>
    props.items.length === 0
      ? createElement('p', { 'data-mol-id': 'notification-empty' }, String(props.emptyState ?? ''))
      : createElement(
          'ul',
          null,
          props.items.map((item) =>
            createElement(
              'li',
              {
                key: item.id,
                onClick: item.onClick,
                ...({ 'data-read': String(item.read) } as Record<string, string>),
              },
              `${item.id}:${item.title}`,
            ),
          ),
        ),
}))

const { NotificationBellWidget } =
  (await import('../../../templates/.agents/skills/examples/notifications/in-app-notifications/app/components/NotificationBell')) as {
    NotificationBellWidget: (props: { userId: string }) => ReactNode
  }

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

interface CapturedRequest {
  url: string
  answered: boolean
  respond: (body?: unknown, status?: number) => void
  /** Reject the request the way a failed network does. */
  fail: (error: Error) => void
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

/** The pending list request, or undefined when it already answered. */
function pendingList(): CapturedRequest | undefined {
  return httpRequests.find((r) => r.url.includes('/api/notifications?') && !r.answered)
}

/** Answer the pending list GET with a page body. */
async function answerList(body: unknown): Promise<void> {
  await answerListWith(body, 200)
}

/** Answer the pending list GET with an explicit status (`ok` follows the status). */
async function answerListWith(body: unknown, status: number): Promise<void> {
  const request = pendingList()
  if (!request) throw new Error('no pending list request')
  request.answered = true
  await act(async () => {
    request.respond(body, status)
  })
  await flush()
}

beforeEach(() => {
  sources = []
  httpRequests.length = 0
  ;(globalThis as { EventSource?: unknown }).EventSource = FakeEventSource
  globalThis.fetch = ((input: unknown) =>
    new Promise((resolve, reject) => {
      const entry: CapturedRequest = {
        url: String(input),
        answered: false,
        respond: (body: unknown = {}, status = 200) =>
          resolve({
            ok: status >= 200 && status < 300,
            status,
            json: async () => body,
          }),
        fail: (error: Error) => reject(error),
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

describe('the bell keeps live arrivals the page snapshot cannot know', () => {
  it('a frame delivered before the page lands is not dropped — row and badge both survive', async () => {
    await mount(createElement(NotificationBellWidget, { userId: 'u1' }))
    await openBell()

    // The live notification arrives while GET /api/notifications is parked.
    await frame(
      'notification:created',
      JSON.stringify({
        id: 'live1',
        type: 'mention',
        actor_name: 'A',
        subject_title: 'T',
        read_at: null,
      }),
    )
    expect(text()).toContain('unread:1')
    expect(text()).toContain('live1')

    // The page answers with the snapshot taken BEFORE that notification existed
    // — it carries one older READ row and no unread.
    await answerList({
      items: [
        {
          id: 'old1',
          type: 'mention',
          actor_name: 'B',
          subject_title: 'T2',
          created_at: '2026-01-01T00:00:00.000Z',
          read_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      unread: 0,
    })

    // The page's row lands, and the live one is still there — in front, newest first.
    expect(text()).toContain('old1')
    expect(text(), 'a live arrival must survive the page landing').toContain('live1')
    expect(text(), 'the badge must still count the live unread row').toContain('unread:1')
  })

  it('a live row the page ALSO carries is counted exactly once', async () => {
    await mount(createElement(NotificationBellWidget, { userId: 'u1' }))
    await openBell()

    // The frame is delivered AND the page snapshot already includes the row (the
    // creation and the broadcast both landed before the server answered) — the
    // page's own unread count already covers it, so the badge must not add it a
    // second time.
    await frame(
      'notification:created',
      JSON.stringify({
        id: 'both1',
        type: 'mention',
        actor_name: 'A',
        subject_title: 'T',
        read_at: null,
      }),
    )
    expect(text()).toContain('unread:1')

    await answerList({
      items: [
        {
          id: 'both1',
          type: 'mention',
          actor_name: 'A',
          subject_title: 'T',
          created_at: '2026-01-01T00:00:00.000Z',
          read_at: null,
        },
      ],
      unread: 1,
    })

    expect(text(), 'the row must not be duplicated').toEqual(expect.stringContaining('both1'))
    expect(text().match(/both1/g)?.length ?? 0, 'the row must appear once').toBe(1)
    expect(text(), 'the page already counted it — no double count').toContain('unread:1')
  })

  it('a read made while the page was in flight survives the page landing as read', async () => {
    await mount(createElement(NotificationBellWidget, { userId: 'u1' }))
    await openBell()

    // The live notification arrives (unread, badge 1) while the page GET is parked…
    await frame(
      'notification:created',
      JSON.stringify({
        id: 'live1',
        type: 'mention',
        actor_name: 'A',
        subject_title: 'T',
        created_at: '2026-01-01T00:00:00.000Z',
        read_at: null,
      }),
    )
    expect(text()).toContain('unread:1')

    // …and the reader clicks it: the panel row's onClick (the shared center
    // hands each item's onClick to its row).
    await act(async () => {
      container
        .querySelector('li[data-read="false"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()

    // The read POST answers ok: the badge clears and the row renders read.
    const readRequest = httpRequests.find(
      (r) => r.url.includes('/api/notifications/live1/read') && !r.answered,
    )
    if (!readRequest) throw new Error('the click issued no read request')
    readRequest.answered = true
    await act(async () => {
      readRequest.respond({ id: 'live1', read_at: '2026-01-02T00:00:00.000Z' })
    })
    await flush()
    expect(text(), 'the accepted read cleared the badge').toContain('unread:0')

    // The page snapshot was taken BEFORE the read write landed: it still carries
    // the row as unread. The merge must not un-read it — the page row rendered
    // unread again, and countedReadRef (already holding the id) kept every
    // further click a no-op, so the row was stuck unread until a reload.
    await answerList({
      items: [
        {
          id: 'live1',
          type: 'mention',
          actor_name: 'A',
          subject_title: 'T',
          created_at: '2026-01-01T00:00:00.000Z',
          read_at: null,
        },
      ],
      unread: 0,
    })

    expect(text(), 'the row must survive the page landing').toContain('live1')
    const row = container.querySelector('li[data-read="false"]')
    expect(row, 'the read the reader made must not be un-made by the older snapshot').toBeNull()
    expect(text(), 'the badge stays clear').toContain('unread:0')
  })
})

/**
 * The mount effect clears the panel up front, so a load that never arrived left
 * the shared center on its empty state — "You're all caught up." — for an inbox
 * whose rows simply did not load. The bell's own catch even said so ("a failed
 * load leaves the bell at its initial empty state"), which is a wrong answer to
 * the reader, not a missing nicety: it is the exact claim the sibling slices
 * (Leaderboard, BlogIndexPage, OrdersPage, SettingsPage) refuse to make at their
 * own catches.
 */
describe('a failed list load is reported, never as "You’re all caught up"', () => {
  it('reports a 500 instead of an empty inbox', async () => {
    await mount(createElement(NotificationBellWidget, { userId: 'u1' }))
    await openBell()
    await answerListWith({ error: 'boom' }, 500)

    expect(text(), 'a failed load is not an empty inbox').not.toContain("You're all caught up")
    expect(text(), 'the failure must be visible').toContain('Could not load your notifications')
  })

  it('reports a 2xx body that is not the page', async () => {
    await mount(createElement(NotificationBellWidget, { userId: 'u1' }))
    await openBell()
    // A route that answered 200 with an envelope (a shrunken rewrite, a proxy's
    // 200) is not proof the inbox is empty.
    await answerListWith({ error: 'nope' }, 200)

    expect(text()).not.toContain("You're all caught up")
    expect(text()).toContain('Could not load your notifications')
  })

  it('reports a rejected fetch (offline)', async () => {
    await mount(createElement(NotificationBellWidget, { userId: 'u1' }))
    await openBell()
    const request = pendingList()
    if (!request) throw new Error('no pending list request')
    request.answered = true
    await act(async () => {
      request.fail(new Error('offline'))
    })
    await flush()

    expect(text()).not.toContain("You're all caught up")
    expect(text()).toContain('Could not load your notifications')
  })
})
