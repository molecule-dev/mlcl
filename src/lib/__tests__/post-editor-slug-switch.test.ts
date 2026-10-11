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
  /** The parsed request body, so a test can assert WHAT was sent. */
  body?: unknown
  method: string | undefined
  answered: boolean
  respond: (status: number, body: unknown) => void
  /** Reject the request the way a failed network does. */
  fail: (error: Error) => void
}

/** Every request the editor made, in order, with a handle to answer it. */
const pending = vi.hoisted(() => ({ requests: [] as Pending[] }))

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => 'stub' }),
}))

// A STABLE `t`: the real `useTranslation()` memoizes it on [provider, locale],
// so its identity changes ONLY on a locale switch. A fresh function per render
// would re-run the editor's effect (its deps are `[editingSlug, t, reloadKey]`)
// on every render and refetch the same slug. `version` is the test's
// locale-switch lever: bumping it hands out a NEW function identity (the effect
// re-runs with the slug unchanged — exactly what a locale switch does), while
// every other render gets the SAME object back.
const translate = vi.hoisted(() => {
  const byVersion = new Map<
    number,
    (key: string, values?: Record<string, unknown>, options?: { defaultValue?: string }) => string
  >()
  const version = { current: 0 }
  return {
    version,
    for: (
      v: number,
    ): ((
      key: string,
      values?: Record<string, unknown>,
      opts?: { defaultValue?: string },
    ) => string) => {
      const existing = byVersion.get(v)
      if (existing) return existing
      const fn = (
        key: string,
        values?: Record<string, unknown>,
        options?: { defaultValue?: string },
      ): string =>
        (options?.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_m, name: string) =>
          String(values?.[name] ?? ''),
        )
      byVersion.set(v, fn)
      return fn
    },
  }
})

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({ t: translate.for(translate.version.current) }),
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

/** Reject the oldest unanswered request the way a failed network does. */
async function rejectPending(): Promise<void> {
  const request = pending.requests.find((r) => !r.answered)
  if (!request) throw new Error('no pending request to reject')
  request.answered = true
  await act(async () => {
    request.fail(new Error('network down'))
  })
  await flush()
}

