// @vitest-environment jsdom
/**
 * A realtime frame is UNTRUSTED input that lands in React state.
 *
 * Both SSE consumers in the example tree parsed `event.data` and wrote the
 * result straight into state:
 *
 * - `in-app-chat`'s `ChatPage` appends every `message:created` frame
 *   (`setMessages((prev) => newestWindow([...prev, msg]))`);
 * - `in-app-notifications`' `NotificationBellWidget` prepends every
 *   `notification:created` frame.
 *
 * Neither validates the parsed value, and both then DEREFERENCE it during
 * render (`toMessageData(m).id` / `n.id` in the notification-center map). The
 * SSE wire format carries arbitrary text after `data:`, so a single frame whose
 * payload is the JSON literal `null` (or any other non-object) is enough to make
 * that render throw `TypeError: Cannot read properties of null (reading 'id')`
 * — and a component that throws during render is unmounted by React: the whole
 * page goes blank, the chat composer included. A frame that is not JSON at all
 * (`data: pong`, a broken newline-joined payload) throws `SyntaxError` out of
 * the listener itself, one uncaught error per frame.
 *
 * A frame like that is not exotic: the stream is fed by whatever the server (or
 * another writer in the room) publishes, and the client is the one place a
 * malformed payload must not be able to take the page down.
 *
 * These render the REAL example components into REAL DOM (jsdom) with a fake
 * `EventSource` the test drives by hand; only the UI primitives / ClassMap /
 * translation bond are reduced to plain elements. The parse, the state write
 * and the render are the shipped code.
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Styling only: every ClassMap helper collapses to one token.
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

// The bubble/indicator/center/badge are not what is under test — each renders
// enough text that an assertion can read which rows survived a bad frame.
vi.mock('@molecule/app-message-bubble-react', () => ({
  // The self/other alignment is part of what a frame test can observe: render
  // it as a prefix so an assertion can tell the viewer's own rows apart.
  MessageBubble: (props: { message?: { body?: string }; isSelf?: boolean }) =>
    createElement(
      'div',
      { className: 'bubble' },
      `${props.isSelf === true ? 'self:' : 'other:'}${props.message?.body ?? ''}`,
    ),
}))
vi.mock('@molecule/app-typing-indicator-react', () => ({ TypingIndicator: () => null }))
vi.mock('@molecule/app-ui-react', () => ({
  // Spread the props so the bell's toggle onClick stays wired.
  Button: (props: Record<string, unknown>) =>
    createElement('button', { ...props, type: 'button' } as never, String(props.children ?? '')),
}))
vi.mock('@molecule/app-notification-badge-react', () => ({
  NotificationWrapper: (props: { count: number; children?: ReactNode }) =>
    createElement('div', null, `unread:${props.count}`, props.children),
}))
vi.mock('@molecule/app-notification-center-react', () => ({
  NotificationCenter: (props: { items: Array<{ id: string; title: string }> }) =>
    createElement(
      'ul',
      null,
      props.items.map((item) => createElement('li', { key: item.id }, `${item.id}:${item.title}`)),
    ),
}))

const { ChatPage } =
  (await import('../../../templates/.agents/skills/examples/messaging/in-app-chat/app/pages/ChatPage')) as {
    ChatPage: (props: { channelId: string }) => ReactNode
  }
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

// react-dom's act() requires this flag outside the React test renderer.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const originalFetch = globalThis.fetch
const originalEventSource = (globalThis as { EventSource?: unknown }).EventSource

/** Every fetch() the components made, each with a handle to answer it. */
const httpRequests = vi.hoisted(
  () => [] as Array<{ url: string; respond: (body: unknown, status?: number) => void }>,
)

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

/** The room subscription this component opened (`?room=…`). */
const roomOf = (index: number): string => {
  const room = new URL(sources[index]?.url ?? '', 'http://localhost').searchParams.get('room')
  if (room === null) throw new Error(`EventSource #${index} joined no room`)
  return room
}

/** Fire one frame; a throw out of the listener/act fails the calling test. */
async function frame(index: number, type: string, data: string): Promise<void> {
  const source = sources[index]
  if (!source) throw new Error(`no EventSource #${index}`)
  await act(async () => {
    source.emit(type, data)
  })
  await flush()
}

