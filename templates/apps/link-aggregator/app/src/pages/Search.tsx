import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CairnHeroCard } from '../components/CairnHeroCard.js'
import { type LinkPost, LinkPostCard } from '../components/LinkPostCard.js'
import { SubBadge, type SubSummary } from '../components/SubBadge.js'

interface SearchResults {
  posts: LinkPost[]
  subs: SubSummary[]
  users: { id: string; username: string; karma: number }[]
}

const EMPTY: SearchResults = { posts: [], subs: [], users: [] }

const FACETS: Array<{
  key: 'all' | 'posts' | 'subs' | 'users'
  label: string
  default: string
}> = [
  { key: 'all', label: 'all', default: 'Everything' },
  { key: 'posts', label: 'posts', default: 'Posts' },
  { key: 'subs', label: 'subs', default: 'Subs' },
  { key: 'users', label: 'users', default: 'Users' },
]

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [params, setParams] = useSearchParams()
  const initial = params.get('q') ?? ''

  const [query, setQuery] = useState(initial)
  const [debounced, setDebounced] = useState(initial)
  const [facet, setFacet] = useState<'all' | 'posts' | 'subs' | 'users'>('all')
  const [results, setResults] = useState<SearchResults>(EMPTY)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(query.trim()), 240)
    return () => clearTimeout(handle)
  }, [query])

  useEffect(() => {
    if (!debounced) {
      setResults(EMPTY)
      const next = new URLSearchParams(params)
      next.delete('q')
      setParams(next, { replace: true })
      return
    }
    const next = new URLSearchParams(params)
    next.set('q', debounced)
    setParams(next, { replace: true })

    let active = true
    setLoading(true)
    Promise.allSettled([
      http.get(`/api/links/search?q=${encodeURIComponent(debounced)}&limit=20`),
      http.get(`/api/subs?search=${encodeURIComponent(debounced)}&limit=10`),
      // Exact-match username lookup — /users/:id/profile resolves usernames,
      // so a query that names a user surfaces them in the Users facet.
      http.get(`/api/users/${encodeURIComponent(debounced)}/profile`),
    ])
      .then(([linksRes, subsRes, userRes]) => {
        if (!active) return
        const linksPayload =
          linksRes.status === 'fulfilled'
            ? ((linksRes.value as { data?: unknown }).data ?? linksRes.value)
            : null
        const subsPayload =
          subsRes.status === 'fulfilled'
            ? ((subsRes.value as { data?: unknown }).data ?? subsRes.value)
            : null
        const userPayload =
          userRes.status === 'fulfilled'
            ? ((userRes.value as { data?: unknown }).data ?? userRes.value)
            : null
        setResults(normalize(linksPayload, subsPayload, userPayload))
      })
      .catch(() => {
        // empty on failure
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- params/setParams intentionally omitted to avoid re-running search on every URL param change
  }, [debounced, http])

  const totalCount = useMemo(
    () => results.posts.length + results.subs.length + results.users.length,
    [results],
  )

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <CairnHeroCard
        eyebrowKey="eyebrow"
        eyebrowDefault={t('common.search', {}, { defaultValue: 'Search' })}
        headlineKey="headline"
        headlineDefault={t(
          'search.heroHeadline',
          {},
          { defaultValue: 'Find a stone in the cairn.' },
        )}
        bodyKey="body"
        bodyDefault={t(
          'search.heroBody',
          {},
          {
            defaultValue: 'Type a phrase, a tag, or a username \u2014 results update as you type.',
          },
        )}
        pillIcon="search"
        pillKey="pill"
        pillDefault={
          debounced
            ? t(
                'search.heroPillResults',
                { count: totalCount },
                { defaultValue: '{{count}} results' },
              )
            : t('search.heroPillIdle', {}, { defaultValue: 'Try a query' })
        }
      />

      <section
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 4),
          cm.roundedFull,
          'bg-surface-container-low border border-outline-variant/30 focus-within:border-primary',
        )}
      >
        <span className={'material-symbols-outlined text-base text-on-surface-variant'}>
          search
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(
            'search.placeholder',
            {},
            { defaultValue: 'Search links, subs, users\u2026' },
          )}
          className={cm.cn(
            cm.sp('py', 3),
            cm.textSize('lg'),
            'flex-1 bg-transparent outline-none text-on-surface',
          )}
        />
      </section>

      <nav
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'md' }),
          'border-b border-outline-variant/30',
        )}
      >
        {FACETS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFacet(f.key)}
            className={cm.cn(
              cm.sp('px', 1),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'transition-colors',
              facet === f.key
                ? 'text-primary border-b-2 border-primary -mb-px'
                : 'text-on-surface-variant hover:text-primary',
            )}
            aria-pressed={facet === f.key}
          >
            {t(`search.${f.label}`, {}, { defaultValue: f.default })}
          </button>
        ))}
      </nav>

      {!debounced ? (
        <p className={cm.cn(cm.textCenter, cm.sp('py', 12), 'text-on-surface-variant')}>
          {t('search.idle', {}, { defaultValue: 'Type a query above to start searching.' })}
        </p>
      ) : loading ? (
        <p className={cm.cn(cm.textCenter, cm.sp('py', 12), 'text-on-surface-variant')}>
          {t('search.loading', {}, { defaultValue: 'Searching\u2026' })}
        </p>
      ) : totalCount === 0 ||
        (facet === 'posts' && results.posts.length === 0) ||
        (facet === 'subs' && results.subs.length === 0) ||
        (facet === 'users' && results.users.length === 0) ? (
        <p className={cm.cn(cm.textCenter, cm.sp('py', 12), 'text-on-surface-variant')}>
          {t(
            'search.empty',
            { query: debounced },
            { defaultValue: 'No results for \u201c{{query}}\u201d.' },
          )}
        </p>
      ) : (
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
          {(facet === 'all' || facet === 'posts') && results.posts.length > 0 && (
            <Section title={t('search.postsHeading', {}, { defaultValue: 'Posts' })}>
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                {results.posts.map((p) => (
                  <LinkPostCard key={p.id} post={p} />
                ))}
              </div>
            </Section>
          )}
          {(facet === 'all' || facet === 'subs') && results.subs.length > 0 && (
            <Section title={t('search.subsHeading', {}, { defaultValue: 'Subs' })}>
              <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
                {results.subs.map((s) => (
                  <SubBadge key={s.slug} sub={s} />
                ))}
              </div>
            </Section>
          )}
          {(facet === 'all' || facet === 'users') && results.users.length > 0 && (
            <Section title={t('search.usersHeading', {}, { defaultValue: 'Users' })}>
              <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                {results.users.map((u) => (
                  <li
                    key={u.id}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      cm.sp('p', 3),
                      'rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/40 transition-colors',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.w(10),
                        cm.h(10),
                        cm.roundedFull,
                        cm.fontWeight('bold'),
                        'bg-primary/15 text-primary uppercase',
                      )}
                    >
                      {u.username.slice(0, 1)}
                    </span>
                    <div className={cm.cn(cm.flex({ direction: 'col' }), 'flex-1 min-w-0')}>
                      <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                        u/{u.username}
                      </span>
                      <span
                        className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}
                      >
                        {t('search.karma', { karma: u.karma }, { defaultValue: '{{karma}} karma' })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
      <h2
        className={cm.cn(
          cm.fontWeight('bold'),
          cm.textSize('xs'),
          'uppercase tracking-widest text-primary',
        )}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

function normalize(linksRaw: unknown, subsRaw: unknown, userRaw: unknown): SearchResults {
  const linksObj = linksRaw as Record<string, unknown> | null
  const subsObj = subsRaw as Record<string, unknown> | null
  // /api/links/search returns { hits, total, page, limit }
  const hits =
    linksObj && Array.isArray(linksObj.hits)
      ? (linksObj.hits as unknown[])
      : Array.isArray(linksRaw)
        ? (linksRaw as unknown[])
        : []
  // /api/subs returns { data: [...] } or [...]
  const subs = subsObj
    ? Array.isArray(subsObj.data)
      ? (subsObj.data as unknown[])
      : Array.isArray(subsObj.subs)
        ? (subsObj.subs as unknown[])
        : []
    : Array.isArray(subsRaw)
      ? (subsRaw as unknown[])
      : []
  // /users/:id/profile unwraps to { id, username, karma, ... } (or an error
  // envelope when the query names no user).
  const userObj =
    userRaw && typeof userRaw === 'object' && 'data' in (userRaw as Record<string, unknown>)
      ? ((userRaw as { data: unknown }).data as Record<string, unknown> | null)
      : (userRaw as Record<string, unknown> | null)
  const users =
    userObj && typeof userObj.id === 'string' && typeof userObj.username === 'string'
      ? [
          {
            id: userObj.id,
            username: userObj.username,
            karma: typeof userObj.karma === 'number' ? userObj.karma : 0,
          },
        ]
      : []
  return {
    // When the @molecule/api-search bond serves the query, each hit is the
    // normalized SearchResult entry ({ id, document, score? }) — flatten it
    // back into a link row. The DB-fallback path returns plain rows in
    // `hits`, which pass through unchanged.
    posts: hits.map((p) => {
      const hit = p as { id?: string; document?: Record<string, unknown> }
      return hit && typeof hit === 'object' && hit.document
        ? ({ id: hit.id, ...hit.document } as unknown as LinkPost)
        : (p as LinkPost)
    }),
    subs: subs.map((s) => s as SubSummary),
    users,
  }
}

export default Search
