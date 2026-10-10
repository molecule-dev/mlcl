// @vitest-environment jsdom
/**
 * `markdown-blog`'s editor and annotation slice, from three angles the shipped
 * code got wrong:
 *
 * 1. **An edit whose LOAD failed offered Save → create.** The load resets
 *    `postId` to null and, on failure, only set `status = 'error'` — but the
 *    error status still rendered the whole form, under the "Edit post" heading,
 *    and `save()` branches on `postId !== null`. The author typed a title, hit
 *    Save, and `POST /api/posts` inserted a SECOND post from a half-empty form
 *    while the post they meant to edit was untouched. The failure is now a
 *    terminal state with the retry it needs, and no form to save from.
 * 2. **Draft saved → a "View post" link that always 404s.** The link rendered
 *    for drafts too; the public route answers 404 for a draft row
 *    (`api/handlers/posts.ts`) and the index lists only published posts.
 * 3. **The hover tooltip duplicated the prompt.** `AnnotatedBody` renders each
 *    prompt ONCE in its side block and its own module rules say so ("Do not
 *    also show it in a hover popover: the reader then sees the same sentence
 *    twice"); `AnnotatedParagraph`'s tooltip carried the prompt anyway.
 *
 * Everything is the shipped component; only the ClassMap, the i18n hook and the
 * markdown provider are stubbed.
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface FetchCall {
  url: string
  method: string
  answered: boolean
  respond: (status: number, body: unknown) => void
}

const fetches = vi.hoisted(() => ({ calls: [] as FetchCall[] }))

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => undefined }),
}))

// `t` must keep ONE identity across renders, like the real `useTranslation`
// (memoized on [provider, locale]). A fresh function per render re-ran the
// editor's load effect on every render, which refetched the post forever — a
// mock artifact that hides what the component actually does.
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

// The bonded markdown renderer: the editor only calls it for the preview.
vi.mock('@molecule/app-markdown', () => ({
  requireProvider: () => ({ render: (markdown: string) => ({ html: markdown }) }),
}))

const { PostEditorPage } =
  (await import('../../../templates/.agents/skills/examples/content/markdown-blog/app/pages/admin/PostEditorPage.js')) as {
    PostEditorPage: (props: { slug?: string }) => ReactNode
  }
const { AnnotatedParagraph } =
  (await import('../../../templates/.agents/skills/examples/content/markdown-blog/app/components/AnnotatedProse.js')) as {
    AnnotatedParagraph: (props: {
      spans: Array<{ text: string; ai: boolean; prompt?: string; model?: string }>
    }) => ReactNode
  }
const { AnnotatedBody } =
  (await import('../../../templates/.agents/skills/examples/content/markdown-blog/app/components/AnnotatedBody.js')) as {
    AnnotatedBody: (props: {
      rows: Array<{ paragraphs: Array<Array<{ text: string; ai: boolean; prompt?: string }>> }>
    }) => ReactNode
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

async function respond(fragment: string, status: number, body: unknown): Promise<void> {
  const call = fetches.calls.find((c) => !c.answered && c.url.includes(fragment))
  if (!call) throw new Error(`no pending fetch for ${fragment}`)
  call.answered = true
  await act(async () => {
    call.respond(status, body)
  })
  await flush()
}

const fetchCount = (fragment: string): number =>
  fetches.calls.filter((c) => c.url.includes(fragment)).length

async function clickByMolId(id: string): Promise<void> {
  const el = container.querySelector(`[data-mol-id="${id}"]`)
  if (!el) throw new Error(`no control with data-mol-id ${id}`)
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
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

beforeEach(() => {
  fetches.calls.length = 0
  globalThis.fetch = ((input: unknown, init?: { method?: string }) =>
    new Promise((resolve) => {
      fetches.calls.push({
        url: String(input),
        method: init?.method ?? 'GET',
        answered: false,
        respond: (status, body) =>
          resolve({ ok: status >= 200 && status < 300, status, json: async () => body }),
      })
    })) as typeof globalThis.fetch
})

afterEach(async () => {
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

describe('post editor — an edit that could not load is not an edit that creates', () => {
  it('offers a retry instead of a form whose Save would POST a duplicate', async () => {
    await mount(createElement(PostEditorPage, { slug: 'my-article' }))

    await respond('/api/posts/my-article', 500, { error: 'boom' })

    expect(text()).toContain('Could not load this post')
    // No form: `postId` is null, so submitting it would take the CREATE branch.
    expect(container.querySelector('[data-mol-id="post-title"]')).toBeNull()
    expect(container.querySelector('form')).toBeNull()

    // …and the retry actually re-fetches.
    await clickByMolId('post-reload')
    expect(fetchCount('/api/posts/my-article')).toBe(2)

    // Answering the retry lands the real editor, prefilled.
    await respond('/api/posts/my-article', 200, {
      id: 'p1',
      title: 'My article',
      slug: 'my-article',
      body_markdown: 'Body',
      draft: true,
    })
    expect((container.querySelector('[data-mol-id="post-title"]') as HTMLInputElement).value).toBe(
      'My article',
    )
  })

  it('treats a 2xx body that is not a post as the failed load it is', async () => {
    await mount(createElement(PostEditorPage, { slug: 'my-article' }))

    // A 200 `{}` (an endpoint with no fixture, a rewritten answer) is not this
    // post. Installing it left `postId` at `undefined` — and `postId !== null`
    // is TRUE for undefined — so the form rendered with blank fields and Save
    // would PUT `/api/posts/undefined`. It must land on the retry state the
    // page already has for a failed load.
    await respond('/api/posts/my-article', 200, {})

    expect(text()).toContain('Could not load this post')
    expect(container.querySelector('form')).toBeNull()
    expect(container.querySelector('[data-mol-id="post-title"]')).toBeNull()
  })

  it('still saves a NEW post from the form (no edit-mode load to fail)', async () => {
    await mount(createElement(PostEditorPage, {}))
    await submitForm()
    await respond('/api/posts', 201, { id: 'p-new' })
    expect(text()).toContain('Draft saved.')
    expect(fetches.calls.some((c) => c.method === 'POST')).toBe(true)
  })
})

describe('post editor — the saved-state line only links to a page that exists', () => {
  it('shows no View post link for a draft, and one for a published post', async () => {
    await mount(createElement(PostEditorPage, {}))
    // Drafts are the default; the public route 404s one.
    await submitForm()
    await respond('/api/posts', 201, { id: 'p1' })

    expect(text()).toContain('Draft saved.')
    expect(container.querySelector('[data-mol-id="post-view-link"]')).toBeNull()

    // Publish it (uncheck, save again — the second save edits the post it
    // created) and the link is the honest thing to show.
    await clickByMolId('post-draft')
    await submitForm()
    await respond('/api/posts/p1', 200, { id: 'p1' })

    expect(text()).toContain('Post published.')
    expect(container.querySelector('[data-mol-id="post-view-link"]')).not.toBeNull()
  })
})

describe('annotated prose — the prompt appears once, in the block', () => {
  it('keeps the prompt out of the hover tooltip (model only)', async () => {
    await mount(
      createElement(AnnotatedParagraph, {
        spans: [{ text: 'machine words', ai: true, prompt: 'the human prompt', model: 'fable-5' }],
      }),
    )

    const tooltip = container.querySelector('[data-mol-id="prov-detail-0"]')
    expect(tooltip?.textContent).toContain('fable-5')
    // The duplication: the same sentence the gutter block renders.
    expect(tooltip?.textContent).not.toContain('the human prompt')
    expect(text()).not.toContain('the human prompt')
  })

  it('still renders the prompt in the section block (it is not dropped everywhere)', async () => {
    await mount(
      createElement(AnnotatedBody, {
        rows: [
          {
            paragraphs: [
              [{ text: 'machine words', ai: true, prompt: 'the human prompt', model: 'fable-5' }],
            ],
          },
        ],
      }),
    )
    expect(text()).toContain('the human prompt')
  })
})
