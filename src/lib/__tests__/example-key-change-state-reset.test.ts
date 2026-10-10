// @vitest-environment jsdom
/**
 * Two example-state rules that the sibling slices already enforce, pinned here
 * against the REAL components (jsdom, only the @molecule bonds + the UI
 * primitives are mocked):
 *
 * 1. **A load keyed on a CHANGING value must not survive the change.** The
 *    messaging slices refetch when `resourceId`/`resourceType` changes while the
 *    component stays mounted (navigate post A → post B). Their ticket guards
 *    (`loadSeq`) drop a superseded RESPONSE, but the state they already hold was
 *    never cleared — so a load for the new resource that FAILS left the previous
 *    resource's comments / reaction counts on screen as if they belonged to it
 *    (and the comment composer's `replyTo` still held a comment id of the other
 *    resource). ChatPage, NotificationBell, AttachmentsPanel and RatingWidget all
 *    clear their state up front for exactly this reason.
 *
 * 2. **A mount-time load must not re-run on a locale switch.** `useTranslation`'s
 *    `t` is memoized on `[provider, locale]`, so its identity changes on a locale
 *    switch. A `[t]` dependency therefore re-ran the profile fetch AND refilled
 *    the form from the server — silently discarding editing the user had not
 *    saved yet (the clobber the markdown-blog editor guards against) — and it
 *    froze the load-failure message in the locale it was fetched under. The fix
 *    loads once per mount and translates the failure at RENDER time, so the
 *    message follows the locale with no extra request.
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

/** Every fetch() the components made, in order, with a handle to answer it. */
const pending = vi.hoisted(() => ({ requests: [] as Pending[] }))

const i18n = vi.hoisted(() => ({
  // Replaced wholesale to reproduce a locale switch: only `t`'s IDENTITY has to
  // change (that is all `useTranslation` does), and the prefix makes the switch
  // observable in the rendered text.
  t: (key: string, values?: Record<string, unknown>, options?: { defaultValue?: string }) =>
    (options?.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_match, name: string) =>
      String(values?.[name] ?? ''),
    ),
}))

interface HttpCall {
  path: string
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
}

/** The `useHttpClient()` double: every GET parks until the test answers it. */
const httpCalls = vi.hoisted(() => [] as HttpCall[])
const http = vi.hoisted(() => ({
  get: (path: string) =>
    new Promise<unknown>((resolve, reject) => {
      httpCalls.push({ path, resolve, reject })
    }),
  post: () => Promise.resolve(undefined),
  delete: () => Promise.resolve(undefined),
}))

// Styling only: every ClassMap helper collapses to one inert token.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => 'stub' }),
}))
vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({ t: i18n.t }),
  useHttpClient: () => http,
}))
// `unwrapList` normalizes the API's envelope to the flat rows the slice wants.
vi.mock('@molecule/app-http', () => ({
  unwrapList: (res: { data?: unknown }) => res.data ?? [],
}))
// The thread/tree widget is not what is under test: render each body plainly.
vi.mock('@molecule/app-feature-thread-tree-react', () => ({
  ThreadTree: (props: { comments: Array<{ id: string; body: string }> }) =>
    createElement(
      'ul',
      null,
      props.comments.map((c) => createElement('li', { key: c.id }, c.body)),
    ),
}))
// The chip row is not what is under test: render emoji + count honestly.
vi.mock('@molecule/app-emoji-reactions-react', () => ({
  EmojiReactions: (props: { reactions: Array<{ emoji: string; count: number }> }) =>
    createElement(
      'ul',
      null,
      props.reactions.map((r) => createElement('li', { key: r.emoji }, `${r.emoji}${r.count}`)),
    ),
}))

const { CommentThread } =
  (await import('../../../templates/.agents/skills/examples/messaging/comment-threads/app/components/CommentThread.js')) as {
    CommentThread: (props: { resourceType: string; resourceId: string }) => ReactNode
  }
const { ReactionBar } =
  (await import('../../../templates/.agents/skills/examples/messaging/emoji-reactions/app/components/ReactionBar.js')) as {
    ReactionBar: (props: { resourceType: string; resourceId: string }) => ReactNode
  }
const { SettingsPage } =
  (await import('../../../templates/.agents/skills/examples/forms/settings-page/app/pages/SettingsPage.js')) as {
    SettingsPage: () => ReactNode
  }
const { DeleteAccountPage } =
  (await import('../../../templates/.agents/skills/examples/auth/account-deletion/app/pages/DeleteAccountPage.js')) as {
    DeleteAccountPage: () => ReactNode
  }

