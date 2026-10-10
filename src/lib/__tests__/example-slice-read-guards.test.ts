// @vitest-environment jsdom
/**
 * Four example slices made a request and then trusted its answer. Each guard
 * below is the fix; each test fails without it.
 *
 * - `markdown-blog`'s `BlogIndexPage` did `fetch('/api/posts').then(r =>
 *   r.json()).then(setPosts)` with no `res.ok` check. A 401/500 still carries a
 *   JSON body (`{ error }`), which `r.json()` resolves happily — so neither the
 *   `.catch` nor `loadFailed` ran, the error OBJECT became `posts`, and the next
 *   render's `posts.map` threw. The sibling slices (`in-app-chat`,
 *   `in-app-notifications`) already coerce the body; this one did not.
 * - `in-app-notifications`' `NotificationBellWidget` subscribed with
 *   `new EventSource('/api/realtime/user:<id>')` — a trailing PATH SEGMENT. The
 *   SSE provider streams its configured path and parses rooms from `?room=`
 *   only (`molecule/packages/api/bonds/realtime/sse/src/provider.ts`,
 *   `handleRequest` + `parseRequestedRooms`), so that URL matched no stream and
 *   named no room: the bell silently received nothing, ever.
 * - `web-push`'s `EnablePushButton` never checked the subscribe POST's `res.ok`.
 *   `fetch` rejects only on a network failure, so an HTTP error (expired
 *   session, 500) fell through to the success state — telling the user push was
 *   enabled after the server stored no subscription.
 * - `full-text-search`'s `SearchPage` wrote whatever response arrived last into
 *   `hits`, so a slow response for an earlier query overwrote a newer query's
 *   results, and a non-array `hits` reached `hits.map`.
 * - `comment-threads` / `emoji-reactions` refetch on a `resourceId` change with
 *   no supersede guard, so a late response rendered the previous resource's
 *   comments/reactions under the new one — the same race the six sibling slices
 *   guard.
 * - `account-deletion`, `settings-page`, `onboarding-tour` and `referrals` all
 *   read `GET /api/me` (or `/referrals/code`) through `.then(r => r.json())`
 *   with no `res.ok` check, so an HTTP failure (401 signed out, 500) resolved
 *   with a JSON `{ error }` body and was treated as SUCCESS: the delete form sat
 *   disabled and unexplained, the settings form rendered empty, the onboarding
 *   tour was offered to a signed-out visitor, and the invite link said
 *   "Loading…" forever. Each comment at those sites names the failure it means
 *   to surface; the guard below is what makes the comment true.
 *
 * Everything is the shipped component: only the UI primitives, the ClassMap and
 * the network are stubbed, and responses are resolved by hand and out of order.
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface FetchRequest {
  url: string
  answered: boolean
  respond: (status: number, body: unknown) => void
}

const fetches = vi.hoisted(() => ({ requests: [] as FetchRequest[] }))

interface HttpCall {
  method: 'get' | 'post' | 'delete'
  url: string
  answered: boolean
  respond: (body: unknown) => void
}

const http = vi.hoisted(() => ({ calls: [] as HttpCall[] }))

/** URLs every mocked EventSource was constructed with, in order. */
const eventSources = vi.hoisted(() => ({ urls: [] as string[] }))

vi.mock('@molecule/app-ui', () => ({
  // Every ClassMap helper collapses to `undefined`, which React accepts for both
  // `className` and `style` (a string would be rejected as a `style` value).
  getClassMap: () => new Proxy({}, { get: () => () => undefined }),
}))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>, options?: { defaultValue?: string }) =>
      (options?.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_m, name: string) =>
        String(values?.[name] ?? ''),
      ),
  }),
  // A stable client, like the real `useHttpClient()` — a fresh object per render
  // would re-run every effect keyed on it.
  useHttpClient: () =>
    (httpClient ??= {
      get: (url: string) => httpRequest('get', url),
      post: (url: string, _body?: unknown) => httpRequest('post', url),
      delete: (url: string) => httpRequest('delete', url),
    }),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Button: (props: Record<string, unknown>) =>
    createElement('button', { ...props, type: 'button' } as never),
}))

