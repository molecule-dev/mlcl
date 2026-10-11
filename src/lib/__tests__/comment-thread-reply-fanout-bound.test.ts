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

/** The number of reply requests one load may issue — mirrors MAX_REPLY_REQUESTS. */
const MAX_REPLY_REQUESTS = 200

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

const text = (): string => container.textContent ?? ''

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

describe('the comment thread’s reply walk', () => {
  it('bounded: a large root list does not fan out one request per root', async () => {
    const ROOTS = MAX_REPLY_REQUESTS + 60
    await mount(createElement(CommentThread, { resourceType: 'post', resourceId: 'p1' }))
    expect(httpCalls[0]?.path).toBe('/api/post/p1/comments')

    await act(async () => {
      httpCalls[0]?.resolve({ data: rows(ROOTS) })
    })
    await flush()

    const replies = httpCalls.filter((c) => c.path.endsWith('/replies'))
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
    expect(httpCalls.filter((c) => c.path.endsWith('/replies')).length).toBe(MAX_REPLY_REQUESTS)
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

    const replyCalls = httpCalls.filter((c) => c.path.endsWith('/replies'))
    expect(replyCalls.map((c) => c.path)).toEqual([
      '/api/comments/c1/replies',
      '/api/comments/c2/replies',
    ])
    await act(async () => {
      replyCalls[0]?.resolve({
        data: [{ id: 'r1', userId: 'u2', parentId: 'c1', body: 'nested reply', createdAt: 'y' }],
      })
      replyCalls[1]?.resolve({ data: [] })
    })
    await flush()

    // The walk continues into what it found — the reply's own page is read.
    const r1Call = httpCalls.find((c) => c.path === '/api/comments/r1/replies')
    expect(r1Call, 'the walk must still continue into a reply it found').toBeTruthy()
    await act(async () => {
      r1Call?.resolve({ data: [] })
    })
    await flush()

    expect(text()).toContain('root one')
    expect(text()).toContain('nested reply')
  })
})
