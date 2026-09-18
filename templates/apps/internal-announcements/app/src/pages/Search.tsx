/**
 * Search — /search global search across announcements, channels, people.
 *
 * Scrappy client-side full-text match against the live announcement
 * list, category list, and team roster. Highlights matches in the
 * snippet with <mark> tags. Filter chips switch which result class is
 * shown.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { type ApiAnnouncement, type ApiCategory, categoryColor } from '../lib/announcements.js'

interface ApiTeamMember {
  id: string
  name: string
  email: string | null
  username: string | null
  role: string | null
  isAdmin: boolean
  isMe: boolean
}

interface SearchHit {
  id: string
  type: 'announcement' | 'person' | 'channel'
  title: string
  snippet: string
  meta: string
  href: string
}

const TYPE_CONFIG: Record<
  string,
  { icon: string; color: string; labelKey: string; defaultLabel: string }
> = {
  announcement: {
    icon: 'campaign',
    color: 'var(--mol-color-primary, #4f46e5)',
    labelKey: 'search.typeAnnouncement',
    defaultLabel: 'Announcement',
  },
  person: {
    icon: 'person',
    color: 'var(--color-mention, #7c3aed)',
    labelKey: 'search.typePerson',
    defaultLabel: 'Person',
  },
  channel: {
    icon: 'tag',
    color: 'var(--mol-color-secondary, #06b6d4)',
    labelKey: 'search.typeChannel',
    defaultLabel: 'Channel',
  },
}

const FILTERS = [
  { id: 'all', labelKey: 'search.filterAll', defaultLabel: 'All' },
  { id: 'announcement', labelKey: 'search.filterAnn', defaultLabel: 'Announcements' },
  { id: 'channel', labelKey: 'search.filterChan', defaultLabel: 'Channels' },
  { id: 'person', labelKey: 'search.filterPeople', defaultLabel: 'People' },
] as const

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function highlight(haystack: string, needle: string): string {
  if (!needle.trim()) return escapeHtml(haystack)
  const re = new RegExp(`(${escapeRegExp(needle.trim())})`, 'ig')
  return escapeHtml(haystack).replace(re, '<mark>$1</mark>')
}

function snippet(haystack: string, needle: string, max = 160): string {
  if (!needle.trim()) return haystack.slice(0, max)
  const idx = haystack.toLowerCase().indexOf(needle.toLowerCase())
  if (idx < 0) return haystack.slice(0, max)
  const start = Math.max(0, idx - 40)
  const end = Math.min(haystack.length, start + max)
  return (start > 0 ? '…' : '') + haystack.slice(start, end) + (end < haystack.length ? '…' : '')
}

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [searchParams, setSearchParams] = useSearchParams()

  // Honor ?q= so search links from elsewhere in the app land here
  // pre-filled. Treat the URL as the source of truth on first render
  // AND when the user navigates with the browser back/forward — without
  // this, /search?q=foo opens an empty input (silent regression for
  // any feature that links into search with a query).
  const initialQuery = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(initialQuery)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')

  useEffect(() => {
    const next = searchParams.get('q') ?? ''
    setQuery(next)
    // We only want this re-sync when the URL itself changes, not
    // when the input does — `setSearchParams` below handles the
    // input → URL direction.
  }, [searchParams])
  const [announcements, setAnnouncements] = useState<ApiAnnouncement[]>([])
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [team, setTeam] = useState<ApiTeamMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get<ApiAnnouncement[]>('/announcements'),
      http.get<ApiCategory[]>('/categories'),
      http.get<ApiTeamMember[]>('/team'),
    ])
      .then(([annsR, catsR, teamR]) => {
        if (cancelled) return
        setAnnouncements(annsR.data)
        setCategories(catsR.data)
        setTeam(Array.isArray(teamR.data) ? teamR.data : [])
      })
      .catch(() => {
        // empty result set is rendered below
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const hits = useMemo<SearchHit[]>(() => {
    const metaAnnouncement = t('search.metaAnnouncement', {}, { defaultValue: 'announcement' })
    const q = query.trim().toLowerCase()
    if (!q) {
      // No query — show all published announcements as default
      return announcements
        .filter((a) => a.status === 'published')
        .slice(0, 10)
        .map((a) => {
          const cat = categories.find((c) => c.id === a.category_id)
          return {
            id: `ann:${a.id}`,
            type: 'announcement' as const,
            title: a.title,
            snippet: escapeHtml(snippet(a.body, '', 160)),
            meta: cat?.name ? `#${cat.name}` : metaAnnouncement,
            href: `/announcement/${a.id}`,
          }
        })
    }
    const out: SearchHit[] = []

    if (filter === 'all' || filter === 'announcement') {
      for (const a of announcements) {
        if (a.status !== 'published') continue
        const inTitle = a.title.toLowerCase().includes(q)
        const inBody = a.body.toLowerCase().includes(q)
        if (!inTitle && !inBody) continue
        const cat = categories.find((c) => c.id === a.category_id)
        const source = inBody ? a.body : a.title
        out.push({
          id: `ann:${a.id}`,
          type: 'announcement',
          title: a.title,
          snippet: highlight(snippet(source, q, 200), q),
          meta: cat?.name ? `#${cat.name}` : metaAnnouncement,
          href: `/announcement/${a.id}`,
        })
      }
    }

    if (filter === 'all' || filter === 'channel') {
      for (const c of categories) {
        if (!c.name?.toLowerCase().includes(q)) continue
        const matches = announcements.filter((a) => a.category_id === c.id).length
        out.push({
          id: `chan:${c.id}`,
          type: 'channel',
          title: `#${c.name}`,
          snippet: escapeHtml(
            t(
              'search.channelSnippet',
              { count: matches },
              { defaultValue: '{{count}} announcements posted to this channel.' },
            ),
          ),
          meta: t('search.metaChannel', {}, { defaultValue: 'channel' }),
          href: `/feed?channel=${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        })
      }
    }

    if (filter === 'all' || filter === 'person') {
      for (const m of team) {
        const blob = `${m.name} ${m.email ?? ''} ${m.username ?? ''} ${m.role ?? ''}`.toLowerCase()
        if (!blob.includes(q)) continue
        out.push({
          id: `person:${m.id}`,
          type: 'person',
          title: m.name,
          snippet: highlight(`${m.email ?? m.username ?? ''}${m.role ? ` · ${m.role}` : ''}`, q),
          meta: m.isAdmin
            ? t('search.metaAdmin', {}, { defaultValue: 'admin' })
            : t('search.metaTeammate', {}, { defaultValue: 'teammate' }),
          href: m.isMe ? '/profile' : '/people',
        })
      }
    }

    return out
  }, [announcements, categories, team, query, filter, t])

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[11px] uppercase tracking-widest text-primary',
          )}
        >
          {t('search.eyebrow', {}, { defaultValue: 'Find anything' })}
        </span>
        <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight text-on-surface')}>
          {t('search.title', { appName: APP_NAME }, { defaultValue: 'Search {{appName}}' })}
        </h1>
      </header>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('p', 4),
          'rounded-2xl border border-outline-variant/40 bg-surface',
        )}
      >
        <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">
          search
        </span>
        <input
          type="search"
          data-testid="search-input"
          value={query}
          onChange={(e) => {
            const next = e.target.value
            setQuery(next)
            // Reflect the query into the URL so deep-links and reload
            // preserve what the user is searching for. Use replace so
            // every keystroke doesn't pile a new history entry.
            const params = new URLSearchParams(searchParams)
            if (next) params.set('q', next)
            else params.delete('q')
            setSearchParams(params, { replace: true })
          }}
          placeholder={t(
            'search.placeholder',
            {},
            { defaultValue: 'Search by title, body, channel, or teammate…' },
          )}
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.textSize('lg'),
            'flex-1 bg-transparent text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none',
          )}
        />
      </div>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
        {FILTERS.map((chip) => {
          const isActive = filter === chip.id
          return (
            <button
              key={chip.id}
              type="button"
              data-testid={`search-filter-${chip.id}`}
              onClick={() => setFilter(chip.id)}
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                cm.sp('px', 3),
                'py-1.5',
                'rounded-full transition-colors',
                isActive
                  ? 'bg-primary text-on-primary'
                  : 'border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low/60',
              )}
            >
              {t(chip.labelKey, {}, { defaultValue: chip.defaultLabel })}
            </button>
          )
        })}
      </div>

      <section
        data-testid="search-results"
        className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
      >
        {loading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('search.loading', {}, { defaultValue: 'Loading index…' })}
          </p>
        ) : hits.length === 0 ? (
          <p
            data-testid="search-empty"
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {query.trim()
              ? t('search.emptyQuery', { query }, { defaultValue: 'No results for "{{query}}".' })
              : t('search.emptyAll', {}, { defaultValue: 'Nothing to search yet.' })}
          </p>
        ) : (
          <ul
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'rounded-xl border border-outline-variant/40 bg-surface divide-y divide-outline-variant/30 overflow-hidden',
            )}
          >
            {hits.map((r) => {
              const cfg = TYPE_CONFIG[r.type]!
              const cat = categories.find((c) => `#${c.name}` === r.meta)
              const accent = cat ? categoryColor(cat) : cfg.color
              return (
                <li key={r.id}>
                  <Link
                    to={r.href}
                    className={cm.cn(
                      cm.flex({ align: 'start', gap: 'md' }),
                      cm.sp('p', 4),
                      'group transition-colors hover:bg-surface-container-low/40',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.w(10),
                        cm.h(10),
                        cm.roundedFull,
                        'shrink-0',
                      )}
                      style={{ backgroundColor: `${accent}1f`, color: accent }}
                      aria-hidden="true"
                    >
                      <span className={cm.cn('material-symbols-outlined text-lg')}>{cfg.icon}</span>
                    </span>
                    <div
                      className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1 min-w-0')}
                    >
                      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
                        <span
                          className={cm.cn(
                            cm.fontWeight('bold'),
                            cm.sp('px', 2),
                            'py-0.5',
                            'rounded-full text-[10px] uppercase tracking-widest',
                          )}
                          style={{ backgroundColor: `${cfg.color}1f`, color: cfg.color }}
                        >
                          {t(cfg.labelKey, {}, { defaultValue: cfg.defaultLabel })}
                        </span>
                        <span
                          className={cm.cn(
                            cm.fontWeight('semibold'),
                            cm.textSize('base'),
                            'text-on-surface group-hover:text-primary transition-colors',
                          )}
                          dangerouslySetInnerHTML={{ __html: highlight(r.title, query) }}
                        />
                      </div>
                      <p
                        className={cm.cn(
                          cm.textSize('sm'),
                          'text-on-surface-variant leading-relaxed [&_mark]:bg-acknowledged-light [&_mark]:text-on-surface [&_mark]:font-semibold [&_mark]:px-1 [&_mark]:rounded',
                        )}
                        dangerouslySetInnerHTML={{ __html: r.snippet }}
                      />
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {r.meta}
                      </span>
                    </div>
                    <span
                      className={cm.cn(
                        'material-symbols-outlined text-base text-on-surface-variant/60 shrink-0 mt-1',
                      )}
                      aria-hidden="true"
                    >
                      arrow_forward
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

export default Search
