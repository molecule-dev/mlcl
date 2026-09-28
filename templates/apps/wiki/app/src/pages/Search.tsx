import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface ApiSpace {
  id: string
  name: string
}

interface ApiPage {
  id: string
  title: string
  slug: string
  content: string
  space_id: string
  updated_at: string | null
  author_id: string
}

interface SearchHit {
  id: string
  score?: number
  document?: ApiPage
  // Some providers (e.g. the Postgres fallback) return flat hits.
  title?: string
  slug?: string
  content?: string
  space_id?: string
  updated_at?: string | null
  author_id?: string
}

interface SearchResponse {
  hits?: SearchHit[]
  total?: number
  page?: number
  perPage?: number
}

function flattenHit(h: SearchHit): ApiPage {
  if (h.document) {
    return {
      id: h.document.id,
      title: h.document.title,
      slug: h.document.slug,
      content: h.document.content,
      space_id: h.document.space_id,
      updated_at: h.document.updated_at ?? null,
      author_id: h.document.author_id ?? '',
    }
  }
  return {
    id: h.id,
    title: h.title ?? '',
    slug: h.slug ?? '',
    content: h.content ?? '',
    space_id: h.space_id ?? '',
    updated_at: h.updated_at ?? null,
    author_id: h.author_id ?? '',
  }
}

