import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { ThreadRow, type ThreadStatus } from '../components/ThreadRow.js'

interface CategoryDetail {
  id: string
  slug: string
  name: string
  description: string
  color?: string
  icon?: string
  thread_count: number
  post_count: number
}

interface ThreadSummary {
  id: string
  slug?: string
  title: string
  excerpt?: string
  author: { username: string; reputation?: number }
  category?: { name: string; slug: string; color?: string }
  reply_count: number
  view_count: number
  last_activity_at: string
  statuses?: ThreadStatus[]
  votes?: number
  unread?: boolean
  is_moderator_author?: boolean
}

const SORT_OPTIONS: Array<{
  key: 'recent' | 'top' | 'unanswered'
  defaultLabel: string
}> = [
  { key: 'recent', defaultLabel: 'Most recent' },
  { key: 'top', defaultLabel: 'Top this week' },
  { key: 'unanswered', defaultLabel: 'Unanswered' },
]

export function CategoryDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const params = useParams<{ slug: string }>()
  const [category, setCategory] = useState<CategoryDetail | null>(null)
  const [threads, setThreads] = useState<ThreadSummary[] | null>(null)
  const [sort, setSort] = useState<'recent' | 'top' | 'unanswered'>('recent')
  const [error, setError] = useState<string | null>(null)
  const [threadsError, setThreadsError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const slug = params.slug
    if (!slug) return
    setError(null)
    setThreadsError(null)
    http
      .get<CategoryDetail>(`/api/categories-by-slug/${slug}`)
      .then((res) => !cancelled && setCategory((res?.data as CategoryDetail) ?? null))
      .catch(
        (e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load category'),
      )
    http
      .get<{ data: ThreadSummary[] }>(`/api/categories/${slug}/threads`)
      .then((res) => {
        if (cancelled) return
        const list = res?.data?.data ?? []
        let sorted = list
        if (sort === 'top')
          sorted = [...list].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
        else if (sort === 'unanswered') sorted = list.filter((t2) => (t2.reply_count ?? 0) === 0)
        setThreads(sorted)
      })
      .catch(() => {
        // Never render the friendly empty state for a FAILED fetch — the
        // distinction matters ("nothing here yet" vs "we could not look").
        if (cancelled) return
        setThreads([])
        setThreadsError(
          t('categoryDetail.threadsFailed', {}, { defaultValue: 'Could not load threads.' }),
        )
      })
    return () => {
      cancelled = true
    }
    // `t` is intentionally excluded — including it can retrigger the fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, params.slug, sort, reloadKey])

  const cat = category
  const list = threads ?? []

  return (
    <div className={cm.cn(cm.stack(6))}>
      {cat && (
        <header
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'md' }),
            cm.sp('p', 8),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 relative overflow-hidden',
          )}
        >
          <div
            aria-hidden
            className={cm.cn('absolute inset-y-0 left-0 w-2')}
            style={{ background: cat.color ?? 'var(--color-author)' }}
          />
          <nav
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant ml-2',
            )}
          >
            <Link to="/c" className={cm.cn('hover:text-primary')}>
              {t('categoryDetail.breadcrumb.categories', {}, { defaultValue: 'Categories' })}
            </Link>
            <span className={cm.cn('mx-2 text-on-surface-variant/40')}>/</span>
            <span className="text-on-surface">{cat.name}</span>
          </nav>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'ml-2')}>
            <div
              className={cm.cn(
                cm.w(12),
                cm.h(12),
                cm.flex({ align: 'center', justify: 'center' }),
                cm.roundedFull,
                'text-white shadow-md shadow-primary/20',
              )}
              style={{ background: cat.color ?? 'var(--color-author)' }}
            >
              <span className="material-symbols-outlined" aria-hidden>
                {cat.icon ?? 'forum'}
              </span>
            </div>
            <div className={cm.stack(1)}>
              <h1
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.fontWeight('bold'),
                  'tracking-tight text-on-surface',
                )}
              >
                {cat.name}
              </h1>
              <p className={cm.cn(cm.textSize('sm'), cm.maxW('xl'), 'text-on-surface-variant')}>
                {cat.description}
              </p>
            </div>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'ml-2 flex-wrap')}>
            <div>
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('categoryDetail.stat.threads', {}, { defaultValue: 'Threads' })}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('bold'),
                  'tabular-nums text-on-surface',
                )}
              >
                {(cat.thread_count ?? 0).toLocaleString()}
              </p>
            </div>
            <div className={cm.cn('h-10 w-px bg-outline-variant/40')} />
            <div>
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('categoryDetail.stat.posts', {}, { defaultValue: 'Posts' })}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('bold'),
                  'tabular-nums text-on-surface-variant',
                )}
              >
                {(cat.post_count ?? 0).toLocaleString()}
              </p>
            </div>
            <div className={cm.cn(cm.flex1)} />
            <Link
              to={`/compose?category=${cat.slug}`}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'inline-flex items-center gap-2 bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-sm shadow-primary/30',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden>
                edit_note
              </span>
              {t('categoryDetail.startThread', {}, { defaultValue: 'Start a thread' })}
            </Link>
          </div>
        </header>
      )}
      {!cat && error && (
        <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
          {error}
        </p>
      )}{' '}
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
        {SORT_OPTIONS.map((option) => {
          const isActive = sort === option.key
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setSort(option.key)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'text-xs uppercase tracking-widest transition-colors min-h-10 md:min-h-0',
                isActive
                  ? 'bg-primary text-on-primary shadow-sm shadow-primary/30'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant',
              )}
            >
              {t(`categoryDetail.sort.${option.key}`, {}, { defaultValue: option.defaultLabel })}
            </button>
          )
        })}
        <span className={cm.cn(cm.flex1)} />
        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(
            'categoryDetail.threadCount',
            { count: list.length.toLocaleString() },
            { defaultValue: 'Showing {{count}} threads' },
          )}
        </span>
      </div>
      {threads === null ? (
        <p className={cm.textMuted}>
          {t('categoryDetail.loading', {}, { defaultValue: 'Loading threads…' })}
        </p>
      ) : threadsError ? (
        <LoadErrorBanner message={threadsError} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : list.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 8),
            cm.stack(3),
            'rounded-2xl bg-surface-container-lowest border border-dashed border-outline-variant/40 items-center text-center',
          )}
        >
          <span
            className="material-symbols-outlined text-[32px] text-on-surface-variant"
            aria-hidden
          >
            forum
          </span>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'categoryDetail.empty',
              {},
              { defaultValue: 'No threads yet. Start one — every conversation begins somewhere.' },
            )}
          </p>
          {cat && (
            <Link
              to={`/compose?category=${cat.slug}`}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.roundedFull,
                cm.textSize('sm'),
                'inline-flex items-center gap-2 bg-primary text-on-primary hover:bg-primary-dark transition-colors',
              )}
            >
              <span className="material-symbols-outlined text-base" aria-hidden>
                edit_note
              </span>
              {t('categoryDetail.startThread', {}, { defaultValue: 'Start a thread' })}
            </Link>
          )}
        </div>
      ) : (
        <div
          className={cm.cn(
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 overflow-hidden',
          )}
        >
          {list.map((thread) => (
            <ThreadRow
              key={thread.id}
              id={thread.id}
              slug={thread.slug}
              title={thread.title}
              excerpt={thread.excerpt}
              author={thread.author}
              category={thread.category}
              replyCount={thread.reply_count}
              viewCount={thread.view_count}
              lastActivityAt={thread.last_activity_at}
              statuses={thread.statuses}
              votes={thread.votes}
              unread={thread.unread}
              isModeratorAuthor={thread.is_moderator_author}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default CategoryDetail
