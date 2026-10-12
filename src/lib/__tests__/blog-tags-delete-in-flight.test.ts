// @vitest-environment jsdom
/**
 * One confirm on a tag's Delete button is ONE DELETE.
 *
 * The page's `handleDelete` promise must reach `ConfirmButton` UNVOIDED: the
 * shared button stays in its pending phase while that promise is in flight and
 * ignores further clicks there. Discarding the promise (what the call site used
 * to do with `() => void handleDelete(id)`) ended the pending phase at the first
 * microtask, so the button re-armed while the DELETE was still in flight — a
 * second confirm issued a SECOND DELETE of the now-absent row, whose 404 painted
 * "Could not delete tag." over a deletion that had succeeded, and fired
 * `tag.deleted` twice.
 *
 * The mock `ConfirmButton` below implements the real component's documented
 * contract (arm → confirm → pending until the returned promise settles, clicks
 * ignored while pending) so the page is driven through the same machine the
 * shipped button runs.
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
/** Every `http.delete`, each parked — the write under test. */
const deletes = vi.hoisted(() => [] as Call[])

const httpClient = vi.hoisted(() => ({
  get: (url: string) =>
    new Promise<unknown>((resolve, reject) => {
      gets.push({ url, resolve, reject })
    }),
  post: () => Promise.resolve({ data: {} }),
  patch: () => Promise.resolve({ data: {} }),
  delete: (url: string) =>
    new Promise<unknown>((resolve, reject) => {
      deletes.push({ url, resolve, reject })
    }),
}))

const classMap = vi.hoisted(() => {
  const stub = new Proxy(function classMapStub() {}, {
    get: (_target, prop) => (prop === Symbol.toPrimitive ? () => 'stub' : stub),
    apply: () => 'stub',
  })
  return stub
})

const track = vi.hoisted(() => vi.fn())

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
/**
 * The shared button's OWN phase machine — idle → armed → pending — driven by
 * clicks, ignoring clicks while pending, and leaving pending only when
 * `onConfirm`'s returned promise settles. This is the contract the page's
 * `void` discarded: a mock that merely rendered children could not see it.
 */
vi.mock('@molecule/app-ui-react', async () => {
  const { useState } = await import('react')
  return {
    ConfirmButton: (props: {
      onConfirm: () => void | Promise<void>
      label: string
      confirmLabel: string
      pendingLabel?: string
      'data-mol-id'?: string
    }) => {
      const [phase, setPhase] = useState<'idle' | 'armed' | 'pending'>('idle')
      const onClick = (): void => {
        if (phase === 'pending') return
        if (phase === 'idle') {
          setPhase('armed')
          return
        }
        setPhase('pending')
        void (async () => {
          await props.onConfirm()
          setPhase('idle')
        })()
      }
      return createElement(
        'button',
        {
          type: 'button',
          'data-mol-id': props['data-mol-id'],
          onClick,
          'data-phase': phase,
        },
        phase === 'pending' ? (props.pendingLabel ?? 'Working…') : props.label,
      )
    },
  }
})
vi.mock('react-router', () => ({
  useNavigate: () => () => undefined,
  useLocation: () => ({ key: routeKey.current }),
}))
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
}

/**
 * The tag row's delete button, found by ATTRIBUTE VALUE (the selector engine
 * does not match non-ASCII ids reliably in this jsdom).
 */
function deleteButton(tagId: string): HTMLButtonElement {
  const id = `button-delete-${tagId}`
  const button = [...container.querySelectorAll('button[data-mol-id]')].find(
    (node) => node.getAttribute('data-mol-id') === id,
  )
  if (!button) throw new Error(`no delete button rendered for ${tagId}`)
  return button as HTMLButtonElement
}

async function click(node: Element): Promise<void> {
  await act(async () => {
    node.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await flush()
}

beforeEach(() => {
  gets.length = 0
  deletes.length = 0
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

describe('blog Tags — one confirm is one DELETE', () => {
  it('clicks ignored while the first DELETE is in flight — the row is deleted, not scolded', async () => {
    await mountWithTaxonomy()

    // Arm, then confirm: the DELETE parks in flight, the button stays pending.
    await click(deleteButton('tag-1'))
    await click(deleteButton('tag-1'))
    expect(deletes, 'the confirm issued the DELETE').toHaveLength(1)
    expect(deleteButton('tag-1').getAttribute('data-phase')).toBe('pending')

    // A double-click on a slow server: re-arm + confirm while the first DELETE
    // is still in flight. The pending phase must ignore both clicks.
    await click(deleteButton('tag-1'))
    await click(deleteButton('tag-1'))
    expect(deletes, 'a re-click must not fire a second DELETE of the same row').toHaveLength(1)

    // The DELETE lands: the row leaves the list, no error, one analytics event.
    await act(async () => {
      deletes[0]?.resolve({ data: {} })
    })
    await flush()

    expect(text(), 'a successful delete must not be reported as a failure').not.toContain(
      'Could not delete tag.',
    )
    expect(text()).not.toContain('javascript')
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'tag.deleted',
        properties: expect.objectContaining({ tagId: 'tag-1' }),
      }),
    )
  })
})
