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

/** The tree shape `<ThreadTree>` consumes (mirrors the shared package's `Comment`). */
interface ThreadNode {
  id: string
  body: string
  children?: ThreadNode[]
}

/** The `useHttpClient()` double: every GET parks until the test answers it. */
const httpCalls = vi.hoisted(() => [] as HttpCall[])
/** Same double for POST — a toggle's/post's write parks until the test answers it. */
const postCalls = vi.hoisted(() => [] as HttpCall[])
const http = vi.hoisted(() => ({
  get: (path: string) =>
    new Promise<unknown>((resolve, reject) => {
      httpCalls.push({ path, resolve, reject })
    }),
  post: (path: string) =>
    new Promise<unknown>((resolve, reject) => {
      postCalls.push({ path, resolve, reject })
    }),
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
// The thread/tree widget is not what is under test: render each body plainly —
// but render the CHILDREN too, since nesting replies under their root is the
// behavior the slice exists to pin.
vi.mock('@molecule/app-feature-thread-tree-react', () => ({
  ThreadTree: (props: { comments: Array<ThreadNode> }) => {
    const render = (node: ThreadNode): ReactNode =>
      createElement('li', { key: node.id }, node.body, (node.children ?? []).map(render))
    return createElement('ul', null, props.comments.map(render))
  },
}))
// The chip row is not what is under test: render emoji + count honestly, with a
// button per chip so a test can drive `onToggle`.
vi.mock('@molecule/app-emoji-reactions-react', () => ({
  EmojiReactions: (props: {
    reactions: Array<{ emoji: string; count: number }>
    onToggle?: (emoji: string) => void
  }) =>
    createElement(
      'ul',
      null,
      props.reactions.map((r) =>
        createElement(
          'li',
          { key: r.emoji },
          `${r.emoji}${r.count}`,
          createElement(
            'button',
            { onClick: () => props.onToggle?.(r.emoji), 'data-mol-id': `toggle-${r.emoji}` },
            'toggle',
          ),
        ),
      ),
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

/** Same, for a textarea (the comment composer). */
async function typeIntoTextarea(textarea: HTMLTextAreaElement, value: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(textarea, value)
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
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
    // The list endpoint returns TOP-LEVEL rows only — the tree's reply pages
    // load per root before anything renders.
    expect(httpCalls[1]?.path).toBe('/api/comments/c1/replies')
    await act(async () => {
      httpCalls[1]?.resolve({
        data: [{ id: 'r1', userId: 'u2', parentId: 'c1', body: 'nested reply', createdAt: 'y' }],
      })
    })
    // The walk continues into what it found: `r1` is itself a parent (the UI
    // lets the reader reply to any row), so its own page is read before the
    // tree renders. Answering it empty is what a childless reply returns.
    expect(httpCalls[2]?.path).toBe('/api/comments/r1/replies')
    await act(async () => {
      httpCalls[2]?.resolve({ data: [] })
    })
    await flush()
    expect(text()).toContain('from-post-1')
    // The reply NESTS under its root — the whole point of the slice; the
    // top-level-only list used to make the nesting pass dead code.
    expect(text()).toContain('nested reply')

    // Navigate post 1 → post 2 while the thread stays mounted, and let the new
    // load FAIL (offline, 500). Post 1's comments must not stand in for post 2's.
    await rerender(createElement(CommentThread, { resourceType: 'post', resourceId: 'p2' }))
    // Found by path, not by index: the reply walk above issued pages of its own.
    const p2List = httpCalls.find((c) => c.path === '/api/post/p2/comments')
    await act(async () => {
      p2List?.reject(new Error('HTTP 500'))
    })
    await flush()
    expect(text()).not.toContain('from-post-1')
    expect(text()).not.toContain('nested reply')
  })

  it('a posted comment survives the refetch — which re-reads the replies pages', async () => {
    await mount(createElement(CommentThread, { resourceType: 'post', resourceId: 'p1' }))
    await act(async () => {
      httpCalls[0]?.resolve({
        data: [{ id: 'c1', userId: 'u1', parentId: null, body: 'root comment', createdAt: 'x' }],
      })
    })
    await flush()
    // The roots list drives one reply-page read per root, before anything renders.
    expect(httpCalls[1]?.path).toBe('/api/comments/c1/replies')
    await act(async () => {
      httpCalls[1]?.resolve({ data: [] })
    })
    await flush()
    expect(text()).toContain('root comment')

    await typeIntoTextarea(container.querySelector('textarea') as HTMLTextAreaElement, 'a comment')
    await act(async () => {
      container
        .querySelector('[data-mol-id="post-comment"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()

    expect(postCalls[0]?.path).toBe('/api/post/p1/comments')
    await act(async () => {
      postCalls[0]?.resolve({ id: 'r9' })
    })
    await flush()
    // The refetch re-reads the top-level list…
    expect(httpCalls[2]?.path).toBe('/api/post/p1/comments')
    await act(async () => {
      httpCalls[2]?.resolve({
        data: [{ id: 'c1', userId: 'u1', parentId: null, body: 'root comment', createdAt: 'x' }],
      })
    })
    // …and the REPLIES page — where replies live. Without that second read,
    // any reply (this user's or anyone else's) vanished from the tree the
    // moment a refetch ran.
    expect(httpCalls[3]?.path).toBe('/api/comments/c1/replies')
    await act(async () => {
      httpCalls[3]?.resolve({
        data: [{ id: 'r9', userId: 'u1', parentId: 'c1', body: 'the reply', createdAt: 'y' }],
      })
    })
    // …and the reply's own page, since the walk continues into it (empty = no
    // reply to the reply).
    expect(httpCalls[4]?.path).toBe('/api/comments/r9/replies')
    await act(async () => {
      httpCalls[4]?.resolve({ data: [] })
    })
    await flush()
    expect(text()).toContain('the reply')
    expect(text()).toContain('root comment')
  })

  it('a post that resolves after the resource changed does not overwrite the new thread', async () => {
    await mount(createElement(CommentThread, { resourceType: 'post', resourceId: 'p1' }))
    await act(async () => {
      httpCalls[0]?.resolve({
        data: [
          { id: 'c1', userId: 'u1', parentId: null, body: 'post-one comment', createdAt: 'x' },
        ],
      })
    })
    await flush()
    expect(httpCalls[1]?.path).toBe('/api/comments/c1/replies')
    await act(async () => {
      httpCalls[1]?.resolve({ data: [] })
    })
    await flush()
    expect(text()).toContain('post-one comment')

    // Post on p1, but navigate to p2 while the POST is parked.
    await typeIntoTextarea(container.querySelector('textarea') as HTMLTextAreaElement, 'a comment')
    await act(async () => {
      container
        .querySelector('[data-mol-id="post-comment"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await rerender(createElement(CommentThread, { resourceType: 'post', resourceId: 'p2' }))
    const p2Load = httpCalls.find((c) => c.path === '/api/post/p2/comments')
    await act(async () => {
      p2Load?.resolve({
        data: [
          { id: 'c2', userId: 'u1', parentId: null, body: 'post-two comment', createdAt: 'z' },
        ],
      })
    })
    await flush()
    // Post 2's root's reply page is part of its load too.
    const p2Replies = httpCalls.find((c) => c.path === '/api/comments/c2/replies')
    await act(async () => {
      p2Replies?.resolve({ data: [] })
      postCalls[0]?.resolve({ id: 'r1' })
    })
    await flush()

    // In the guarded flow the parked post fires NO trailing refetch. In the
    // unguarded flow it re-loads post 1 with the newest ticket — answer that
    // too, so the test is deterministic in both worlds, and the assertion
    // below is what catches the bug.
    for (const call of httpCalls.filter((c) => c.path === '/api/post/p1/comments')) {
      await act(async () => {
        call.resolve({
          data: [
            { id: 'c1', userId: 'u1', parentId: null, body: 'post-one comment', createdAt: 'x' },
          ],
        })
      })
    }
    await flush()

    // Post 2's thread stands; post 1's rows did not ride in on the stale post.
    expect(text()).toContain('post-two comment')
    expect(text()).not.toContain('post-one comment')
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

  it('a toggle that resolves after the resource changed does not resync the old summary into the new resource', async () => {
    await mount(createElement(ReactionBar, { resourceType: 'post', resourceId: 'p1' }))
    await act(async () => {
      httpCalls[0]?.resolve({ data: { total: 1, counts: { '👍': 1 }, userReactions: [] } })
    })
    await flush()

    // Toggle on p1 (POST parks), then navigate to p2 while it is in flight.
    await act(async () => {
      container
        .querySelector('[data-mol-id="toggle-👍"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await rerender(createElement(ReactionBar, { resourceType: 'post', resourceId: 'p2' }))
    const p2Load = httpCalls.find((c) => c.path === '/api/post/p2/reactions')
    await act(async () => {
      p2Load?.resolve({ data: { total: 0, counts: {}, userReactions: [] } })
      postCalls[0]?.resolve({ ok: true })
    })
    await flush()

    // In the guarded flow the parked toggle fires NO trailing resync. In the
    // unguarded flow it re-loads p1's summary with the newest ticket — answer
    // that too, so the test is deterministic in both worlds, and the
    // assertion below is what catches the bug.
    for (const call of httpCalls.filter((c) => c.path === '/api/post/p1/reactions')) {
      await act(async () => {
        call.resolve({ data: { total: 1, counts: { '👍': 1 }, userReactions: [] } })
      })
    }
    await flush()

    // p2's (empty) summary stands; p1's 👍 chip did not ride in on the
    // stale toggle.
    expect(text()).not.toContain('👍1')
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

describe('the comment thread nests replies at any depth, not just one level', () => {
  it('loads a reply’s OWN replies — a reply to a reply is not left out of the tree', async () => {
    // `GET /comments/:id/replies` answers a node's DIRECT children only, and the
    // UI lets the reader reply to any row (`ThreadTree`'s onReply). A pass that
    // asked only the roots never requested a reply's children, so a reply to a
    // reply was missing from the tree until a reload — the same "it vanished on
    // the refetch" symptom the roots' pages exist to prevent.
    await mount(createElement(CommentThread, { resourceType: 'post', resourceId: 'p1' }))
    await act(async () => {
      httpCalls[0]?.resolve({
        data: [{ id: 'c1', userId: 'u1', parentId: null, body: 'root comment', createdAt: 'x' }],
      })
    })
    expect(httpCalls[1]?.path).toBe('/api/comments/c1/replies')
    await act(async () => {
      httpCalls[1]?.resolve({
        data: [{ id: 'r1', userId: 'u2', parentId: 'c1', body: 'first reply', createdAt: 'y' }],
      })
    })

    // The walk continues into the row it just found…
    expect(httpCalls[2]?.path).toBe('/api/comments/r1/replies')
    await act(async () => {
      httpCalls[2]?.resolve({
        data: [
          { id: 'r2', userId: 'u1', parentId: 'r1', body: 'reply to the reply', createdAt: 'z' },
        ],
      })
    })
    // …and into that row's children too, until a page comes back empty.
    expect(httpCalls[3]?.path).toBe('/api/comments/r2/replies')
    await act(async () => {
      httpCalls[3]?.resolve({ data: [] })
    })
    await flush()

    expect(text()).toContain('root comment')
    expect(text()).toContain('first reply')
    expect(text()).toContain('reply to the reply')
  })
})
