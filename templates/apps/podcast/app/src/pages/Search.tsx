import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Show {
  id: string
  title: string
  publisher?: string
  category?: string
  cover_index: number
}

interface Episode {
  id: string
  show_id: string
  show_title: string
  title: string
  duration_seconds: number
  cover_index: number
}

const SEGMENTS = ['all', 'shows', 'episodes'] as const
type Segment = (typeof SEGMENTS)[number]

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [query, setQuery] = useState('')
  const [segment, setSegment] = useState<Segment>('all')
  const [shows, setShows] = useState<Show[]>([])
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([http.get('/api/shows'), http.get('/api/episodes')])
      .then(([s, e]) => {
        if (cancelled) return
        setShows(unwrapList<Show>(s))
        setEpisodes(unwrapList<Episode>(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return {
      shows: shows.filter(
        (s) =>
          !q || s.title.toLowerCase().includes(q) || (s.publisher ?? '').toLowerCase().includes(q),
      ),
      episodes: episodes.filter(
        (e) =>
          !q || e.title.toLowerCase().includes(q) || (e.show_title ?? '').toLowerCase().includes(q),
      ),
    }
  }, [query, shows, episodes])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <header className={'space-y-3'}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('search.eyebrow', {}, { defaultValue: 'Find anything' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('common.search', {}, { defaultValue: 'Search' })}
          </h1>
        </div>
        <div className={cm.cn('relative')}>
          <span
            className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder', {}, { defaultValue: 'Show, episode, or topic…' })}
            className={cm.cn(
              cm.sp('pl', 12),
              cm.sp('pr', 4),
              cm.sp('py', 3),
              cm.textSize('base'),
              'w-full border border-outline-variant rounded-md',
            )}
          />
        </div>
        <nav
          aria-label={t('search.segmentLabel', {}, { defaultValue: 'Filter results' })}
          className={cm.flex({ gap: 'xs', align: 'center' })}
        >
          {SEGMENTS.map((s) => {
            const active = segment === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSegment(s)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  cm.fontWeight('medium'),
                  'rounded-full',
                  active
                    ? 'bg-primary text-on-primary'
                    : cm.cn('bg-surface border border-outline-variant', 'text-on-surface-variant'),
                )}
                aria-pressed={active}
              >
                {t(
                  `search.segment.${s}`,
                  {},
                  { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) },
                )}
              </button>
            )
          })}
        </nav>
      </header>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('search.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (segment === 'all' && filtered.shows.length === 0 && filtered.episodes.length === 0) ||
        (segment === 'shows' && filtered.shows.length === 0) ||
        (segment === 'episodes' && filtered.episodes.length === 0) ? (
        <p
          className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}
          data-testid="search-no-results"
        >
          {t('search.noResults', {}, { defaultValue: 'No results. Try a different search.' })}
        </p>
      ) : (
        <div className={'space-y-8'}>
          {(segment === 'all' || segment === 'shows') && filtered.shows.length > 0 && (
            <section>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 3))}>
                {t(
                  'search.showsHeading',
                  { count: filtered.shows.length },
                  { defaultValue: 'Shows ({{count}})' },
                )}
              </h2>
              <ul className={cm.grid({ cols: 4, gap: 'md' })}>
                {filtered.shows.slice(0, 8).map((s) => (
                  <li key={s.id}>
                    <Link
                      to={`/shows/${s.id}`}
                      className={cm.cn(
                        cm.card(),
                        cm.sp('p', 4),
                        'block hover:bg-surface-container space-y-2',
                      )}
                    >
                      <div
                        className={'aspect-square rounded'}
                        style={{ background: `var(--color-cover-${s.cover_index})` }}
                        aria-hidden="true"
                      />
                      <p
                        className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'truncate')}
                      >
                        {s.title}
                      </p>
                      <p
                        className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'truncate')}
                      >
                        {s.publisher ?? s.category ?? ''}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(segment === 'all' || segment === 'episodes') && filtered.episodes.length > 0 && (
            <section>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 3))}>
                {t(
                  'search.episodesHeading',
                  { count: filtered.episodes.length },
                  { defaultValue: 'Episodes ({{count}})' },
                )}
              </h2>
              <ul className={'space-y-1'}>
                {filtered.episodes.slice(0, 8).map((e) => (
                  <li key={e.id}>
                    <Link
                      to={`/episodes/${e.id}`}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.flex({ align: 'center', gap: 'md' }),
                        'rounded hover:bg-surface-container',
                      )}
                    >
                      <div
                        className={cm.cn(cm.h(10), cm.w(10), 'rounded shrink-0')}
                        style={{ background: `var(--color-cover-${e.cover_index})` }}
                        aria-hidden="true"
                      />
                      <div className={cm.cn(cm.flex1, 'min-w-0')}>
                        <p
                          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'truncate')}
                        >
                          {e.title}
                        </p>
                        <p
                          className={cm.cn(
                            cm.textSize('xs'),
                            'text-on-surface-variant',
                            'truncate',
                          )}
                        >
                          {e.show_title}
                        </p>
                      </div>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant',
                          'shrink-0 font-mono',
                        )}
                      >
                        {Math.floor(e.duration_seconds / 60)}:
                        {(e.duration_seconds % 60).toString().padStart(2, '0')}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
