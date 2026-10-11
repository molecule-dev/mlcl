import { type FormEvent, type ReactElement, useEffect, useMemo, useRef, useState } from 'react'

import { requireProvider } from '@molecule/app-markdown'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

type Status = 'idle' | 'loading' | 'saving' | 'saved' | 'error'

/**
 * How long the live preview waits after the last keystroke before it re-renders.
 *
 * The preview renders the WHOLE document (parse + sanitize) through the bonded
 * provider, so deriving it straight from `bodyMarkdown` re-rendered everything
 * typed so far on EVERY keystroke: the total typing cost grew as
 * keystrokes × document size, and a long post turned each key into a visible
 * lag. The trailing debounce keeps the preview live while bounding the renders
 * to one per pause — the value it shows is at most this far behind the
 * textarea. Exported so the regression suite can pin the behavior against it.
 */
export const PREVIEW_DEBOUNCE_MS = 300

type LoadedPost = {
  id: string
  title: string
  slug: string
  body_markdown: string
  draft: boolean
}

// Turns "Why we chose Postgres" into "why-we-chose-postgres": lowercase, digits
// and single dashes — the shape the posts handler's slug schema accepts. Two
// titles it cannot turn into a valid slug, where the author must type one: a
// ONE-character title ("A" → "a", and that schema requires at least two
// characters, so Save answers 400), and a title with no ASCII letters or digits
// at all ("Привет" → "", which the input's `required` blocks). Both are
// surfaced — as a save error or a disabled save — never submitted silently.
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z\d]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Author-only editor. Pass a `slug` to edit that post (loaded via
 * `GET /api/posts/:slug`); omit it to create a new one. Saving POSTs
 * (create) or PUTs (edit) to the real posts endpoint in api/handlers/posts.ts.
 */
