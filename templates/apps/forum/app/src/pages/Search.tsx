/**
 * Search — /search global results across threads.
 *
 * Layout: search input + sort/range filters → tabs (All / Threads / Comments
 * / Communities / Users) → highlighted results.
 *
 * Threads are loaded from `GET /api/threads/search?q=...`. Communities
 * matched against the loaded category list. Comments + users are
 * placeholders until those endpoints land.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import { getClient as getHttpClient } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CategoryCard, type CategoryCardData } from '../components/CategoryCard.js'
import { ThreadRow } from '../components/ThreadRow.js'
import { type ApiThread, decorateApiThreadToRow } from '../utils/threads.js'

const TABS = [
  { id: 'all', labelKey: 'search.tabAll', defaultLabel: 'All' },
  { id: 'threads', labelKey: 'search.tabThreads', defaultLabel: 'Threads' },
  { id: 'communities', labelKey: 'search.tabCommunities', defaultLabel: 'Communities' },
] as const

const SORTS = [
  { id: 'relevance', labelKey: 'search.sortRelevance', defaultLabel: 'Relevance' },
  { id: 'top', labelKey: 'search.sortTop', defaultLabel: 'Top' },
  { id: 'new', labelKey: 'search.sortNew', defaultLabel: 'New' },
] as const

interface ApiCategory {
  id: string
  slug: string
  name: string
  description?: string | null
  color?: string | null
  icon?: string | null
  subscriber_count?: number | null
}

function highlight(text: string, query: string, cm: ReturnType<typeof getClassMap>) {
  if (!query) return text
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (!safe) return text
  const re = new RegExp(`(${safe})`, 'gi')
  const parts = text.split(re)
  // split() with a capture group places matches at odd indices — checking
  // `re.test(part)` here would be buggy (the /g flag advances lastIndex
  // between calls, so identical matches alternate true/false).
  return parts.map((part, idx) =>
    idx % 2 === 1 ? (
      <mark
        key={`${part}-${idx}`}
        className={cm.cn('rounded px-0.5')}
        style={{
          backgroundColor: 'var(--color-karma-light, var(--color-karma-light))',
          color: 'var(--color-rep-veteran-fg, #c48a18)',
        }}
      >
        {part}
      </mark>
    ) : (
      <span key={`${part}-${idx}`}>{part}</span>
    ),
  )
}

function isLikelyEmoji(value: string | null | undefined): boolean {
  if (!value) return false
  return /[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}]/u.test(value)
}

function categoryToCard(c: ApiCategory): CategoryCardData {
  const isEmoji = isLikelyEmoji(c.icon)
  return {
    slug: c.slug,
    name: c.name,
    description: c.description ?? '',
    emoji: isEmoji ? (c.icon ?? undefined) : undefined,
    icon: isEmoji ? undefined : (c.icon ?? undefined),
    subscribers: c.subscriber_count ?? 0,
    accentColor: c.color ?? undefined,
  }
}

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('all')
  const [sort, setSort] = useState<(typeof SORTS)[number]['id']>('relevance')
  const [threads, setThreads] = useState<ApiThread[]>([])
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const http = getHttpClient()
        const res = await http.get<ApiCategory[]>('/api/categories')
        if (!mounted) return
        setCategories(res.data ?? [])
      } catch (error) {
        logError('search.loadCategories', error)
        if (mounted) setCategories([])
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setThreads([])
      return
    }
    setLoading(true)
    try {
      const http = getHttpClient()
      const res = await http.get<{ hits?: ApiThread[]; data?: ApiThread[] }>(
        `/api/threads/search?q=${encodeURIComponent(q)}&limit=25`,
      )
      const hits = res.data.hits ?? res.data.data ?? []
      setThreads(hits)
    } catch (error) {
      logError('search.runSearch', error)
      setThreads([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const id = setTimeout(() => {
      void runSearch(query)
    }, 250)
    return () => clearTimeout(id)
  }, [query, runSearch])

  const sortedThreads = useMemo(() => {
    const copy = [...threads]
    if (sort === 'top') {
      copy.sort((a, b) => (b.vote_score ?? 0) - (a.vote_score ?? 0))
    } else if (sort === 'new') {
      copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
    return copy
  }, [threads, sort])

  const matchedCommunities = useMemo(() => {
    if (!query.trim()) return []
    const q = query.trim().toLowerCase()
    return categories
      .filter(
        (c) =>
          c.slug.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          (c.description ?? '').toLowerCase().includes(q),
      )
      .slice(0, 6)
      .map(categoryToCard)
  }, [categories, query])

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[11px] uppercase tracking-widest text-primary',
          )}
        >
          {t('common.search', {}, { defaultValue: 'Search' })}
        </span>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('p', 2),
            'rounded-full border border-outline-variant/40 bg-surface focus-within:border-primary',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-on-surface-variant ml-3')}>
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'search.placeholder',
              {},
              { defaultValue: 'Search threads, communities…' },
            )}
            className={cm.cn(
              cm.textSize('base'),
              'flex-1 bg-transparent text-on-surface placeholder:text-on-surface-variant focus:outline-none',
            )}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={t('search.clear', {}, { defaultValue: 'Clear' })}
              className={cm.cn('mr-2 text-on-surface-variant hover:text-on-surface')}
            >
              <span className={cm.cn('material-symbols-outlined text-base')}>close</span>
            </button>
          )}
        </div>
      </div>

      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }), 'flex-wrap')}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
          {TABS.map((current) => {
            const isActive = current.id === tab
            return (
              <button
                key={current.id}
                type="button"
                onClick={() => setTab(current.id)}
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-full transition-colors',
                  isActive
                    ? 'bg-primary text-on-primary'
                    : 'border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low/60',
                )}
              >
                {t(current.labelKey, {}, { defaultValue: current.defaultLabel })}
              </button>
            )
          })}
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <label
            htmlFor="search-sort"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('search.sortLabel', {}, { defaultValue: 'Sort' })}
          </label>
          <select
            id="search-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-full border border-outline-variant/40 bg-surface text-on-surface',
            )}
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {t(s.labelKey, {}, { defaultValue: s.defaultLabel })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!query.trim() && (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'search.startTyping',
            {},
            { defaultValue: 'Type a query above to search across threads and communities.' },
          )}
        </p>
      )}

      {(tab === 'all' || tab === 'threads') && query.trim() && (
        <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {tab === 'all' && (
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[11px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('search.threadsHeading', {}, { defaultValue: 'Threads' })}
            </h2>
          )}
          {loading && (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('common.searchingEllipsis', {}, { defaultValue: 'Searching…' })}
            </p>
          )}
          {!loading && sortedThreads.length === 0 && (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('search.empty', {}, { defaultValue: 'No threads match.' })}
            </p>
          )}
          {sortedThreads.map((th) => {
            const row = decorateApiThreadToRow(th, null)
            return (
              <div key={row.id} className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <ThreadRow thread={row} />
                {row.excerpt && (
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.sp('px', 4),
                      'text-on-surface-variant leading-relaxed',
                    )}
                  >
                    {highlight(row.excerpt, query, cm)}
                  </p>
                )}
              </div>
            )
          })}
        </section>
      )}

      {(tab === 'all' || tab === 'communities') && query.trim() && (
        <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {tab === 'all' && (
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[11px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('search.communitiesHeading', {}, { defaultValue: 'Communities' })}
            </h2>
          )}
          {matchedCommunities.length === 0 && (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('search.communitiesEmpty', {}, { defaultValue: 'No communities match.' })}
            </p>
          )}
          <div className={cm.cn('grid gap-3 grid-cols-1 md:grid-cols-2')}>
            {matchedCommunities.map((c) => (
              <CategoryCard key={c.slug} category={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default Search