vi.mock('@molecule/app-notification-badge-react', () => ({
  NotificationWrapper: (props: { children: ReactNode }) =>
    createElement('div', null, props.children),
}))

vi.mock('@molecule/app-notification-center-react', () => ({
  NotificationCenter: (props: { items: Array<{ id: string; title: string }> }) =>
    createElement(
      'ul',
      null,
      props.items.map((i) => createElement('li', { key: i.id }, i.title)),
    ),
}))

// The search box is not what is under test — three controls drive its real
// `onChange`/`onSearch` props so a test can pick the query and its timing.
vi.mock('@molecule/app-search-autocomplete-react', () => ({
  SearchAutocomplete: (props: {
    value: string
    onChange: (q: string) => void
    onSearch: (q: string) => unknown
  }) =>
    createElement(
      'div',
      null,
      createElement('span', null, props.value),
      createElement(
        'button',
        { type: 'button', 'aria-label': 'set-query-cat', onClick: () => props.onChange('cat') },
        'type',
      ),
      createElement(
        'button',
        { type: 'button', 'aria-label': 'search-ca', onClick: () => void props.onSearch('ca') },
        'search ca',
      ),
      createElement(
        'button',
        { type: 'button', 'aria-label': 'search-cat', onClick: () => void props.onSearch('cat') },
        'search cat',
      ),
    ),
}))

// Render the thread tree's bodies so an assertion can tell WHICH resource's
// comments are on screen.
vi.mock('@molecule/app-feature-thread-tree-react', () => ({
  ThreadTree: (props: { comments: Array<{ id: string; body: string }> }) =>
    createElement(
      'ul',
      null,
      props.comments.map((c) => createElement('li', { key: c.id }, c.body)),
    ),
}))

// `unwrapList` normalizes the pagination envelope the handlers return.
vi.mock('@molecule/app-http', () => ({
  unwrapList: (res: unknown) =>
    Array.isArray((res as { data?: unknown })?.data) ? (res as { data: unknown[] }).data : [],
}))

// One toggle control per chip, so a test can drive the real `onToggle`.
vi.mock('@molecule/app-emoji-reactions-react', () => ({
  EmojiReactions: (props: {
    reactions: Array<{ emoji: string; count: number }>
    onToggle: (emoji: string) => void
  }) =>
    createElement(
      'div',
      null,
      createElement('span', null, props.reactions.map((r) => `${r.emoji}:${r.count}`).join(',')),
      props.reactions.map((r) =>
        createElement(
          'button',
          {
            key: r.emoji,
            type: 'button',
            'aria-label': `toggle-${r.emoji}`,
            onClick: () => props.onToggle(r.emoji),
          },
          r.emoji,
        ),
      ),
    ),
}))

let httpClient: {
  get: (url: string) => Promise<unknown>
  post: (url: string, body?: unknown) => Promise<unknown>
  delete: (url: string) => Promise<unknown>
} | null = null

function httpRequest(method: 'get' | 'post' | 'delete', url: string): Promise<unknown> {
  return new Promise((resolve) => {
    http.calls.push({ method, url, answered: false, respond: (body) => resolve(body) })
  })
}

const { BlogIndexPage } =
  (await import('../../../templates/.agents/skills/examples/content/markdown-blog/app/pages/BlogIndexPage')) as {
    BlogIndexPage: (props: object) => ReactNode
  }
const { NotificationBellWidget } =
  (await import('../../../templates/.agents/skills/examples/notifications/in-app-notifications/app/components/NotificationBell')) as {
    NotificationBellWidget: (props: { userId: string }) => ReactNode
  }
const { EnablePushButton } =
  (await import('../../../templates/.agents/skills/examples/notifications/web-push/app/components/EnablePushButton')) as {
    EnablePushButton: (props: object) => ReactNode
  }
