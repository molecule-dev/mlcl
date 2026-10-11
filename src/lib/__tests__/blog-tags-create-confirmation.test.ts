// @vitest-environment jsdom
/**
 * The blog Tags page's create modal claims a create the page cannot confirm.
 *
 * `handleCreate` appended whatever the POST answered — `(res as …).id ? res :
 * res?.data` — and closed the modal either way, so a 2xx whose body carries no
 * tag (the mock API server's `200 {}` for an endpoint with no fixture, a
 * proxy's rewritten answer) reported a created tag that the list nowhere
 * showed, fired the `tag.created` analytics event for it, and invited a retry
 * whose Save POSTs the same name again — a second INSERT, since `create` is
 * not idempotent. The row's `id` is the only confirmation the page can act on
 * (it is what the list keys and what Edit/Delete address); without it the
 * answer is "unconfirmed", the modal stays open with the failure, and Save
 * refuses until the modal is closed — the "check the tag list" step the error
 * names — so a deliberate re-open starts a fresh create.
 *
 * Everything rendered is the shipped page: only the ClassMap, i18n, the
 * router, the analytics client, the shell and the http client are stubbed, and
 * the create answers are resolved by hand.
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const TAGS = [
  { id: 'tag-1', name: 'javascript', post_count: 3 },
  { id: 'tag-2', name: 'css', post_count: 1 },
]

interface Call {
  url: string
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
}

/** Every `http.get` the page made, each parked until the test answers it. */
const gets = vi.hoisted(() => [] as Call[])
/** Every `http.post`, with the body — what the resource validates. */
const posts = vi.hoisted(() => [] as Array<Call & { body?: unknown }>)

/**
 * The http client double. ONE object, hoisted: the page's load effect depends
 * on `http`, so a fresh object per render would re-arm the effect forever.
 */
