import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { languageLabel } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

interface GuestRow {
  id: string
  name: string
  email: string | null
  phone: string | null
  preferred_language: string
  stay_count: number
}

/** Up-to-two-letter initials for the guest avatar tile. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export function Guests() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [guests, setGuests] = useState<GuestRow[] | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setGuests(null)
    ;(async () => {
      try {
        const query = search.trim() === '' ? '' : '?search=' + encodeURIComponent(search.trim())
        const res = await http.get('/api/guests' + query)
        if (cancelled) return
        setGuests(unwrapList<GuestRow>(res))
      } catch (_e) {
        if (!cancelled) {
          setError(t('guests.loadError', {}, { defaultValue: 'Failed to load guests.' }))
          setGuests([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, t, search])

  // Directory telemetry — derived from the SAME fetched list, the design's
  // KPI strip fed by real data.
  const kpis = useMemo(() => {
    const list = guests ?? []
    const langs = new Set(list.map((g) => g.preferred_language).filter(Boolean))
    const repeats = list.filter((g) => g.stay_count > 1).length
    const stays = list.reduce((acc, g) => acc + g.stay_count, 0)
    return { count: list.length, langs: langs.size, repeats, stays }
  }, [guests])

  return (
    <div className={cm.cn(cm.maxW('6xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      {/* Header strip — eyebrow ledger trail, serif headline */}
      <div className="border-b border-outline-variant/60 pb-6">
        <p
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'uppercase tracking-wider text-on-surface-variant',
          )}
        >
          <span>{t('guests.eyebrow', {}, { defaultValue: 'Switchboard autonomous ledger' })}</span>
          <span className="sb-icon flex h-3 w-3 items-center justify-center" aria-hidden="true">
            <span className="material-symbols-outlined">chevron_right</span>
          </span>
          <span className="text-secondary">
            {t('guests.eyebrowSegment', {}, { defaultValue: 'Guest directory' })}
          </span>
        </p>
        <h1
          className={cm.cn('sb-serif mt-1 text-3xl font-normal tracking-tight text-primary')}
          data-mol-id="guests-heading"
        >
          {t('guests.heading', {}, { defaultValue: 'Guests' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'guests.subheading',
            {},
            {
              defaultValue:
                'Guest profiles with preferred language and stay history — the voice agent greets repeat guests in theirs.',
            },
          )}
        </p>
      </div>

      {/* Directory telemetry strip */}
      <div className={cm.cn('mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4')}>
        <div
          data-mol-id="guests-kpi-profiles"
          className="sb-card-shadow flex flex-col justify-between rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-4"
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wider text-on-surface-variant',
            )}
          >
            <span>{t('guests.kpiProfiles', {}, { defaultValue: 'Total guest profiles' })}</span>
            <span className="sb-icon flex h-5 w-5 items-center justify-center" aria-hidden="true">
              <span className="material-symbols-outlined">badge</span>
            </span>
          </div>
          <div className={cm.cn('sb-serif mt-1 text-2xl font-medium tracking-tight text-primary')}>
            {guests === null ? '—' : String(kpis.count)}
          </div>
          <p
            className={cm.cn(
              cm.sp('mt', 2),
              cm.sp('pt', 2),
              cm.textSize('xs'),
              'border-t border-outline-variant/30 text-on-surface-variant',
            )}
          >
            {t('guests.kpiProfilesSub', {}, { defaultValue: 'Every caller the desk has on file' })}
          </p>
        </div>
        <div
          data-mol-id="guests-kpi-languages"
          className="sb-card-shadow flex flex-col justify-between rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-4"
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wider text-on-surface-variant',
            )}
          >
            <span>{t('guests.kpiLanguages', {}, { defaultValue: 'Languages on file' })}</span>
            <span
              className="sb-icon flex h-5 w-5 items-center justify-center text-secondary"
              aria-hidden="true"
            >
              <span className="material-symbols-outlined">translate</span>
            </span>
          </div>
          <div className={cm.cn('sb-serif mt-1 text-2xl font-medium tracking-tight text-primary')}>
            {guests === null ? '—' : String(kpis.langs)}
          </div>
          <p
            className={cm.cn(
              cm.sp('mt', 2),
              cm.sp('pt', 2),
              cm.textSize('xs'),
              'border-t border-outline-variant/30 text-on-surface-variant',
            )}
          >
            {t(
              'guests.kpiLanguagesSub',
              {},
              { defaultValue: 'The agent opens in the guest’s own language' },
            )}
          </p>
        </div>
        <div
          data-mol-id="guests-kpi-repeats"
          className="sb-card-shadow flex flex-col justify-between rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-4"
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wider text-on-surface-variant',
            )}
          >
            <span>{t('guests.kpiRepeats', {}, { defaultValue: 'Repeat guests' })}</span>
            <span className="sb-icon flex h-5 w-5 items-center justify-center" aria-hidden="true">
              <span className="material-symbols-outlined">group</span>
            </span>
          </div>
          <div className={cm.cn('sb-serif mt-1 text-2xl font-medium tracking-tight text-primary')}>
            {guests === null ? '—' : String(kpis.repeats)}
          </div>
          <p
            className={cm.cn(
              cm.sp('mt', 2),
              cm.sp('pt', 2),
              cm.textSize('xs'),
              'border-t border-outline-variant/30 text-on-surface-variant',
            )}
          >
            {t('guests.kpiRepeatsSub', {}, { defaultValue: 'More than one completed stay' })}
          </p>
        </div>
        <div
          data-mol-id="guests-kpi-stays"
          className="sb-card-shadow flex flex-col justify-between rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-4"
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wider text-on-surface-variant',
            )}
          >
            <span>{t('guests.kpiStays', {}, { defaultValue: 'Stays served' })}</span>
            <span className="sb-icon flex h-5 w-5 items-center justify-center" aria-hidden="true">
              <span className="material-symbols-outlined">hotel_class</span>
            </span>
          </div>
          <div className={cm.cn('sb-serif mt-1 text-2xl font-medium tracking-tight text-primary')}>
            {guests === null ? '—' : String(kpis.stays)}
          </div>
          <p
            className={cm.cn(
              cm.sp('mt', 2),
              cm.sp('pt', 2),
              cm.textSize('xs'),
              'border-t border-outline-variant/30 text-on-surface-variant',
            )}
          >
            {t('guests.kpiStaysSub', {}, { defaultValue: 'Completed stays across the directory' })}
          </p>
        </div>
      </div>

      {/* Search rail */}
      <div className={cm.cn(cm.sp('mt', 6))}>
        <div className="relative max-w-xl">
          <span
            className="sb-icon pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-on-surface-variant"
            aria-hidden="true"
          >
            <span className="material-symbols-outlined">search</span>
          </span>
          <input
            id="guest_search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              'guests.searchPlaceholder',
              {},
              { defaultValue: 'Search guests by name…' },
            )}
            data-mol-id="guests-search"
            aria-label={t('guests.searchLabel', {}, { defaultValue: 'Search guests' })}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2.5),
              'w-full rounded-lg border border-outline-variant/60 bg-surface-container-lowest pl-10 text-primary placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
            )}
          />
        </div>
      </div>

      {error ? (
        <p
          data-mol-id="guests-error"
          className={cm.cn(
            cm.sp('mt', 4),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'rounded-lg bg-error/10 text-error border border-error/30',
          )}
        >
          {error}
        </p>
      ) : null}

      {/* Guest roster */}
      <ul className={cm.cn(cm.sp('mt', 4), 'grid grid-cols-1 gap-3.5 lg:grid-cols-2')}>
        {guests === null ? (
          <li data-mol-id="guests-loading" className="text-on-surface-variant">
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </li>
        ) : guests.length === 0 ? (
          <li data-mol-id="guests-empty" className="text-on-surface-variant">
            {t('guests.empty', {}, { defaultValue: 'No guests match that search.' })}
          </li>
        ) : (
          guests.map((g) => (
            <li key={g.id}>
              <Link
                to={'/guests/' + g.id}
                data-mol-id={'guest-row-' + g.id}
                className={cm.cn(
                  cm.sp('p', 4),
                  'block rounded-lg border border-outline-variant/50 bg-surface-container-lowest transition-colors hover:border-secondary/60',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'sm' }))}>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    <span
                      aria-hidden="true"
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'h-10 w-10 shrink-0 rounded-lg bg-primary text-on-primary',
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                      )}
                    >
                      {initials(g.name)}
                    </span>
                    <span>
                      <span className={cm.cn('sb-serif block text-lg font-medium text-primary')}>
                        {g.name}
                      </span>
                      <span
                        className={cm.cn(
                          'block font-mono text-on-surface-variant',
                          cm.textSize('xs'),
                        )}
                      >
                        {g.email ?? g.phone ?? '—'}
                      </span>
                    </span>
                  </div>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.textSize('xs'),
                      cm.fontWeight('medium'),
                      'whitespace-nowrap rounded border border-outline-variant/60 bg-surface-container px-2 py-1 text-on-surface-variant',
                    )}
                  >
                    <span
                      className="sb-icon flex h-3.5 w-3.5 items-center justify-center"
                      aria-hidden="true"
                    >
                      <span className="material-symbols-outlined">translate</span>
                    </span>
                    {languageLabel(g.preferred_language)}
                  </span>
                </div>
                <div
                  className={cm.cn(
                    cm.sp('mt', 3),
                    cm.sp('pt', 3),
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.textSize('xs'),
                    'border-t border-outline-variant/30 text-on-surface-variant',
                  )}
                >
                  <span>
                    <span className={cm.fontWeight('semibold') + ' text-primary'}>
                      {t(
                        'guests.stays',
                        { count: g.stay_count },
                        { defaultValue: '{{count}} stays' },
                      )}
                    </span>
                  </span>
                  <span className={cm.flex({ align: 'center', gap: 'xs' }) + ' text-secondary'}>
                    {t('guests.viewDossier', {}, { defaultValue: 'View dossier' })}
                    <span
                      className="sb-icon flex h-3.5 w-3.5 items-center justify-center"
                      aria-hidden="true"
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </span>
                  </span>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
