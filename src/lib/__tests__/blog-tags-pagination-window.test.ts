// @vitest-environment jsdom
/**
 * The blog app's Tags pagination renders a bounded control, not one button per
 * page.
 *
 * The control enumerated EVERY page (`Array.from({ length: totalPages })`), so
 * the work it did per render scaled with the number of TAGS rather than with
 * the control's own size: a blog with a few thousand tags mounted a few hundred
 * page buttons — each with its own inline style object — and rebuilt them on
 * every keystroke in the search box, because the filter above re-renders the
 * page. The app's own `PostListPagination` already bounds its numbers to the
 * current page and its neighbours (the repository's other paginators - the
 * windowed admin-products one, the paginated-user-list example - do the same),
 * so this pins the same bound on the tag list.
 *
 * The assertions count the rendered page buttons: at most three, the current
 * page among them, and no button for a page far away. Against the old
 * `Array.from({ length: totalPages })` this mounts 50 buttons for 400 tags and
 * fails on the first count.
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** The tags `GET /api/tags` answers with — 50 pages at the page size of 8. */
const TAGS = Array.from({ length: 400 }, (_unused, index) => ({
  id: `tag-${index}`,
  name: `Tag ${index}`,
  post_count: index % 7,
}))

const PAGE_SIZE = 8
const TOTAL_PAGES = Math.ceil(TAGS.length / PAGE_SIZE)

/**
 * The http client double. ONE object, hoisted: the page's load effect depends on
 * `http`, so a fresh object per render would re-arm the effect forever.
 */
const httpClient = vi.hoisted(() => ({
  get: () =>
    Promise.resolve({
      data: { data: [], total: 0 },
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

/** The numbered page buttons actually rendered (prev/next carry their own ids). */
function pageButtons(): number[] {
  return [...container.querySelectorAll('[data-mol-id]')]
    .map((el) => el.getAttribute('data-mol-id') ?? '')
    .map((id) => /^btn-page-(\d+)$/.exec(id)?.[1])
    .filter((p): p is string => p !== undefined)
    .map(Number)
    .sort((a, b) => a - b)
}

async function clickPageButton(id: string): Promise<void> {
  const button = container.querySelector(`[data-mol-id="${id}"]`)
  if (!button) throw new Error(`no rendered control ${id}`)
  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await flush()
}

beforeEach(() => {
  httpClient.get = () => Promise.resolve({ data: { data: TAGS, total: TAGS.length } })
})

afterEach(async () => {
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

describe('blog Tags pagination', () => {
  it('renders at most three page buttons, however many pages the list has', async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(createElement(Tags))
    })
    await flush()

    // The list really did load: without this the assertion below would pass
    // vacuously on a page that rendered no pagination at all.
    expect(container.textContent).toContain(`of ${TAGS.length} tags`)

    const pages = pageButtons()
    expect(
      pages.length,
      `the control must not enumerate every page (rendered ${pages.join(', ')} of ${TOTAL_PAGES} pages)`,
    ).toBeLessThanOrEqual(3)
    // The current page is among them, and a distant page is not.
    expect(pages).toContain(1)
    expect(pageButtons()).not.toContain(TOTAL_PAGES)

    // The fixture must reach far more pages than the bound, so "a distant page
    // is not rendered" above says something — and the count is the COMPONENT's,
    // walked out, not a pair of test-local constants. (This replaced
    // `expect(TOTAL_PAGES).toBeGreaterThan(3)`, which was computed from the
    // test's own TAGS and PAGE_SIZE and so could never fail: changing the page's
    // page size left it green.)
    const next = (): HTMLButtonElement => {
      const el = container.querySelector(
        '[data-mol-id="btn-page-next"]',
      ) as HTMLButtonElement | null
      if (!el) throw new Error('no next-page control rendered')
      return el
    }
    let steps = 0
    while (steps < 500 && !next().disabled) {
      await clickPageButton('btn-page-next')
      steps += 1
    }
    expect(steps, 'the fixture must reach far more pages than the bound').toBe(TOTAL_PAGES - 1)
    expect(steps).toBeGreaterThan(3)
    // …and the control stays bounded at the far end of the list.
    expect(pageButtons().length).toBeLessThanOrEqual(3)
    expect(pageButtons()).toContain(TOTAL_PAGES)
  })

  it('windows the numbers onto the page being read', async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(createElement(Tags))
    })
    await flush()

    // Two "next" clicks land on page 3 — the window must follow it (2, 3, 4)
    // rather than staying pinned on the first page.
    await clickPageButton('btn-page-next')
    await clickPageButton('btn-page-next')

    const pages = pageButtons()
    expect(pages.length).toBeLessThanOrEqual(3)
    expect(pages).toContain(3)
    expect(pages).toContain(4)
    expect(pages).not.toContain(1)
  })
})
