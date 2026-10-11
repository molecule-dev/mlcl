// @vitest-environment jsdom
/**
 * The comment composer posts ONE comment per user action.
 *
 * `post()` cleared the draft only AFTER the server accepted it (deliberately —
 * clearing first would discard the user's text on a failed post), and nothing
 * else marked the write as in flight: the Post button's `disabled` depended on
 * the draft alone. So a second click before the first response landed fired
 * `http.post` again with the same `{ body, parentId }` — two identical comments,
 * and the comments resource has no idempotency key to collapse them. Every
 * sibling slice that writes carries the guard (`ChatPage`'s `sending`,
 * `AttachmentsPanel`'s `uploading`, `ImportPage`'s `committing`).
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface HttpCall {
  path: string
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
}

/** The `useHttpClient()` double: every GET parks until the test answers it. */
const httpCalls = vi.hoisted(() => [] as HttpCall[])
/** Same double for POST — the comment write parks until the test answers it. */
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
  useTranslation: () => ({
    t: (key: string, _values?: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
  useHttpClient: () => http,
}))
vi.mock('@molecule/app-http', () => ({
  unwrapList: (res: { data?: unknown }) => res.data ?? [],
}))
vi.mock('@molecule/app-feature-thread-tree-react', () => ({
  ThreadTree: (props: { comments: Array<{ id: string; body: string }> }) =>
    createElement(
      'ul',
      null,
      props.comments.map((node) => createElement('li', { key: node.id }, node.body)),
    ),
}))

const { CommentThread } =
  (await import('../../../templates/.agents/skills/examples/messaging/comment-threads/app/components/CommentThread.js')) as {
    CommentThread: (props: { resourceType: string; resourceId: string }) => ReactNode
  }

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

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

/** Render a new element into the SAME root — the panel outlives a resource change. */
async function rerender(element: ReactNode): Promise<void> {
  await act(async () => {
    root.render(element)
  })
  await flush()
}

const text = (): string => container.textContent ?? ''

const postButton = (): HTMLButtonElement =>
  container.querySelector('[data-mol-id="post-comment"]') as HTMLButtonElement

/** Set the textarea value the way a user's keystroke does. */
async function typeIntoTextarea(value: string): Promise<void> {
  const textarea = container.querySelector('textarea') as HTMLTextAreaElement
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(textarea, value)
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await flush()
}

