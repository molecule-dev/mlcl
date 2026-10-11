// @vitest-environment jsdom
/**
 * The markdown-blog editor's live preview is DEBOUNCED, not per-keystroke.
 *
 * The preview renders the WHOLE document (parse + sanitize) through the bonded
 * provider. Derived straight from the body state, the memo re-rendered it on
 * every keystroke: the total cost of typing a post grew as
 * keystrokes × document size, so a long post turned each key into a full
 * re-parse of everything typed so far — work per keystroke that scales with
 * the document, the exact shape this bound exists to stop. The render count is
 * the observable: a debounced preview renders once per PAUSE, never once per
 * key.
 *
 * @module
 */
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const markdown = vi.hoisted(() => ({ renderCalls: 0, rendered: '' }))

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => undefined }),
}))

const translate = (
  key: string,
  _values?: Record<string, unknown>,
  options?: { defaultValue?: string },
): string => options?.defaultValue ?? key

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({ t: translate }),
}))

vi.mock('@molecule/app-markdown', () => ({
  requireProvider: () => ({
    render: (body: string) => {
      markdown.renderCalls++
      markdown.rendered = body
      return { html: `<p>${body}</p>` }
    },
  }),
}))

const { PostEditorPage, PREVIEW_DEBOUNCE_MS } =
  (await import('../../../templates/.agents/skills/examples/content/markdown-blog/app/pages/admin/PostEditorPage.js')) as {
    PostEditorPage: (props: { slug?: string }) => ReactNode
    PREVIEW_DEBOUNCE_MS: number
  }

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLElement
let root: Root

const text = (): string => container.textContent ?? ''

async function mountEditor(): Promise<void> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(createElement(PostEditorPage, {}))
  })
}

async function typeBody(value: string): Promise<void> {
  const el = container.querySelector('[data-mol-id="post-body"]') as HTMLTextAreaElement
  if (!el) throw new Error('the editor rendered no body textarea')
  // The native-setter dance: React's onChange tracks the value property, so a
  // direct assignment plus a bubbling input event is what one keystroke is.
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

beforeEach(() => {
  markdown.renderCalls = 0
  markdown.rendered = ''
  vi.useFakeTimers()
})

afterEach(async () => {
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
  vi.useRealTimers()
})

describe('post editor — the live preview renders per pause, not per keystroke', () => {
  it('renders nothing while the reader is still typing, once after they pause', async () => {
    await mountEditor()

    // Five keystrokes, no pause between them.
    await typeBody('H')
    await typeBody('He')
    await typeBody('Hel')
    await typeBody('Hell')
    await typeBody('Hello')
    expect(markdown.renderCalls).toBe(0)

    await advance(PREVIEW_DEBOUNCE_MS)
    expect(markdown.renderCalls).toBe(1)
    expect(markdown.rendered).toBe('Hello')
    expect(text()).toContain('Hello')
  })

  it('a keystroke inside the window resets the timer — no render until the real pause', async () => {
    await mountEditor()

    await typeBody('abc')
    await advance(PREVIEW_DEBOUNCE_MS - 100)
    await typeBody('abcd') // inside the window: resets it
    await advance(PREVIEW_DEBOUNCE_MS - 100)
    expect(markdown.renderCalls).toBe(0)
    await advance(100)
    expect(markdown.renderCalls).toBe(1)
    expect(markdown.rendered).toBe('abcd')
  })

  it('a pending preview timer never fires into an unmounted editor', async () => {
    await mountEditor()
    await typeBody('draft text')
    await act(async () => {
      root.unmount()
    })
    await advance(PREVIEW_DEBOUNCE_MS)
    expect(markdown.renderCalls).toBe(0)
  })
})
