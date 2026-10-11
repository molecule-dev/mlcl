import { type ReactElement, useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

type Post = {
  id: string
  slug: string
  title: string
  excerpt: string
  published_at: string
}

/**
 * The card's publish date, or null when the answer carried none this render may
 * show.
 *
 * `published_at` is one of the two fields the row gate above deliberately does
 * NOT require (see its comment): a post whose answer omits it is still a post
 * and still renders, with the date shown as NOTHING. `new Date(undefined)` is
 * not a date — `toLocaleDateString()` returns the literal string
 * "Invalid Date", which the card then printed under the headline as though it
 * were the publication day. The same holds for a string that is not a date, so
 * both are treated as "no date to show" rather than as a value to render.
 *
 * @param value - The row's `published_at`, as received (untrusted).
 * @returns The localized date, or null when there is none to show.
 */
function publishedLabel(value: string | undefined): string | null {
  if (typeof value !== 'string' || value.length === 0) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString()
}

export function BlogIndexPage(): ReactElement {
  const { t } = useTranslation()
  const [posts, setPosts] = useState<Post[]>([])
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    // The response is checked AND coerced before it reaches state: a non-2xx
    // answer (401, 500) still carries a JSON body (`{ error }`), which `r.json()`
    // resolves happily — so a missing `res.ok` check neither rejects nor sets
    // `loadFailed`; it stores that error object and the next render's
    // `posts.map` throws. Same guard as the sibling ChatPage / NotificationBell.
    fetch('/api/posts')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((body: unknown) => {
        // The 2xx half of the same rule the catch below states: a body that is
        // not the list (an endpoint with no fixture answers 200 `{}`, a rewritten
        // answer) was coerced to `[]` and rendered as an EMPTY blog — a silent
        // "there are no posts", the state the catch exists to prevent. `GET
        // /api/posts` answers with the array itself (api/handlers/posts.ts), so
        // anything else is a failed load, not an empty blog.
        if (!Array.isArray(body)) {
          setLoadFailed(true)
          return
        }
        // …and every ROW must be a post. `[{}]` passes `Array.isArray` and the
        // card below dereferences each row: an empty-titled card linking to
        // `/blog/undefined` with "Invalid Date" under it was presented as a real
        // list (a shrunken rewrite, a partial answer). The three fields gated
        // here are the ones the render cannot degrade without lying about the
        // post — its key, its link and its headline; `excerpt`/`published_at`
        // render as nothing rather than as a wrong value when they are absent.
        const isPost = (row: unknown): row is Post =>
          typeof row === 'object' &&
          row !== null &&
          typeof (row as Post).id === 'string' &&
          typeof (row as Post).slug === 'string' &&
          typeof (row as Post).title === 'string'
        if (!body.every(isPost)) {
          setLoadFailed(true)
          return
        }
        setPosts(body)
      })
      .catch(() => {
        // A failed load must be visible: a silent catch would render an empty
        // list that reads as "the blog has no posts".
        setLoadFailed(true)
      })
  }, [])

  return (
    <div
      className={cm.flex({ direction: 'col', gap: 'lg' })}
      style={{ maxWidth: '40rem', padding: '1.5rem' }}
    >
      <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
        {t('blog.title', undefined, { defaultValue: 'Latest posts' })}
      </h1>
      {loadFailed ? (
        <p className={cm.textError}>
          {t('blog.loadFailed', undefined, {
            defaultValue: 'Could not load posts — refresh to try again.',
          })}
        </p>
      ) : null}
      {/* Each post is a padded card, not a bare link: breathing room between
          title/excerpt/date, a surface + rounding so the list reads as
          discrete items, and hover feedback. Copy this shape whenever you
          list articles, changelog entries or docs pages — and add a border
          class if the surface alone does not read as a card in your theme. */}
      {posts.map((p) => {
        const published = publishedLabel(p.published_at)
        return (
          <a
            key={p.id}
            href={`/blog/${p.slug}`}
            data-mol-id={`blog-post-${p.slug}`}
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'sm' }),
              cm.sp('p', 5),
              'rounded-lg bg-surface-container-low text-on-surface no-underline transition-colors hover:bg-surface-container',
            )}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>{p.title}</h2>
            <p className={cm.cn(cm.textMuted)}>{p.excerpt}</p>
            {published ? (
              <time className={cm.cn(cm.textSize('sm'), cm.textMuted)}>{published}</time>
            ) : null}
          </a>
        )
      })}
    </div>
  )
}