/** One click of the Post button — its own event, like a real click. */
async function clickPost(): Promise<void> {
  await act(async () => {
    postButton()?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await flush()
}

/** Answer the parked list request at `index` with `body`. */
async function answerGet(index: number, body: unknown): Promise<void> {
  const call = httpCalls[index]
  if (!call) throw new Error(`no parked GET at index ${index}`)
  await act(async () => {
    call.resolve(body)
  })
  await flush()
}

beforeEach(() => {
  httpCalls.length = 0
  postCalls.length = 0
})

afterEach(async () => {
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

describe('the comment composer', () => {
  it('a second click while the POST is in flight posts once', async () => {
    await mount(createElement(CommentThread, { resourceType: 'post', resourceId: 'p1' }))
    // The roots list, then the empty replies page for the one root.
    await answerGet(0, {
      data: [{ id: 'c1', userId: 'u1', parentId: null, body: 'root comment', createdAt: 'x' }],
    })
    await answerGet(1, { data: [] })
    expect(text()).toContain('root comment')

    await typeIntoTextarea('a comment')
    await clickPost()
    // The first POST is parked. Subsequent clicks must not post it again — the
    // endpoint has no idempotency key to collapse the duplicate comment.
    await clickPost()
    await clickPost()

    expect(
      postCalls.filter((c) => c.path === '/api/post/p1/comments'),
      'one user action, one POST',
    ).toHaveLength(1)
    // The control is disabled while the write is in flight.
    expect(postButton().disabled, 'the composer is disabled while the POST is parked').toBe(true)

    // The accepted post clears the draft…
    await act(async () => {
      postCalls[0]?.resolve({ id: 'c2' })
    })
    await flush()
    // …and its refetch settles (the roots list, then that root's replies page).
    const refetches = httpCalls.filter((c) => c.path === '/api/post/p1/comments')
    const listRefetch = refetches[refetches.length - 1]
    if (listRefetch) {
      await act(async () => {
        listRefetch.resolve({ data: [] })
      })
      await flush()
    }
    for (const call of httpCalls.filter((c) => c.path.includes('/replies'))) {
      await act(async () => {
        call.resolve({ data: [] })
      })
    }
    await flush()
    expect(text()).not.toContain('a comment')

    // A fresh draft re-enables the composer — the guard is released, not stuck.
    await typeIntoTextarea('a second comment')
    expect(postButton().disabled, 'a new draft re-enables the composer').toBe(false)
  })

  it('a post that fails after the resource changed does not report its error on the new thread', async () => {
    // The slice's own rule (see mountedForRef): a write that started on one
    // resource must not write the state of another. The success path honours it;
    // the FAILURE path did not, so an abandoned post's error was painted under
    // the thread the reader had just navigated to — a comment they never tried
    // to post.
    await mount(createElement(CommentThread, { resourceType: 'post', resourceId: 'p1' }))
    await answerGet(0, {
      data: [{ id: 'c1', userId: 'u1', parentId: null, body: 'root comment', createdAt: 'x' }],
    })
    await answerGet(1, { data: [] })

    await typeIntoTextarea('a comment')
    await clickPost()
    expect(postCalls).toHaveLength(1)

    // The reader navigates to another post while the POST is parked…
    await rerender(createElement(CommentThread, { resourceType: 'post', resourceId: 'p2' }))
    // …and it fails. The failure belongs to p1, whose state this render no
    // longer owns.
    await act(async () => {
      postCalls[0]?.reject(new Error('HTTP 500'))
    })
    await flush()

    await answerGet(2, {
      data: [{ id: 'c9', userId: 'u2', parentId: null, body: 'other thread', createdAt: 'x' }],
    })
    await answerGet(3, { data: [] })
    expect(text()).toContain('other thread')
    expect(
      text(),
      'an abandoned post’s failure must not surface on the thread the reader is on',
    ).not.toContain('Could not post the comment')
  })

  it('a post-save REFETCH that fails after a navigation stays off the new thread', async () => {
    // The refetch the accepted post triggers is part of the same flow, so it
    // obeys the same ownership rule as the rest of it. It did not: the reader
    // could navigate while it was in flight, and a rejecting refetch then
    // painted "could not post the comment" under a thread where the post had
    // never been attempted — a comment that WAS posted, reported as failed.
    await mount(createElement(CommentThread, { resourceType: 'post', resourceId: 'p1' }))
    await answerGet(0, {
      data: [{ id: 'c1', userId: 'u1', parentId: null, body: 'root comment', createdAt: 'x' }],
    })
    await answerGet(1, { data: [] })

    await typeIntoTextarea('a comment')
    await clickPost()
    // The server accepted it, so the flow continues into its refetch — parked
    // at the next list GET for p1.
    await act(async () => {
      postCalls[0]?.resolve({ id: 'c2' })
    })
    await flush()

    // The reader navigates to another post while that refetch is in flight…
    await rerender(createElement(CommentThread, { resourceType: 'post', resourceId: 'p2' }))
    // …and it fails (offline). The failure belongs to p1.
    const staleRefetch = httpCalls[httpCalls.length - 2]
    expect(staleRefetch?.path, 'the post-save refetch is parked before it fails').toBe(
      '/api/post/p1/comments',
    )
    await act(async () => {
      staleRefetch?.reject(new Error('offline'))
    })
    await flush()

    await answerGet(httpCalls.length - 1, {
      data: [{ id: 'c9', userId: 'u2', parentId: null, body: 'other thread', createdAt: 'x' }],
    })
    await answerGet(httpCalls.length - 1, { data: [] })
    expect(text()).toContain('other thread')
    expect(
      text(),
      'a refetch that failed after the reader left must not report the old thread’s post here',
    ).not.toContain('Could not post the comment')
  })

  it('a failed post does not leave its error banner on the next resource', async () => {
    // No race needed: the failure is recorded while the reader is still on the
    // old resource, and the resource change itself must retire it (the sibling
    // ChatPage clears its room-scoped sendError on exactly that switch).
    await mount(createElement(CommentThread, { resourceType: 'post', resourceId: 'p1' }))
    await answerGet(0, {
      data: [{ id: 'c1', userId: 'u1', parentId: null, body: 'root comment', createdAt: 'x' }],
    })
    await answerGet(1, { data: [] })

    await typeIntoTextarea('a comment')
    await clickPost()
    await act(async () => {
      postCalls[0]?.reject(new Error('HTTP 500'))
    })
    await flush()
    expect(text()).toContain('Could not post the comment')

    await rerender(createElement(CommentThread, { resourceType: 'post', resourceId: 'p2' }))
    await answerGet(2, {
      data: [{ id: 'c9', userId: 'u2', parentId: null, body: 'other thread', createdAt: 'x' }],
    })
    await answerGet(3, { data: [] })

    expect(text()).toContain('other thread')
    expect(
      text(),
      'a previous resource’s failed post must not leave its banner on the new one',
    ).not.toContain('Could not post the comment')
  })
})
