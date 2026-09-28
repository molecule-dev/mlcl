import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface Post {
  id: string
  title: string
  excerpt?: string
  authorName?: string
  authorAvatarUrl?: string
  publishedAt?: string
  readMinutes?: number
}

function TrendingSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<{ data?: Post[] }>('/api/posts?limit=6&sort=trending')
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
            : t('trending.fetchError', {}, { defaultValue: 'Could not load trending posts.' }),
        )
        setPosts([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <section className={cm.cn(cm.sp('py', 16), cm.sp('px', 6), cm.mxAuto, 'max-w-7xl')}>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 10))}>
        <div
          className={cm.cn(
            cm.w(6),
            cm.h(6),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'border border-outline-variant',
          )}
        >
          <span
            className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')}
            style={{ fontVariationSettings: "'wght' 700" }}
          >
            trending_up
          </span>
        </div>
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'font-label uppercase tracking-[0.2em] text-on-surface',
          )}
        >
          {t(
            'trending.heading',
            { appName: APP_NAME },
            { defaultValue: 'Trending on {{appName}}' },
          )}
        </h2>
      </div>

      {posts === null ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('trending.loading', {}, { defaultValue: 'Loading trending posts…' })}
        </p>
      ) : error ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p>
      ) : posts.length === 0 ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'trending.empty',
            {},
            { defaultValue: 'No trending posts yet — be the first to publish.' },
          )}
        </p>
      ) : (
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2 lg:grid-cols-3')}>
          {posts.map((post, i) => (
            <Link
              to={`/post/${post.id}`}
              key={post.id}
              className={cm.cn(cm.flex({ gap: 'md' }), 'group')}
            >
              {/* Decorative ranking numeral — hidden from the a11y tree (it
                  duplicates the row's order). Rendered in `text-outline`
                  (≈4.4:1 on the page surface) so it still clears the 3:1
                  large-text floor; the surface-on-surface watermark tint
                  shipped at 1.23:1 and failed axe color-contrast. */}
              <span
                aria-hidden="true"
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.fontWeight('bold'),
                  'font-headline text-outline group-hover:text-on-surface-variant transition-colors',
                )}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  {post.authorAvatarUrl ? (
                    <img
                      className={cm.cn(cm.w(5), cm.h(5), cm.roundedFull, 'object-cover')}
                      alt={post.authorName ?? ''}
                      src={post.authorAvatarUrl}
                    />
                  ) : (
                    <div
                      className={cm.cn(
                        cm.w(5),
                        cm.h(5),
                        cm.roundedFull,
                        'bg-surface-container-low',
                      )}
                    />
                  )}
                  {post.authorName ? (
                    <span
                      className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-on-surface')}
                    >
                      {post.authorName}
                    </span>
                  ) : null}
                </div>
                <h3
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('base'),
                    'font-headline leading-tight group-hover:text-primary transition-colors',
                  )}
                >
                  {post.title}
                </h3>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.fontWeight('medium'),
                    cm.textSize('xs'),
                    'text-on-surface-variant/70',
                  )}
                >
                  {post.publishedAt ? (
                    <span>
                      {new Date(post.publishedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  ) : null}
                  {post.publishedAt && post.readMinutes ? (
                    <span
                      className={cm.cn(cm.w(1), cm.h(1), cm.roundedFull, 'bg-outline-variant')}
                    />
                  ) : null}
                  {post.readMinutes ? (
                    <span>
                      {t(
                        'trending.readTime',
                        { minutes: post.readMinutes },
                        { defaultValue: '{{minutes}} min read' },
                      )}
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

export default TrendingSection
export { TrendingSection }
