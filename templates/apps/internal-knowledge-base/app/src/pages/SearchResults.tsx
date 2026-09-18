import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CairnArticleRow } from '../components/CairnArticleRow.js'
import type { CairnArticleStatus } from '../components/CairnArticleStatusPill.js'
import { extractExcerpt } from '../lib/markdown.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApiArticle {
  id: string
  space_id: string
  title: string
  body_md?: string
  status: CairnArticleStatus
  updated_at: string
}

interface ApiSpace {
  id: string
  key: string
  name: string
}

interface SearchHit {
  id: string
  title: string
  excerpt: string
  space_name: string
  space_key: string
  section_path?: string[]
  author_name: string
  author_initials: string
  status: CairnArticleStatus
  updated_at: string
  match_count: number
}

export function SearchResults() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const queryParam = params.get('q') ?? ''
  const [query, setQuery] = useState(queryParam)
  // Filter chips are derived from the user's real spaces; `?space=<key>`
  // (e.g. from a space page's "Search this space" link) preselects one.
  const [filter, setFilter] = useState<string>(params.get('space') ?? 'all')
  const http = useHttpClient()
  const [spaces, setSpaces] = useState<ApiSpace[]>([])
  const [hits, setHits] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  useEffect(() => {
    let cancelled = false
    http
      .get('/spaces')
      .then((res) => {
        if (cancelled) return
        setSpaces(unwrapList<ApiSpace>(res))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http])

  useEffect(() => {
    if (!queryParam.trim()) {
      setHits([])
      return
    }
    let cancelled = false
    setLoading(true)
    // Backend search across every article the user can read (own spaces +
    // member spaces). Server filters by title + body_md substring match.
    Promise.all([
      http
        .get('/articles', { params: { q: queryParam } })
        .then((res) => unwrapList<ApiArticle>(res)),
      http.get('/spaces').then((res) => unwrapList<ApiSpace>(res)),
    ])
      .then(([articles, spacesRes]) => {
        if (cancelled) return
        const spaceMap = new Map(spacesRes.map((s) => [s.id, s]))
        const matched: SearchHit[] = articles.map((a) => {
          const sp = spaceMap.get(a.space_id)
          return {
            id: a.id,
            title: a.title,
            excerpt: extractExcerpt(a.body_md ?? ''),
            space_name: sp?.name ?? '',
            space_key: sp?.key ?? '',
            author_name: '',
            author_initials: '',
            status: a.status,
            updated_at: a.updated_at,
            match_count: 1,
          }
        })
        setHits(matched)
        setHasFetched(true)
      })
      .catch(() => {
        if (!cancelled) {
          setHits([])
          setHasFetched(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, queryParam])

  const source = hasFetched ? hits : []
  const filtered = source.filter((r) => {
    if (filter === 'all') return true
    return r.space_key === filter
  })

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('extrabold'),
            'uppercase tracking-widest text-secondary',
          )}
        >
          {t('searchResults.eyebrow', {}, { defaultValue: 'Workspace search' })}
        </p>
        <h1
          className={cm.cn(
            cm.sp('mt', 1),
            cm.textSize('3xl'),
            cm.fontWeight('extrabold'),
            'tracking-tight',
          )}
        >
          {t('searchResults.heading', {}, { defaultValue: 'Search articles' })}
        </h1>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setParams({ q: query })
        }}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          'rounded-full bg-surface-container-lowest ring-1 ring-outline-variant shadow-sm',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined text-on-surface-variant')}
          aria-hidden="true"
        >
          search
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(
            'searchResults.placeholder',
            {},
            { defaultValue: 'Search runbooks, RFCs, policies, decisions\u2026' },
          )}
          className={cm.cn(
            cm.w('full'),
            cm.textSize('lg'),
            'border-0 bg-transparent text-on-surface focus:outline-none placeholder:text-on-surface-variant/60',
          )}
        />
        <kbd
          className={cm.cn(
            cm.sp('px', 2),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('extrabold'),
            'rounded-md bg-surface-container text-on-surface-variant',
          )}
        >
          {'\u2318K'}
        </kbd>
      </form>

      <nav className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
        {[
          { key: 'all', label: t('searchResults.filter.all', {}, { defaultValue: 'All spaces' }) },
          ...spaces.map((s) => ({ key: s.key, label: s.name })),
        ].map((f) => {
          const isActive = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={isActive}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-full transition-colors',
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              )}
            >
              {f.label}
            </button>
          )
        })}
      </nav>

      <div>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('extrabold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t(
            'searchResults.summary',
            { count: filtered.length, query },
            { defaultValue: '{{count}} results for \u201c{{query}}\u201d' },
          )}
        </p>
        <div className={cm.cn(cm.sp('mt', 4), 'space-y-3')}>
          {loading ? (
            <p className={cm.cn(cm.sp('py', 16), 'text-center text-on-surface-variant')}>
              {t('searchResults.loading', {}, { defaultValue: 'Searching\u2026' })}
            </p>
          ) : filtered.length === 0 ? (
            <p className={cm.cn(cm.sp('py', 16), 'text-center text-on-surface-variant')}>
              {queryParam.trim()
                ? t(
                    'searchResults.empty',
                    {},
                    {
                      defaultValue:
                        'Nothing matched. Try fewer words, or open a draft to write the answer.',
                    },
                  )
                : t(
                    'searchResults.idle',
                    {},
                    { defaultValue: 'Type a query and press Enter to search.' },
                  )}
            </p>
          ) : (
            filtered.map((r) => (
              <CairnArticleRow
                key={r.id}
                id={r.id}
                title={r.title}
                excerpt={r.excerpt}
                spaceName={r.space_name}
                sectionPath={r.section_path}
                authorName={r.author_name}
                authorInitials={r.author_initials}
                status={r.status}
                updatedAt={r.updated_at}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default SearchResults
