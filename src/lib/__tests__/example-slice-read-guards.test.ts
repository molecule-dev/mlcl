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

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const originalFetch = globalThis.fetch
const originalEventSource = (globalThis as { EventSource?: unknown }).EventSource

class MockEventSource {
  static urls = eventSources.urls
  constructor(url: string) {
    eventSources.urls.push(url)
  }
  addEventListener(): void {}
  close(): void {}
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

beforeEach(() => {
  fetches.requests.length = 0
  http.calls.length = 0
  eventSources.urls.length = 0
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
})
