import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Post {
  id: string
  title: string
  status?: string
  views?: number | string
  published_at?: string | null
  publishedAt?: string | null
  scheduled_at?: string | null
  scheduledAt?: string | null
  created_at?: string | null
  createdAt?: string | null
  updated_at?: string | null
  updatedAt?: string | null
}

function pickDateForRow(post: Post): string | null {
  const status = (post.status ?? '').toLowerCase()
  if (status === 'scheduled') {
    return post.scheduled_at ?? post.scheduledAt ?? null
  }
  if (status === 'draft') {
    return post.updated_at ?? post.updatedAt ?? post.created_at ?? post.createdAt ?? null
  }
  return (
    post.published_at ??
    post.publishedAt ??
    post.updated_at ??
    post.updatedAt ??
    post.created_at ??
    post.createdAt ??
    null
  )
}

function formatShortDate(value: string | null): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatViews(value: number | string | undefined): string | null {
  if (value === undefined || value === null || value === '') return null
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return String(value)
  return num.toLocaleString()
}

function statusBadgeClasses(status: string | undefined): string {
  switch ((status ?? '').toLowerCase()) {
    case 'published':
      return 'bg-success-light text-success'
    case 'scheduled':
      return 'bg-blue-100 text-blue-800'
    case 'draft':
    default:
      return 'bg-surface-secondary text-foreground-secondary'
  }
}

function statusLabel(
  status: string | undefined,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  switch ((status ?? '').toLowerCase()) {
    case 'published':
      return t('status.published', {}, { defaultValue: 'Published' })
    case 'scheduled':
      return t('common.scheduled', {}, { defaultValue: 'Scheduled' })
    case 'draft':
      return t('common.draft', {}, { defaultValue: 'Draft' })
    default:
      return status ?? ''
  }
}

const ROW_LIMIT = 5

function RecentPostsSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<{ data?: Post[] } | Post[]>(`/api/posts?limit=${ROW_LIMIT}&sort=recent`)
      .then((res) => {
        if (cancelled) return
        const payload = (res as { data?: { data?: Post[] } | Post[] }).data ?? res
        const arr = Array.isArray(payload)
          ? (payload as Post[])
          : (((payload as { data?: Post[] }).data ?? []) as Post[])
        // Server may not honor sort=recent; sort client-side as a safety net.
        const sorted = [...arr].sort((a, b) => {
          const da = new Date(pickDateForRow(a) ?? 0).getTime()
          const db = new Date(pickDateForRow(b) ?? 0).getTime()
          return db - da
        })
        setPosts(sorted.slice(0, ROW_LIMIT))
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t(
                'recentPostsSection.fetchError',
                {},
                { defaultValue: 'Could not load recent posts.' },
              ),
        )
        setPosts([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const headerTh = cm.cn(
    cm.sp('px', 6),
    cm.sp('py', 4),
    cm.textSize('xs'),
    cm.fontWeight('bold'),
    'uppercase tracking-widest text-secondary',
  )

  return (
    <div className={cm.cn(cm.stack(6), 'flex-grow')}>
      <div className={cm.flex({ justify: 'between', align: 'end' })}>
        <h2
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            'font-headline tracking-tight',
          )}
        >
          {t('recentPostsSection.recentPosts', {}, { defaultValue: 'Recent Posts' })}
        </h2>
        <Link className={cm.fve32557bd} data-mol-id="view-all-posts" to="/posts">
          {t('recentPostsSection.viewAllPosts', {}, { defaultValue: 'View All Posts' })}
          <span
            className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
            data-icon="chevron_right"
          >
            chevron_right
          </span>
        </Link>
      </div>
      <div
        className={cm.cn('bg-surface-container-lowest rounded-xl editorial-shadow overflow-hidden')}
      >
        <div className={cm.cn('w-full overflow-x-auto')}>
          <table className={cm.cn(cm.w('full'), 'text-left border-collapse min-w-[540px]')}>
            <thead>
              <tr className={cm.cn('bg-surface-container-low/50')}>
                <th className={headerTh}>{t('form.title', {}, { defaultValue: 'Title' })}</th>
                <th className={headerTh}>{t('nav.status', {}, { defaultValue: 'Status' })}</th>
                <th className={cm.cn(headerTh, cm.textCenter)}>
                  {t('recentPostsSection.views', {}, { defaultValue: 'Views' })}
                </th>
                <th className={cm.cn(headerTh, cm.textRight)}>
                  {t('form.date', {}, { defaultValue: 'Date' })}
                </th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-surface-container-low')}>
              {posts === null ? (
                <tr>
                  <td
                    colSpan={4}
                    className={cm.cn(
                      cm.sp('px', 6),
                      cm.sp('py', 8),
                      cm.textCenter,
                      cm.textSize('sm'),
                      'text-on-surface-variant',
                    )}
                  >
                    {t('recentPostsSection.loading', {}, { defaultValue: 'Loading recent posts…' })}
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={4}
                    className={cm.cn(
                      cm.sp('px', 6),
                      cm.sp('py', 8),
                      cm.textCenter,
                      cm.textSize('sm'),
                      'text-error',
                    )}
                  >
                    {error}
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className={cm.cn(
                      cm.sp('px', 6),
                      cm.sp('py', 8),
                      cm.textCenter,
                      cm.textSize('sm'),
                      'text-on-surface-variant',
                    )}
                  >
                    {t(
                      'recentPostsSection.empty',
                      {},
                      {
                        defaultValue: 'No posts yet — create your first post to see it here.',
                      },
                    )}
                  </td>
                </tr>
              ) : (
                posts.map((post, index) => {
                  const dateLabel = formatShortDate(pickDateForRow(post))
                  const viewsLabel = formatViews(post.views)
                  const status = post.status ?? 'draft'
                  const isDraft = status.toLowerCase() === 'draft'
                  const isScheduled = status.toLowerCase() === 'scheduled'
                  return (
                    <tr
                      key={post.id}
                      className={cm.cn(
                        cm.cursorPointer,
                        'hover:bg-surface-container-low/20 transition-colors group',
                      )}
                      data-mol-id={`post-row-${index + 1}`}
                      onClick={() => navigate(`/post/${post.id}`)}
                    >
                      <td
                        className={cm.cn(
                          cm.sp('px', 6),
                          cm.sp('py', 5),
                          cm.fontWeight('semibold'),
                          'text-on-background group-hover:text-primary transition-colors',
                        )}
                      >
                        {post.title}
                      </td>
                      <td className={cm.cn(cm.sp('px', 6), cm.sp('py', 5))}>
                        <span
                          className={cm.cn(
                            cm.roundedFull,
                            cm.textSize('xs'),
                            cm.fontWeight('medium'),
                            'inline-flex items-center px-2.5 py-0.5',
                            statusBadgeClasses(status),
                          )}
                        >
                          {statusLabel(status, t)}
                        </span>
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('px', 6),
                          cm.sp('py', 5),
                          cm.textCenter,
                          cm.fontWeight('medium'),
                          'text-secondary',
                        )}
                      >
                        {isDraft || isScheduled || !viewsLabel
                          ? t('recentPostsSection.noViews', {}, { defaultValue: '—' })
                          : viewsLabel}
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('px', 6),
                          cm.sp('py', 5),
                          cm.textRight,
                          cm.textSize('sm'),
                          'text-secondary',
                        )}
                      >
                        {dateLabel ?? t('recentPostsSection.noDate', {}, { defaultValue: '—' })}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default RecentPostsSection
export { RecentPostsSection }
