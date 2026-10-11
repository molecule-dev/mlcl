// @vitest-environment jsdom
/**
 * A SAVE that fails must not paint its failure under a post the author has
 * moved on from.
 *
 * `PostEditorPage`'s save path checks that the editor is still on the post the
 * save belongs to (`stillOnThisPost`, captured at submit time) after EVERY
 * await — except the body read on the `!res.ok` branch. `res.json()` is a
 * second await, so a save parked there while the author navigated to another
 * post resumed and wrote ITS error into the form: the new post's load was
 * lifted off "Loading…" onto the load-failure screen (the
 * `editingSlug && postId === null && status === 'error'` branch) carrying the
 * PREVIOUS post's save error, and offering a "Try again" that reloads a post
 * whose load had never failed.
 *
 * The real component is driven with only the ClassMap, the i18n hook and the
 * markdown provider stubbed. `fetch` is a hand-driven stub whose `json()` on
 * the failing PUT is a DEFERRED promise, so the navigation lands in exactly
 * the window between the response arriving and its body being read — the
 * window the missing guard left open.
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => undefined }),
}))

// `t` keeps ONE identity across renders, like the real `useTranslation`.
const translate = (
  key: string,
  values?: Record<string, unknown>,
  options?: { defaultValue?: string },
): string =>
  (options?.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_m, name: string) =>
    String(values?.[name] ?? ''),
  )

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({ t: translate }),
}))

vi.mock('@molecule/app-markdown', () => ({
  requireProvider: () => ({ render: (markdown: string) => ({ html: markdown }) }),
}))

const { PostEditorPage } =
  (await import('../../../templates/.agents/skills/examples/content/markdown-blog/app/pages/admin/PostEditorPage.js')) as {
    PostEditorPage: (props: { slug?: string }) => ReactNode
  }

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

interface PendingCall {
  url: string
  method: string
  /** Answer this call; `json` supplies the body-read (deferrable) behaviour. */
  respond: (status: number, json: () => Promise<unknown>) => void
}

const calls: PendingCall[] = []

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

/** The oldest unanswered call matching a method and URL fragment. */
function pendingCall(method: string, fragment: string): PendingCall {
  const call = calls.find((c) => c.method === method && c.url.includes(fragment))
  if (!call) throw new Error(`no pending ${method} for ${fragment}`)
  return call
}

/** Answer the oldest unanswered call for `fragment` with a JSON body. */
async function respond(
  method: string,
  fragment: string,
  status: number,
  body: unknown,
): Promise<void> {
  const call = pendingCall(method, fragment)
  await act(async () => {
    call.respond(status, async () => body)
  })
  await flush()
}

async function submitForm(): Promise<void> {
  const form = container.querySelector('form')
  if (!form) throw new Error('the editor rendered no form')
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  await flush()
}

afterEach(async () => {
  calls.length = 0
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

describe('post editor — a failed save belongs to the post it was sent to', () => {
  it('does not paint an old post’s save error onto the post now loading', async () => {
    calls.length = 0
    globalThis.fetch = ((input: unknown, init?: { method?: string }) =>
      new Promise((resolve) => {
        calls.push({
          url: String(input),
          method: init?.method ?? 'GET',
          respond: (status, json) => resolve({ ok: status >= 200 && status < 300, status, json }),
        })
      })) as typeof globalThis.fetch

    const A = {
      id: 'p1',
      title: 'Post A',
      slug: 'post-a',
      body_markdown: 'A body',
      draft: true,
    }
    await mount(createElement(PostEditorPage, { slug: 'post-a' }))
    await respond('GET', '/api/posts/post-a', 200, A)
    // The form is filled from post A (an input's value is not textContent).
    expect(
      (container.querySelector('[data-mol-id="post-title"]') as HTMLInputElement | null)?.value,
    ).toBe('Post A')

    // Save post A. The PUT answers 500, but its BODY read is parked — the
    // window the missing ownership check left open.
    let releaseBody: ((value: unknown) => void) | null = null
    const bodyRead = new Promise<unknown>((resolve) => {
      releaseBody = resolve
    })
    await submitForm()
    const put = pendingCall('PUT', '/api/posts/p1')
    await act(async () => {
      put.respond(500, () => bodyRead)
    })

    // The author navigates to another post while that body read is parked.
    await act(async () => {
      root.render(createElement(PostEditorPage, { slug: 'post-b' }))
    })
    await flush()
    expect(text(), 'the new post is loading').toContain('Loading')

    // Now post A's failure body lands, one await too late for the guard that
    // ran before it.
    await act(async () => {
      releaseBody?.({ error: 'post A save blew up' })
    })
    await flush()

    expect(text(), 'the failed save of post A must not replace post B’s loading state').toContain(
      'Loading',
    )
    expect(text()).not.toContain('post A save blew up')
  })
})
