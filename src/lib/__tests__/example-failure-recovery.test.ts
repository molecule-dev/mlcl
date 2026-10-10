// @vitest-environment jsdom
/**
 * Five example slices, each with a failure path that left something wrong
 * behind. Everything here is the shipped component: only the UI primitives, the
 * ClassMap and the network are stubbed.
 *
 * 1. `web-push`'s `EnablePushButton` reported "Push notifications enabled" from
 *    `Notification.permission === 'granted'` ALONE on mount. Permission is a
 *    browser fact, not a stored subscription: a user whose subscribe POST failed
 *    (401/500), or whose browser subscription was cleared, saw the enabled line
 *    with no way back — the Enable control that re-registers was gone, and
 *    nothing was ever delivered. The file's own `enable()` path states the rule
 *    ("Reporting 'enabled' on one would tell the user push works while the
 *    server stored no subscription"); the mount check broke it. It now
 *    reconciles: it re-posts the browser's own subscription (the endpoint
 *    dedupes by endpoint) and only says enabled when the server answers ok.
 * 2. `uploads`' `AttachmentsPanel` refreshed its list only when EVERY file in a
 *    multi-file upload succeeded. A failure on the second file left the first
 *    (already stored server-side) off the list until an unrelated reload.
 * 3. `paginated-user-list`'s `UsersPage` kept the previous page's rows when the
 *    request for a new page FAILED, rendering them under the new page number.
 * 4. `in-app-notifications`' `NotificationBellWidget` handled the broadcast
 *    `notification:all-read` frame by zeroing the badge only, leaving every row
 *    rendered as unread — the panel and the badge disagreed until a reload.
 * 5. `in-app-chat`'s `ChatPage` had no in-flight guard on the send (a double
 *    Enter posted the same message twice, and the endpoint has no idempotency
 *    key) and cleared the composer on the RESPONSE, wiping text typed while the
 *    POST was in flight.
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Network doubles
// ---------------------------------------------------------------------------

interface FetchCall {
  url: string
  method: string
  answered: boolean
  respond: (status: number, body: unknown) => void
  fail: (error: Error) => void
}

const fetches = vi.hoisted(() => ({ calls: [] as FetchCall[] }))

/** The `useHttpClient()` double, for the page that uses the client (UsersPage). */
interface HttpCall {
  url: string
  answered: boolean
  resolve: (payload: unknown) => void
  reject: (error: Error) => void
}

const httpCalls = vi.hoisted(() => ({ calls: [] as HttpCall[] }))

/** URLs every mocked EventSource was constructed with, in order. */
const eventSources = vi.hoisted(() => ({ urls: [] as string[] }))

// ---------------------------------------------------------------------------
// Module doubles (UI primitives + ClassMap only)
// ---------------------------------------------------------------------------

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => undefined }),
}))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>, options?: { defaultValue?: string }) =>
      (options?.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_m, name: string) =>
        String(values?.[name] ?? ''),
      ),
  }),
  useHttpClient: () =>
    (httpClient ??= {
      get: (url: string) =>
        new Promise<unknown>((resolve, reject) => {
          httpCalls.calls.push({ url, answered: false, resolve, reject })
        }),
    }),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Button: (props: Record<string, unknown>) =>
    createElement('button', { ...props, type: 'button' } as never),
}))

// The paginator is not under test — one Next control drives the real
// `onPageChange`, and the page number it is showing stays readable.
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

vi.mock('@molecule/app-file-dropzone-react', () => ({
  FileDropzone: (props: { onFiles: (files: File[]) => void; disabled?: boolean }) =>
    createElement(
      'button',
      {
        type: 'button',
        'aria-label': 'drop-files',
        disabled: props.disabled,
        // Two files in ONE selection: the first uploads, the second is the
        // failure the fix has to recover from.
        onClick: () =>
          props.onFiles([
            new File(['a'], 'a.txt', { type: 'text/plain' }),
            new File(['b'], 'b.txt', { type: 'text/plain' }),
          ]),
      },
      'drop',
    ),
}))