const { SearchPage } =
  (await import('../../../templates/.agents/skills/examples/search/full-text-search/app/pages/SearchPage')) as {
    SearchPage: (props: { index: string }) => ReactNode
  }
const { CommentThread } =
  (await import('../../../templates/.agents/skills/examples/messaging/comment-threads/app/components/CommentThread')) as {
    CommentThread: (props: { resourceType: string; resourceId: string }) => ReactNode
  }
const { ReactionBar } =
  (await import('../../../templates/.agents/skills/examples/messaging/emoji-reactions/app/components/ReactionBar')) as {
    ReactionBar: (props: { resourceType: string; resourceId: string }) => ReactNode
  }
const { DeleteAccountPage } =
  (await import('../../../templates/.agents/skills/examples/auth/account-deletion/app/pages/DeleteAccountPage')) as {
    DeleteAccountPage: (props: object) => ReactNode
  }
const { SettingsPage } =
  (await import('../../../templates/.agents/skills/examples/forms/settings-page/app/pages/SettingsPage')) as {
    SettingsPage: (props: object) => ReactNode
  }
const { ProductTour } =
  (await import('../../../templates/.agents/skills/examples/forms/onboarding-tour/app/components/ProductTour')) as {
    ProductTour: (props: object) => ReactNode
  }
const { InviteLink } =
  (await import('../../../templates/.agents/skills/examples/commerce/referrals/app/components/InviteLink')) as {
    InviteLink: (props: object) => ReactNode
  }

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const originalFetch = globalThis.fetch
const originalEventSource = (globalThis as { EventSource?: unknown }).EventSource

class MockEventSource {
  static urls = eventSources.urls
  /** Every subscription this render made, so a test can deliver a server event. */
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

