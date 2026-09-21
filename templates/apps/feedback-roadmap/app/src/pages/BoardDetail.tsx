/**
 * BoardDetail — one board's posts, sorted by votes by default.
 *
 * Public. Filter chips narrow by official status; the sort toggle flips
 * between demand (votes) and recency. Signed-in visitors can toggle votes
 * straight from the list; signed-out pills route to /login.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { getClient as getHttpClient } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PostCard } from '../components/PostCard.js'
import { StatusBadge } from '../components/StatusBadge.js'
import type { ApiBoardSummary, ApiPost } from '../utils/posts.js'

type StatusFilter = 'all' | 'open' | 'planned' | 'in_progress' | 'shipped' | 'declined'
type SortMode = 'top' | 'latest'

const STATUS_FILTERS: StatusFilter[] = [
  'all',
  'open',
  'planned',
  'in_progress',
  'shipped',
  'declined',
]

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'All',
  open: 'Open',
  planned: 'Planned',
  in_progress: 'In progress',
  shipped: 'Shipped',
  declined: 'Declined',
}

export function BoardDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { slug = '' } = useParams()
  const { isAuthenticated } = useAuth()
  const [board, setBoard] = useState<ApiBoardSummary | null>(null)
  const [posts, setPosts] = useState<ApiPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<SortMode>('top')
  const [votingId, setVotingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const http = getHttpClient()
    void http
      .get<ApiBoardSummary>(`/api/boards/by-slug/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (cancelled) return
        const data = res?.data
        if (data?.id) setBoard(data)
        else setError(t('boards.notFound', {}, { defaultValue: 'Board not found' }))
      })
      .catch((e) => {
        logError('boardDetail.loadBoard', e)
        if (!cancelled) setError(t('boards.notFound', {}, { defaultValue: 'Board not found' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug, t])

  useEffect(() => {
    if (!board?.id) return
    let cancelled = false
    const http = getHttpClient()
    const params = new URLSearchParams({ sort, limit: '50' })
    if (statusFilter !== 'all') params.set('status', statusFilter)
    void http
      .get<{ data?: ApiPost[] }>(`/api/posts?${params.toString()}`)
      .then((res) => {
        if (cancelled) return
        const rows = Array.isArray(res?.data?.data) ? res.data.data : []
        setPosts(rows.filter((p) => p.board_id === board.id))
      })
      .catch((e) => {
        logError('boardDetail.loadPosts', e)
        if (!cancelled) setPosts([])
      })
    return () => {
      cancelled = true
    }
  }, [board?.id, statusFilter, sort])

  const toggleVote = useCallback(
    async (post: ApiPost) => {
      if (!isAuthenticated || votingId) return
      setVotingId(post.id)
      try {
        const http = getHttpClient()
        const res = await http.post<{ voted?: boolean; vote_count?: number }>('/api/votes', {
          post_id: post.id,
        })
        const voted = res?.data?.voted ?? !post.viewer_voted
        track({ name: 'post.voted', properties: { post_id: post.id, voted } })
        const count = res?.data?.vote_count ?? (post.vote_count ?? 0) + (voted ? 1 : -1)
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id ? { ...p, viewer_voted: voted, vote_count: count } : p,
          ),
        )
      } catch (e) {
        logError('boardDetail.vote', e)
      } finally {
        setVotingId(null)
      }
    },
    [isAuthenticated, votingId],
  )

  if (loading) {
    return (
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }

  if (error || !board) {
    return (
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'items-start')}>
        <p
          className={cm.cn(cm.textSize('base'), cm.fontWeight('medium'), 'text-on-surface-variant')}
        >
          {error}
        </p>
        <Link
          to="/boards"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-primary hover:underline',
          )}
        >
          {t('boardDetail.backToBoards', {}, { defaultValue: 'Back to boards' })}
        </Link>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
        <Link
          to="/boards"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'text-on-surface-variant hover:text-primary transition-colors',
          )}
        >
          <span className="material-symbols-outlined text-sm" aria-hidden="true">
            arrow_back
          </span>
          {t('boardDetail.allBoards', {}, { defaultValue: 'All boards' })}
        </Link>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(11),
              cm.h(11),
              cm.roundedFull,
              cm.textSize('2xl'),
            )}
            style={{
              backgroundColor: board.color ? `${board.color}1f` : 'var(--color-primary-container)',
            }}
            aria-hidden="true"
          >
            {board.icon || '🗂️'}
          </span>
          <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight text-on-surface')}>
            {board.name}
          </h1>
        </div>
        {board.description && (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{board.description}</p>
        )}
      </header>

      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }), 'flex-wrap')}
      >
        <div
          role="group"
          aria-label={t('boardDetail.filterLabel', {}, { defaultValue: 'Filter by status' })}
          className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}
        >
          {STATUS_FILTERS.map((f) => {
            const selected = f === statusFilter
            return (
              <button
                key={f}
                type="button"
                data-mol-id={`filter-${f}`}
                aria-pressed={selected}
                onClick={() => setStatusFilter(f)}
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  'rounded-full border transition-colors',
                  selected
                    ? 'border-primary bg-primary-container/30 text-primary'
                    : 'border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low/50',
                )}
              >
                {f === 'all' ? (
                  t('boardDetail.filterAll', {}, { defaultValue: FILTER_LABELS.all })
                ) : (
                  <StatusBadge status={f} />
                )}
              </button>
            )
          })}
        </div>
        <div
          role="group"
          aria-label={t('boardDetail.sortLabel', {}, { defaultValue: 'Sort' })}
          className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}
        >
          {(['top', 'latest'] as SortMode[]).map((mode) => {
            const selected = mode === sort
            return (
              <button
                key={mode}
                type="button"
                data-mol-id={`sort-${mode}`}
                aria-pressed={selected}
                onClick={() => setSort(mode)}
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  'rounded-full border transition-colors',
                  selected
                    ? 'border-primary bg-primary-container/30 text-primary'
                    : 'border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low/50',
                )}
              >
                {mode === 'top'
                  ? t('boardDetail.sortTop', {}, { defaultValue: 'Most voted' })
                  : t('boardDetail.sortLatest', {}, { defaultValue: 'Newest' })}
              </button>
            )
          })}
        </div>
      </div>

      {posts.length === 0 ? (
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            cm.sp('p', 10),
            'rounded-xl border border-dashed border-outline-variant/50 text-center',
          )}
        >
          <span
            className={cm.cn(
              'material-symbols-outlined',
              cm.textSize('3xl'),
              'text-on-surface-variant',
            )}
            aria-hidden="true"
          >
            inbox
          </span>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('boardDetail.empty', {}, { defaultValue: 'No posts match these filters yet.' })}
          </p>
          <Link
            to="/submit"
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'rounded-full bg-primary text-on-primary hover:bg-primary-active transition-colors',
            )}
          >
            {t('boardDetail.submitFirst', {}, { defaultValue: 'Post the first idea' })}
          </Link>
        </div>
      ) : (
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onVote={isAuthenticated ? toggleVote : undefined}
              votingDisabled={votingId === post.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default BoardDetail