export function PostEditorPage({ slug: editingSlug }: { slug?: string } = {}): ReactElement {
  const { t } = useTranslation()
  const [postId, setPostId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [bodyMarkdown, setBodyMarkdown] = useState('')
  const [draft, setDraft] = useState(true)
  const [status, setStatus] = useState<Status>(editingSlug ? 'loading' : 'idle')
  const [error, setError] = useState<string | null>(null)
  // Bumped by the "Try again" control below. The load effect keys on it, which
  // is what makes a FAILED load retryable — `loadedSlug` is null after a
  // failure, so without a changing dep nothing would ever re-run the fetch.
  const [reloadKey, setReloadKey] = useState(0)
  /**
   * A CREATE whose answer could not be confirmed: the POST may have created a
   * post, but the 2xx body carried no id, so the editor cannot adopt it.
   *
   * `save()` is not idempotent in create mode — it POSTs `/api/posts`, which
   * INSERTS. With `postId` still null the next Save took the create branch again
   * and inserted a SECOND copy of the same post: a create whose answer the
   * editor did not understand was treated as one it could retry. Checked in
   * `save()` before it POSTs, and set there when the body carries no id.
   */
  const createUnconfirmed = useRef(false)

  /**
   * What an UNCONFIRMED create tells the author — one wording, used by both ways
   * a create can end up unconfirmed: a 2xx answer carrying no id, and a request
   * that never reached an answer at all.
   */
  const unconfirmedCreateMessage = (): string =>
    t('postEditor.createUnconfirmed', undefined, {
      defaultValue:
        'Could not confirm the save — the post may or may not have been created. Check the post list before saving again.',
    })

  // Edit mode: load the post's current values so the author edits, not clobbers.
  const loadedSlug = useRef<string | null>(null)
  /**
   * The slug the CURRENT render belongs to.
   *
   * The load effect already drops a superseded response (`cancelled`), but a SAVE
   * is an equally long request and had no such guard: the editor outlives a slug
   * change (the contract at the top of this file), so a save parked on post A
   * that resolved AFTER the author moved to post B adopted A's id into a form
   * holding B's fields (`if (saved?.id) setPostId(saved.id)`) — and the next Save
   * then PUT `/api/posts/<A>` with B's title/slug/body, overwriting the post the
   * author had left. Same ownership rule the sibling slices apply through their
   * mounted-for refs.
   */
  const editingSlugRef = useRef(editingSlug)
  editingSlugRef.current = editingSlug
  /**
   * Bumped on every SLUG TRANSITION, and the second half of a save's ownership
   * test ({@link stillOnThisPost} in `save`).
   *
   * The slug NAME alone cannot carry that test: a save parked on post A that
   * resolves after the author went A → B → A matches the name it was sent under
   * — and so does a create-mode save (slug `undefined`) that resolves after the
   * author went create → B → create. Adopting the create's answer into the
   * fresh, reset form put the created post's id in a `postId` the form's blank
   * fields do not describe: the next Save PUT that id with the new text and
   * silently overwrote a post the author never opened. The ticket is bumped by
   * exactly the events that end a save's scope — every slug change, including
   * the transition into create mode — so a save that outlives ANY of them is
   * dropped (the same monotonic ticket the in-app-chat slice's send uses).
   */
  const editorGeneration = useRef(0)
  // The slug the PREVIOUS effect run saw. It separates the transition INTO create
  // mode (a slug, then no slug) from every other re-run of this effect (a locale
  // switch, the "Try again" button) — only the transition may reset the form.
  const previousSlug = useRef<string | undefined>(editingSlug)
  useEffect(() => {
    const slugChanged = previousSlug.current !== editingSlug
    previousSlug.current = editingSlug
    if (slugChanged) editorGeneration.current += 1
    if (!editingSlug) {
      // CREATE mode — and the SAME instance can be reused for it. The documented
      // contract is "pass a `slug` to edit that post; omit it to create a new
      // one", and a caller that mounts ONE editor and toggles the prop (a route
      // with an optional param, or `{editing ? <PostEditorPage slug={id}/> :
      // <PostEditorPage/>}`) reuses this instance with the slug dropped. Without
      // the reset below the form kept the post it was editing: `postId` was
      // still that post's id, so `save()` took the EDIT branch and PUT the old
      // post's id with the old post's values — the author was shown a "New post"
      // heading and silently overwrote an existing post. Reset to the blank
      // create state, and forget the loaded slug, on THAT transition only, so a
      // re-run that did not change the mode still cannot discard typed text.
      if (slugChanged) {
        loadedSlug.current = null
        createUnconfirmed.current = false
        setPostId(null)
        setTitle('')
        setSlug('')
        setSlugEdited(false)
        setBodyMarkdown('')
        setDraft(true)
        setError(null)
        setStatus('idle')
      }
      return
    }
    // Load each slug ONCE. This effect also re-runs when `t` changes identity (a
    // locale switch — see useTranslation), and an unguarded reload there would
    // discard the author's unsaved typing by refilling the form from the server.
    if (loadedSlug.current === editingSlug) return
    // Entering a different post: go back to the loading state, forget the
    // PREVIOUS post's id (so a save during the load cannot PUT the old post with
    // the new one's half-loaded fields) — and forget that the OLD slug was
    // loaded. The marker means "the form currently holds THIS slug's values",
    // and the resets below invalidate exactly that; without clearing it too,
    // navigating A → B → A (with B still in flight) returned early on the trip
    // back to A — `loadedSlug` still said A — and left the editor on
    // "Loading…" forever, with nothing left to resolve it.
    loadedSlug.current = null
    setStatus('loading')
    setPostId(null)
    // A superseded load must not populate the form: an older post's response can
    // land after a newer one's and refill the editor with the wrong content.
    let cancelled = false
    fetch(`/api/posts/${editingSlug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((body: unknown) => {
        // A 2xx proves the route ANSWERED, not that the body is a post: an
        // endpoint with no fixture answers 200 `{}`, and installing that set
        // `postId` to `undefined` — for which `postId !== null` is TRUE, so Save
        // took the edit branch and PUT `/api/posts/undefined` with blank fields
        // instead of landing on the "no post to edit" state the retry guard
        // below guarantees. `GET /api/posts/:slug` answers with the post itself
        // (api/handlers/posts.ts), so anything else is the failed load the catch
        // below already handles.
        const post = (body ?? {}) as Partial<LoadedPost>
        if (
          typeof post.id !== 'string' ||
          typeof post.slug !== 'string' ||
          // `title` belongs in the gate: it is a REQUIRED part of the post the
          // API returns and the type of the form's `title` state. A body
          // omitting it installed `undefined` into that state (React turns the
          // controlled input uncontrolled) and `save()` then serialised
          // `{"title": undefined}` — JSON.stringify DROPS the key, so the PUT
          // silently cleared the existing title.
          typeof post.title !== 'string' ||
          typeof post.body_markdown !== 'string'
        ) {
          throw new Error('load-post: the response is not a post')
        }
        return post as LoadedPost
      })
      .then((post) => {
        if (cancelled) return
        // Recorded only once the values actually landed — an in-flight load that
        // a re-run supersedes (a locale switch) must not be marked done, or the
        // form would sit on "Loading…" with nothing left to fill it.
        loadedSlug.current = editingSlug
        setPostId(post.id)
        setTitle(post.title)
        setSlug(post.slug)
        setSlugEdited(true)
        setBodyMarkdown(post.body_markdown)
        setDraft(Boolean(post.draft))
        setStatus('idle')
      })
      .catch(() => {
        if (cancelled) return
        setError(
          t('postEditor.loadFailed', undefined, { defaultValue: 'Could not load this post' }),
        )
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [editingSlug, t, reloadKey])

  // Auto-suggest a slug from the title until the author edits the slug directly.
  function onTitleChange(value: string): void {
    setTitle(value)
    if (!slugEdited) setSlug(slugify(value))
  }

  // Live markdown preview through the bonded provider — sanitised (XSS-safe),
  // exactly as PostPage renders the published post — rendered from a DEBOUNCED
  // copy of the body, never the body itself (see PREVIEW_DEBOUNCE_MS): keyed on
  // the body, the memo re-parsed and re-sanitised the whole document on every
  // keystroke, a cost that grows with the post exactly while the reader is
  // typing it. The timer resets on every change, so only a PAUSE commits; the
  // cleanup clears a pending one on unmount so it never fires into a gone
  // component.
  const [previewSource, setPreviewSource] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setPreviewSource(bodyMarkdown), PREVIEW_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [bodyMarkdown])

  const previewHtml = useMemo(() => {
    if (!previewSource) return ''
    return requireProvider().render(previewSource, { gfm: true, sanitize: true }).html
  }, [previewSource])

  async function save(e: FormEvent): Promise<void> {
    e.preventDefault()
    setStatus('saving')
    setError(null)
    // The editor this save belongs to (see editingSlugRef and editorGeneration):
    // every state write after the await below is skipped once the author has
    // moved on, so a late save cannot adopt another post's id into this form —
    // or paint its failure under a post nobody tried to save. The name compare
    // alone cannot see a navigation that CAME BACK (A → B → A, or create → B →
    // create, where the names match again), so the generation ticket settles it.
    const slugAtSave = editingSlug
    const generationAtSave = editorGeneration.current
    const stillOnThisPost = (): boolean =>
      editingSlugRef.current === slugAtSave && editorGeneration.current === generationAtSave
    // A create the PREVIOUS save could not confirm must not be POSTed again:
    // `editing` is false for as long as `postId` is null, so a retry takes the
    // create branch again and INSERTs a duplicate of the post the first POST may
    // already have created (see createUnconfirmed). Refuse until the author has
    // checked whether the post exists (reloading the editor clears it).
    if (postId === null && createUnconfirmed.current) {
      setError(unconfirmedCreateMessage())
      setStatus('error')
      return
    }
    // Every failure path sets the `error` status (which also clears the
    // saving flag) — a rejected fetch (offline, server restart) must not
    // leave the form stuck on "Saving…" with the button disabled forever.
    try {
      const editing = postId !== null
      const res = await fetch(editing ? `/api/posts/${postId}` : '/api/posts', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, slug, body_markdown: bodyMarkdown, draft }),
      })
      if (!stillOnThisPost()) return
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        // The body read is a SECOND await, so the ownership guard has to be
        // applied again here — the same re-check the success path below makes
        // after its own `res.json()`. Without it a save that failed while the
        // author moved to another post painted ITS error into the post they
        // moved to: the editor was lifted off "Loading…" onto the load-failure
        // screen (with the previous post's save error under the new one), for a
        // save that belonged to a post nobody is looking at.
        if (!stillOnThisPost()) return
        setError(
          body.error ??
            t('postEditor.saveFailed', undefined, { defaultValue: 'Could not save the post' }),
        )
        setStatus('error')
        return
      }
      const saved = (await res.json().catch(() => null)) as { id?: string } | null
      if (!stillOnThisPost()) return
      if (!editing) {
        // A CREATE is confirmed only by the created post's OWN id — a 2xx
        // proves the route answered, not that a body describing the new post
        // came back (`{}`, a proxy's answer, a shim all parse as happily as the
        // row does; the load path above refuses exactly that shape). The id is
        // load-bearing here: it is what turns the NEXT save into an edit of the
        // post just created instead of a second POST. Claiming "Draft saved." /
        // "Post published." without it reported a write the editor could not
        // confirm — and the retry the message invites inserted a duplicate.
        const createdId = typeof saved?.id === 'string' && saved.id.length > 0 ? saved.id : null
        if (createdId === null) {
          createUnconfirmed.current = true
          setError(unconfirmedCreateMessage())
          setStatus('error')
          return
        }
        setPostId(createdId)
      }
      setStatus('saved')
    } catch (_error) {
      if (!stillOnThisPost()) return
      // A CREATE whose request never reached an ANSWER is an unconfirmed create,
      // not a failed one. `fetch` rejects only when the request could not be
      // completed (offline, a timeout, the connection dropped, a proxy that
      // answered nothing) — which says nothing about the server side: the POST
      // may have inserted the row before the answer was lost, and `postId` is
      // still null, so the next Save takes the create branch again and inserts a
      // SECOND copy (the endpoint has no idempotency key). Same latch and same
      // wording as the 2xx-without-an-id case above. An EDIT's retry is a PUT of
      // the same values, which is idempotent, so only the create branch latches.
      if (postId === null) {
        createUnconfirmed.current = true
        setError(unconfirmedCreateMessage())
        setStatus('error')
        return
      }
      setError(t('postEditor.saveFailed', undefined, { defaultValue: 'Could not save the post' }))
      setStatus('error')
    }
  }

  if (status === 'loading') {
    return (
      <p className={cm.textMuted}>{t('common.loading', undefined, { defaultValue: 'Loading…' })}</p>
    )
  }

  // An EDIT whose load failed has no post to edit: `postId` is still null, so
  // rendering the form would offer a Save that takes the CREATE branch (POST
  // /api/posts) — a half-empty duplicate inserted from the editor, with the
  // original untouched. The page says what happened and offers the retry it
  // needs instead of the form. (A CREATE — no `editingSlug` — has no load to
  // fail; a SAVE failure keeps the form, so the author can fix and resubmit.)
  if (editingSlug && postId === null && status === 'error') {
    return (
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), cm.sp('p', 6))}>
        <p className={cm.textError}>
          {error ??
            t('postEditor.loadFailed', undefined, { defaultValue: 'Could not load this post' })}
        </p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className={cm.button({})}
          data-mol-id="post-reload"
        >
          {t('postEditor.retryLoad', undefined, { defaultValue: 'Try again' })}
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={save}
      className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), cm.sp('p', 6))}
      style={{ maxWidth: '40rem' }}
    >
      <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
        {editingSlug
          ? t('postEditor.editTitle', undefined, { defaultValue: 'Edit post' })
          : t('postEditor.newTitle', undefined, { defaultValue: 'New post' })}
      </h1>

      <label htmlFor="post-title" className={cm.label({ required: true })}>
        {t('postEditor.titleLabel', undefined, { defaultValue: 'Title' })}
      </label>
      <input
        id="post-title"
        required
        maxLength={300}
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder={t('postEditor.titlePlaceholder', undefined, {
          defaultValue: 'Why we chose Postgres',
        })}
        className={cm.input({})}
        data-mol-id="post-title"
      />

      <label htmlFor="post-slug" className={cm.label({ required: true })}>
        {t('postEditor.slugLabel', undefined, { defaultValue: 'Slug' })}
      </label>
      <input
        id="post-slug"
        required
        value={slug}
        onChange={(e) => {
          setSlug(e.target.value)
          setSlugEdited(true)
        }}
        placeholder="why-we-chose-postgres"
        className={cm.input({})}
        data-mol-id="post-slug"
      />
      <p className={cm.formHint}>
        {t('postEditor.slugHint', undefined, { defaultValue: 'Used in the URL: /blog/your-slug' })}
      </p>

      <label htmlFor="post-body" className={cm.label({ required: true })}>
        {t('postEditor.bodyLabel', undefined, { defaultValue: 'Body (Markdown)' })}
      </label>
      <textarea
        id="post-body"
        required
        rows={14}
        value={bodyMarkdown}
        onChange={(e) => setBodyMarkdown(e.target.value)}
        placeholder={t('postEditor.bodyPlaceholder', undefined, {
          defaultValue: '# Heading\n\nWrite your post in **markdown**…',
        })}
        className={cm.textarea({})}
        data-mol-id="post-body"
      />

      <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
        <input
          type="checkbox"
          checked={draft}
          onChange={(e) => setDraft(e.target.checked)}
          className={cm.checkbox({})}
          data-mol-id="post-draft"
        />
        {t('postEditor.draftLabel', undefined, {
          defaultValue: 'Save as draft (hidden from the public blog)',
        })}
      </label>

      {previewHtml ? (
        <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {t('postEditor.previewHeading', undefined, { defaultValue: 'Preview' })}
          </h2>
          {/* Safe: the bonded provider sanitises XSS before returning html. */}
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </section>
      ) : null}

      {status === 'error' && error ? <p className={cm.textError}>{error}</p> : null}
      {status === 'saved' ? (
        <p className={cm.textSuccess}>
          {draft
            ? t('postEditor.savedDraft', undefined, { defaultValue: 'Draft saved.' })
            : t('postEditor.published', undefined, { defaultValue: 'Post published.' })}{' '}
          {/* No "View post" link for a draft: the public route 404s one
              (api/handlers/posts.ts answers 404 for `post.draft`) and the blog
              index lists only published posts, so the link walked the author
              straight into "Post not found" on the save they had just made. */}
          {draft ? null : (
            <a href={`/blog/${slug}`} data-mol-id="post-view-link">
              {t('postEditor.viewPost', undefined, { defaultValue: 'View post' })}
            </a>
          )}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === 'saving'}
        className={cm.button({ variant: 'solid' })}
        data-mol-id="post-save"
      >
        {status === 'saving'
          ? t('postEditor.saving', undefined, { defaultValue: 'Saving…' })
          : t('postEditor.save', undefined, { defaultValue: 'Save post' })}
      </button>
    </form>
  )
}
