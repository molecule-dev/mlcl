// @vitest-environment jsdom
/**
 * A blog Tags page whose taxonomy load FAILED must say so — never "No tags yet.".
 *
 * The load path caught every rejection and set `tags` to `[]`, so a 500 or an
 * offline request rendered the whole page as an authoritative, empty taxonomy:
 * the "Total Tags" card read 0, the table showed its "No tags yet" empty state
 * and the "Create your first tag" call to action — a wrong answer that reads as
 * "this blog has no tags", indistinguishable from one. It is the same wrong
 * answer the blog's own `BlogIndexPage` and the example slices state at their
 * own catches ("a silent catch would render an empty list that reads as 'the
 * blog has no posts'"; see the leaderboard / settings / account-deletion load
 * paths) — this catch was the one still swallowing it.
 *
 * Everything rendered is the shipped page: only the ClassMap, i18n, the router,
 * the analytics client, the shell and the http client are stubbed, and the
 * failure is a real rejected request. The retry test pins that the failure
 * state is recoverable, and the positive twin that the error line is not simply
 * always rendered.
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const TAGS = [
  { id: 'tag-1', name: 'javascript', post_count: 3 },
  { id: 'tag-2', name: 'css', post_count: 1 },
]

interface Call {
  url: string
  reject: (error: unknown) => void
  resolve: (value: unknown) => void
}

/** Every `http.get` the page made, each parked until the test answers it. */
const calls = vi.hoisted(() => [] as Call[])

/**
 * The http client double. ONE object, hoisted: the page's load effect depends on
 * `http`, so a fresh object per render would re-arm the effect forever.
 */
const httpClient = vi.hoisted(() => ({
  get: (url: string) =>
    new Promise<unknown>((resolve, reject) => {
      calls.push({ url, resolve, reject })
    }),
  post: () => Promise.resolve({ data: {} }),
  patch: () => Promise.resolve({ data: {} }),
  delete: () => Promise.resolve({ data: {} }),
}))

/**
 * A ClassMap stub that answers BOTH call shapes the page uses: `cm.cn(...)` /
 * `cm.sp(4)` are called, while a few class names (`cm.textMuted`) are passed as
 * the value itself — so the stub must stringify to something inert as well.
 */
const classMap = vi.hoisted(() => {
  const stub = new Proxy(function classMapStub() {}, {
    get: (_target, prop) => (prop === Symbol.toPrimitive ? () => 'stub' : stub),
    apply: () => 'stub',
  })
  return stub
})

vi.mock('@molecule/app-ui', () => ({ getClassMap: () => classMap }))
vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, values?: Record<string, unknown>, options?: { defaultValue?: string }) =>
      (options?.defaultValue ?? _key).replace(/\{\{(\w+)\}\}/g, (_match, name: string) =>
        String(values?.[name] ?? ''),
      ),
  }),
  useHttpClient: () => httpClient,
}))
vi.mock('@molecule/app-analytics', () => ({ track: vi.fn() }))
vi.mock('@molecule/app-ui-react', () => ({
  ConfirmButton: (props: { children?: ReactNode }) =>
    createElement('button', { type: 'button' }, props.children),
}))
vi.mock('react-router', () => ({
  useNavigate: () => () => undefined,
  useLocation: () => ({ key: 'test' }),
}))
// The authenticated shell is not what is under test — render the page alone.
vi.mock('../../../templates/apps/blog/app/src/components/AppShell.js', () => ({
  default: (props: { children?: ReactNode }) => createElement('div', null, props.children),
}))

const { Tags } =
  (await import('../../../templates/apps/blog/app/src/pages/Tags.js')) as unknown as {
    Tags: () => ReactNode
  }

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLElement
let root: Root

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve))
  })
}

async function mount(): Promise<void> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(createElement(Tags))
  })
  await flush()
}

const text = (): string => container.textContent ?? ''

/** Answer the oldest parked request. */
async function answer(index: number, fn: (call: Call) => void): Promise<void> {
  await act(async () => {
    const call = calls[index]
    if (!call) throw new Error(`no parked request #${index} — the page made none`)
    fn(call)
  })
  await flush()
}

afterEach(async () => {
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
  calls.length = 0
})

describe('blog Tags — a failed taxonomy load is reported, not shown as an empty list', () => {
  it('reports the failure instead of rendering "No tags yet." and its create CTA', async () => {
    await mount()
    expect(calls.length, 'the page must request the taxonomy').toBeGreaterThan(0)

    await answer(0, (call) => call.reject(new Error('HTTP 500')))

    expect(text(), 'the reader must be told the load failed').toContain('Could not load tags')
    expect(text(), 'a failed load must not read as "this blog has no tags"').not.toContain(
      'No tags yet',
    )
    expect(
      text(),
      'a failed load must not invite creating a first tag over tags that exist',
    ).not.toContain('Create your first tag')
    expect(
      text(),
      'the stats card must not claim 0 tags for a taxonomy that was never read',
    ).not.toContain('Growth +12% this month')
  })

  it('reports a 2xx body that is not the taxonomy as the same failure, not as zero tags', async () => {
    await mount()
    expect(calls.length, 'the page must request the taxonomy').toBeGreaterThan(0)

    // The unmatched-fixture / rewritten-answer case: the route ANSWERED 2xx, but
    // the body carries no tag list. Read as `[]` it rendered the "No tags yet"
    // empty state and its create CTA — the authoritative empty taxonomy the
    // failure state exists to prevent, without the catch below ever running.
    await answer(0, (call) => call.resolve({ data: {} }))

    expect(text(), 'the reader must be told the load failed').toContain('Could not load tags')
    expect(text(), 'a non-list body must not read as "this blog has no tags"').not.toContain(
      'No tags yet',
    )
    expect(
      text(),
      'a non-list body must not invite creating a first tag over tags that exist',
    ).not.toContain('Create your first tag')
  })

  it('keeps a way to retry, and the retry renders the taxonomy', async () => {
    await mount()
    await answer(0, (call) => call.reject(new Error('offline')))

    const retry = container.querySelector('[data-mol-id="btn-retry-tags"]')
    expect(retry, 'a failed load must keep a way to retry').not.toBeNull()

    const before = calls.length
    await act(async () => {
      retry?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    expect(calls.length, 'the retry must issue a fresh request').toBe(before + 1)

    await answer(calls.length - 1, (call) =>
      call.resolve({ data: { data: TAGS, total: TAGS.length } }),
    )

    expect(text()).toContain('javascript')
    expect(text()).toContain('of 2 tags')
    expect(text(), 'the recovered page must drop the failure state').not.toContain(
      'Could not load tags',
    )
  })

  it('renders the rows a successful load returns (the positive twin)', async () => {
    await mount()
    await answer(0, (call) => call.resolve({ data: { data: TAGS, total: TAGS.length } }))

    expect(text()).toContain('javascript')
    expect(text()).not.toContain('Could not load tags')
    expect(text()).not.toContain('No tags yet')
  })
})
