// @vitest-environment jsdom
/**
 * One click on a reaction chip is ONE write.
 *
 * `toggle()` decides add-vs-remove from the last SYNCED summary, which only
 * updates when its own resync (`load()`) resolves. The shared `<EmojiReactions>`
 * types `onToggle` as returning `void` and calls it from a bare `onClick`, so it
 * cannot know a write is pending — a second click on the same chip therefore
 * read the same `reactedByMe` and fired the SAME write again (two adds for one
 * gesture, leaving the chip reading "👍2" from a single user).
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface HttpCall {
  path: string
  body?: unknown
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
}

/** The `useHttpClient()` double: every call parks until the test answers it. */
const getCalls = vi.hoisted(() => [] as HttpCall[])
const postCalls = vi.hoisted(() => [] as HttpCall[])
const deleteCalls = vi.hoisted(() => [] as HttpCall[])
const http = vi.hoisted(() => ({
  get: (path: string) =>
    new Promise<unknown>((resolve, reject) => {
      getCalls.push({ path, resolve, reject })
    }),
  post: (path: string, body?: unknown) =>
    new Promise<unknown>((resolve, reject) => {
      postCalls.push({ path, body, resolve, reject })
    }),
  delete: (path: string) =>
    new Promise<unknown>((resolve, reject) => {
      deleteCalls.push({ path, resolve, reject })
    }),
}))

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => 'stub' }),
}))
vi.mock('@molecule/app-react', () => ({
  useHttpClient: () => http,
}))
// The chip row is not what is under test: render a button per chip so a test can
// drive `onToggle` (the shared component's REAL contract — a bare onClick).
vi.mock('@molecule/app-emoji-reactions-react', () => ({
  EmojiReactions: (props: {
    reactions: Array<{ emoji: string; count: number }>
    onToggle?: (emoji: string) => void
  }) =>
    createElement(
      'ul',
      null,
      props.reactions.map((reaction) =>
        createElement(
          'li',
          { key: reaction.emoji },
          `${reaction.emoji}${reaction.count}`,
          createElement(
            'button',
            {
              onClick: () => props.onToggle?.(reaction.emoji),
              'data-mol-id': `toggle-${reaction.emoji}`,
            },
            'toggle',
          ),
        ),
      ),
    ),
}))

const { ReactionBar } =
  (await import('../../../templates/.agents/skills/examples/messaging/emoji-reactions/app/components/ReactionBar.js')) as {
    ReactionBar: (props: { resourceType: string; resourceId: string }) => ReactNode
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
 * The chip button for `emoji`, found by ATTRIBUTE VALUE rather than by a CSS
 * attribute selector.
 *
 * `querySelector('[data-mol-id="toggle-👍"]')` matches NOTHING in this jsdom
 * (the selector engine's handling of the astral emoji — the element is there,
 * `button[data-mol-id]` finds it, and its attribute reads exactly
 * `toggle-👍`), so a test that drives the toggle through such a selector clicks
 * an absent element and passes without exercising anything. Discovering the
 * node in JS keeps the emoji out of the selector.
 */
function chipButton(emoji: string): Element | undefined {
  const id = `toggle-${emoji}`
  return [...container.querySelectorAll('button[data-mol-id]')].find(
    (button) => button.getAttribute('data-mol-id') === id,
  )
}

async function clickToggle(emoji: string): Promise<void> {
  const chip = chipButton(emoji)
  if (!chip) throw new Error(`no chip rendered for ${emoji}`)
  await act(async () => {
    chip.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await flush()
}

async function answerGet(index: number, body: unknown): Promise<void> {
  const call = getCalls[index]
  if (!call) throw new Error(`no parked GET at index ${index}`)
  await act(async () => {
    call.resolve(body)
  })
  await flush()
}

beforeEach(() => {
  getCalls.length = 0
  postCalls.length = 0
  deleteCalls.length = 0
})

afterEach(async () => {
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

describe('the reaction bar', () => {
  it('a second click on the same chip while the toggle is in flight writes once', async () => {
    await mount(createElement(ReactionBar, { resourceType: 'post', resourceId: 'p1' }))
    // The viewer has NOT reacted yet, so the first write is a POST (add).
    await answerGet(0, { data: { total: 1, counts: { '👍': 1 }, userReactions: [] } })
    expect(text()).toContain('👍1')

    await clickToggle('👍')
    // The write is parked. A second click must not fire it again — the summary
    // has not resynced, so it would read the same `reactedByMe: false`.
    await clickToggle('👍')

    expect(
      postCalls.filter((c) => c.path === '/api/post/p1/reactions'),
      'one add, not two',
    ).toHaveLength(1)
    expect(deleteCalls).toHaveLength(0)

    // The write lands and the resync reads the new summary: the chip is now the
    // viewer's, and a further click is a REMOVE — the guard released.
    await act(async () => {
      postCalls[0]?.resolve({ ok: true })
    })
    await flush()
    await answerGet(1, { data: { total: 2, counts: { '👍': 2 }, userReactions: ['👍'] } })
    expect(text()).toContain('👍2')

    await clickToggle('👍')
    expect(
      deleteCalls.filter((c) => c.path.includes('type=')),
      'the next click removes',
    ).toHaveLength(1)
  })

  it('a failed toggle releases the slot, so the chip is clickable again', async () => {
    await mount(createElement(ReactionBar, { resourceType: 'post', resourceId: 'p1' }))
    await answerGet(0, { data: { total: 1, counts: { '👍': 1 }, userReactions: [] } })

    await clickToggle('👍')
    await act(async () => {
      postCalls[0]?.reject(new Error('HTTP 500'))
    })
    await flush()
    await answerGet(1, { data: { total: 1, counts: { '👍': 1 }, userReactions: [] } })

    // The failed toggle released its slot: a retry issues a new write.
    await clickToggle('👍')
    expect(postCalls, 'the guard must not stick after a failure').toHaveLength(2)
  })
})
