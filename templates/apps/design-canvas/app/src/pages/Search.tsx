import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DesignCanvasLayout } from '../components/DesignCanvasLayout.js'

interface SearchHit {
  id: string
  title: string
  snippet: string
  category: 'project' | 'template' | 'component'
  href: string
  meta: string
  accentColor: string
}

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'project', label: 'Projects' },
  { id: 'template', label: 'Templates' },
  { id: 'component', label: 'Components' },
] as const

const CATEGORY_ICONS: Record<SearchHit['category'], string> = {
  project: 'design_services',
  template: 'auto_awesome_mosaic',
  component: 'extension',
}

const RECENT_KEY = 'dc-search-recent'

function loadRecent(): string[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(RECENT_KEY) : null
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((s): s is string => typeof s === 'string').slice(0, 6)
  } catch (_error) {
    // localStorage parse failure is non-fatal; start with an empty recents list
    return []
  }
}

function saveRecent(list: string[]) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(RECENT_KEY, JSON.stringify(list))
  } catch (_error) {
    // localStorage may be disabled or in private-browsing mode; ignore
  }
}

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('all')
  const [results, setResults] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState<string[]>(loadRecent)
  const [submittedQuery, setSubmittedQuery] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Back the ⌘K badge on the search box: Cmd/Ctrl+K focuses the input.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    let cancelled = false
    const handle = setTimeout(() => {
      const q = query.trim()
      setLoading(true)
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (tab !== 'all') params.set('category', tab)
      http
        .get(`/api/search${params.toString() ? `?${params.toString()}` : ''}`)
        .then((resp) => {
          if (cancelled) return
          const payload = ((resp as { data?: { results?: SearchHit[] } }).data ?? {
            results: [],
          }) as {
            results?: SearchHit[]
          }
          setResults(payload.results ?? [])
          setSubmittedQuery(q)
        })
        .catch(() => {
          if (!cancelled) setResults([])
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [http, query, tab])

  const persistRecent = (q: string) => {
    if (!q.trim()) return
    const next = [q.trim(), ...recent.filter((r) => r !== q.trim())].slice(0, 6)
    setRecent(next)
    saveRecent(next)
  }

  return (
    <DesignCanvasLayout
      eyebrow={t('search.eyebrow', {}, { defaultValue: 'Workspace search' })}
      title={t('search.title', {}, { defaultValue: 'Find anything' })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            persistRecent(query)
          }}
          data-mol-id="search-form"
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('p', 4),
            'relative bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm',
          )}
        >
          <span
            className={cm.cn(
              'material-symbols-outlined text-[28px] text-on-surface-variant',
              cm.sp('mr', 3),
            )}
          >
            search
          </span>
          <input
            ref={inputRef}
            type="search"
            data-mol-id="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'search.placeholder',
              {},
              { defaultValue: 'Search projects, templates, components…' },
            )!}
            className={cm.cn(
              cm.flex1,
              cm.fontWeight('semibold'),
              'bg-transparent text-base outline-none placeholder:text-on-surface-variant/60',
            )}
          />
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              'rounded-md text-[10px] uppercase tracking-widest bg-surface-container text-on-surface-variant',
            )}
          >
            ⌘K
          </span>
        </form>

        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          {TABS.map((c) => {
            const active = c.id === tab
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setTab(c.id)}
                data-mol-id={`search-tab-${c.id}`}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  active
                    ? 'bg-primary text-white rounded-xl shadow-sm shadow-primary/30'
                    : 'bg-surface-container-lowest text-on-surface-variant rounded-xl border border-outline-variant/30 hover:bg-surface-container transition-colors',
                )}
              >
                {t(`search.tab.${c.id}`, {}, { defaultValue: c.label })}
              </button>
            )
          })}
        </div>

        {!query && recent.length > 0 && (
          <aside
            data-mol-id="search-recent"
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(3),
              'bg-surface-container-lowest rounded-2xl border border-outline-variant/30',
            )}
          >
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('search.recentLabel', {}, { defaultValue: 'Recent searches' })}
            </span>
            {recent.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuery(q)}
                data-mol-id={`search-recent-${q.replace(/\s+/g, '-')}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-lg text-on-surface-variant hover:bg-surface-container/60 transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[16px]')}>history</span>
                {q}
              </button>
            ))}
          </aside>
        )}

        <section className={cm.cn(cm.stack(3))} data-mol-id="search-results">
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <h2
              className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {submittedQuery
                ? t(
                    'search.resultsFor',
                    { count: results.length, query: submittedQuery },
                    { defaultValue: '{{count}} results for "{{query}}"' },
                  )
                : t('search.popular', {}, { defaultValue: 'Popular across the workspace' })}
            </h2>
            {results.length > 0 && (
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('search.sortedBy', {}, { defaultValue: 'Sorted by relevance' })}
              </span>
            )}
          </div>

          {loading ? (
            <p
              data-mol-id="search-loading"
              className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
            >
              {t('common.searchingEllipsis', {}, { defaultValue: 'Searching…' })}
            </p>
          ) : results.length === 0 ? (
            <div
              data-mol-id="search-empty"
              className={cm.cn(
                cm.sp('p', 12),
                cm.textCenter,
                cm.stack(3),
                'bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/40 text-on-surface-variant',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[40px] text-primary')}>
                travel_explore
              </span>
              <p className={cm.cn(cm.fontWeight('semibold'))}>
                {t(
                  'search.empty.title',
                  { query: submittedQuery },
                  {
                    defaultValue: submittedQuery
                      ? 'Nothing matches "{{query}}" yet'
                      : 'Type to search across your workspace',
                  },
                )}
              </p>
              <p className={cm.cn(cm.textSize('sm'))}>
                {t(
                  'search.empty.body',
                  {},
                  { defaultValue: 'Try a different keyword or category.' },
                )}
              </p>
            </div>
          ) : (
            <div className={cm.cn(cm.stack(3))}>
              {results.map((r) => (
                <Link
                  key={r.id}
                  to={r.href}
                  data-mol-id={`search-result-${r.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md' }),
                    cm.sp('p', 5),
                    'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 hover:-translate-y-0.5 hover:shadow-md transition-all',
                  )}
                  onClick={() => persistRecent(query)}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(12),
                      cm.h(12),
                      cm.roundedFull,
                      'shrink-0 text-white shadow-md',
                    )}
                    style={{ backgroundColor: r.accentColor }}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-[22px]')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {CATEGORY_ICONS[r.category]}
                    </span>
                  </span>
                  <div className={cm.cn(cm.flex1, cm.stack(1), 'min-w-0')}>
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                      <span
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          'text-[10px] uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t(`search.category.${r.category}`, {}, { defaultValue: r.category })}
                      </span>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          'text-on-surface-variant',
                        )}
                      >
                        {r.meta}
                      </span>
                    </div>
                    <h3
                      className={cm.cn(
                        cm.textSize('lg'),
                        'font-extrabold tracking-tight text-on-surface truncate',
                      )}
                    >
                      {r.title}
                    </h3>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                        'text-on-surface-variant leading-relaxed truncate',
                      )}
                    >
                      {r.snippet}
                    </p>
                  </div>
                  <span className={cm.cn('material-symbols-outlined text-[20px] text-primary')}>
                    arrow_forward
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </DesignCanvasLayout>
  )
}

export default Search
