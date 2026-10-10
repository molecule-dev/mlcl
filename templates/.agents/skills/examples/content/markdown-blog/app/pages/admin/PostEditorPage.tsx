import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'

import { requireProvider } from '@molecule/app-markdown'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

type Status = 'idle' | 'loading' | 'saving' | 'saved' | 'error'

type LoadedPost = {
  id: string
  title: string
  slug: string
  body_markdown: string
  draft: boolean
}

// Turns "Why we chose Postgres" into "why-we-chose-postgres" so the slug
// input matches the posts handler's schema (lowercase, digits, single dashes).
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
export function PostEditorPage({ slug: editingSlug }: { slug?: string } = {}) {
  const { t } = useTranslation()
  const [postId, setPostId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [bodyMarkdown, setBodyMarkdown] = useState('')
  const [draft, setDraft] = useState(true)
  const [status, setStatus] = useState<Status>(editingSlug ? 'loading' : 'idle')
  const [error, setError] = useState<string | null>(null)

  // Edit mode: load the post's current values so the author edits, not clobbers.
  const loadedSlug = useRef<string | null>(null)
  useEffect(() => {
    if (!editingSlug) return
    // Load each slug ONCE. This effect also re-runs when `t` changes identity (a
    // locale switch — see useTranslation), and an unguarded reload there would
    // discard the author's unsaved typing by refilling the form from the server.
    if (loadedSlug.current === editingSlug) return
    // Entering a different post: go back to the loading state and forget the
    // PREVIOUS post's id, so a save during the load cannot PUT the old post with
    // the new one's half-loaded fields.
    setStatus('loading')
    setPostId(null)
    // A superseded load must not populate the form: an older post's response can
    // land after a newer one's and refill the editor with the wrong content.
    let cancelled = false
    fetch(`/api/posts/${editingSlug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((post: LoadedPost) => {
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
  }, [editingSlug, t])

  // Auto-suggest a slug from the title until the author edits the slug directly.
  function onTitleChange(value: string): void {
    setTitle(value)
    if (!slugEdited) setSlug(slugify(value))
  }

  // Live markdown preview through the bonded provider — sanitised (XSS-safe),
  // exactly as PostPage renders the published post.
  const previewHtml = useMemo(() => {
    if (!bodyMarkdown) return ''
    return requireProvider().render(bodyMarkdown, { gfm: true, sanitize: true }).html
  }, [bodyMarkdown])

  async function save(e: FormEvent): Promise<void> {
    e.preventDefault()
    setStatus('saving')
    setError(null)
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
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(
          body.error ??
            t('postEditor.saveFailed', undefined, { defaultValue: 'Could not save the post' }),
        )
        setStatus('error')
        return
      }
      const saved = (await res.json().catch(() => null)) as { id?: string } | null
      if (saved?.id) setPostId(saved.id)
      setStatus('saved')
    } catch (_error) {
      setError(t('postEditor.saveFailed', undefined, { defaultValue: 'Could not save the post' }))
      setStatus('error')
    }
  }

  if (status === 'loading') {
    return (
      <p className={cm.textMuted}>{t('common.loading', undefined, { defaultValue: 'Loading…' })}</p>
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
          <a href={`/blog/${slug}`} data-mol-id="post-view-link">
            {t('postEditor.viewPost', undefined, { defaultValue: 'View post' })}
          </a>
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