vi.mock('@molecule/app-notification-badge-react', () => ({
  NotificationWrapper: (props: { count: number; children: ReactNode }) =>
    createElement('div', { 'data-count': String(props.count) }, props.children),
}))

vi.mock('@molecule/app-notification-center-react', () => ({
  // Render each row's read state: "the badge says 0 while the rows still render
  // unread" is exactly the disagreement under test.
  NotificationCenter: (props: { items: Array<{ id: string; title: string; read: boolean }> }) =>
    createElement(
      'ul',
      null,
      props.items.map((i) =>
        createElement('li', { key: i.id, 'data-read': String(i.read) }, i.title),
      ),
    ),
}))

vi.mock('@molecule/app-message-bubble-react', () => ({
  MessageBubble: (props: { message: { id: string; body: string } }) =>
    createElement('li', { key: props.message.id }, props.message.body),
}))

vi.mock('@molecule/app-typing-indicator-react', () => ({
  TypingIndicator: () => createElement('span', null, 'typing'),
}))

let httpClient: { get: (url: string) => Promise<unknown> } | null = null

// ---------------------------------------------------------------------------
// The components under test — the SHIPPED files
// ---------------------------------------------------------------------------

const { EnablePushButton } =
  (await import('../../../templates/.agents/skills/examples/notifications/web-push/app/components/EnablePushButton.js')) as {
    EnablePushButton: () => ReactNode
  }
const { AttachmentsPanel } =
  (await import('../../../templates/.agents/skills/examples/uploads/file-attachments/app/components/AttachmentsPanel.js')) as {
    AttachmentsPanel: (props: { parentId: string }) => ReactNode
  }
const { default: UsersPage } =
  (await import('../../../templates/.agents/skills/examples/data-display/paginated-user-list/app/pages/UsersPage.js')) as {
    default: () => ReactNode
  }
const { NotificationBellWidget } =
  (await import('../../../templates/.agents/skills/examples/notifications/in-app-notifications/app/components/NotificationBell.js')) as {
    NotificationBellWidget: (props: { userId: string }) => ReactNode
  }
const { ChatPage } =
  (await import('../../../templates/.agents/skills/examples/messaging/in-app-chat/app/pages/ChatPage.js')) as {
    ChatPage: (props: { channelId: string }) => ReactNode
  }

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// jsdom implements no layout, so the chat page's auto-scroll effect would call a
// `scrollTo` its elements do not have.
Element.prototype.scrollTo = (): void => {
  /* no layout to scroll in jsdom */
}

const originalFetch = globalThis.fetch
const originalEventSource = (globalThis as { EventSource?: unknown }).EventSource

class MockEventSource {
  static instances: MockEventSource[] = []

  private readonly listeners = new Map<string, Array<(event: { data: string }) => void>>()

  constructor(url: string) {
    eventSources.urls.push(url)
    MockEventSource.instances.push(this)
  }

  addEventListener(type: string, listener: (event: { data: string }) => void): void {
    const forType = this.listeners.get(type) ?? []
    forType.push(listener)
    this.listeners.set(type, forType)
  }

  close(): void {}

  emit(type: string, data?: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ data: JSON.stringify(data) })
    }
  }
}

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

/** Re-render the mounted tree — how a prop change (e.g. a new chat channel) arrives. */
async function rerender(element: ReactNode): Promise<void> {
  await act(async () => {
    root.render(element)
  })
  await flush()
}

async function clickByLabel(label: string): Promise<void> {
  const el = container.querySelector(`[aria-label="${label}"]`)
  if (!el) throw new Error(`no control labelled ${label}`)
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await flush()
}

/** Type into the composer the way a user does (native setter + input event). */
async function typeIntoInput(value: string): Promise<void> {
  const input = container.querySelector('input') as HTMLInputElement | null
  if (!input) throw new Error('no input rendered')
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await flush()
}

