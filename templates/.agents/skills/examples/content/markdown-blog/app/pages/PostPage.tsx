import { useEffect, useMemo, useState } from 'react'

import { requireProvider } from '@molecule/app-markdown'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

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
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    // The slug can change while this component stays mounted (navigating from
    // one post to another). Two things follow from that:
    //
    // - Reset BOTH outcomes up front. `notFound` used to be set once and never
    //   cleared, so after a 404 the very next (valid) post still rendered "Post
    //   not found" — and the previous post's body stayed on screen until the new
    //   one loaded.
    // - Drop the superseded response. An older post's request can resolve after
    //   the newer one's, which would render the wrong post under the current URL.
    let cancelled = false
    setPost(null)
    setNotFound(false)
    setLoadFailed(false)
    fetch(`/api/posts/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((body: unknown) => {
        // A 2xx proves the route ANSWERED, not that the body is a post — the
        // same rule the sibling pages apply (BlogIndexPage checks the array,
        // PostEditorPage the fields). An endpoint with no fixture answers 200
        // `{}` (the mock API server's unmatchedFixtureResponse), and a proxy can
        // rewrite a failure into a 200; installed as `post` that body rendered an
        // article with a blank title, `new Date(undefined)` → "Invalid Date", and
        // `undefined` handed to the markdown bond's render — instead of the
        // failure it is. `GET /api/posts/:slug` answers with the post itself
        // (api/handlers/posts.ts), so anything else is a failed load.
        const loaded = (body ?? {}) as Partial<Post>
        if (
          typeof loaded.id !== 'string' ||
          typeof loaded.title !== 'string' ||
          typeof loaded.body_markdown !== 'string'
        ) {
          if (!cancelled) setLoadFailed(true)
          return
        }
        if (!cancelled) setPost(loaded as Post)
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
    return () => {
      cancelled = true
    }
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
  // An answer that is not a post is a FAILED load, not "this post exists": say
  // so, and keep it distinct from the 404 above (the post may well exist).
  if (loadFailed) {
    return (
      <p className={cm.textError}>
        {t('posts.loadFailed', undefined, {
          defaultValue: 'Could not load this post — refresh to try again.',
        })}
      </p>
    )
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
