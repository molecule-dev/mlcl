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
  /** The request body, for the POST double — what the resource validates. */
  body?: unknown
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
  post: (path: string, body?: unknown) =>
    new Promise<unknown>((resolve, reject) => {
      postCalls.push({ path, body, resolve, reject })
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
  // Also exposes a reply affordance: `onReply(id)` is how the real tree sets the
  // composer's target, and the request body it produces is under test.
  ThreadTree: (props: {
    comments: Array<{ id: string; body: string }>
    onReply?: (id: string) => void
  }) =>
    createElement(
      'ul',
      null,
      props.comments.map((node) =>
        createElement(
          'li',
          { key: node.id },
          node.body,
          createElement('button', {
            type: 'button',
            'aria-label': `reply-${node.id}`,
            onClick: () => props.onReply?.(node.id),
          }),
        ),
      ),
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

  it('a POST parked on the previous resource neither freezes nor releases the new composer', async () => {
    // The component outlives a resource change, and `posting` is one flag for
    // the whole composer. The resource reset cleared the thread, the reply
    // target and the error banner — but not that flag: a POST parked on p1 left
    // p2's composer disabled (and `post` returning early) until p1's request
    // settled, and then its `finally` released the flag UNCONDITIONALLY, clearing
    // the guard around p2's own write — the double-post this whole guard exists
    // to stop. The same monotonic release ChatPage's `sendTicket` uses fixes both
    // halves.
    await mount(createElement(CommentThread, { resourceType: 'post', resourceId: 'p1' }))
    await answerGet(0, { data: [] })

    await typeIntoTextarea('a comment')
    await clickPost()
    expect(postCalls).toHaveLength(1)
    expect(postButton().disabled, 'p1’s write is in flight').toBe(true)

    // The reader navigates to another resource while that POST is parked.
    await rerender(createElement(CommentThread, { resourceType: 'post', resourceId: 'p2' }))
    await answerGet(1, { data: [] })

    // p2's composer must be usable: the parked write belongs to p1.
    await typeIntoTextarea('on p2')
    expect(
      postButton().disabled,
      'the previous resource’s parked POST must not hold the new composer disabled',
    ).toBe(false)
    await clickPost()
    expect(
      postCalls.filter((c) => c.path === '/api/post/p2/comments'),
      'the new resource posts its own comment',
    ).toHaveLength(1)

    // p1's write settles now. It must NOT release p2's in-flight guard…
    await act(async () => {
      postCalls[0]?.resolve({ id: 'c1' })
    })
    await flush()
    expect(
      postButton().disabled,
      'the abandoned write must not release the new resource’s in-flight guard',
    ).toBe(true)
    await clickPost()
    expect(
      postCalls.filter((c) => c.path === '/api/post/p2/comments'),
      'no duplicate post while p2’s own write is still in flight',
    ).toHaveLength(1)

    // …and p2's own write releases it when IT settles.
    await act(async () => {
      postCalls[1]?.resolve({ id: 'c2' })
    })
    await flush()
    await typeIntoTextarea('a third comment')
    expect(postButton().disabled, 'the guard is released by the write that actually owns it').toBe(
      false,
    )
  })

  it('a parked post that resolves after p1 → p2 → p1 keeps the draft typed since', async () => {
    // `stillOnResource` compares resource NAMES, so a navigation that CAME BACK
    // is invisible to it: a POST parked across p1 → p2 → p1 passes the guard and
    // ran its success path on return — where `setDraft('')` wiped whatever the
    // reader had typed SINCE (the resource change keeps the draft on purpose),
    // discarding text the accepted post had no claim on.
    await mount(createElement(CommentThread, { resourceType: 'post', resourceId: 'p1' }))
    await answerGet(0, { data: [] })

    await typeIntoTextarea('first comment')
    await clickPost()
    expect(postCalls).toHaveLength(1)

    // The reader navigates away and BACK while the POST is parked…
    await rerender(createElement(CommentThread, { resourceType: 'post', resourceId: 'p2' }))
    await answerGet(1, { data: [] })
    await rerender(createElement(CommentThread, { resourceType: 'post', resourceId: 'p1' }))
    await answerGet(2, { data: [] })

    // …and types a NEW draft.
    await typeIntoTextarea('a newer draft')

    // The parked POST lands. The comment it sent is stored; the new draft is not
    // its to clear.
    await act(async () => {
      postCalls[0]?.resolve({ id: 'c1' })
    })
    await flush()

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    expect(
      textarea.value,
      'the accepted post must clear only the text it sent, never the draft typed since',
    ).toBe('a newer draft')
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

describe('the comment body the resource validates', () => {
  it('a top-level comment OMITS parentId — a JSON null is a 400, not a top-level comment', async () => {
    // The resource's createCommentSchema is
    // `z.object({ body, parentId: z.string().uuid().optional() })` — `.optional()`
    // accepts a MISSING key, never a JSON `null`. Posting `parentId: null` for a
    // top-level comment failed validation ("expected string, received null"), so
    // the create handler answered 400 and NO top-level comment could ever be
    // posted; only replies (whose uuid passes) worked.
    await mount(createElement(CommentThread, { resourceType: 'post', resourceId: 'p1' }))
    await answerGet(0, {
      data: [{ id: 'c1', userId: 'u1', parentId: null, body: 'root comment', createdAt: 'x' }],
    })
    await answerGet(1, { data: [] })

    await typeIntoTextarea('a top-level comment')
    await clickPost()

    const posted = postCalls[0]?.body as Record<string, unknown>
    expect(posted).toEqual({ body: 'a top-level comment' })
    expect('parentId' in posted, 'the key must be absent, not null').toBe(false)
  })

  it('a reply carries the parent id', async () => {
    await mount(createElement(CommentThread, { resourceType: 'post', resourceId: 'p1' }))
    await answerGet(0, {
      data: [{ id: 'c1', userId: 'u1', parentId: null, body: 'root comment', createdAt: 'x' }],
    })
    await answerGet(1, { data: [] })

    await act(async () => {
      container
        .querySelector('[aria-label="reply-c1"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    await typeIntoTextarea('a reply')
    await clickPost()

    expect(postCalls[0]?.body).toEqual({ body: 'a reply', parentId: 'c1' })
  })
})

describe('the comment composer — a post that LANDED is never reported as failed', () => {
  it('a failed refetch after a successful post says the comment was posted', async () => {
    await mount(createElement(CommentThread, { resourceType: 'post', resourceId: 'p1' }))
    await answerGet(0, {
      data: [{ id: 'c1', userId: 'u1', parentId: null, body: 'root comment', createdAt: 'x' }],
    })
    await answerGet(1, { data: [] })

    await typeIntoTextarea('shipping Friday?')
    await clickPost()
    // The server accepted it — the comment IS stored.
    await act(async () => {
      postCalls[0]?.resolve({ id: 'c2' })
    })
    await flush()

    // …and the refetch that would have shown it fails.
    const refetch = httpCalls.filter((c) => c.path === '/api/post/p1/comments').at(-1)
    expect(refetch).toBeDefined()
    await act(async () => {
      refetch?.reject(new Error('network down'))
    })
    await flush()

    // Reporting this as a failed POST sent the reader back to retype a comment
    // that is already stored — and the resource has no idempotency key, so the
    // retry creates a duplicate.
    expect(text()).not.toContain('Could not post the comment')
    expect(text()).toContain('Your comment was posted')
  })
})