const httpClient = vi.hoisted(() => ({
  get: (url: string) =>
    new Promise<unknown>((resolve, reject) => {
      gets.push({ url, resolve, reject })
    }),
  post: (url: string, body?: unknown) =>
    new Promise<unknown>((resolve, reject) => {
      posts.push({ url, body, resolve, reject })
    }),
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

const track = vi.hoisted(() => vi.fn())

/**
 * The key `useLocation` reports. The page closes its modal whenever it changes
 * (the location-key effect), so a test that simulates the reader navigating
 * away bumps this and re-renders — a close that does NOT pass through the
 * Cancel button's `closeModal`.
 */
const routeKey = vi.hoisted(() => ({ current: 'route-a' }))

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
vi.mock('@molecule/app-analytics', () => ({ track }))
vi.mock('@molecule/app-ui-react', () => ({
  ConfirmButton: (props: { children?: ReactNode }) =>
    createElement('button', { type: 'button' }, props.children),
}))
vi.mock('react-router', () => ({
  useNavigate: () => () => undefined,
  useLocation: () => ({ key: routeKey.current }),
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

const text = (): string => container.textContent ?? ''
const modal = (): HTMLElement | null => container.querySelector('[data-mol-id="new-tag-modal"]')
const tagRows = (): number => container.querySelectorAll('[data-mol-id^="tag-row-"]').length

async function mountWithTaxonomy(): Promise<void> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(createElement(Tags))
  })
  await flush()
  const load = gets.at(-1)
  if (!load) throw new Error('the page made no taxonomy request')
  await act(async () => {
    load.resolve({ data: { data: TAGS, total: TAGS.length } })
  })
  await flush()
  expect(tagRows(), 'the taxonomy must be on screen before the create is driven').toBe(TAGS.length)
}

/** Open the create modal and type a name, leaving nothing sent yet. */
async function openCreateAndType(name: string): Promise<void> {
  const open = container.querySelector('[data-mol-id="btn-create-tag"]')
  if (!open) throw new Error('no create control rendered')
  await act(async () => {
    open.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await flush()
  const input = container.querySelector('[data-mol-id="input-tag-name"]') as HTMLInputElement
  if (!input) throw new Error('the modal rendered no name field')
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(input, name)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await flush()
}

/** The next key {@link routeKey} reports — one per simulated route change. */
let routeSeq = 0

/**
 * Simulate the reader navigating (away and back): a new location key and a
 * re-render. The page closes its modal on a location-key change WITHOUT
 * passing through `closeModal` — the close path the unconfirmed-create latch
 * has to survive.
 */
async function navigateAwayAndBack(): Promise<void> {
  await act(async () => {
    routeSeq += 1
    routeKey.current = `route-${routeSeq}`
    root.render(createElement(Tags))
  })
  await flush()
}

async function clickSave(): Promise<void> {
  const save = container.querySelector('[data-mol-id="btn-modal-save"]')
  if (!save) throw new Error('the modal rendered no save button')
  await act(async () => {
    save.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await flush()
}

beforeEach(() => {
  gets.length = 0
  posts.length = 0
  track.mockClear()
  routeKey.current = 'route-a'
})

afterEach(async () => {
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

describe('blog Tags — a create is claimed only when the answer carries the tag', () => {
  it('a 2xx body with no tag is an unconfirmed create, never a silent success', async () => {
    await mountWithTaxonomy()
    await openCreateAndType('javascript')
    await clickSave()

    const create = posts.at(-1)
    expect(create?.url).toBe('/api/tags')
    expect(create?.body).toEqual({ name: 'javascript', color: '#6366f1' })

    // The non-answer: the handler answers 201 with the created row; a 200 `{}`
    // says nothing about whether the tag exists.
    await act(async () => {
      create?.resolve({ data: {} })
    })
    await flush()

    // The modal STAYS OPEN with the failure — it used to close as if the tag
    // had landed, over a list that showed no new row.
    expect(modal(), 'an unconfirmed create must not close the modal').not.toBeNull()
    expect(text(), 'the reader must be told the create could not be confirmed').toContain(
      'Could not confirm the tag was created',
    )
    expect(tagRows(), 'no row may be adopted from an answer that carries none').toBe(TAGS.length)
    expect(
      track,
      'no analytics event may report a create the page could not confirm',
    ).not.toHaveBeenCalled()
  })

  it('refuses a second POST until the modal is closed — the retry inserts a duplicate', async () => {
    await mountWithTaxonomy()
    await openCreateAndType('javascript')
    await clickSave()
    await act(async () => {
      posts.at(-1)?.resolve({ data: {} })
    })
    await flush()

    // Another Save of the same name is an INSERT, not a retry: refuse it.
    await clickSave()
    expect(posts.length, 'an unconfirmed create must not re-POST the same name').toBe(1)
    expect(text()).toContain('Could not confirm the tag was created')

    // Closing the modal is the "go check the list" step the error names — and
    // a deliberate re-open starts a FRESH create (the refusal is not a wedge).
    const cancel = container.querySelector('[data-mol-id="btn-modal-cancel"]')
    await act(async () => {
      cancel?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    expect(modal()).toBeNull()

    await openCreateAndType('javascript')
    await clickSave()
    expect(posts.length, 'a deliberate re-open may create afresh').toBe(2)
    await act(async () => {
      posts.at(-1)?.resolve({
        data: { id: 'tag-9', name: 'javascript', post_count: 0 },
      })
    })
    await flush()
    expect(modal(), 'the confirmed create closes the modal').toBeNull()
    expect(tagRows()).toBe(TAGS.length + 1)
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'tag.created',
        properties: expect.objectContaining({ tagId: 'tag-9' }),
      }),
    )
  })

  it('a route change that closes the modal also ends the unconfirmed create', async () => {
    await mountWithTaxonomy()
    await openCreateAndType('javascript')
    await clickSave()
    await act(async () => {
      posts.at(-1)?.resolve({ data: {} })
    })
    await flush()
    expect(text()).toContain('Could not confirm the tag was created')

    // The error sends the reader to check the tag list — in the SPA that is a
    // ROUTE CHANGE, and the page closes the modal on one through its
    // location-key effect, never through closeModal. That close path used to
    // leave the latch set, so the fresh create the reader started on their
    // return was refused with the same "could not confirm" sentence for the
    // life of the mount.
    await navigateAwayAndBack()
    expect(modal(), 'a route change closes the modal').toBeNull()

    // A deliberate re-open starts a fresh create — it must POST.
    await openCreateAndType('javascript')
    await clickSave()
    expect(posts.length, 'a fresh create after a navigation close must POST').toBe(2)
  })

  it('a confirmed create appends the row, closes the modal and reports it (the positive twin)', async () => {
    await mountWithTaxonomy()
    await openCreateAndType('react')
    await clickSave()
    await act(async () => {
      posts.at(-1)?.resolve({
        data: { id: 'tag-3', name: 'react', post_count: 0 },
      })
    })
    await flush()

    expect(modal(), 'the confirmed create closes the modal').toBeNull()
    expect(tagRows()).toBe(TAGS.length + 1)
    expect(text()).toContain('react')
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'tag.created',
        properties: expect.objectContaining({ tagId: 'tag-3' }),
      }),
    )
  })
})