// react-dom's act() requires this flag outside the React test renderer.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const originalFetch = globalThis.fetch
const defaultT = i18n.t

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

/** Answer the oldest unanswered fetch() whose URL contains `fragment`. */
async function respond(fragment: string, status: number, body: unknown): Promise<void> {
  const request = pending.requests.find((r) => !r.answered && r.url.includes(fragment))
  if (!request) throw new Error(`no pending fetch for ${fragment}`)
  request.answered = true
  await act(async () => {
    request.respond(status, body)
  })
  await flush()
}

const fetchedUrls = (): string[] => pending.requests.map((r) => r.url)
const text = (): string => container.textContent ?? ''

/** Set a React-controlled input's value the way a user's keystroke does. */
async function type(input: HTMLInputElement, value: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await flush()
}

beforeEach(() => {
  pending.requests.length = 0
  httpCalls.length = 0
  i18n.t = defaultT
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

const PROFILE = { id: 'u1', name: 'Ada', email: 'ada@test.dev', timezone: 'UTC' }

describe('a failed load for a new resource must not leave the previous resource on screen', () => {
  it('clears the previous post’s comments when the next post’s load fails', async () => {
    await mount(createElement(CommentThread, { resourceType: 'post', resourceId: 'p1' }))
    expect(httpCalls[0]?.path).toBe('/api/post/p1/comments')
    await act(async () => {
      httpCalls[0]?.resolve({
        data: [{ id: 'c1', userId: 'u1', parentId: null, body: 'from-post-1', createdAt: 'x' }],
      })
    })
    await flush()
    expect(text()).toContain('from-post-1')

    // Navigate post 1 → post 2 while the thread stays mounted, and let the new
    // load FAIL (offline, 500). Post 1's comments must not stand in for post 2's.
    await rerender(createElement(CommentThread, { resourceType: 'post', resourceId: 'p2' }))
    expect(httpCalls[1]?.path).toBe('/api/post/p2/comments')
    await act(async () => {
      httpCalls[1]?.reject(new Error('HTTP 500'))
    })
    await flush()
    expect(text()).not.toContain('from-post-1')
  })

  it('clears the previous resource’s reaction chips when the next load fails', async () => {
    await mount(createElement(ReactionBar, { resourceType: 'post', resourceId: 'p1' }))
    expect(httpCalls[0]?.path).toBe('/api/post/p1/reactions')
    await act(async () => {
      httpCalls[0]?.resolve({ data: { total: 2, counts: { '👍': 2 }, userReactions: ['👍'] } })
    })
    await flush()
    expect(text()).toContain('👍2')

    await rerender(createElement(ReactionBar, { resourceType: 'post', resourceId: 'p2' }))
    expect(httpCalls[1]?.path).toBe('/api/post/p2/reactions')
    await act(async () => {
      httpCalls[1]?.reject(new Error('HTTP 500'))
    })
    await flush()
    expect(text()).not.toContain('👍2')
  })
})

describe('a mount-time profile load must not re-run (nor refill the form) on a locale switch', () => {
  it('settings: keeps the user’s unsaved edit and issues no second request', async () => {
    await mount(createElement(SettingsPage))
    await respond('/api/me', 200, PROFILE)
    const nameInput = container.querySelector('form input') as HTMLInputElement | null
    expect(nameInput?.value).toBe('Ada')

    // The user edits the field but has not saved yet.
    await type(nameInput!, 'Grace')
    expect(fetchedUrls().length).toBe(1)

    // A locale switch gives `t` a new identity and re-renders.
    i18n.t = (key, values, options) =>
      `ES ${(options?.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_m, n: string) => String(values?.[n] ?? ''))}`
    await rerender(createElement(SettingsPage))

    // No refetch, and the edit is still in the field (a refill would have put
    // the server's "Ada" back).
    expect(fetchedUrls().length).toBe(1)
    expect((container.querySelector('form input') as HTMLInputElement).value).toBe('Grace')
  })

  it('delete-account: re-translates the load failure at render without refetching', async () => {
    await mount(createElement(DeleteAccountPage))
    await respond('/api/me', 401, { error: 'unauthorized' })
    expect(text()).toContain('Could not load your account')
    expect(fetchedUrls().length).toBe(1)

    i18n.t = (key, values, options) =>
      `ES ${(options?.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_m, n: string) => String(values?.[n] ?? ''))}`
    await rerender(createElement(DeleteAccountPage))

    expect(fetchedUrls().length).toBe(1)
    expect(text()).toContain('ES Could not load your account')
  })
})