/** Type into an editor field the way a user does (native setter + input event). */
async function typeInto(selector: string, value: string): Promise<void> {
  const input = container.querySelector(selector) as (HTMLInputElement | HTMLTextAreaElement) | null
  if (!input) throw new Error(`no field matching ${selector}`)
  const proto =
    input instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  await act(async () => {
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await flush()
}

/** Submit the editor form (the real onSubmit path). */
async function submitEditor(): Promise<void> {
  const form = container.querySelector('form')
  if (!form) throw new Error('the editor rendered no form')
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  await flush()
}

const post = (id: string, title: string, slug: string): Record<string, unknown> => ({
  id,
  title,
  slug,
  body_markdown: `# ${title}`,
  draft: true,
})

beforeEach(() => {
  pending.requests.length = 0
  translate.version.current = 0
  globalThis.fetch = ((input: unknown, init?: { body?: unknown; method?: string }) =>
    new Promise((resolve, reject) => {
      pending.requests.push({
        url: String(input),
        body: safeJson(init?.body),
        method: init?.method,
        answered: false,
        respond: (status, body) =>
          resolve({
            ok: status >= 200 && status < 300,
            status,
            json: async () => body,
          }),
        fail: reject,
      })
    })) as typeof globalThis.fetch
})

/** Parse a captured request body, or null when it carried none / invalid JSON. */
function safeJson(raw: unknown): unknown {
  if (typeof raw !== 'string') return null
  try {
    return JSON.parse(raw) as unknown
  } catch (_error) {
    // A body this suite did not write as JSON is "no parseable body" — what
    // the null return means to callers.
    return null
  }
}

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

describe('PostEditorPage — save()', () => {
  it('creates a new post, then PUTs the second save to the id the create answered', async () => {
    // save() was dead code to the suite: no test submitted the form, so the
    // create-vs-PUT switch, the id it adopts from the response and the saved
    // state were all unpinned.
    await render(createElement(PostEditorPage, {}), true)
    await typeInto('[data-mol-id="post-title"]', 'Fresh post')
    await typeInto('[data-mol-id="post-body"]', '# Body')
    await submitEditor()

    const createRequest = pending.requests[0]
    expect(createRequest?.url).toBe('/api/posts')
    expect(createRequest?.method).toBe('POST')
    expect(createRequest?.body).toEqual({
      title: 'Fresh post',
      slug: 'fresh-post',
      body_markdown: '# Body',
      draft: true,
    })
    await respond('/api/posts', 201, { id: 'p-new' })

    expect(text()).toContain('Draft saved.')
    // The second save must be a PUT to the id the create returned — the
    // create/rename switch rides on that id being adopted.
    await submitEditor()
    const updateRequest = pending.requests[1]
    expect(updateRequest?.url).toBe('/api/posts/p-new')
    expect(updateRequest?.method).toBe('PUT')
    await respond('/api/posts/p-new', 200, { id: 'p-new' })
    expect(text()).toContain('Draft saved.')
  })

  it('a save that resolves AFTER the editor moved to another slug is not adopted', async () => {
    // The editor instance outlives a slug change (its own contract), so a save
    // parked on post A can answer after the author has moved to post B. The
    // response then adopted A's id into a form holding B's fields, and the next
    // Save PUT A's id with B's title/slug/body — overwriting the post the author
    // had left. The load effect already drops a superseded GET; a save needed the
    // same ownership guard.
    await render(createElement(PostEditorPage, { slug: 'a' }), true)
    await respond('/api/posts/a', 200, post('p-a', 'Post A', 'a'))

    // Save post A — the PUT parks.
    await submitEditor()
    expect(pending.requests.at(-1)?.url).toBe('/api/posts/p-a')

    // Navigate to B; B's load resolves while A's PUT has not.
    await render(createElement(PostEditorPage, { slug: 'b' }), false)
    await respond('/api/posts/b', 200, post('p-b', 'Post B', 'b'))
    expect(titleInput()?.value).toBe('Post B')

    // A's PUT finally answers. It belongs to the post the author left.
    await respond('/api/posts/p-a', 200, { id: 'p-a' })

    // The proof: the next Save must PUT the post on screen, not the abandoned one.
    await submitEditor()
    const puts = pending.requests.filter((request) => request.method === 'PUT')
    expect(puts.at(-1)?.url).toBe('/api/posts/p-b')
  })

  it('surfaces an error body and clears the saving state on a failed save', async () => {
    await render(createElement(PostEditorPage, { slug: 'a' }), true)
    await respond('/api/posts/a', 200, post('p-a', 'Post A', 'a'))

    await submitEditor()
    await respond('/api/posts/p-a', 409, { error: 'slug already taken' })

    expect(text()).toContain('slug already taken')
    const button = container.querySelector('[data-mol-id="post-save"]') as HTMLButtonElement | null
    expect(button?.disabled).toBe(false)
    expect(text()).not.toContain('Saving…')
  })

  it('a REJECTED save frees the form — never stuck on "Saving…" forever', async () => {
    // save()'s own comment promises the catch: "a rejected fetch must not
    // leave the form stuck on 'Saving…'". No fetch double could reject, so
    // deleting the catch kept every test green over a wedged editor.
    await render(createElement(PostEditorPage, {}), true)
    await typeInto('[data-mol-id="post-title"]', 'Offline post')
    await typeInto('[data-mol-id="post-body"]', '# Body')
    await submitEditor()
    await rejectPending()

    expect(text()).toContain('Could not save the post')
    const button = container.querySelector('[data-mol-id="post-save"]') as HTMLButtonElement | null
    expect(button?.disabled).toBe(false)
    expect(text()).not.toContain('Saving…')
  })
})

describe('PostEditorPage — the slug prop DROPPED on the same instance (the create screen)', () => {
  it('forgets the edited post, so Save creates instead of overwriting it', async () => {
    // The component's own contract is "pass a `slug` to edit that post; omit it
    // to create a new one" — and a caller that mounts ONE editor and toggles
    // that prop (an optional route param, or `{editing ? <A slug={id}/> :
    // <A/>}`) reuses this instance with the slug dropped. The load effect
    // returned on `!editingSlug` BEFORE any of its resets, so the form kept the
    // post it was editing while the heading said "New post": save() read the
    // stale `postId` and PUT that post's id with its own loaded values — the
    // author was shown a new-post screen and silently overwrote an existing
    // post. This drives the real reused instance, as the A → B → A suite above
    // does.
    await render(createElement(PostEditorPage, { slug: 'a' }), true)
    await respond('/api/posts/a', 200, post('p-a', 'Post A', 'a'))
    expect(titleInput()?.value).toBe('Post A')

    await render(createElement(PostEditorPage, {}), false)
    expect(text()).toContain('New post')
    // The form no longer holds the post that was being edited.
    expect(titleInput()?.value).toBe('')

    await typeInto('[data-mol-id="post-title"]', 'Brand new')
    await typeInto('[data-mol-id="post-body"]', '# Body')
    await submitEditor()

    const save = pending.requests.find((request) => request.method !== undefined)
    expect(save?.url, 'a create screen must POST a new post').toBe('/api/posts')
    expect(save?.method).toBe('POST')
    // The load's own GET is the only other request; nothing may have PUT.
    expect(pending.requests.some((request) => request.method === 'PUT')).toBe(false)
  })

  it('keeps the author’s typing when an unrelated dep re-runs the effect (a locale switch)', async () => {
    // The reset keys on the slug TRANSITION, not on "no slug": a re-run that did
    // not change the mode — the real `useTranslation` hands out a NEW `t` on a
    // locale switch, which is a dep of this effect — must not wipe a draft the
    // author is writing. Without this, "reset whenever there is no slug" would
    // look correct and lose typed text on every locale switch.
    await render(createElement(PostEditorPage, {}), true)
    await typeInto('[data-mol-id="post-title"]', 'Half-written')

    translate.version.current += 1 // the locale switch: a new `t` identity
    await render(createElement(PostEditorPage, {}), false)

    expect(titleInput()?.value).toBe('Half-written')
  })
})
