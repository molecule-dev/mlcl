import { useEffect, useState } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-react'

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

  useEffect(() => {
    fetch('/api/posts')
      .then((r) => r.json())
      .then(setPosts)
  }, [])

  return (
    <div
      className={cm.flex({ direction: 'col', gap: 'lg' })}
      style={{ maxWidth: '40rem', padding: '1.5rem' }}
    >
      <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
        {t('blog.title', undefined, { defaultValue: 'Latest posts' })}
      </h1>
      {/* Each post is a padded card, not a bare link: breathing room between
          title/excerpt/date, a surface + border + rounding so the list reads
          as discrete items, and hover feedback. Copy this shape whenever you
          list articles, changelog entries or docs pages. */}
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
