import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Post {
  id: string
  title: string
  cover_image_url?: string | null
  coverImageUrl?: string | null
  views?: number | string | null
  shares?: number | string | null
  read_minutes?: number | string | null
  readMinutes?: number | string | null
  avg_read_seconds?: number | string | null
  avgReadSeconds?: number | string | null
  trend?: 'up' | 'down' | 'flat' | string | null
  views_delta?: number | string | null
  viewsDelta?: number | string | null
  published_at?: string | null
  publishedAt?: string | null
}

interface TopPostsTableProps {
  posts?: Post[]
  loading?: boolean
}

const TOP_LIMIT = 5

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : 0
}

function formatCount(value: number | string | null | undefined): string {
  return toNumber(value).toLocaleString()
}

function formatReadTime(post: Post): string | null {
  const seconds =
    toNumber(post.avg_read_seconds ?? post.avgReadSeconds) ||
    toNumber(post.read_minutes ?? post.readMinutes) * 60
  if (!seconds) return null
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatPublishedDate(value: string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
}

function trendIcon(post: Post): { name: string; tone: 'up' | 'down' | 'flat' } {
  const explicit = (post.trend ?? '').toString().toLowerCase()
  if (explicit === 'up') return { name: 'north_east', tone: 'up' }
  if (explicit === 'down') return { name: 'south_east', tone: 'down' }
  if (explicit === 'flat') return { name: 'trending_flat', tone: 'flat' }
  const delta = toNumber(post.views_delta ?? post.viewsDelta)
  if (delta > 0) return { name: 'north_east', tone: 'up' }
  if (delta < 0) return { name: 'south_east', tone: 'down' }
  return { name: 'trending_flat', tone: 'flat' }
}

function TopPostsTable(props: TopPostsTableProps = {}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()

  const externallyControlled = props.posts !== undefined
  const [internalPosts, setInternalPosts] = useState<Post[] | null>(
    externallyControlled ? null : null,
  )
  const [internalError, setInternalError] = useState<string | null>(null)

  useEffect(() => {
    if (externallyControlled) return
    let cancelled = false
    http
      .get<{ data?: Post[] } | Post[]>(`/api/posts?sort=views&limit=${TOP_LIMIT}`)
      .then((res) => {
        if (cancelled) return
        const payload = (res as { data?: { data?: Post[] } | Post[] }).data ?? res
        const arr = Array.isArray(payload)
          ? (payload as Post[])
          : (((payload as { data?: Post[] }).data ?? []) as Post[])
        setInternalPosts(arr)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setInternalError(
          e instanceof Error
            ? e.message
            : t('topPostsTable.fetchError', {}, { defaultValue: 'Could not load top posts.' }),
        )
        setInternalPosts([])
      })
    return () => {
      cancelled = true
    }
  }, [externallyControlled, http, t])

  const sourcePosts = useMemo<Post[] | null>(
    () => (externallyControlled ? (props.posts ?? []) : internalPosts),
    [externallyControlled, props.posts, internalPosts],
  )
  const loading = externallyControlled ? Boolean(props.loading) : sourcePosts === null
  const error = externallyControlled ? null : internalError

  const topPosts = useMemo<Post[]>(() => {
    if (!sourcePosts) return []
    const sorted = [...sourcePosts].sort((a, b) => toNumber(b.views) - toNumber(a.views))
    return sorted.slice(0, TOP_LIMIT)
  }, [sourcePosts])

  const headerTh = cm.cn(
    cm.sp('pb', 4),
    cm.textSize('xs'),
    cm.fontWeight('bold'),
    'uppercase tracking-widest text-on-surface-variant',
  )

  return (
    <div
      className={cm.cn(
        cm.sp('p', 8),
        'col-span-12 bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 8))}>
        <h4 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), "font-['Newsreader']")}>
          {t(
            'topPostsTable.topPerformingArticles',
            {},
            { defaultValue: 'Top Performing Articles' },
          )}
        </h4>
        <Link
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant hover:text-primary',
          )}
          to="/posts"
        >
          {t('topPostsTable.seeAllArticles', {}, { defaultValue: 'See All Articles' })}
        </Link>
      </div>
      <div className={cm.fvaa841a0f}>
        <table className={cm.cn(cm.w('full'), 'text-left')}>
          <thead>
            <tr className={cm.fve8829c3f}>
              <th className={headerTh}>
                {t('topPostsTable.articleTitle', {}, { defaultValue: 'Article Title' })}
              </th>
              <th className={headerTh}>
                {t('topPostsTable.views', {}, { defaultValue: 'Views' })}
              </th>
              <th className={headerTh}>
                {t('topPostsTable.avgReadTime', {}, { defaultValue: 'Avg Read Time' })}
              </th>
              <th className={cm.cn(headerTh, cm.textCenter)}>
                {t('topPostsTable.shares', {}, { defaultValue: 'Shares' })}
              </th>
              <th className={cm.cn(headerTh, cm.textRight)}>
                {t('topPostsTable.trend', {}, { defaultValue: 'Trend' })}
              </th>
            </tr>
          </thead>
          <tbody className={cm.fvc3e72362}>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className={cm.cn(
                    cm.sp('py', 8),
                    cm.textCenter,
                    cm.textSize('sm'),
                    'text-on-surface-variant',
                  )}
                >
                  {t('topPostsTable.loading', {}, { defaultValue: 'Loading top articles…' })}
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td
                  colSpan={5}
                  className={cm.cn(cm.sp('py', 8), cm.textCenter, cm.textSize('sm'), 'text-error')}
                >
                  {error}
                </td>
              </tr>
            ) : topPosts.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className={cm.cn(
                    cm.sp('py', 8),
                    cm.textCenter,
                    cm.textSize('sm'),
                    'text-on-surface-variant',
                  )}
                >
                  {t(
                    'topPostsTable.empty',
                    {},
                    {
                      defaultValue:
                        'No analytics data yet — publish a post to see performance metrics.',
                    },
                  )}
                </td>
              </tr>
            ) : (
              topPosts.map((post) => {
                const trend = trendIcon(post)
                const cover = post.cover_image_url ?? post.coverImageUrl ?? null
                const dateLabel = formatPublishedDate(post.published_at ?? post.publishedAt)
                const readTime = formatReadTime(post)
                return (
                  <tr
                    key={post.id}
                    className={cm.cn(
                      cm.cursorPointer,
                      'group hover:bg-surface-container-low/50 transition-colors',
                    )}
                    onClick={() => navigate(`/post/${post.id}`)}
                  >
                    <td className={cm.sp('py', 5)}>
                      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
                        <div
                          className={cm.cn(
                            cm.w(10),
                            cm.h(10),
                            'rounded bg-surface-container overflow-hidden',
                          )}
                        >
                          {cover ? (
                            <img
                              className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
                              alt={post.title}
                              src={cover}
                            />
                          ) : null}
                        </div>
                        <div>
                          <p
                            className={cm.cn(
                              cm.fontWeight('bold'),
                              'text-on-surface group-hover:text-primary transition-colors',
                            )}
                          >
                            {post.title}
                          </p>
                          {dateLabel ? (
                            <p
                              className={cm.cn(
                                cm.fontWeight('medium'),
                                'text-[10px] text-on-surface-variant uppercase tracking-tight',
                              )}
                            >
                              {t(
                                'topPostsTable.publishedDate',
                                { date: dateLabel },
                                { defaultValue: 'Published {{date}}' },
                              )}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('py', 5),
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                      )}
                    >
                      {formatCount(post.views)}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('py', 5),
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                      )}
                    >
                      {readTime ?? t('topPostsTable.noReadTime', {}, { defaultValue: '—' })}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('py', 5),
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        cm.textCenter,
                      )}
                    >
                      {formatCount(post.shares)}
                    </td>
                    <td className={cm.cn(cm.sp('py', 5), cm.textRight)}>
                      <span
                        className={cm.cn(
                          trend.tone === 'down' ? 'text-error' : cm.textPrimary,
                          'material-symbols-outlined',
                        )}
                        data-icon={trend.name}
                      >
                        {trend.name}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TopPostsTable
export { TopPostsTable }
