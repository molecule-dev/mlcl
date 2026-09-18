import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

type ClassMap = ReturnType<typeof getClassMap>

import type { ThreadStatus } from '../components/ThreadRow.js'

interface SearchResult {
  id: string
  kind?: 'thread' | 'post' | 'user'
  slug?: string
  title: string
  excerpt?: string
  highlight?: string[]
  author: { username: string; reputation?: number }
  category?: { name: string; slug: string; color?: string }
  reply_count?: number
  view_count?: number
  last_activity_at?: string
  statuses?: ThreadStatus[]
}

const FILTERS: Array<{
  key: 'all' | 'threads' | 'posts' | 'users'
  defaultLabel: string
  icon: string
}> = [
  { key: 'all', defaultLabel: 'Everything', icon: 'apps' },
  { key: 'threads', defaultLabel: 'Threads', icon: 'forum' },
  { key: 'posts', defaultLabel: 'Posts', icon: 'chat_bubble' },
  { key: 'users', defaultLabel: 'People', icon: 'person' },
]

const highlight = (_cm: ClassMap, text: string, terms: string[]) => {
  if (!terms.length) return text
  const pattern = new RegExp(
    `(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'ig',
  )
  const parts = text.split(pattern)
  return parts.map((part, i) =>
    pattern.test(part) ? (
      <mark
        key={i}
        style={{
          background: 'var(--color-pinned-light)',
          color: 'var(--color-reputation)',
          borderRadius: 2,
        }}
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'threads' | 'posts' | 'users'>('all')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    const handle = window.setTimeout(() => {
      http
        .get<{ data: SearchResult[] }>(`/api/search?q=${encodeURIComponent(query)}&type=${filter}`)
        .then((res) => {
          if (cancelled) return
          setResults(res?.data?.data ?? [])
          setError(null)
        })
        .catch((e) => {
          if (cancelled) return
          setResults([])
          setError(e instanceof Error ? e.message : 'Search failed')
        })
        .finally(() => !cancelled && setLoading(false))
    }, 220)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [http, query, filter])

  const groupedTerms = useMemo(() => query.split(/\s+/).filter((t) => t.length > 1), [query])

  return (
    <div className={cm.cn(cm.stack(6))}>
      <header className={cm.stack(2)}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-[0.3em] text-primary',
          )}
        >
          {t('search.eyebrow', {}, { defaultValue: 'Search the agora' })}
        </span>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('search.heading', {}, { defaultValue: 'Find a thread, a post, a person.' })}
        </h1>
      </header>

      <div
        className={cm.cn(
          cm.sp('p', 4),
          cm.flex({ align: 'center', gap: 'sm' }),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
        )}
      >
        <span className="material-symbols-outlined text-on-surface-variant" aria-hidden>
          search
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(
            'search.placeholder',
            {},
            { defaultValue: 'Search the full archive — try a phrase or @username' },
          )}
          className={cm.cn(
            cm.sp('px', 2),
            'flex-1 bg-transparent border-0 outline-none text-base text-on-surface placeholder:text-on-surface-variant',
          )}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className={cm.cn(
              cm.sp('p', 1),
              cm.roundedFull,
              'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
            )}
            aria-label={t('search.clear', {}, { defaultValue: 'Clear search' })}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden>
              close
            </span>
          </button>
        )}
      </div>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'inline-flex items-center gap-2 text-xs uppercase tracking-widest transition-colors',
                active
                  ? 'bg-primary text-on-primary shadow-sm shadow-primary/30'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant',
              )}
            >
              <span className="material-symbols-outlined text-[14px]" aria-hidden>
                {f.icon}
              </span>
              {t(`search.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
            </button>
          )
        })}
        <span className={cm.cn(cm.flex1)} />
        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {loading
            ? t('search.searching', {}, { defaultValue: 'Searching…' })
            : t(
                'search.resultsCount',
                { count: results.length.toLocaleString() },
                { defaultValue: '{{count}} results' },
              )}
        </span>
      </div>

      {error && (
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant italic')} role="alert">
          {error}
        </p>
      )}

      {!query.trim() ? (
        <p className={cm.textMuted}>
          {t('search.prompt', {}, { defaultValue: 'Type a query to search threads.' })}
        </p>
      ) : loading ? (
        <p className={cm.textMuted}>
          {t('common.searchingEllipsis', {}, { defaultValue: 'Searching…' })}
        </p>
      ) : results.length === 0 ? (
        <p className={cm.textMuted}>
          {t('search.empty', {}, { defaultValue: 'No matches. Try a different phrase.' })}
        </p>
      ) : (
        <div className={cm.stack(3)}>
          {results.map((result) => {
            const isUser = result.kind === 'user'
            const target = isUser
              ? `/u/${result.author.username}`
              : `/t/${result.slug ?? result.id}`
            return (
              <article
                key={result.id}
                className={cm.cn(
                  cm.sp('p', 5),
                  cm.stack(2),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/40 hover:shadow-md transition-all',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
                  {isUser && (
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.fontWeight('bold'),
                        cm.roundedFull,
                        'inline-flex items-center gap-1 py-0.5 text-[10px] uppercase tracking-widest bg-primary/10 text-primary',
                      )}
                    >
                      <span className="material-symbols-outlined text-[12px]" aria-hidden>
                        person
                      </span>
                      {t('search.filter.users', {}, { defaultValue: 'People' })}
                    </span>
                  )}
                  {result.category && (
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.fontWeight('bold'),
                        cm.roundedFull,
                        'py-0.5 text-[10px] uppercase tracking-widest text-on-surface-variant bg-surface-container',
                      )}
                      style={
                        result.category.color
                          ? { boxShadow: `inset 3px 0 0 0 ${result.category.color}` }
                          : undefined
                      }
                    >
                      {result.category.name}
                    </span>
                  )}
                  {result.statuses?.map((status) => (
                    <span
                      key={status}
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.fontWeight('bold'),
                        cm.roundedFull,
                        'py-0.5 text-[10px] uppercase tracking-widest',
                        status === 'pinned'
                          ? 'bg-warning-light text-warning'
                          : status === 'hot'
                            ? 'bg-error-light text-error'
                            : status === 'resolved'
                              ? 'bg-success-light text-success'
                              : 'bg-border text-foreground-secondary',
                      )}
                    >
                      {t(`threadRow.status.${status}`, {}, { defaultValue: status })}
                    </span>
                  ))}
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('bold'),
                    'tracking-tight text-on-surface',
                  )}
                >
                  <Link to={target} className={cm.cn('hover:text-primary transition-colors')}>
                    {highlight(cm, result.title, groupedTerms)}
                  </Link>
                </h3>
                {result.excerpt && (
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      'text-on-surface-variant leading-relaxed line-clamp-3',
                    )}
                    style={{ fontFamily: 'var(--mol-font-serif, Georgia, serif)' }}
                  >
                    {highlight(cm, result.excerpt, groupedTerms)}
                  </p>
                )}
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md' }),
                    cm.textSize('xs'),
                    'text-on-surface-variant flex-wrap',
                  )}
                >
                  <Link
                    to={`/u/${result.author.username}`}
                    className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
                  >
                    @{result.author.username}
                  </Link>
                  {!isUser && (
                    <>
                      <span className="text-on-surface-variant">·</span>
                      <span>
                        {t(
                          'search.replies',
                          { count: (result.reply_count ?? 0).toLocaleString() },
                          { defaultValue: '{{count}} replies' },
                        )}
                      </span>
                      <span className="text-on-surface-variant">·</span>
                      <span>
                        {t(
                          'common.countViews',
                          { count: (result.view_count ?? 0).toLocaleString() },
                          { defaultValue: '{{count}} views' },
                        )}
                      </span>
                    </>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Search
