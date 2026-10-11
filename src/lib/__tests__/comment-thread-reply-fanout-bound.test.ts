// @vitest-environment jsdom
/**
 * The comment thread's reply walk is BOUNDED.
 *
 * `GET /comments/:id/replies` answers a node's DIRECT children only, so reaching
 * the thread costs ONE REQUEST PER NODE — the loader has to ask every row it
 * found for its own children, and it has always continued into what it finds
 * (a reply to a reply is a node like any other; see the sibling
 * example-key-change-state-reset suite). Unbounded, that walk is a fan-out: a
 * thread with N comments issued N requests on mount, with a WHOLE LEVEL fired at
 * once, from every open tab — and again on every refetch a post triggers. The
 * budget the loader now spends (`MAX_REPLY_REQUESTS`) caps the burst; these
 * tests pin both halves: the cap holds on a large thread, and a small thread
 * still nests its replies.
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
const http = vi.hoisted(() => ({
  get: (path: string) =>
    new Promise<unknown>((resolve, reject) => {
      httpCalls.push({ path, resolve, reject })
    }),
  post: () => Promise.resolve(undefined),
  delete: () => Promise.resolve(undefined),
}))

interface ThreadNode {
  id: string
  body: string
  children?: ThreadNode[]
}

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => 'stub' }),
}))
vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values?: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? _key,
  }),
  useHttpClient: () => http,
}))
vi.mock('@molecule/app-http', () => ({
  unwrapList: (res: { data?: unknown }) => res.data ?? [],
}))
// Render each body plainly, children included — nesting is what the walk is for.
vi.mock('@molecule/app-feature-thread-tree-react', () => ({
  ThreadTree: (props: { comments: ThreadNode[] }) => {
    const render = (node: ThreadNode): ReactNode =>
      createElement('li', { key: node.id }, node.body, (node.children ?? []).map(render))
    return createElement('ul', null, props.comments.map(render))
  },
}))

const { CommentThread, MAX_REPLY_REQUESTS } =
  (await import('../../../templates/.agents/skills/examples/messaging/comment-threads/app/components/CommentThread.js')) as {
    CommentThread: (props: { resourceType: string; resourceId: string }) => ReactNode
    /** The number of reply requests one load may issue — the component's own budget. */
    MAX_REPLY_REQUESTS: number
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

const text = (): string => container.textContent ?? ''

/**
 * Every reply page the walk requested.
 *
 * Matched on the PATH, not on `endsWith('/replies')`: the walk asks for the
 * resource's largest page (`?limit=500`), so a request never ends there.
 */
const repliesCalls = (): HttpCall[] => httpCalls.filter((c) => c.path.includes('/replies'))

/** The rows the list endpoint answered one load with. */
function rows(count: number): Array<Record<string, unknown>> {
  return Array.from({ length: count }, (_, i) => ({
    id: `c${i}`,
    userId: 'u1',
    parentId: null,
    body: `root ${i}`,
    createdAt: 'x',
  }))
}

beforeEach(() => {
  httpCalls.length = 0
})

afterEach(async () => {
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

/**
 * A ceiling this SUITE owns, independent of the component's own budget.
 *
 * Reading `MAX_REPLY_REQUESTS` (below) makes the assertion drift-proof — the
 * test can no longer disagree with the walk it drives — but a test whose only
 * bound is the implementation's own number accepts ANY number: raise the
 * constant to 10 000 and the input grows with it, the comparison still holds,
 * and the fan-out the budget exists to prevent is back with a green suite. The
 * budget is a cost bound, so the suite states the order of magnitude it was
 * chosen for (the module doc: "the same order of magnitude the sibling slices
 * put on their live lists — the chat room's MAX_RENDERED_MESSAGES is 200") and
 * fails if the walk's page count stops being one.
 */
const REPLY_REQUEST_CEILING = 500

describe('the comment thread’s reply walk', () => {
  it('bounds the walk to a burst-sized page count, not to whatever the constant says', () => {
    expect(
      MAX_REPLY_REQUESTS,
      'a per-load request budget in the thousands is a fan-out with a number on it',
    ).toBeLessThanOrEqual(REPLY_REQUEST_CEILING)
  })

  it('bounded: a large root list does not fan out one request per root', async () => {
    const ROOTS = MAX_REPLY_REQUESTS + 60
    await mount(createElement(CommentThread, { resourceType: 'post', resourceId: 'p1' }))
    expect(httpCalls[0]?.path).toBe('/api/post/p1/comments')

    await act(async () => {
      httpCalls[0]?.resolve({ data: rows(ROOTS) })
    })
    await flush()

    const replies = repliesCalls()
    // The walk asks at most the budget's worth of nodes. Without the bound this
    // is one request PER ROOT (ROOTS), all of them fired in one Promise.all.
    expect(replies.length, `${ROOTS} roots must not become ${ROOTS} replies requests`).toBe(
      MAX_REPLY_REQUESTS,
    )

    // Answer every request the walk did make: it must stop, not issue a new
    // level, once the budget is spent — and the tree then renders ALL the roots
    // the list returned (the cap limits the walk, not the list).
    await act(async () => {
      for (const call of replies) call.resolve({ data: [] })
    })
    await flush()
    expect(repliesCalls().length).toBe(MAX_REPLY_REQUESTS)
    expect(text()).toContain('root 0')
    expect(text()).toContain(`root ${ROOTS - 1}`)
  })

  it('under the budget, every root’s replies are still fetched and nested', async () => {
    await mount(createElement(CommentThread, { resourceType: 'post', resourceId: 'p1' }))
    await act(async () => {
      httpCalls[0]?.resolve({
        data: [
          { id: 'c1', userId: 'u1', parentId: null, body: 'root one', createdAt: 'x' },
          { id: 'c2', userId: 'u1', parentId: null, body: 'root two', createdAt: 'x' },
        ],
      })
    })
    await flush()

    const replyCalls = repliesCalls()
    expect(replyCalls.map((c) => c.path)).toEqual([
      '/api/comments/c1/replies?limit=500',
      '/api/comments/c2/replies?limit=500',
    ])
    await act(async () => {
      replyCalls[0]?.resolve({
        data: [{ id: 'r1', userId: 'u2', parentId: 'c1', body: 'nested reply', createdAt: 'y' }],
      })
      replyCalls[1]?.resolve({ data: [] })
    })
    await flush()

    // The walk continues into what it found — the reply's own page is read.
    const r1Call = httpCalls.find((c) => c.path === '/api/comments/r1/replies?limit=500')
    expect(r1Call, 'the walk must still continue into a reply it found').toBeTruthy()
    await act(async () => {
      r1Call?.resolve({ data: [] })
    })
    await flush()

    expect(text()).toContain('root one')
    expect(text()).toContain('nested reply')
  })

  it("asks for the resource's largest replies page, not the endpoint's default of 20", async () => {
    // `GET /comments/:id/replies` pages at 20 by default and caps at 500 (the
    // comment resource's MAX_LIST_LIMIT). Asking for the default made the walk
    // treat a node's first twenty replies as its COMPLETE children — replies
    // 21+ were never requested, so they never rendered at ANY budget, which is
    // not what "a request per node reaches the whole thread" promises.
    await mount(createElement(CommentThread, { resourceType: 'post', resourceId: 'p1' }))
    await act(async () => {
      httpCalls[0]?.resolve({
        data: [{ id: 'c1', userId: 'u1', parentId: null, body: 'root', createdAt: 'x' }],
      })
    })
    await flush()

    expect(repliesCalls().map((c) => c.path)).toEqual(['/api/comments/c1/replies?limit=500'])
  })
})
