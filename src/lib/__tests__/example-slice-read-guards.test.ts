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
 * - `two-factor-auth`'s enroll page and `csv-import`'s import page trusted a 2xx
 *   BODY as well as a 2xx status: an unmatched endpoint answers 200 with an
 *   empty object (the mock API server's `unmatchedFixtureResponse`), the empty
 *   object was installed as the enrollment / the preview, and the next render
 *   ran `enrollment.recoveryCodes.map(...)` / iterated `preview.invalid` — a
 *   white screen where a retryable error belongs. `res.ok` is a statement about
 *   the status, never about the shape. `profile-photo-upload` read no `avatar`
 *   out of the same empty body and reported nothing: the upload rendered no
 *   image and no error, so it looked like it had silently done nothing.
 * - `in-app-chat`'s `ChatPage` cleared its hide-typing TIMER on a room switch but
 *   never the flag that timer exists to clear, so the previous room's "peer is
 *   typing" indicator stayed on screen for the new room — for good, with the
 *   timer that would have cleared it already gone.
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
  /** The parsed request body, so a test can assert WHAT was sent. */
  body?: unknown
  answered: boolean
  respond: (status: number, body: unknown) => void
  /** Reject the request the way a failed network does. */
  fail: (error: Error) => void
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

// The dropzone is not what is under test — one button hands the page a File
// through the real `onFiles` prop.
vi.mock('@molecule/app-file-dropzone-react', () => ({
  FileDropzone: (props: { onFiles: (files: File[]) => void; disabled?: boolean }) =>
    createElement(
      'button',
      {
        type: 'button',
        'aria-label': 'drop-files',
        disabled: props.disabled,
        onClick: () => props.onFiles([new File(['x'], 'avatar.png', { type: 'image/png' })]),
      },
      'drop',
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

// Render each chat bubble's body as a row, so an assertion can COUNT the
// messages a room renders and tell which ones they are.
vi.mock('@molecule/app-message-bubble-react', () => ({
  MessageBubble: (props: { message: { id: string; body: string } }) =>
    createElement('li', { key: props.message.id }, props.message.body),
}))

vi.mock('@molecule/app-typing-indicator-react', () => ({
  TypingIndicator: () => createElement('span', null, 'typing'),
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
const { ChatPage } =
  (await import('../../../templates/.agents/skills/examples/messaging/in-app-chat/app/pages/ChatPage')) as {
    ChatPage: (props: { channelId: string }) => ReactNode
  }
const { EnableTwoFactorPage } =
  (await import('../../../templates/.agents/skills/examples/auth/two-factor-auth/app/pages/EnableTwoFactorPage')) as {
    EnableTwoFactorPage: (props: object) => ReactNode
  }
const { ImportPage } =
  (await import('../../../templates/.agents/skills/examples/data-display/csv-import/app/pages/ImportPage')) as {
    ImportPage: (props: object) => ReactNode
  }
const { ProfilePhotoPage } =
  (await import('../../../templates/.agents/skills/examples/uploads/profile-photo-upload/app/pages/ProfilePhotoPage')) as {
    ProfilePhotoPage: (props: object) => ReactNode
  }

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// jsdom implements no layout, so the scroll APIs the examples call do not
// exist on its elements — the chat page's auto-scroll effect calls
// `scrollTo` on every message it renders.
Element.prototype.scrollTo = (): void => {
  /* no layout to scroll in jsdom */
}

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

/** Reject the oldest unanswered request the way a failed network does. */
async function rejectPending(fragment: string): Promise<void> {
  const request = fetches.requests.find((r) => !r.answered && r.url.includes(fragment))
  if (!request) throw new Error(`no pending request to reject for ${fragment}`)
  request.answered = true
  await act(async () => {
    request.fail(new Error('network down'))
  })
  await flush()
}

/** Type into a text/numeric input the way a user does (native setter + input event). */
async function typeIntoInput(selector: string, value: string): Promise<void> {
  const input = container.querySelector(selector) as HTMLInputElement | null
  if (!input) throw new Error(`no input matching ${selector}`)
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await flush()
}

/** Submit the page's one form (the real onSubmit path). */
async function submitOnlyForm(): Promise<void> {
  const form = container.querySelector('form')
  if (!form) throw new Error('the page rendered no form')
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
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

/** Parse a captured request body, or null when it carried none / invalid JSON. */
function safeJson(raw: unknown): unknown {
  if (typeof raw !== 'string') return null
  try {
    return JSON.parse(raw) as unknown
  } catch (_error) {
    // A body this suite did not write as JSON (a raw string, an empty init) is
    // "no parseable body" — exactly what the null return means to callers.
    return null
  }
}

/** Type into the chat composer the way a user does (native setter + input event). */
async function typeDraft(value: string): Promise<void> {
  const input = container.querySelector('input')
  if (!input) throw new Error('the chat page rendered no composer')
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await flush()
}

/** Submit the chat composer's form (the real onSubmit path). */
async function submitDraft(): Promise<void> {
  const form = container.querySelector('form')
  if (!form) throw new Error('the chat page rendered no composer form')
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  await flush()
}

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
  globalThis.fetch = ((input: unknown, init?: { body?: unknown }) =>
    new Promise((resolve, reject) => {
      fetches.requests.push({
        url: String(input),
        body: safeJson(init?.body),
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

describe('example slices — a request’s answer is validated before it is trusted', () => {
  it('an error body from GET /api/posts is reported, never rendered as the list', async () => {
    await mount(createElement(BlogIndexPage, {}))

    // A 500 resolves `r.json()` with `{ error }` — no array. Before the guard it
    // became `posts` and the next render's `posts.map` threw.
    await respond('/api/posts', 500, { error: 'boom' })
    expect(text()).toContain('Could not load posts')
    expect(container.querySelectorAll('a')).toHaveLength(0)
  })

  it('reports a 2xx body that is not the list instead of rendering an empty blog', async () => {
    await mount(createElement(BlogIndexPage, {}))

    // A 200 `{}` (an endpoint with no fixture, a rewritten answer) is not the
    // list. Coercing it to `[]` rendered an EMPTY blog — a silent "there are no
    // posts", which is exactly the state the `.catch` below exists to prevent.
    await respond('/api/posts', 200, {})

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
    // The tree's reply pages load per root before anything renders.
    await respondHttp('/comments/b1/replies', { data: [] })
    expect(text()).toContain('B comment')

    // Post A's slower response must not render under post B. It is dropped at
    // the ticket — before its per-root reply page would ever load.
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

  it('explains a 2xx body that carries no email instead of leaving the form disabled', async () => {
    // `res.ok` says the route ANSWERED, not that the body is this user's row. A
    // 200 `{}` (an endpoint with no fixture, a proxy rewrite) set no email and
    // no failure, so the form sat disabled with nothing to explain why — the
    // state the `res.ok` guard exists to prevent.
    await mount(createElement(DeleteAccountPage, {}))
    await respond('/api/me', 200, {})

    expect(text()).toContain('Could not load your account')
    const button = container.querySelector(
      '[data-mol-id="delete-account-submit"]',
    ) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('a REJECTED delete frees the form — never a button disabled forever', async () => {
    // submit()'s finally promises the busy state clears on EVERY path; no
    // fetch double could reject, so deleting the catch and the finally kept
    // every test green over a delete button locked by the first failure.
    await mount(createElement(DeleteAccountPage, {}))
    await respond('/api/me', 200, { email: 'ada@calc.dev' })

    await typeIntoInput('[data-mol-id="delete-account-confirm-email"]', 'ada@calc.dev')
    await submitOnlyForm()
    await rejectPending('/api/me')

    expect(text()).toContain('Could not delete your account')
    const button = container.querySelector(
      '[data-mol-id="delete-account-submit"]',
    ) as HTMLButtonElement
    expect(button.disabled).toBe(false)
    expect(text()).not.toContain('Deleting…')
    // The account still exists and a retry goes back out.
    expect(text()).not.toContain('scheduled for deletion')
    await submitOnlyForm()
    expect(fetches.requests.filter((r) => r.url === '/api/me' && r.body !== null)).toHaveLength(2)
  })

  it('keeps the settings form from adopting an error body as the profile', async () => {
    await mount(createElement(SettingsPage, {}))

    // The 401 body is not a Profile: before the guard it BECAME the profile, the
    // form rendered with empty fields, and the failure was never surfaced.
    await respond('/api/me', 401, { error: 'Authentication required' })
    expect(text()).toContain('Could not load your profile')
    expect(container.querySelectorAll('input')).toHaveLength(0)
  })

  it('keeps the settings form from adopting a 2xx body that is not a profile', async () => {
    // The save path validates its own 2xx for exactly this reason; the LOAD
    // path installed whatever it got. A 200 `{}` became the draft, the form
    // rendered with empty fields and no error, and Save would then have PATCHed
    // those blank values over the real profile.
    await mount(createElement(SettingsPage, {}))
    await respond('/api/me', 200, {})

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

  it('stops claiming to load the invite link when a 2xx answer carries no code', async () => {
    await mount(createElement(InviteLink, {}))

    // An endpoint with no fixture answers 200 `{}`. `typeof body.code !==
    // 'string'` used to resolve to `setCode(null)` with NO failure flag — the
    // component kept rendering "Loading your invite link…" forever, with
    // nothing left in flight to ever change it.
    await respond('/api/referrals/code', 200, {})
    expect(text()).toContain('Could not load your invite link')
    expect(text()).not.toContain('Loading your invite link')
  })

  it('treats an EMPTY code as the same failure, not as a pending load', async () => {
    await mount(createElement(InviteLink, {}))

    // `typeof '' === 'string'` passed the guard above, and the render gate is
    // `if (!code)` — so an empty code was falsy, no failure flag was set, and
    // the component parked on "Loading your invite link…" forever: exactly the
    // outcome that guard's own comment promises it prevents. (The guard now
    // refuses a blank code too — `'   '` is just as unusable a link.)
    await respond('/api/referrals/code', 200, { code: '' })
    expect(text()).toContain('Could not load your invite link')
    expect(text()).not.toContain('Loading your invite link')
  })
})

describe('example slices — a 2xx body is validated before it becomes state', () => {
  /** Click the first button rendered — the enroll page labels its one by text. */
  async function clickOnlyButton(): Promise<void> {
    await act(async () => {
      container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
  }

  /** Click a control by its `data-mol-id` (the import page's own selector). */
  async function clickByMolId(id: string): Promise<void> {
    const el = container.querySelector(`[data-mol-id="${id}"]`)
    if (!el) throw new Error(`no control with data-mol-id ${id}`)
    await act(async () => {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
  }

  /** Hand the file input a File and fire the change event the page listens for. */
  async function chooseFile(contents: string, name: string): Promise<void> {
    const input = container.querySelector('input[type="file"]') as HTMLInputElement | null
    if (!input) throw new Error('the import page rendered no file input')
    Object.defineProperty(input, 'files', {
      value: [new File([contents], name, { type: 'text/csv' })],
      configurable: true,
    })
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await flush()
  }

  it('reports an enroll answer that carries no enrollment instead of crashing the page', async () => {
    await mount(createElement(EnableTwoFactorPage, {}))
    await clickOnlyButton()

    // An endpoint with no fixture answers 200 `{}`. Installed as the
    // enrollment it moved the page past the "Get started" step, and the next
    // render's `enrollment.recoveryCodes.map(...)` threw: a blank page instead
    // of an error the user can retry.
    await respond('/api/2fa/enroll', 200, {})
    expect(text()).toContain('Could not enroll')
    // Still on the "Get started" step — the page survived the bad body instead
    // of unmounting on the render below it.
    expect(text()).toContain('Get started')
  })

  it('renders the enrollment a real 200 carries (the positive twin)', async () => {
    await mount(createElement(EnableTwoFactorPage, {}))
    await clickOnlyButton()

    await respond('/api/2fa/enroll', 200, {
      secret: 'JBSWY3DPEHPK3PXP',
      keyUrl: 'otpauth://totp/App?secret=JBSWY3DPEHPK3PXP',
      QRImageUrl: 'data:image/png;base64,AAAA',
      recoveryCodes: ['recoveryCode-1', 'recoveryCode-2'],
    })
    // The secret + codes the page exists to show, so the guard above is not
    // satisfied by a page that renders nothing.
    expect(text()).toContain('JBSWY3DPEHPK3PXP')
    expect(text()).toContain('recoveryCode-1')
    expect(text()).not.toContain('Could not enroll')
  })

  it('completes a valid verify to the ENABLED terminus', async () => {
    // `setEnabled(true)` and the enabled screen were never rendered by any
    // test — coverage stopped at the error branches, so a dropped success
    // branch (2FA enrollment that never completes) kept every test green.
    await mount(createElement(EnableTwoFactorPage, {}))
    await clickOnlyButton()
    await respond('/api/2fa/enroll', 200, {
      secret: 'JBSWY3DPEHPK3PXP',
      QRImageUrl: '',
      recoveryCodes: ['recoveryCode-1'],
    })

    await typeIntoInput('input[inputmode="numeric"]', '123456')
    await submitOnlyForm()
    await respond('/api/2fa/verify', 200, { ok: true })

    expect(text()).toContain('Two-factor authentication enabled')
    expect(text()).toContain('saved your recovery codes')
  })

  it('a REJECTED verify leaves the form usable, never a dead verify button', async () => {
    // verify()'s comment promises the finally: "a rejected fetch must not
    // leave the button disabled forever". No fetch double could reject, so
    // deleting the catch and the finally kept every test green.
    await mount(createElement(EnableTwoFactorPage, {}))
    await clickOnlyButton()
    await respond('/api/2fa/enroll', 200, {
      secret: 'JBSWY3DPEHPK3PXP',
      QRImageUrl: '',
      recoveryCodes: ['recoveryCode-1'],
    })
    await typeIntoInput('input[inputmode="numeric"]', '123456')
    await submitOnlyForm()
    await rejectPending('/api/2fa/verify')

    expect(text()).toContain('Network error')
    const button = container.querySelector('form button[type="submit"]') as HTMLButtonElement
    expect(button.disabled).toBe(false)
    // A retry goes back out.
    await submitOnlyForm()
    expect(fetches.requests.filter((r) => r.url.includes('/api/2fa/verify'))).toHaveLength(2)
  })

  it('reports a preview answer that carries no preview instead of crashing the table', async () => {
    await mount(createElement(ImportPage, {}))
    await chooseFile('email,name\na@b.test,A\n', 'users.csv')

    // Same empty 200: `preview` became `{}`, the page flipped to "ready", and
    // the render's `for (const item of preview.invalid)` threw.
    await respond('/api/import/preview', 200, {})
    expect(text()).toContain('Could not read the file')
    expect(container.querySelector('table')).toBeNull()
  })

  it('renders the rows a real preview carries (the positive twin)', async () => {
    await mount(createElement(ImportPage, {}))
    await chooseFile('email,name\na@b.test,A\n', 'users.csv')

    await respond('/api/import/preview', 200, {
      totalRows: 1,
      previewRows: [{ email: 'a@b.test', name: 'A' }],
      valid: 1,
      invalid: [],
    })
    expect(text()).toContain('1 rows found')
    expect(text()).toContain('a@b.test')
    expect(text()).not.toContain('Could not read the file')
  })

  it('reports a commit answer with no counts instead of summarizing undefined', async () => {
    await mount(createElement(ImportPage, {}))
    await chooseFile('email,name\na@b.test,A\n', 'users.csv')
    await respond('/api/import/preview', 200, {
      totalRows: 1,
      previewRows: [{ email: 'a@b.test', name: 'A' }],
      valid: 1,
      invalid: [],
    })

    await clickByMolId('import-confirm')
    // The empty 200 would render "Imported undefined, updated undefined,
    // skipped undefined." as if the import had reported its counts.
    await respond('/api/import/commit', 200, {})
    expect(text()).toContain('Import failed')
    expect(text()).not.toContain('undefined')
  })

  it('reports an avatar upload whose 200 carries no URL instead of succeeding silently', async () => {
    await mount(createElement(ProfilePhotoPage, {}))
    await clickByLabel('drop-files')

    // The empty 200 was installed as the avatar: no <img> rendered AND no
    // error was set, so the user's upload had visibly done nothing at all.
    await respond('/api/upload/avatar', 200, {})
    expect(text()).toContain('Upload failed')
    expect(container.querySelector('img')).toBeNull()
  })

  it('renders the avatar a real upload carries (the positive twin)', async () => {
    await mount(createElement(ProfilePhotoPage, {}))
    await clickByLabel('drop-files')

    await respond('/api/upload/avatar', 200, { avatar: '/api/upload/avatar/abc' })
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/api/upload/avatar/abc')
    expect(text()).not.toContain('Upload failed')
  })

  it('keeps the settings form filled when the save answer carries no profile', async () => {
    await mount(createElement(SettingsPage, {}))
    await respond('/api/me', 200, {
      id: 'u1',
      name: 'Ada',
      email: 'ada@test.dev',
      timezone: 'UTC',
    })
    const nameInput = container.querySelector('form input') as HTMLInputElement
    expect(nameInput.value).toBe('Ada')

    // Edit, then save. The PATCH succeeds (2xx) but its body is `{}` — the
    // mock API server's unmatchedFixtureResponse shape.
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setter?.call(nameInput, 'Grace')
      nameInput.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await flush()
    await act(async () => {
      container
        .querySelector('form')
        ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await flush()

    await respond('/api/me', 200, {})
    // The empty body must not be installed as the profile: that blanked the
    // form the moment "Saved" appeared. The values the server accepted — the
    // ones the form already holds — stand in instead.
    expect(text()).toContain('Saved')
    expect((container.querySelector('form input') as HTMLInputElement).value).toBe('Grace')
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

  it('clears the previous room’s typing indicator when the channel changes', async () => {
    await mount(createElement(ChatPage, { channelId: 'general' }))
    await respond('/api/messages?channel_id=general', 200, [])

    await emitSse('typing', { userId: 'u-2' })
    expect(text()).toContain('typing')

    // A channel switch runs the effect's cleanup, which CLEARS the hide-typing
    // timer — but nothing reset the flag that timer exists to clear, so the
    // indicator stayed on screen for the new room with no timer left to turn it
    // off (it outlived the room that reported it, until another `typing` event
    // or an unmount).
    await rerender(createElement(ChatPage, { channelId: 'random' }))
    expect(eventSources.urls).toContain('/api/realtime?room=channel:random')
    expect(text()).not.toContain('typing')
  })

  it('sends a draft through the real composer: the POST carries the room, and success clears it', async () => {
    // `send()` was dead code to the suite: nothing submitted the composer, so
    // the room-scoping and draft-handling fixes rode untested.
    await mount(createElement(ChatPage, { channelId: 'general' }))
    await respond('/api/messages?channel_id=general', 200, [])

    await typeDraft('first post')
    await submitDraft()

    const post = fetches.requests.find((r) => r.url === '/api/messages' && !r.answered)
    expect(post, 'the submit must POST the message').toBeDefined()
    expect(post?.body).toEqual({ channel_id: 'general', content: 'first post' })
    await respond('/api/messages', 200, { ok: true })
    // The server accepted it: the draft is cleared.
    const input = container.querySelector('input')
    expect((input as HTMLInputElement | null)?.value).toBe('')
    expect(text()).not.toContain('Message not sent')
  })

  it('a rejected send keeps the draft and shows the retryable error', async () => {
    await mount(createElement(ChatPage, { channelId: 'general' }))
    await respond('/api/messages?channel_id=general', 200, [])

    await typeDraft('keep me')
    await submitDraft()
    await respond('/api/messages', 503, { error: 'down' })

    // The user's text survives a failed send — clearing it discarded the draft
    // silently — and the failure is surfaced as retryable.
    const input = container.querySelector('input')
    expect((input as HTMLInputElement | null)?.value).toBe('keep me')
    expect(text()).toContain('Message not sent')
  })

  it('a late send response belongs to the room it was sent FROM, not the room shown', async () => {
    await mount(createElement(ChatPage, { channelId: 'general' }))
    await respond('/api/messages?channel_id=general', 200, [])

    await typeDraft('for general')
    await submitDraft()
    // The POST is in flight; the user switches rooms and types a new draft.
    await rerender(createElement(ChatPage, { channelId: 'random' }))
    await respond('/api/messages?channel_id=random', 200, [])
    await typeDraft('for random')

    // The late SUCCESS resolves: without the room-scope check it cleared the
    // draft the user has since typed into room B's composer.
    await respond('/api/messages', 200, { ok: true })
    const input = container.querySelector('input')
    expect((input as HTMLInputElement | null)?.value).toBe('for random')
    expect(text()).not.toContain('Message not sent')
  })

  it('bounds the FIRST history page too — the window applies to the load, not just live events', async () => {
    await mount(createElement(ChatPage, { channelId: 'general' }))
    // A server answering more than the client's window must not grow the room
    // unbounded either: the wrap on the history load is the same
    // MAX_RENDERED_MESSAGES bound the live feed already had covered.
    const page = Array.from({ length: 260 }, (_unused, i) => ({
      id: `h-${i + 1}`,
      user_id: 'u-1',
      content: `history ${i + 1}`,
      created_at: '2026-01-01T00:00:00.000Z',
    }))
    await respond('/api/messages?channel_id=general', 200, page)
    expect(rows()).toHaveLength(200)
    expect(rows()[0]).toBe('history 61')
    expect(rows()[199]).toBe('history 260')
  })

  it('keeps the chat room on its newest window while live messages arrive', async () => {
    await mount(createElement(ChatPage, { channelId: 'general' }))

    // The history load is one page — here, three messages.
    await respond('/api/messages?channel_id=general', 200, [
      { id: 'm-1', user_id: 'u-1', content: 'history 1', created_at: '2026-01-01T00:00:00.000Z' },
      { id: 'm-2', user_id: 'u-1', content: 'history 2', created_at: '2026-01-01T00:00:01.000Z' },
      { id: 'm-3', user_id: 'u-1', content: 'history 3', created_at: '2026-01-01T00:00:02.000Z' },
    ])
    expect(rows()).toHaveLength(3)

    // A room that stays open APPENDED every live message forever: 257 events on
    // top of the loaded 3 rendered 260 rows (and kept them all in memory).
    for (let i = 4; i <= 260; i++) {
      await emitSse('message:created', {
        id: `m-${i}`,
        user_id: 'u-2',
        content: `live ${i}`,
        created_at: '2026-01-02T00:00:00.000Z',
      })
    }

    // Bounded to the newest window, and it is the newest one — the end of the
    // conversation the reader is looking at.
    expect(rows()).toHaveLength(200)
    expect(rows()[199]).toBe('live 260')
    expect(rows()[0]).toBe('live 61')
    expect(rows().some((row) => row.startsWith('history'))).toBe(false)
  })
})

describe('example slices — the message a failure deserves', () => {
  /** The bell's aria-label carries the live unread count the badge renders. */
  const badgeLabel = (): string =>
    container.querySelector('button')?.getAttribute('aria-label') ?? ''

  it('a notification read twice (idempotent endpoint, re-broadcast) decrements the badge once', async () => {
    await mount(createElement(NotificationBellWidget, { userId: 'u-9' }))
    await respond('/api/notifications', 200, {
      items: [
        {
          id: 'n-1',
          type: 'comment',
          actor_name: 'A',
          subject_title: 'S',
          created_at: 't',
          read_at: null,
        },
        {
          id: 'n-2',
          type: 'comment',
          actor_name: 'A',
          subject_title: 'S',
          created_at: 't',
          read_at: null,
        },
      ],
      unread: 2,
    })
    expect(badgeLabel()).toBe('Notifications (2 unread)')

    // The read endpoint is idempotent and the handler re-broadcasts for every
    // request: clicking an already-read row (or a second tab reading the same
    // row) delivers `notification:read` for a row that is already read. Each
    // event used to decrement, so three stray events drained a badge that
    // still had unread rows behind it.
    await emitSse('notification:read', { id: 'n-1' })
    expect(badgeLabel()).toBe('Notifications (1 unread)')

    await emitSse('notification:read', { id: 'n-1' })
    await emitSse('notification:read', { id: 'n-1' })
    expect(badgeLabel()).toBe('Notifications (1 unread)')

    // The other row's read still counts — the transition, not the event.
    await emitSse('notification:read', { id: 'n-2' })
    expect(badgeLabel()).toBe('Notifications (0 unread)')
  })

  it('a 429 verify answer is not reported as "Wrong code" — the server says why', async () => {
    await mount(createElement(EnableTwoFactorPage, {}))
    // The enroll control is the page's only button at this point.
    await act(async () => {
      container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    await respond('/api/2fa/enroll', 200, {
      secret: 'JBSWY3DPEHPK3PXP',
      QRImageUrl: 'data:image/png;base64,AAAA',
      recoveryCodes: ['code-1'],
    })

    const codeInput = container.querySelector('input') as HTMLInputElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setter?.call(codeInput, '123456')
      codeInput.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await flush()
    await act(async () => {
      container
        .querySelector('form')
        ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await flush()

    // The handler rate-limits /2fa/verify per user; the throttle's 429 body
    // names the throttle. Collapsing every non-2xx into "Wrong code — try
    // again" told the user to retype a code that was probably fine.
    await respond('/api/2fa/verify', 429, { error: 'Too many attempts — try again shortly.' })
    expect(text()).toContain('Too many attempts — try again shortly.')
    expect(text()).not.toContain('Wrong code')
  })

  it('a dismissed push prompt stays enable-able — it is not a denial', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register: async () => ({ pushManager: {} }) },
    })
    Object.defineProperty(window, 'PushManager', { configurable: true, value: function P() {} })
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: {
        permission: 'default',
        // requestPermission resolves 'default' when the user DISMISSES the
        // prompt — a state distinct from 'denied', and one the browser will
        // re-ask for on the next click.
        requestPermission: async () => 'default',
      },
    })

    await mount(createElement(EnablePushButton, {}))
    await act(async () => {
      container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()

    // The enable button is still there to click again, and the page does not
    // claim the browser settings need changing.
    expect(text()).toContain('Enable notifications')
    expect(text()).not.toContain('Push notifications were denied')
  })
})
