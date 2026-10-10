// @vitest-environment jsdom
/**
 * `PostEditorPage` loads each slug ONCE, guarded by a `loadedSlug` ref, so a
 * locale switch (which gives `t` a new identity and re-runs the effect) cannot
 * refill the form and discard unsaved typing.
 *
 * That guard fires on "the form already holds THIS slug's values" — but the
 * ref was left pointing at the previous slug while ANOTHER slug's load reset
 * the state (`setStatus('loading')`, `setPostId(null)`). Navigating A → B → A
 * with B still in flight therefore returned early on the trip back to A: the
 * form was still in the loading state B's run had put it in, nothing was in
 * flight any more (B's response is dropped as superseded), and the editor sat
 * on "Loading…" forever even though A had loaded a moment earlier. The ref is
 * now cleared when a different slug's load starts, so the trip back to A
 * reloads it.
 *
 * Everything is the shipped component: only the ClassMap, i18n, the markdown
 * bond and the network are stubbed, and responses are resolved by hand.
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface Pending {
  url: string
  answered: boolean
  respond: (status: number, body: unknown) => void
}

/** Every request the editor made, in order, with a handle to answer it. */
const pending = vi.hoisted(() => ({ requests: [] as Pending[] }))

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => 'stub' }),
}))

// A STABLE `t`: the real `useTranslation()` memoizes it on [provider, locale],
// so its identity changes ONLY on a locale switch. A fresh function per render
// would re-run the editor's effect (its deps are `[editingSlug, t]`) on every
// render and refetch the same slug.
const translate = vi.hoisted(
  () => (key: string, values?: Record<string, unknown>, options?: { defaultValue?: string }) =>
    (options?.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_m, name: string) =>
      String(values?.[name] ?? ''),
    ),
)

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({ t: translate }),
}))

// The markdown bond is not what is under test; rendering nothing is enough.
vi.mock('@molecule/app-markdown', () => ({
  requireProvider: () => ({ render: () => ({ html: '' }) }),
}))

const { PostEditorPage } =
  (await import('../../../templates/.agents/skills/examples/content/markdown-blog/app/pages/admin/PostEditorPage')) as {
    PostEditorPage: (props: { slug?: string }) => ReactNode
  }

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const originalFetch = globalThis.fetch

let container: HTMLElement
let root: Root

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve))
  })
}

async function render(element: ReactNode, first: boolean): Promise<void> {
  if (first) {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  }
  await act(async () => {
    root.render(element)
  })
  await flush()
}

/** Answer the oldest unanswered request whose URL ends with `fragment`. */
async function respond(fragment: string, status: number, body: unknown): Promise<void> {
  const request = pending.requests.find((r) => !r.answered && r.url.includes(fragment))
  if (!request) throw new Error(`no pending request for ${fragment}`)
  request.answered = true
  await act(async () => {
    request.respond(status, body)
  })
  await flush()
}

const text = (): string => container.textContent ?? ''
const titleInput = (): HTMLInputElement | null =>
  container.querySelector('[data-mol-id="post-title"]') as HTMLInputElement | null

const post = (id: string, title: string, slug: string): Record<string, unknown> => ({
  id,
  title,
  slug,
  body_markdown: `# ${title}`,
  draft: true,
})

beforeEach(() => {
  pending.requests.length = 0
  globalThis.fetch = ((input: unknown) =>
    new Promise((resolve) => {
      pending.requests.push({
        url: String(input),
        answered: false,
        respond: (status, body) =>
          resolve({
            ok: status >= 200 && status < 300,
            status,
            json: async () => body,
          }),
      })
    })) as typeof globalThis.fetch
})

afterEach(async () => {
  globalThis.fetch = originalFetch
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

describe('PostEditorPage — an interrupted A → B → A navigation keeps working', () => {
  it('reloads post A instead of stranding the editor on "Loading…"', async () => {
    await render(createElement(PostEditorPage, { slug: 'a' }), true)
    await respond('/api/posts/a', 200, post('p-a', 'Post A', 'a'))

    // A is loaded: the form is populated (not the loading line).
    expect(titleInput()?.value).toBe('Post A')
    expect(text()).not.toContain('Loading…')

    // Navigate to B — B's request is in flight and the form goes back to loading.
    await render(createElement(PostEditorPage, { slug: 'b' }), false)
    expect(pending.requests.map((r) => r.url)).toEqual(['/api/posts/a', '/api/posts/b'])
    expect(titleInput()).toBeNull()

    // Back to A before B ever answers. A's values are the ones the form must
    // hold again — the early return left `status` at 'loading' with B's
    // superseded response as the only thing that could have cleared it.
    await render(createElement(PostEditorPage, { slug: 'a' }), false)

    // The reload is requested…
    expect(pending.requests.map((r) => r.url)).toEqual([
      '/api/posts/a',
      '/api/posts/b',
      '/api/posts/a',
    ])
    // …and once it lands the editor shows A again, editable.
    await respond('/api/posts/a', 200, post('p-a', 'Post A', 'a'))
    expect(titleInput()?.value).toBe('Post A')
    expect(text()).not.toContain('Loading…')
  })
})