/** Submit the page's form — the real onSubmit path. */
async function submitForm(): Promise<void> {
  const form = container.querySelector('form')
  if (!form) throw new Error('no form rendered')
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  await flush()
}

const text = (): string => container.textContent ?? ''

/** Answer the oldest unanswered fetch whose URL contains `fragment`. */
async function respond(fragment: string, status: number, body: unknown): Promise<void> {
  const call = fetches.calls.find((c) => !c.answered && c.url.includes(fragment))
  if (!call) throw new Error(`no pending fetch for ${fragment}`)
  call.answered = true
  await act(async () => {
    call.respond(status, body)
  })
  await flush()
}

const fetchCount = (fragment: string): number =>
  fetches.calls.filter((c) => c.url.includes(fragment)).length

/** Deliver a server-sent event to every open subscription. */
async function emitSse(type: string, data?: unknown): Promise<void> {
  await act(async () => {
    for (const source of MockEventSource.instances) source.emit(type, data)
  })
  await flush()
}

// ---------------------------------------------------------------------------
// Push-permission stubs
// ---------------------------------------------------------------------------

const push = vi.hoisted(() => ({
  permission: 'default' as string,
  /** The browser's existing subscription, as `getSubscription()` returns it. */
  subscription: null as null | { toJSON: () => unknown },
}))

function stubPushApis(subscription: { toJSON: () => unknown } | null): void {
  push.subscription = subscription
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      register: async () => ({
        pushManager: { getSubscription: async () => push.subscription },
      }),
    },
  })
  Object.defineProperty(window, 'PushManager', { configurable: true, value: function Push() {} })
  Object.defineProperty(window, 'Notification', {
    configurable: true,
    value: {
      get permission() {
        return push.permission
      },
      requestPermission: async () => push.permission,
    },
  })
}

