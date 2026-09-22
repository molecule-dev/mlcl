import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface Workspace {
  id: string
  name: string
  icon: string | null
}

interface PageHit {
  id: string
  workspace_id: string
  title: string
  icon: string | null
  updated_at: string
}

const FILTERS: ReadonlyArray<{ key: 'all' | 'pages'; icon: string; label: string }> = [
  { key: 'all', icon: 'all_inclusive', label: 'All' },
  { key: 'pages', icon: 'description', label: 'Pages' },
]

const RECENT_KEY = 'verso.recentSearches'

const formatRelative = (iso: string): string => {
  const d = new Date(iso)
  const day = 24 * 60 * 60 * 1000
  const diff = Date.now() - d.getTime()
  if (diff < day) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'pages'>('all')
  const [hits, setHits] = useState<PageHit[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recent, setRecent] = useState<string[]>([])
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_KEY)
      if (raw) setRecent(JSON.parse(raw))
    } catch (_error) {
      // localStorage may be unavailable (private browsing); fail open.
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    http
      .get<Workspace[]>('/workspaces')
      .then((res) => {
        if (!cancelled) setWorkspaces(res.data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load workspaces')
      })
    return () => {
      cancelled = true
    }
  }, [http])

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    if (!query.trim() || workspaces.length === 0) {
      setHits([])
      return
    }
    debounce.current = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const all: PageHit[] = []
        for (const ws of workspaces) {
          const res = await http.get<PageHit[]>(
            `/pages/search?workspace_id=${ws.id}&q=${encodeURIComponent(query.trim())}`,
          )
          all.push(...res.data)
        }
        setHits(all)
        void track({
          name: 'search.performed',
          properties: { query: query.trim(), results: all.length },
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed')
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [http, query, workspaces])

  const recordRecent = (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    setRecent((prev) => {
      const next = [trimmed, ...prev.filter((p) => p !== trimmed)].slice(0, 6)
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      } catch (_error) {
        // localStorage may be unavailable
      }
      return next
    })
  }

  const visibleHits = useMemo<PageHit[]>(() => {
    if (filter === 'pages') return hits
    return hits
  }, [hits, filter])

  return (
    <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 10), 'mx-auto w-full max-w-4xl')}>
      <header className={cm.cn('mb-8')}>
        <p
          className={cm.cn(
            'text-[11px] font-black uppercase tracking-[0.32em] text-on-surface-variant mb-2',
          )}
        >
          {t('search.eyebrow', { appName: APP_NAME }, { defaultValue: '{{appName}} · ⌘K' })}
        </p>
        <h1
          className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface')}
          style={{
            fontFamily: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
          }}
        >
          {t('search.title', {}, { defaultValue: 'Search the second brain.' })}
        </h1>
        <p className={cm.cn('text-base text-on-surface-variant mt-2 max-w-xl')}>
          {t(
            'search.subtitle',
            {},
            {
              defaultValue:
                'Full-text across every notebook. Type to search; results refresh as you type.',
            },
          )}
        </p>
      </header>

      <div
        className={cm.cn(
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm',
        )}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            recordRecent(query)
          }}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 4),
            cm.flex({ align: 'center', gap: 'sm' }),
            'border-b border-outline-variant/40',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-[22px] text-on-surface-variant')}
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
              { defaultValue: 'Search every note, tag, and backlink…' },
            )}
            data-testid="search-input"
            className={cm.cn(
              'flex-1 bg-transparent border-0 outline-none text-lg text-on-surface placeholder:text-on-surface-variant/60',
            )}
            style={{
              fontFamily: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
            }}
            aria-label={t(
              'search.inputAria',
              { appName: APP_NAME },
              { defaultValue: 'Search {{appName}}' },
            )}
          />
        </form>

        <div
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.flex({ align: 'center', gap: 'sm' }),
            'border-b border-outline-variant/40 flex-wrap',
          )}
        >
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.flex({ align: 'center', gap: 'xs' }),
                'rounded-full text-[12px] font-bold transition-colors',
                filter === f.key
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                {f.icon}
              </span>
              {t(`search.filter.${f.key}`, {}, { defaultValue: f.label })}
            </button>
          ))}
        </div>

        <div className={cm.cn('p-2')}>
          {error ? (
            <p
              role="alert"
              className={cm.cn(cm.sp('px', 3), cm.sp('py', 4), 'text-sm font-semibold text-error')}
            >
              {error}
            </p>
          ) : null}
          {loading ? (
            <p className={cm.cn('px-3 py-4 text-sm text-on-surface-variant')}>
              {t('search.loading', {}, { defaultValue: 'Searching…' })}
            </p>
          ) : null}

          {!query.trim() ? (
            <div className={cm.cn('px-3 py-6')}>
              <p
                className={cm.cn(
                  'text-[11px] font-black uppercase tracking-[0.32em] text-on-surface-variant mb-3',
                )}
              >
                {t('search.recentLabel', {}, { defaultValue: 'Recent searches' })}
              </p>
              <div className={cm.cn('flex flex-wrap gap-2')}>
                {recent.length === 0 ? (
                  <p className={cm.cn('text-sm text-on-surface-variant')}>
                    {t(
                      'search.noRecent',
                      {},
                      { defaultValue: 'Type a query above to start searching across your notes.' },
                    )}
                  </p>
                ) : (
                  recent.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuery(q)}
                      className={cm.cn(
                        'px-3 py-1.5 rounded-full text-sm font-semibold bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors',
                      )}
                    >
                      {q}
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : visibleHits.length === 0 && !loading ? (
            <div className={cm.cn('px-3 py-10 text-center')} data-testid="search-empty">
              <span
                className={cm.cn('material-symbols-outlined text-[36px] text-on-surface-variant')}
                aria-hidden="true"
              >
                search_off
              </span>
              <p className={cm.cn('mt-2 text-on-surface-variant')}>
                {t('search.empty', {}, { defaultValue: 'No notes match this query yet.' })}
              </p>
            </div>
          ) : (
            <ul
              className={cm.cn('divide-y divide-outline-variant/30')}
              data-testid="search-results"
            >
              {visibleHits.map((hit) => (
                <li key={hit.id}>
                  <Link
                    to={`/notes/${hit.id}`}
                    onClick={() => recordRecent(query)}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'block hover:bg-surface-container/70',
                    )}
                  >
                    <p className={cm.cn('text-sm font-bold text-on-surface')}>
                      {hit.title || t('status.untitled', {}, { defaultValue: 'Untitled' })}
                    </p>
                    <p className={cm.cn('text-xs text-on-surface-variant mt-0.5')}>
                      {formatRelative(hit.updated_at)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default Search
