// @vitest-environment jsdom
/**
 * A leaderboard whose LOAD FAILED must say so — never "No scores yet.".
 *
 * `<LeaderboardList>` owns the chrome and renders its `emptyState` whenever it
 * has no rows, so a swallowed failure handed the reader that empty state: an
 * offline / 500 answer was presented as an authoritative, genuinely-empty
 * leaderboard, indistinguishable from one. It is the same wrong answer the
 * sibling slices state at their own catches (BlogIndexPage: "a silent catch
 * would render an empty list that reads as 'the blog has no posts'";
 * SettingsPage and DeleteAccountPage load paths too) — this slice was the one
 * still swallowing it.
 *
 * Everything is the shipped component: only the ClassMap, i18n and the http
 * client are stubbed, and the failure is a real rejected request. The positive
 * twin pins that the error line is not simply always rendered.
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface Call {
  url: string
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
}

/** The `useHttpClient()` double: every call parks until the test answers it. */
const calls = vi.hoisted(() => [] as Call[])
const http = vi.hoisted(() => ({
  get: (url: string) =>
    new Promise<unknown>((resolve, reject) => {
      calls.push({ url, resolve, reject })
    }),
}))

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => 'stub' }),
}))

// ONE stable client object, like the real `useHttpClient()`: a fresh object per
// render would re-run the load effect forever. The translation double renders
// the English fallback so an assertion reads the real sentence.
vi.mock('@molecule/app-react', () => ({
  useHttpClient: () => http,
  useTranslation: () => ({
    t: (key: string, _values?: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))

// The shared list owns the empty state: render it exactly when it has no rows,
// which is what made a swallowed failure read as "there are no scores".
vi.mock('@molecule/app-leaderboard-list-react', () => ({
  LeaderboardList: (props: { title: string; emptyState: ReactNode; children?: ReactNode }) =>
    createElement(
      'section',
      null,
      createElement('h2', null, props.title),
      Array.isArray(props.children) && props.children.length === 0
        ? createElement('p', null, props.emptyState)
        : props.children,
    ),
}))

vi.mock('@molecule/app-leaderboard-row-react', () => ({
  LeaderboardRow: (props: { rank: number; name: string; score: number }) =>
    createElement('li', null, `${props.rank} ${props.name} ${props.score}`),
}))

const { Leaderboard } =
  (await import('../../../templates/.agents/skills/examples/data-display/leaderboard/app/components/Leaderboard')) as {
    Leaderboard: (props: { currentUserId?: string }) => ReactNode
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

beforeEach(() => {
  calls.length = 0
})

afterEach(async () => {
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

describe('the leaderboard example — a failed load is reported, not shown as empty', () => {
  it('reports the failure instead of rendering "No scores yet."', async () => {
    await mount(createElement(Leaderboard, { currentUserId: 'u-1' }))
    expect(calls[0]?.url).toBe('/api/leaderboard')

    await act(async () => {
      calls[0]?.reject(new Error('offline'))
    })
    await flush()

    expect(text()).toContain('Could not load the leaderboard')
    expect(text(), 'an offline load must not read as an empty board').not.toContain(
      'No scores yet.',
    )
  })

  it('reports a non-list body the same way instead of showing an empty board', async () => {
    await mount(createElement(Leaderboard, {}))
    // A 2xx that is not the list (a proxy rewrite, an endpoint with no fixture)
    // is coerced to `[]` — which renders the empty state for a board whose rows
    // simply did not arrive.
    await act(async () => {
      calls[0]?.resolve({ data: { error: 'boom' } })
    })
    await flush()

    expect(text()).toContain('Could not load the leaderboard')
    expect(text()).not.toContain('No scores yet.')
  })

  it('renders the rows a successful load returns (the positive twin)', async () => {
    await mount(createElement(Leaderboard, { currentUserId: 'u-1' }))
    await act(async () => {
      calls[0]?.resolve({
        data: [{ userId: 'u-1', rank: 1, score: 42, name: 'Ada' }],
      })
    })
    await flush()

    expect(text()).toContain('1 Ada 42')
    expect(text()).not.toContain('Could not load the leaderboard')
    expect(text()).not.toContain('No scores yet.')
  })
})