  /** Deliver `data` to every listener of `type`, in the shape the handler reads. */
  emit(type: string, data: unknown): void {
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

/** Answer the oldest unanswered request whose URL contains `fragment`. */
async function respond(fragment: string, status: number, body: unknown): Promise<void> {
  const request = fetches.requests.find((r) => !r.answered && r.url.includes(fragment))
  if (!request) throw new Error(`no pending request for ${fragment}`)
  request.answered = true
  await act(async () => {
    request.respond(status, body)
  })
  await flush()
}

/** Answer the oldest unanswered http-client call whose url contains `fragment`. */
async function respondHttp(fragment: string, body: unknown): Promise<void> {
  const call = http.calls.find((c) => !c.answered && c.url.includes(fragment))
  if (!call) throw new Error(`no pending http call for ${fragment}`)
  call.answered = true
  await act(async () => {
    call.respond(body)
  })
  await flush()
}

const text = (): string => container.textContent ?? ''

/** The rendered list rows (the mocks render each item as an `<li>`), in order. */
const rows = (): string[] =>
  Array.from(container.querySelectorAll('li')).map((li) => li.textContent ?? '')

/** Deliver a server-sent event to every open subscription. */
async function emitSse(type: string, data: unknown): Promise<void> {
  await act(async () => {
    for (const source of MockEventSource.instances) source.emit(type, data)
  })
  await flush()
}

beforeEach(() => {
  fetches.requests.length = 0
  http.calls.length = 0
  eventSources.urls.length = 0
  MockEventSource.instances.length = 0
  httpClient = null
  globalThis.fetch = ((input: unknown) =>
    new Promise((resolve) => {
      fetches.requests.push({
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

describe('example slices — a request’s answer is validated before it is trusted', () => {
  it('an error body from GET /api/posts is reported, never rendered as the list', async () => {
    await mount(createElement(BlogIndexPage, {}))

    // A 500 resolves `r.json()` with `{ error }` — no array. Before the guard it
    // became `posts` and the next render's `posts.map` threw.
    await respond('/api/posts', 500, { error: 'boom' })
    expect(text()).toContain('Could not load posts')
    expect(container.querySelectorAll('a')).toHaveLength(0)
  })

  it('renders the posts a successful GET /api/posts returns', async () => {
    await mount(createElement(BlogIndexPage, {}))
    await respond('/api/posts', 200, [
      { id: '1', slug: 'hello', title: 'Hello', excerpt: 'x', published_at: '2026-01-01' },
    ])
    expect(text()).toContain('Hello')
    expect(text()).not.toContain('Could not load posts')
  })

  it('subscribes the notification bell to its room through ?room=, not a path segment', async () => {
    await mount(createElement(NotificationBellWidget, { userId: 'u-7' }))

    // The SSE provider only streams its configured path and parses rooms from
    // ?room=/?rooms= — `/api/realtime/user:u-7` matched nothing and joined no
    // room, so the bell never received an event.
    expect(eventSources.urls).toEqual(['/api/realtime?room=user%3Au-7'])
  })

  it('does not report push as enabled when the subscribe POST was rejected', async () => {
    const subscribe = vi.fn(async () => ({ toJSON: () => ({ endpoint: 'https://push.test/1' }) }))
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register: async () => ({ pushManager: { subscribe } }) },
    })
    Object.defineProperty(window, 'PushManager', { configurable: true, value: function Push() {} })
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: { permission: 'default', requestPermission: async () => 'granted' },
    })

    await mount(createElement(EnablePushButton, {}))
    // The enable control carries no aria-label — it is the only button rendered.
    await act(async () => {
      container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()

    await respond('/api/push/public-key', 200, { publicKey: 'BEl62iUYgU' })
    // The server rejects the subscription (expired session / 500).
    await respond('/api/push/subscribe', 401, { error: 'unauthorized' })

    expect(text()).not.toContain('Push notifications enabled')
    expect(text()).toContain('Could not save the subscription')
  })

  it('keeps a slow response for an older query from replacing a newer query’s hits', async () => {
    await mount(createElement(SearchPage, { index: 'products' }))

    await clickByLabel('set-query-cat')
    await clickByLabel('search-ca') // slower, older query
    await clickByLabel('search-cat') // newer query

    await respond('q=cat', 200, { hits: [{ id: 'c', title: 'cat hit' }] })
    expect(text()).toContain('cat hit')

    // The superseded "ca" response lands last and must be dropped: the input
    // (and the "No matches for cat" line) say "cat".
    await respond('q=ca', 200, { hits: [{ id: 'x', title: 'ca hit' }] })
    expect(text()).toContain('cat hit')
    expect(text()).not.toContain('ca hit')
  })

  it('drops a superseded comments response when the resource changes', async () => {
    await mount(createElement(CommentThread, { resourceType: 'posts', resourceId: 'a' }))
    await rerender(createElement(CommentThread, { resourceType: 'posts', resourceId: 'b' }))

    await respondHttp('/posts/b/comments', {
      data: [{ id: 'b1', userId: 'u', parentId: null, body: 'B comment', createdAt: 'x' }],
    })
    expect(text()).toContain('B comment')

    // Post A's slower response must not render under post B.
    await respondHttp('/posts/a/comments', {
      data: [{ id: 'a1', userId: 'u', parentId: null, body: 'A comment', createdAt: 'x' }],
    })
    expect(text()).toContain('B comment')
    expect(text()).not.toContain('A comment')
  })

  it('drops a superseded reaction summary when the resource changes', async () => {
    await mount(createElement(ReactionBar, { resourceType: 'posts', resourceId: 'a' }))
    await rerender(createElement(ReactionBar, { resourceType: 'posts', resourceId: 'b' }))

    await respondHttp('/posts/b/reactions', {
      data: { total: 1, counts: { '👍': 1 }, userReactions: [] },
    })
    expect(text()).toContain('👍:1')

    await respondHttp('/posts/a/reactions', {
      data: { total: 9, counts: { '🎉': 9 }, userReactions: [] },
    })
    expect(text()).toContain('👍:1')
    expect(text()).not.toContain('🎉:9')
  })

  it('explains a failed account load instead of showing an unexplained disabled form', async () => {
    await mount(createElement(DeleteAccountPage, {}))

    // Signed out: GET /api/me answers 401 with `{ error }`. `r.json()` resolves,
    // so without the `res.ok` guard neither the email nor the error was set and
    // the form sat there disabled with no reason given.
    await respond('/api/me', 401, { error: 'Authentication required' })
    expect(text()).toContain('Could not load your account')
  })

  it('keeps the settings form from adopting an error body as the profile', async () => {
    await mount(createElement(SettingsPage, {}))

    // The 401 body is not a Profile: before the guard it BECAME the profile, the
    // form rendered with empty fields, and the failure was never surfaced.
    await respond('/api/me', 401, { error: 'Authentication required' })
    expect(text()).toContain('Could not load your profile')
    expect(container.querySelectorAll('input')).toHaveLength(0)
  })

  it('does not offer the onboarding tour when GET /api/me failed', async () => {
    // The tour renders nothing when its step's anchor is absent (it walks to the
    // next step, then finishes itself), so WITHOUT this anchor the assertion
    // below would hold no matter what the effect decided. Anchoring step 0 makes
    // the render depend on `active` alone.
    const anchor = document.createElement('div')
    anchor.setAttribute('data-tour', 'nav-search')
    document.body.appendChild(anchor)

    try {
      await mount(createElement(ProductTour, {}))

      // A 401 body carries no `tour_completed_at`, so the tour used to open for a
      // signed-out visitor; a failed read must read as "already completed".
      await respond('/api/me', 401, { error: 'Authentication required' })
      expect(container.querySelector('[role="dialog"]')).toBeNull()
    } finally {
      anchor.remove()
    }
  })

  it('still offers the tour to a signed-in user who has not completed it', async () => {
    // The positive twin of the case above: it proves the anchor + harness CAN
    // produce the dialog, so that assertion is not vacuous.
    const anchor = document.createElement('div')
    anchor.setAttribute('data-tour', 'nav-search')
    document.body.appendChild(anchor)

    try {
      await mount(createElement(ProductTour, {}))
      await respond('/api/me', 200, { id: 'u1', tour_completed_at: null })
      expect(container.querySelector('[role="dialog"]')).not.toBeNull()
    } finally {
      anchor.remove()
    }
  })

  it('stops claiming to load the invite link once the code request failed', async () => {
    await mount(createElement(InviteLink, {}))

    // A 500 body carries no `code`, so the component used to render
    // "Loading your invite link…" forever.
    await respond('/api/referrals/code', 500, { error: 'boom' })
    expect(text()).toContain('Could not load your invite link')
    expect(text()).not.toContain('Loading your invite link')
  })
})

describe('example slices — a live feed does not grow a list without bound', () => {
  it('keeps the notification bell on one page while live events arrive', async () => {
    const page = Array.from({ length: 20 }, (_, i) => ({
      id: `n-${i + 1}`,
      type: 'comment',
      actor_name: 'Alice',
      subject_title: `Subject #${i + 1}`,
      created_at: '2026-01-01T00:00:00.000Z',
      read_at: null,
    }))

    await mount(createElement(NotificationBellWidget, { userId: 'u-7' }))
    // The server serves a PAGE (`?limit=`, default 20). A bell that prepends
    // every live event to it grows past the page for the life of the tab — 25
    // events on top of the loaded 20 rendered 45 rows.
    await respond('/api/notifications', 200, { items: page, unread: 20 })
    await clickByLabel('Notifications (20 unread)')
    expect(rows()).toHaveLength(20)

    for (let i = 21; i <= 45; i++) {
      await emitSse('notification:created', {
        id: `n-${i}`,
        type: 'comment',
        actor_name: 'Alice',
        subject_title: `Subject #${i}`,
        created_at: '2026-01-02T00:00:00.000Z',
        read_at: null,
      })
    }

    // Still one page, and it is the NEWEST one — what a reload would render.
    expect(rows()).toHaveLength(20)
    expect(rows()[0]).toContain('"Subject #45"')
    expect(rows().some((row) => row.includes('"Subject #1"'))).toBe(false)
    // The live feed still reached the badge and the list.
    expect(rows()[19]).toContain('"Subject #26"')
  })
})
