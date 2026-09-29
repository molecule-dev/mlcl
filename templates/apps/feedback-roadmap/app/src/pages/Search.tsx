/**
 * Search — public full-text search across feedback posts.
 *
 * Hits GET /api/posts/search?q=… (Meilisearch-backed with a DB fallback on
 * the server). Board chips narrow to one board.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PostCard } from '../components/PostCard.js'
import type { ApiBoardSummary, ApiPost } from '../utils/posts.js'

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [hits, setHits] = useState<ApiPost[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [boards, setBoards] = useState<ApiBoardSummary[]>([])
  const [boardFilter, setBoardFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'open' | 'planned' | 'in_progress' | 'shipped'
  >('all')

  useEffect(() => {
    let cancelled = false
    const http = getHttpClient()
    void http
      .get<ApiBoardSummary[]>('/api/boards')
      .then((res) => {
        if (!cancelled && Array.isArray(res?.data)) setBoards(res.data)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const runSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) return
      const http = getHttpClient()
      setSearching(true)
      setError(null)
      try {
        const res = await http.get<{ hits?: ApiPost[] }>(
          `/api/posts/search?q=${encodeURIComponent(q.trim())}`,
        )
        setHits(Array.isArray(res?.data?.hits) ? res.data.hits : [])
      } catch (e) {
        logError('search.load', e)
        setHits([])
        setError(t('search.loadError', {}, { defaultValue: 'Search failed — try again.' }))
      } finally {
        setSearching(false)
      }
    },
    [t],
  )

  useEffect(() => {
    if (submitted) void runSearch(submitted)
  }, [submitted, runSearch])

  const filtered = useMemo(
    () =>
      (hits ?? []).filter(
        (p) =>
          (!boardFilter || p.board_id === boardFilter) &&
          (statusFilter === 'all' || p.status === statusFilter),
      ),
    [hits, boardFilter, statusFilter],
  )

  const statusFacets: Array<{
    id: 'all' | 'open' | 'planned' | 'in_progress' | 'shipped'
    label: string
  }> = [
    { id: 'all', label: t('boardDetail.filterAll', {}, { defaultValue: 'All' }) },
    { id: 'open', label: t('status.open', {}, { defaultValue: 'Open' }) },
    { id: 'planned', label: t('status.planned', {}, { defaultValue: 'Planned' }) },
    { id: 'in_progress', label: t('status.inProgress', {}, { defaultValue: 'In progress' }) },
    { id: 'shipped', label: t('status.shipped', {}, { defaultValue: 'Shipped' }) },
  ]

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), 'max-w-3xl')}>
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight text-on-surface')}>
          {t('search.title', {}, { defaultValue: 'Search Feedback & Roadmap' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'search.subtitle',
            {},
            {
              defaultValue:
                'Instant full-text query across feature requests, the active roadmap, backlog items, and shipped changelogs.',
            },
          )}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSubmitted(query)
          }}
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
        >
          <input
            type="search"
            data-mol-id="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'search.placeholder',
              {},
              { defaultValue: 'Search requests, e.g. "dark mode"…' },
            )}
            aria-label={t('search.placeholder', {}, { defaultValue: 'Search requests' })}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.flex1,
              'rounded-full border border-outline-variant/50 bg-input-background text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary',
            )}
          />
          <button
            type="submit"
            data-mol-id="search-submit"
            disabled={!query.trim() || searching}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(11),
              cm.h(11),
              'rounded-full bg-primary text-on-primary disabled:opacity-40 hover:bg-primary-active transition-colors',
            )}
            aria-label={t('search.submit', {}, { defaultValue: 'Search' })}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {searching ? 'progress_activity' : 'search'}
            </span>
          </button>
        </form>
        {error && (
          <div
            role="alert"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.sp('p', 3),
              'rounded-lg bg-error-container/40 text-on-error-container border border-error/40',
            )}
          >
            {error}
          </div>
        )}
        {boards.length > 0 && hits !== null && (
          <div
            role="group"
            aria-label={t('search.boardFilter', {}, { defaultValue: 'Filter by board' })}
            className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}
          >
            <button
              key="all"
              type="button"
              aria-pressed={boardFilter === ''}
              onClick={() => setBoardFilter('')}
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('xs'),
                cm.sp('px', 3),
                cm.sp('py', 1),
                'rounded-full border transition-colors',
                boardFilter === ''
                  ? 'border-primary bg-primary-container/30 text-primary'
                  : 'border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low/50',
              )}
            >
              {t('search.allBoards', {}, { defaultValue: 'All boards' })}
            </button>
            {boards.map((board) => {
              const selected = board.id === boardFilter
              return (
                <button
                  key={board.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setBoardFilter(board.id)}
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
                  {board.icon ? `${board.icon} ` : ''}
                  {board.name}
                </button>
              )
            })}
          </div>
        )}
        <section
          aria-labelledby="search-facets"
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'xs' }),
            cm.sp('p', 4),
            'rounded-xl border border-outline-variant/40 bg-surface-container-low/40',
          )}
        >
          <h3
            id="search-facets"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'text-on-surface',
            )}
          >
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(6),
                cm.h(6),
                'rounded-md shrink-0',
              )}
              style={{
                backgroundColor: 'var(--color-primary-container)',
                color: 'var(--color-primary)',
              }}
              aria-hidden="true"
            >
              <span className={cm.cn('material-symbols-outlined text-sm')}>filter_list</span>
            </span>
            {t('search.facetsTitle', {}, { defaultValue: 'Faceted Refinements' })}
          </h3>
          <div
            role="group"
            aria-label={t('search.facetsLabel', {}, { defaultValue: 'Refine by status' })}
            className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}
          >
            {statusFacets.map((facet) => {
              const selected = facet.id === statusFilter
              return (
                <button
                  key={facet.id}
                  type="button"
                  data-mol-id={`search-facet-${facet.id}`}
                  aria-pressed={selected}
                  onClick={() => setStatusFilter(facet.id)}
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
                  {facet.label}
                </button>
              )
            })}
          </div>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'search.facetsNotify',
              {},
              {
                defaultValue:
                  'Voters are notified automatically when new feedback matches a request they backed.',
              },
            )}
          </p>
        </section>
      </header>

      {hits === null && !error ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'search.hint',
            {},
            {
              defaultValue: 'Type a query to find existing requests before posting a duplicate.',
            },
          )}
        </p>
      ) : error ? null : searching ? (
        <p role="status" className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('search.searching', {}, { defaultValue: 'Searching…' })}
        </p>
      ) : filtered.length === 0 ? (
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
            search_off
          </span>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('search.empty', {}, { defaultValue: 'No requests match that search.' })}
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
            {t('search.submitNew', {}, { defaultValue: 'Post it as a new request' })}
          </Link>
        </div>
      ) : (
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {filtered.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Search
