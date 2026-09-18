import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import DiscoverySidebar from './DiscoverySidebar.js'

interface Post {
  id: string
  title: string
  excerpt?: string
  cover_image_url?: string
  category_id?: string
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

function FeaturedPostsSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<{ data?: Post[] }>('/api/posts?limit=5')
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
            : t('featuredPostsSection.fetchError', {}, { defaultValue: 'Could not load posts.' }),
        )
        setPosts([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const cards = posts ? posts.slice(0, 3) : []
  const linears = posts ? posts.slice(3, 5) : []

  if (posts === null) {
    return (
      <section className={cm.cn(cm.sp('px', 6), 'max-w-7xl', cm.mxAuto, 'py-20')}>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('featuredPostsSection.loading', {}, { defaultValue: 'Loading posts…' })}
        </p>
      </section>
    )
  }

  if (error) {
    return (
      <section className={cm.cn(cm.sp('px', 6), 'max-w-7xl', cm.mxAuto, 'py-20')}>
        <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p>
      </section>
    )
  }

  if (posts.length === 0) {
    return (
      <section className={cm.cn(cm.sp('px', 6), 'max-w-7xl', cm.mxAuto, 'py-20')}>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'featuredPostsSection.empty',
            {},
            { defaultValue: 'No posts yet — be the first to publish.' },
          )}
        </p>
      </section>
    )
  }

  return (
    <section className={cm.cn(cm.sp('px', 6), 'max-w-7xl', cm.mxAuto, 'py-20')}>
      <div className={cm.cn(cm.grid({ gap: 'xl' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}>
        {cards.map((post) => {
          const dateLabel = formatDate(post.published_at ?? post.publishedAt)
          return (
            <Link
              key={post.id}
              to={`/post/${post.id}`}
              className={cm.cn(cm.fvde2f5b1a)}
              onClick={(e) => e.stopPropagation()}
            >
              <article className={cm.cn(cm.flex({ direction: 'col' }), cm.cursorPointer, 'group')}>
                <div
                  className={cm.cn(
                    cm.sp('mb', 6),
                    'aspect-video overflow-hidden rounded-lg bg-surface-container-low',
                  )}
                >
                  {post.cover_image_url ? (
                    <img
                      className={cm.cn(
                        cm.w('full'),
                        cm.h('full'),
                        'object-cover group-hover:scale-105 transition-transform duration-500',
                      )}
                      alt={post.title}
                      src={post.cover_image_url}
                    />
                  ) : null}
                </div>
                {post.authorName ? (
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 3))}>
                    {post.authorAvatarUrl ? (
                      <img
                        className={cm.cn(cm.w(6), cm.h(6), cm.roundedFull, 'object-cover')}
                        alt={post.authorName}
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
                      className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-on-surface')}
                    >
                      {post.authorName}
                    </span>
                    {dateLabel ? (
                      <>
                        <span
                          className={cm.cn(cm.roundedFull, 'w-0.5 h-0.5 bg-outline-variant')}
                        ></span>
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('medium'),
                            'text-on-surface-variant',
                          )}
                        >
                          {dateLabel}
                        </span>
                      </>
                    ) : null}
                  </div>
                ) : dateLabel ? (
                  <div
                    className={cm.cn(
                      cm.sp('mb', 3),
                      cm.textSize('xs'),
                      cm.fontWeight('medium'),
                      'text-on-surface-variant',
                    )}
                  >
                    {dateLabel}
                  </div>
                ) : null}
                <h3
                  className={cm.cn(
                    cm.textSize('2xl'),
                    cm.sp('mb', 3),
                    'font-headline font-extrabold leading-snug group-hover:text-primary transition-colors',
                  )}
                >
                  {post.title}
                </h3>
                {post.excerpt ? (
                  <p
                    className={cm.cn(
                      cm.sp('mb', 6),
                      'font-body text-on-surface-variant line-clamp-2 leading-relaxed',
                    )}
                  >
                    {post.excerpt}
                  </p>
                ) : null}
                {post.readMinutes ? (
                  <div className={cm.cn(cm.flex({ align: 'center' }), 'mt-auto')}>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('medium'),
                        'text-on-surface-variant',
                      )}
                    >
                      {t(
                        'featuredPostsSection.readTime',
                        { minutes: post.readMinutes },
                        { defaultValue: '{{minutes}} min read' },
                      )}
                    </span>
                  </div>
                ) : null}
              </article>
            </Link>
          )
        })}
      </div>

      {linears.length > 0 ? (
        <div
          className={cm.cn(
            cm.grid({ gap: 'xl' }),
            'mt-20 grid-cols-1 lg:grid-cols-12 border-t border-outline-variant/10 pt-20',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xl' }), 'lg:col-span-8')}>
            {linears.map((post) => {
              const dateLabel = formatDate(post.published_at ?? post.publishedAt)
              return (
                <Link
                  key={post.id}
                  to={`/post/${post.id}`}
                  className={cm.cn(cm.fvde2f5b1a)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <article
                    className={cm.cn(
                      cm.flex({ direction: 'col', align: 'start', gap: 'xl' }),
                      cm.cursorPointer,
                      cm.sp('p', 6),
                      'md:flex-row group bg-surface-container-low hover:bg-surface-container rounded-xl transition-colors',
                    )}
                  >
                    <div className={cm.cn(cm.flex1, 'order-2 md:order-1')}>
                      {post.authorName ? (
                        <div
                          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 3))}
                        >
                          {post.authorAvatarUrl ? (
                            <img
                              className={cm.cn(cm.w(5), cm.h(5), cm.roundedFull, 'object-cover')}
                              alt={post.authorName}
                              src={post.authorAvatarUrl}
                            />
                          ) : (
                            <div
                              className={cm.cn(
                                cm.w(5),
                                cm.h(5),
                                cm.roundedFull,
                                'bg-surface-container',
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
                          cm.textSize('3xl'),
                          cm.sp('mb', 3),
                          cm.fontWeight('bold'),
                          'font-headline leading-tight group-hover:text-primary transition-colors',
                        )}
                      >
                        {post.title}
                      </h3>
                      {post.excerpt ? (
                        <p
                          className={cm.cn(
                            cm.sp('mb', 4),
                            'font-body text-on-surface-variant max-w-xl leading-relaxed',
                          )}
                        >
                          {post.excerpt}
                        </p>
                      ) : null}
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'md' }),
                          cm.fontWeight('medium'),
                          cm.textSize('xs'),
                          'tracking-widest text-on-surface-variant uppercase',
                        )}
                      >
                        {dateLabel ? <span>{dateLabel}</span> : null}
                        {dateLabel && post.readMinutes ? (
                          <span>{t('common.separator', {}, { defaultValue: '•' })}</span>
                        ) : null}
                        {post.readMinutes ? (
                          <span>
                            {t(
                              'featuredPostsSection.readTime',
                              { minutes: post.readMinutes },
                              { defaultValue: '{{minutes}} min read' },
                            )}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {post.cover_image_url ? (
                      <div
                        className={cm.cn(
                          cm.w('full'),
                          'md:w-48 aspect-square rounded overflow-hidden order-1 md:order-2',
                        )}
                      >
                        <img
                          className={cm.cn(
                            cm.w('full'),
                            cm.h('full'),
                            'object-cover group-hover:scale-110 transition-transform duration-700',
                          )}
                          alt={post.title}
                          src={post.cover_image_url}
                        />
                      </div>
                    ) : null}
                  </article>
                </Link>
              )
            })}
          </div>
          <DiscoverySidebar />
        </div>
      ) : null}
    </section>
  )
}

export default FeaturedPostsSection
export { FeaturedPostsSection }