function snippet(content: string, query: string): string {
  if (!content) return ''
  const text = content
    .replace(/[#*`>]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!query) return text.slice(0, 220)
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return text.slice(0, 220)
  const start = Math.max(0, idx - 60)
  const end = Math.min(text.length, idx + 160)
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
}

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialQ = searchParams.get('q') ?? ''
  const initialSpace = searchParams.get('space_id') ?? ''

  const [query, setQuery] = useState(initialQ)
  const [activeSpaceId, setActiveSpaceId] = useState<string>(initialSpace)
  const [spaces, setSpaces] = useState<ApiSpace[]>([])
  const [results, setResults] = useState<ApiPage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<ApiSpace[]>('/spaces')
      .then((res) => {
        if (!cancelled) setSpaces(Array.isArray(res.data) ? res.data : [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http])

  const runSearch = useCallback(
    async (q: string, spaceId: string) => {
      if (!q.trim()) {
        setResults([])
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const params: Record<string, string> = { q: q.trim() }
        if (spaceId) params.space_id = spaceId
        const res = await http.get<SearchResponse | ApiPage[]>('/pages/search', { params })
        const data = res.data as SearchResponse | ApiPage[]
        const rawHits: SearchHit[] = Array.isArray(data)
          ? (data as ApiPage[]).map((p) => ({
              id: p.id,
              title: p.title,
              slug: p.slug,
              content: p.content,
              space_id: p.space_id,
              updated_at: p.updated_at,
              author_id: p.author_id,
            }))
          : Array.isArray(data?.hits)
            ? data.hits!
            : []
        const hits: ApiPage[] = rawHits.map(flattenHit)
        setResults(hits)
        void track({
          name: 'search.performed',
          properties: {
            query_length: q.trim().length,
            results: hits.length,
            has_space_filter: Boolean(spaceId),
          },
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed')
        setResults([])
      } finally {
        setLoading(false)
      }
    },
    [http],
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      runSearch(query, activeSpaceId)
      const next = new URLSearchParams(searchParams)
      if (query) next.set('q', query)
      else next.delete('q')
      if (activeSpaceId) next.set('space_id', activeSpaceId)
      else next.delete('space_id')
      setSearchParams(next, { replace: true })
    }, 220)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeSpaceId, runSearch]) // searchParams/setSearchParams omitted: including them would cause an infinite update loop

  const spaceMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const s of spaces) m[s.id] = s.name
    return m
  }, [spaces])

  return (
    <div className={cm.stack(8)} data-testid="search-page">
      <div className={cm.stack(2)}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('search.eyebrow', {}, { defaultValue: 'Across all spaces' })}
        </span>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('search.heading', { appName: APP_NAME }, { defaultValue: 'Search {{appName}}' })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
          {t(
            'search.subtitle',
            {},
            { defaultValue: 'Pages, comments, contributors — all instant, all local-first.' },
          )}
        </p>
      </div>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 4),
          'h-14 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm focus-within:ring-2 focus-within:ring-primary/40',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined text-[22px] text-primary')}
          aria-hidden="true"
        >
          search
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(
            'search.placeholder',
            {},
            { defaultValue: 'Search pages, snippets, contributors…' },
          )}
          data-testid="search-input"
          className={cm.cn(
            'flex-1 bg-transparent text-base text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none',
          )}
        />
        <kbd
          className={cm.cn(
            cm.sp('px', 2),
            cm.textSize('xs'),
            'font-mono rounded bg-surface-container border border-outline-variant/60 text-on-surface-variant',
          )}
        >
          ⌘K
        </kbd>
      </div>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
        <button
          type="button"
          onClick={() => setActiveSpaceId('')}
          data-testid="search-filter-all"
          className={cm.cn(
            cm.sp('px', 4),
            cm.textSize('xs'),
            'h-8 rounded-full font-bold uppercase tracking-widest transition-colors',
            !activeSpaceId
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high',
          )}
        >
          {t('status.all', {}, { defaultValue: 'All' })}
        </button>
        {spaces.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveSpaceId(s.id)}
            data-testid={`search-filter-${s.id}`}
            className={cm.cn(
              cm.sp('px', 4),
              cm.textSize('xs'),
              'h-8 rounded-full font-bold uppercase tracking-widest transition-colors',
              s.id === activeSpaceId
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high',
            )}
          >
            {s.name}
          </button>
        ))}
        <span
          className={cm.cn(cm.textSize('xs'), 'ml-auto text-on-surface-variant')}
          data-testid="search-result-count"
        >
          {loading
            ? t('common.searchingEllipsis', {}, { defaultValue: 'Searching…' })
            : t(
                'search.resultCount',
                { count: results.length },
                { defaultValue: '{{count}} results' },
              )}
        </span>
      </div>

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            cm.accentCard({ tone: 'error' }),
            'rounded-md bg-error/10 text-on-surface',
          )}
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {!query.trim() ? (
        <div
          className={cm.cn(
            cm.sp('p', 12),
            cm.stack(2),
            cm.textCenter,
            'rounded-xl border border-outline-variant/40 bg-surface-container-lowest',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-[40px] text-on-surface-variant/60')}
            aria-hidden="true"
          >
            search
          </span>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'text-on-surface')}>
            {t('search.startTyping', {}, { defaultValue: 'Type to search the cairn.' })}
          </p>
        </div>
      ) : results.length === 0 && !loading ? (
        <div
          className={cm.cn(
            cm.sp('p', 12),
            cm.stack(2),
            cm.textCenter,
            'rounded-xl border border-outline-variant/40 bg-surface-container-lowest',
          )}
          data-testid="search-empty"
        >
          <span
            className={cm.cn('material-symbols-outlined text-[40px] text-on-surface-variant/60')}
            aria-hidden="true"
          >
            search_off
          </span>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'text-on-surface')}>
            {t(
              'search.empty.title',
              {},
              { defaultValue: 'Nothing in the cairn matches that yet.' },
            )}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t(
              'search.empty.body',
              {},
              { defaultValue: 'Try a shorter phrase or remove a filter.' },
            )}
          </p>
        </div>
      ) : (
        <ul className={cm.stack(3)} data-testid="search-results">
          {results.map((r) => (
            <li key={r.id} data-testid={`search-result-${r.id}`}>
              <Link
                to={`/page/${r.id}`}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'xs' }),
                  cm.sp('p', 5),
                  'rounded-xl border border-outline-variant/40 bg-surface-container-lowest hover:-translate-y-0.5 hover:shadow-md transition-all',
                )}
              >
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {spaceMap[r.space_id] ?? t('search.unknownSpace', {}, { defaultValue: 'Space' })}
                </p>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    'font-extrabold tracking-tight text-on-surface',
                  )}
                >
                  {r.title}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-snug')}>
                  {snippet(r.content ?? '', query)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
