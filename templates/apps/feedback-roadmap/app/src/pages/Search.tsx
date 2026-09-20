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
  const [boards, setBoards] = useState<ApiBoardSummary[]>([])
  const [boardFilter, setBoardFilter] = useState('')

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

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) return
    const http = getHttpClient()
    try {
      const res = await http.get<{ hits?: ApiPost[] }>(
        `/api/posts/search?q=${encodeURIComponent(q.trim())}`,
      )
      setHits(Array.isArray(res?.data?.hits) ? res.data.hits : [])
    } catch (e) {
      logError('search.load', e)
      setHits([])
    }
  }, [])

  useEffect(() => {
    if (submitted) void runSearch(submitted)
  }, [submitted, runSearch])

  const filtered = useMemo(
    () => (hits ?? []).filter((p) => !boardFilter || p.board_id === boardFilter),
    [hits, boardFilter],
  )

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), 'max-w-3xl')}>
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight text-on-surface')}>
          {t('search.title', {}, { defaultValue: 'Search feedback' })}
        </h1>
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
            disabled={!query.trim()}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(11),
              cm.h(11),
              'rounded-full bg-primary text-on-primary disabled:opacity-40 hover:bg-primary-active transition-colors',
            )}
            aria-label={t('search.submit', {}, { defaultValue: 'Search' })}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              search
            </span>
          </button>
        </form>
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
      </header>

      {hits === null ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'search.hint',
            {},
            {
              defaultValue: 'Type a query to find existing requests before posting a duplicate.',
            },
          )}
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