beforeEach(() => {
  fetches.calls.length = 0
  httpCalls.calls.length = 0
  eventSources.urls.length = 0
  MockEventSource.instances.length = 0
  httpClient = null
  push.permission = 'default'
  push.subscription = null
  globalThis.fetch = ((input: unknown, init?: { method?: string }) =>
    new Promise((resolve, reject) => {
      fetches.calls.push({
        url: String(input),
        method: init?.method ?? 'GET',
        answered: false,
        respond: (status, body) =>
          resolve({
            ok: status >= 200 && status < 300,
            status,
            json: async () => body,
          }),
        fail: reject,
      })
    })) as typeof globalThis.fetch
  ;(globalThis as { EventSource?: unknown }).EventSource = MockEventSource
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

describe('web-push — "enabled" is a stored subscription, never a permission flag', () => {
  it('reconciles an existing browser subscription with the server on mount', async () => {
    // Permission granted and the browser HAS a subscription: the only way to
    // know push can be delivered is to ask the server, which this re-posts (the
    // endpoint dedupes by endpoint). Before the fix the mount never spoke to
    // the server at all.
    push.permission = 'granted'
    stubPushApis({
      toJSON: () => ({ endpoint: 'https://push.test/1', keys: { auth: 'a', p256dh: 'p' } }),
    })

    await mount(createElement(EnablePushButton, {}))
    expect(fetchCount('/api/push/subscribe')).toBe(1)
    await respond('/api/push/subscribe', 200, { ok: true })

    expect(text()).toContain('Push notifications enabled')
  })

  it('does not claim enabled when the server did not store the subscription', async () => {
    // The state the old check got wrong: the browser has a subscription (this
    // user clicked Enable and the browser half succeeded) but the POST that
    // stores it failed — 401 expired session, 500, or the row was purged. The
    // old code showed "Push notifications enabled" on the next mount with the
    // Enable control gone, so nothing was ever delivered and there was no way
    // to retry.
    push.permission = 'granted'
    stubPushApis({ toJSON: () => ({ endpoint: 'https://push.test/1' }) })

    await mount(createElement(EnablePushButton, {}))
    await respond('/api/push/subscribe', 500, { error: 'boom' })

    expect(text()).not.toContain('Push notifications enabled')
    // The retry path is on screen (the Enable control carries no aria-label —
    // its text is the label).
    expect(container.querySelector('button')?.textContent).toContain('Enable notifications')
  })

  it('offers Enable when permission is granted but the browser holds no subscription', async () => {
    // Expired/cleared subscription with permission still granted: nothing can be
    // delivered, so "enabled" was wrong — and the button is how the user gets a
    // new subscription.
    push.permission = 'granted'
    stubPushApis(null)

    await mount(createElement(EnablePushButton, {}))

    expect(text()).not.toContain('Push notifications enabled')
    expect(container.querySelector('button')?.textContent).toContain('Enable notifications')
    // Nothing to reconcile with the server: no subscription to post.
    expect(fetchCount('/api/push/subscribe')).toBe(0)
  })
})

describe('file-attachments — a partly-failed upload still refreshes the list', () => {
  it('shows the files that DID land, alongside the error for the one that did not', async () => {
    await mount(createElement(AttachmentsPanel, { parentId: 'o1' }))
    await respond('/api/attachments?parent_id=o1', 200, [])

    // Two files, one selection: the first uploads, the second is rejected.
    await clickByLabel('drop-files')
    await respond('/api/attachments?parent_id=o1', 201, { ok: true })
    await respond('/api/attachments?parent_id=o1', 500, { error: 'File too large' })

    // The failure is reported…
    expect(text()).toContain('File too large')
    // …AND the list re-read: a.txt is stored server-side and the panel must not
    // hide it until an unrelated reload.
    expect(fetchCount('/api/attachments?parent_id=o1')).toBe(4) // load + 2 uploads + refresh
  })

  it('renders the row the post-failure refresh returns', async () => {
    await mount(createElement(AttachmentsPanel, { parentId: 'o1' }))
    await respond('/api/attachments?parent_id=o1', 200, [])

    await clickByLabel('drop-files')
    await respond('/api/attachments?parent_id=o1', 201, { ok: true })
    await respond('/api/attachments?parent_id=o1', 500, { error: 'File too large' })

    const refresh = fetches.calls.at(-1)
    expect(refresh?.method).toBe('GET')
    await respond('/api/attachments?parent_id=o1', 200, [
      { id: 'f1', filename: 'a.txt', mimetype: 'text/plain', size: 1, created_at: 't' },
    ])

    expect(text()).toContain('a.txt')
    expect(text()).toContain('File too large')
  })
})

describe('paginated-user-list — a failed page change leaves no stale page behind', () => {
  it('shows the error with no rows from the page the user left', async () => {
    await mount(createElement(UsersPage, {}))
    await act(async () => {
      httpCalls.calls[0]?.resolve({
        data: {
          data: [{ id: 'a', name: 'page-1 user a', email: 'a@test.dev', created_at: 't' }],
          total: 60,
          page: 1,
          limit: 20,
        },
      })
    })
    await flush()
    expect(container.querySelectorAll('li')).toHaveLength(1)

    // Next page: the request fails.
    await clickByLabel('Next page')
    await act(async () => {
      httpCalls.calls[1]?.reject(new Error('HTTP 500'))
    })
    await flush()

    expect(text()).toContain('Could not load users')
    // Page 1's row must not stand in for page 2, and the paginator must not
    // claim a page whose rows are not there.
    expect(container.querySelectorAll('li')).toHaveLength(0)
    expect(container.querySelector('[data-page]')).toBeNull()
  })
})

describe('in-app-notifications — the all-read frame updates the rows too', () => {
  const page = [
    {
      id: 'n-1',
      type: 'comment',
      actor_name: 'Alice',
      subject_title: 'First',
      created_at: 't',
      read_at: null,
    },
    {
      id: 'n-2',
      type: 'comment',
      actor_name: 'Bob',
      subject_title: 'Second',
      created_at: 't',
      read_at: null,
    },
  ]

  it('marks every loaded row read, not just the badge', async () => {
    await mount(createElement(NotificationBellWidget, { userId: 'u-1' }))
    await respond('/api/notifications', 200, { items: page, unread: 2 })
    await clickByLabel('Notifications (2 unread)')

    const readFlags = (): string[] =>
      Array.from(container.querySelectorAll('li')).map((li) => li.getAttribute('data-read') ?? '')
    expect(readFlags()).toEqual(['false', 'false'])

    // Mark-all-read in ANOTHER tab of the same user: the handler broadcasts the
    // frame to this user's room, so this bell receives it. It used to zero the
    // badge only, leaving the panel rendering two unread rows under a badge
    // reading zero — a state nothing resynced until a reload.
    await emitSse('notification:all-read', {})

    expect(container.querySelector('[data-count]')?.getAttribute('data-count')).toBe('0')
    expect(readFlags()).toEqual(['true', 'true'])
  })
})

describe('in-app-chat — a send is one message, and it clears only what it sent', () => {
  it('a double submit while the POST is in flight sends once', async () => {
    await mount(createElement(ChatPage, { channelId: 'general' }))
    await respond('/api/messages?channel_id=general', 200, [])

    await typeIntoInput('hello')
    await submitForm()
    // The first POST is parked; a second Enter must not send it again (the
    // endpoint has no idempotency key to collapse the duplicate).
    await submitForm()
    await submitForm()

    const posts = fetches.calls.filter((c) => c.url === '/api/messages')
    expect(posts).toHaveLength(1)
    // The composer is disabled while the send is in flight.
    expect((container.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(
      true,
    )

    await respond('/api/messages', 200, { ok: true })
    expect((container.querySelector('input') as HTMLInputElement).value).toBe('')
  })

  it('keeps text typed while the POST is in flight', async () => {
    await mount(createElement(ChatPage, { channelId: 'general' }))
    await respond('/api/messages?channel_id=general', 200, [])

    await typeIntoInput('first post')
    await submitForm()
    // Same room, so the room guard cannot help: the user kept typing while the
    // accepted message was in flight, and the success response used to wipe it.
    await typeIntoInput('first post and more')

    await respond('/api/messages', 200, { ok: true })

    expect((container.querySelector('input') as HTMLInputElement).value).toBe('first post and more')
  })

  it('a send abandoned by a channel switch does not unfreeze the new room’s send', async () => {
    await mount(createElement(ChatPage, { channelId: 'general' }))
    await respond('/api/messages?channel_id=general', 200, [])

    // A send parked in the room the user is about to leave.
    await typeIntoInput('sent from general')
    await submitForm()
    expect(fetches.calls.filter((c) => c.url === '/api/messages')).toHaveLength(1)

    // The user switches rooms while it is in flight. The flag is released for
    // the room being entered (the composer must not stay disabled awaiting a
    // request that belongs to another room), and the new room's own send parks.
    await rerender(createElement(ChatPage, { channelId: 'random' }))
    await respond('/api/messages?channel_id=random', 200, [])
    await typeIntoInput('sent from random')
    await submitForm()
    expect(fetches.calls.filter((c) => c.url === '/api/messages')).toHaveLength(2)

    // The room we LEFT answers now. It no longer owns the in-flight flag, so it
    // must not release it: the composer still has the new room's POST parked,
    // and an early release lets a double Enter post the same message twice.
    await respond('/api/messages', 200, { ok: true })
    expect(
      (container.querySelector('button[type="submit"]') as HTMLButtonElement).disabled,
      'an abandoned send must not unfreeze the composer for the new room’s in-flight send',
    ).toBe(true)

    await submitForm()
    expect(fetches.calls.filter((c) => c.url === '/api/messages')).toHaveLength(2)

    // The new room's own send still releases the flag when it resolves.
    await respond('/api/messages', 200, { ok: true })
    expect((container.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(
      false,
    )
  })
})
