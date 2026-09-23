import { useEffect } from 'react'
import { useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PageMeta } from '../components/PageMeta.js'
import { PostDate } from '../components/PostDate.js'
import { TagList } from '../components/TagList.js'
import { findPost, postMarkdownPath } from '../content.js'
import { withBase } from '../site.js'
import { NotFound } from './NotFound.js'

/**
 * One post at `/<slug>/`. The body is the HTML the build rendered from the
 * markdown (sanitized by `@molecule/app-markdown-marked`, so it is safe to
 * inject). The raw markdown is linked at `/<slug>.md`.
 */
export function Post() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { slug = '' } = useParams<{ slug: string }>()
  const post = findPost(slug)
  // Reading a post is this site's conversion: fire once per mounted post,
  // client-side only (an effect never runs in the prerender). No-op without
  // an analytics provider.
  useEffect(() => {
    if (post)
      void track({
        name: 'post.read',
        properties: { slug: post.slug, minutes: post.readingMinutes },
      })
  }, [post])
  if (!post) return <NotFound />

  return (
    <article
      className={cm.cn(cm.container({ size: 'lg' }), cm.sp('py', 8))}
      data-mol-id="post-page"
    >
      <PageMeta title={post.title} description={post.description} />
      {/* Centered title block: title, date, tags — the tags row centers WITH
          it (a left-flush chip row under a centered title reads as a mistake),
          and the foot links center below the body inside the same measure —
          never full-width or off to the left while the body is measured. */}
      <header className={cm.cn(cm.sp('pb', 6), cm.textCenter)}>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))} data-mol-id="post-title">
          {post.title}
        </h1>
        <p className={cm.cn(cm.sp('pt', 2), cm.textMuted, cm.textSize('sm'))}>
          <PostDate date={post.date} />
          {' · '}
          <span data-mol-id="post-reading-time">
            {t(
              'post.readingTime',
              { minutes: post.readingMinutes },
              { defaultValue: '{{minutes}} min read' },
            )}
          </span>
        </p>
        <div className={cm.sp('pt', 3)}>
          <TagList tags={post.tags} center />
        </div>
      </header>
      <div
        className={cm.prose}
        data-mol-id="post-body"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />
      <footer className={cm.cn(cm.sp('pt', 8), cm.textSize('sm'), cm.textMuted, cm.textCenter)}>
        <a
          className={cm.link}
          href={withBase(postMarkdownPath(post.slug))}
          data-mol-id="post-markdown"
        >
          {t('post.markdown', undefined, { defaultValue: 'View this post as markdown' })}
        </a>
      </footer>
    </article>
  )
}
