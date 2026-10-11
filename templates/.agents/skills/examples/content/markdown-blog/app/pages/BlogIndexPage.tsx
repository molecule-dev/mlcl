import { useEffect, useState } from 'react'

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

export function BlogIndexPage() {
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
        setPosts(body as Post[])
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
      {posts.map((p) => (
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
          <time className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {new Date(p.published_at).toLocaleDateString()}
          </time>
        </a>
      ))}
    </div>
  )
}
