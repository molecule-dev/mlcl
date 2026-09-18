import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Post {
  id: string
  title: string
  excerpt?: string
  cover_image_url?: string
  authorName?: string
  authorAvatarUrl?: string
  published_at?: string
  publishedAt?: string
  readMinutes?: number
}

function formatDate(value: string | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function RelatedPostsSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<{ data?: Post[] }>('/api/posts?limit=3')
      .then((res) => {
        if (cancelled) return
        const arr = (res.data?.data ?? []) as Post[]
        setPosts(arr)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t(
                'relatedPostsSection.fetchError',
                {},
                { defaultValue: 'Could not load related posts.' },
              ),
        )
        setPosts([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <section className={cm.cn('max-w-7xl', cm.mxAuto, cm.sp('px', 6), 'mt-20')}>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 10))}>
        <h2 className={cm.cn('font-headline', cm.textSize('2xl'), cm.fontWeight('bold'))}>
          {t('relatedPostsSection.heading', {}, { defaultValue: 'More posts' })}
        </h2>
        <Link className={cm.fv0c863e61} to="/posts">
          {t('relatedPostsSection.viewAll', {}, { defaultValue: 'Explore all' })}
        </Link>
      </div>

      {posts === null ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('relatedPostsSection.loading', {}, { defaultValue: 'Loading related posts…' })}
        </p>
      ) : error ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p>
      ) : posts.length === 0 ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'relatedPostsSection.empty',
            {},
            { defaultValue: 'No related posts yet — be the first to publish.' },
          )}
        </p>
      ) : (
        <div className={cm.cn(cm.grid({ gap: 'xl' }), 'grid-cols-1 md:grid-cols-3')}>
          {posts.map((post) => {
            const dateLabel = formatDate(post.published_at ?? post.publishedAt)
            return (
              <Link key={post.id} to={`/post/${post.id}`} className={cm.cn(cm.fvde2f5b1a)}>
                <article className={cm.cn(cm.cursorPointer, 'group')}>
                  {post.cover_image_url ? (
                    <img
                      alt={post.title}
                      className={cm.cn(
                        cm.w('full'),
                        cm.sp('mb', 6),
                        'aspect-video object-cover rounded-lg group-hover:scale-105 transition-transform duration-500',
                      )}
                      src={post.cover_image_url}
                    />
                  ) : (
                    <div
                      className={cm.cn(
                        cm.w('full'),
                        cm.sp('mb', 6),
                        'aspect-video rounded-lg bg-surface-container-low',
                      )}
                    />
                  )}
                  {post.authorName ? (
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 3))}>
                      {post.authorAvatarUrl ? (
                        <img
                          alt={post.authorName}
                          className={cm.cn(cm.w(6), cm.h(6), cm.roundedFull, 'object-cover')}
                          src={post.authorAvatarUrl}
                        />
                      ) : (
                        <div
                          className={cm.cn(
                            cm.w(6),
                            cm.h(6),
                            cm.roundedFull,
                            'bg-surface-container-low',
                          )}
                        />
                      )}
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'text-on-surface',
                        )}
                      >
                        {post.authorName}
                      </span>
                    </div>
                  ) : null}
                  <h3
                    className={cm.cn(
                      cm.textSize('xl'),
                      cm.sp('mb', 3),
                      'font-headline font-extrabold group-hover:text-primary transition-colors leading-snug',
                    )}
                  >
                    {post.title}
                  </h3>
                  <div
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('medium'),
                      'text-on-surface-variant',
                    )}
                  >
                    {dateLabel ? <span>{dateLabel}</span> : null}
                    {dateLabel && post.readMinutes ? (
                      <span>{t('common.separator', {}, { defaultValue: ' · ' })}</span>
                    ) : null}
                    {post.readMinutes ? (
                      <span>
                        {t(
                          'relatedPostsSection.readTime',
                          { minutes: post.readMinutes },
                          { defaultValue: '{{minutes}} min read' },
                        )}
                      </span>
                    ) : null}
                  </div>
                </article>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default RelatedPostsSection
export { RelatedPostsSection }