beforeEach(() => {
  sources = []
  httpRequests.length = 0
  ;(globalThis as { EventSource?: unknown }).EventSource = FakeEventSource
  // The history / notification loads are not what is under test; leaving them
  // pending keeps the state purely what the frames below wrote. Each request is
  // still RECORDED, so a test that needs one (the self-id probe) can answer it.
  globalThis.fetch = ((input: unknown) =>
    new Promise((resolve) => {
      httpRequests.push({
        url: String(input),
        respond: (body: unknown, status = 200) =>
          resolve({
            ok: status >= 200 && status < 300,
            status,
            json: async () => body,
          }),
      })
    })) as typeof globalThis.fetch
  // jsdom has no Element.scrollTo — the chat page's auto-scroll effect would
  // otherwise throw where the frame handling is not.
  Element.prototype.scrollTo = (() => {}) as typeof Element.prototype.scrollTo
})

/** Open the bell's dropdown so the center (and its rows) render. */
async function openBell(): Promise<void> {
  await act(async () => {
    container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await flush()
}

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

describe('a malformed realtime frame must not take the page down', () => {
  it('chat: a non-object frame is ignored instead of blanking the room', async () => {
    await mount(createElement(ChatPage, { channelId: 'c1' }))
    expect(roomOf(0)).toBe('channel:c1')

    await frame(0, 'message:created', JSON.stringify({ id: 'm1', user_id: 'me', content: 'hi' }))
    expect(text()).toContain('hi')

    // Every one of these is a valid SSE frame body (the spec puts anything after
    // `data:` on the wire): the JSON literal `null` used to reach
    // `toMessageData(null)` during render and throw, unmounting the page.
    await frame(0, 'message:created', 'null')
    await frame(0, 'message:created', '"a string"')
    await frame(0, 'message:created', '[1,2,3]')
    // …and a frame that is not JSON at all used to throw out of the listener.
    await frame(0, 'message:created', 'pong')

    // The room is still mounted and still shows the good frame.
    expect(text()).toContain('hi')
    expect(container.querySelector('input')).not.toBeNull()
  })

  it('notifications: a non-object frame is ignored instead of blanking the bell', async () => {
    await mount(createElement(NotificationBellWidget, { userId: 'u1' }))
    expect(roomOf(0)).toBe('user:u1')
    await openBell()

    await frame(0, 'notification:created', JSON.stringify({ id: 'n1', type: 'mention' }))
    expect(text()).toContain('n1:')
    expect(text()).toContain('unread:1')

    await frame(0, 'notification:created', 'null')
    await frame(0, 'notification:created', '42')
    await frame(0, 'notification:created', 'not json')

    // The bell is still mounted, the good row survives and the badge did not
    // count a frame that carried no notification.
    expect(text()).toContain('n1:')
    expect(text()).toContain('unread:1')
  })
})

describe('chat: a bubble is self-aligned by the SESSION user, not a placeholder', () => {
  it("the viewer's own messages align right once the self id resolves", async () => {
    await mount(createElement(ChatPage, { channelId: 'c1' }))
    // The server stamps every message with the session's userId, so `isSelf`
    // must compare against that id — the shipped 'me' placeholder matched no
    // row, and every message (the viewer's own included) rendered as the other
    // party. The page learns the id from the framework's readSelf route.
    const meRequest = httpRequests.find((r) => r.url.includes('/api/users/me'))
    if (!meRequest) throw new Error('the chat page never asked who the viewer is')
    meRequest.respond({ id: 'u-9' })
    await flush()

    await frame(0, 'message:created', JSON.stringify({ id: 'm1', user_id: 'u-9', content: 'mine' }))
    await frame(
      0,
      'message:created',
      JSON.stringify({ id: 'm2', user_id: 'u-2', content: 'theirs' }),
    )
    expect(text()).toContain('self:mine')
    expect(text()).toContain('other:theirs')
  })

  it('an unresolvable self id degrades to other-alignment instead of mislabeling rows', async () => {
    await mount(createElement(ChatPage, { channelId: 'c1' }))
    // The self probe fails (signed out, offline): no row may claim self.
    const meRequest = httpRequests.find((r) => r.url.includes('/api/users/me'))
    meRequest?.respond({ error: 'unauthorized' }, 401)
    await flush()

    await frame(0, 'message:created', JSON.stringify({ id: 'm1', user_id: 'u-9', content: 'mine' }))
    expect(text()).toContain('other:mine')
  })
})
