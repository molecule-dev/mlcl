import { useEffect, useState } from 'react'
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
  episodes_count?: number
  unplayed_count?: number
}

interface Episode {
  id: string
  show_id: string
  show_title: string
  title: string
  duration_seconds: number
  played_position: number
  cover_index: number
  saved_at: string
}

const TABS = ['shows', 'saved'] as const
type Tab = (typeof TABS)[number]

export function Library() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tab, setTab] = useState<Tab>('shows')
  const [shows, setShows] = useState<Show[]>([])
  const [saved, setSaved] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([http.get('/api/subscriptions/shows'), http.get('/api/episodes?saved=true')])
      .then(([s, e]) => {
        if (cancelled) return
        setShows(unwrapList<Show>(s))
        setSaved(unwrapList<Episode>(e))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('library.loadError', {}, { defaultValue: 'Failed to load library.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div className={cm.cn(cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6 px-4 sm:px-8')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('library.eyebrow', {}, { defaultValue: 'Your collection' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.yourLibrary', {}, { defaultValue: 'Your library' })}
        </h1>
        {!loading && !error && (shows.length > 0 || saved.length > 0) ? (
          <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }), cm.sp('mt', 4))}>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'bg-primary-container text-primary uppercase tracking-wider',
              )}
            >
              {t(
                'library.showsCount',
                { count: shows.length },
                { defaultValue: '{{count}} shows' },
              )}
            </span>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'bg-success-light text-success uppercase tracking-wider',
              )}
            >
              {t(
                'library.savedCount',
                { count: saved.length },
                { defaultValue: '{{count}} saved' },
              )}
            </span>
            {(() => {
              const unplayed = shows.reduce((s, x) => s + (x.unplayed_count ?? 0), 0)
              return unplayed > 0 ? (
                <span
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.roundedFull,
                    'bg-warning-light text-warning uppercase tracking-wider',
                  )}
                >
                  {t(
                    'library.unplayedCount',
                    { count: unplayed },
                    { defaultValue: '{{count}} unplayed' },
                  )}
                </span>
              ) : null
            })()}
          </div>
        ) : null}
      </header>

      <nav
        aria-label={t('library.tabsLabel', {}, { defaultValue: 'Library tabs' })}
        className={cm.flex({ gap: 'xs', align: 'center' })}
      >
        {TABS.map((s) => {
          const active = tab === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => setTab(s)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'rounded-full',
                active
                  ? 'bg-primary text-on-primary'
                  : cm.cn('bg-surface border border-outline-variant', 'text-on-surface-variant'),
              )}
              aria-pressed={active}
            >
              {t(
                `library.tab.${s}`,
                {},
                { defaultValue: s === 'shows' ? 'Subscribed shows' : 'Saved episodes' },
              )}
            </button>
          )
        })}
      </nav>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('library.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <div>
          {tab === 'shows' &&
            (shows.length === 0 ? (
              <div
                className={cm.cn(cm.sp('py', 12), cm.textCenter, 'space-y-3')}
                data-testid="library-shows-empty"
              >
                <p className={cm.cn('text-on-surface-variant')}>
                  {t(
                    'library.noShows',
                    {},
                    { defaultValue: 'You are not subscribed to any shows yet.' },
                  )}
                </p>
                <Link
                  to="/discover"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'inline-block rounded-full bg-primary text-on-primary',
                  )}
                >
                  {t('library.browseShows', {}, { defaultValue: 'Browse shows' })}
                </Link>
              </div>
            ) : (
              <ul className={cm.grid({ gap: 'lg' }) + ' grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}>
                {shows.map((s) => (
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
                        className={'aspect-square rounded relative'}
                        style={{ background: `var(--color-cover-${s.cover_index})` }}
                        aria-hidden="true"
                      >
                        {(s.unplayed_count ?? 0) > 0 && (
                          <span
                            className={cm.cn(
                              cm.flex({ align: 'center', justify: 'center' }),
                              cm.sp('px', 2),
                              'absolute top-2 right-2 rounded-full',
                              cm.textSize('xs'),
                              cm.fontWeight('bold'),
                            )}
                            style={{
                              backgroundColor: 'var(--mol-color-primary)',
                              color: 'var(--color-on-primary)',
                              minWidth: '24px',
                              height: '24px',
                            }}
                          >
                            {s.unplayed_count}
                          </span>
                        )}
                      </div>
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
            ))}
          {tab === 'saved' &&
            (saved.length === 0 ? (
              <p
                className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}
                data-testid="library-saved-empty"
              >
                {t(
                  'library.noSaved',
                  {},
                  { defaultValue: 'No saved episodes yet — save one from any show page.' },
                )}
              </p>
            ) : (
              <ul className={'space-y-2'}>
                {saved.map((e) => {
                  const progressPct =
                    e.duration_seconds > 0
                      ? Math.round((e.played_position / e.duration_seconds) * 100)
                      : 0
                  return (
                    <li key={e.id}>
                      <Link
                        to={`/episodes/${e.id}`}
                        className={cm.cn(
                          cm.card(),
                          cm.sp('p', 4),
                          cm.flex({ align: 'center', gap: 'md' }),
                          'hover:bg-surface-container',
                        )}
                      >
                        <div
                          className={cm.cn(cm.h(11), cm.w(11), 'rounded shrink-0')}
                          style={{ background: `var(--color-cover-${e.cover_index})` }}
                          aria-hidden="true"
                        />
                        <div className={cm.cn(cm.flex1, 'min-w-0')}>
                          <p
                            className={cm.cn(
                              cm.textSize('sm'),
                              cm.fontWeight('semibold'),
                              'truncate',
                            )}
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
                        <div className={cm.cn(cm.shrink0, cm.textCenter)}>
                          <p
                            className={cm.cn(
                              cm.textSize('xs'),
                              'text-on-surface-variant',
                              'font-mono',
                            )}
                          >
                            {Math.floor(e.duration_seconds / 60)}:
                            {(e.duration_seconds % 60).toString().padStart(2, '0')}
                          </p>
                          {progressPct > 0 && (
                            <p className={cm.cn(cm.textSize('xs'), cm.textPrimary)}>
                              {progressPct}%
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ))}
        </div>
      )}
    </div>
  )
}
