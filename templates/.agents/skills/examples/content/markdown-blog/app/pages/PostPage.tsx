import { useEffect, useMemo, useState } from 'react'

import { requireProvider } from '@molecule/app-markdown'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-react'

const cm = getClassMap()

type Post = {
  id: string
  title: string
  body_markdown: string
  published_at: string
}

export function PostPage({ slug }: { slug: string }) {
  const { t } = useTranslation()
  const [post, setPost] = useState<Post | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/posts/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setPost)
      .catch(() => setNotFound(true))
  }, [slug])

  // Render markdown to sanitised HTML via the bonded provider.
  // requireProvider() returns the @molecule/app-markdown-react-markdown
  // instance wired in bonds.ts; sanitize defaults to true (XSS-safe).
  const renderedHtml = useMemo(() => {
    if (!post) return ''
    return requireProvider().render(post.body_markdown, { gfm: true, sanitize: true }).html
  }, [post])

  if (notFound) {
    return <p>{t('posts.notFound', undefined, { defaultValue: 'Post not found' })}</p>
  }
  if (!post) return <p>{t('common.loading', undefined, { defaultValue: 'Loading…' })}</p>

  return (
    <article
      className={cm.flex({ direction: 'col', gap: 'md' })}
      style={{ maxWidth: '32rem', padding: '1.5rem' }}
    >
      <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>{post.title}</h1>
      <time className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
        {new Date(post.published_at).toLocaleDateString()}
      </time>
      {/* dangerouslySetInnerHTML is safe here: the provider sanitises XSS before returning html */}
      <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
    </article>
  )
}
