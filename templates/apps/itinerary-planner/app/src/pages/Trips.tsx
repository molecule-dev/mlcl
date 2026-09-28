/**
 * Trips — primary list of every trip the traveler has, grouped into
 * "Live & planning" and "Past adventures" sections. Each card is the
 * editorial `<TripCoverCard>` (cover image + status pill + collaborator
 * stack + budget pill).
 *
 * Status filter pills sit above the grid as a quick triage. Counts on the
 * pills update live with the filter selection.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { TripCoverCard, type TripStatus } from '../components/TripCoverCard.js'
import { type TripRow, tripRowToSummary } from '../lib/api.js'

type Filter = 'all' | TripStatus

const FILTER_ORDER: Filter[] = [
  'all',
  'in_progress',
  'confirmed',
  'tentative',
  'completed',
  'cancelled',
]
const FILTER_LABELS: Record<Filter, string> = {
  all: 'All trips',
  in_progress: 'In progress',
  confirmed: 'Confirmed',
  tentative: 'Tentative',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export function Trips() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [filter, setFilter] = useState<Filter>('all')
  const [trips, setTrips] = useState<TripRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get<TripRow[]>('/trips')
      .then((resp) => {
        if (cancelled) return
        const data = Array.isArray(resp.data) ? resp.data : []
        setTrips(data)
      })
      .catch(() => {
        if (!cancelled) setTrips([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const summaries = useMemo(() => trips.map(tripRowToSummary), [trips])

  const counts = useMemo(() => {
    const next: Record<Filter, number> = {
      all: summaries.length,
      in_progress: 0,
      confirmed: 0,
      tentative: 0,
      completed: 0,
      cancelled: 0,
    }
    for (const trip of summaries) next[trip.status] += 1
    return next
  }, [summaries])

  const filtered = filter === 'all' ? summaries : summaries.filter((s) => s.status === filter)
  const live = filtered.filter(
    (s) => s.status === 'in_progress' || s.status === 'confirmed' || s.status === 'tentative',
  )
  const past = filtered.filter((s) => s.status === 'completed' || s.status === 'cancelled')

  return (
    <div
      className={cm.cn(
        cm.maxW('7xl'),
        cm.sp('px', 8),
        cm.sp('py', 10),
        cm.mxAuto,
        cm.flex({ direction: 'col', gap: 'lg' }),
      )}
    >
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }))}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.25em] text-primary',
            )}
          >
            {t('trips.eyebrow', {}, { defaultValue: 'The atlas' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('extrabold'),
              cm.sp('mt', 2),
              'leading-tight tracking-tight',
            )}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {t('trips.heading', {}, { defaultValue: 'Every trip you\u2019ve ever wandered.' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('base'),
              cm.sp('mt', 2),
              cm.maxW('2xl'),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {t(
              'trips.subheading',
              { count: summaries.length },
              { defaultValue: '{{count}} itineraries — past, present, and someday.' },
            )}
          </p>
        </div>
        <Link
          to="/trips/new"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'sm' }),
            'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-md',
          )}
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            add
          </span>
          {t('trips.newTripCta', {}, { defaultValue: 'Plan a new trip' })}
        </Link>
      </header>

      <div
        className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}
        role="tablist"
        aria-label={t('trips.filterLabel', {}, { defaultValue: 'Filter trips by status' })}
      >
        {FILTER_ORDER.map((key) => {
          const active = filter === key
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(key)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'uppercase tracking-widest rounded-full transition-colors',
                active
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-primary-container/40',
              )}
            >
              {t(`trips.filter.${key}`, {}, { defaultValue: FILTER_LABELS[key] })}
              <span className={cm.cn(cm.textSize('xs'), 'tabular-nums opacity-80')}>
                {counts[key]}
              </span>
            </button>
          )
        })}
      </div>

      {!loading && filtered.length === 0 ? (
        <div
          data-testid="trips-empty"
          className={cm.cn(
            cm.sp('p', 12),
            cm.textCenter,
            'rounded-3xl bg-surface-container-low border border-outline-variant/40',
          )}
        >
          <span
            className="material-symbols-outlined text-4xl text-on-surface-variant"
            aria-hidden="true"
          >
            map
          </span>
          <h2
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('extrabold'),
              cm.sp('mt', 3),
              'tracking-tight',
            )}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {summaries.length === 0
              ? t('trips.noTrips.heading', {}, { defaultValue: 'No trips yet.' })
              : t('trips.empty.heading', {}, { defaultValue: 'Nothing matches that filter yet.' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {summaries.length === 0
              ? t(
                  'trips.noTrips.body',
                  {},
                  {
                    defaultValue: 'Plan your first trip — give it a name, dates, and destination.',
                  },
                )
              : t(
                  'trips.empty.body',
                  {},
                  { defaultValue: 'Switch back to All trips or start planning your next wander.' },
                )}
          </p>
          {summaries.length === 0 ? (
            <Link
              to="/trips/new"
              className={cm.cn(
                cm.sp('mt', 4),
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                'inline-block rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors',
              )}
            >
              {t('trips.empty.cta', {}, { defaultValue: 'Plan a trip' })}
            </Link>
          ) : null}
        </div>
      ) : null}

      {live.length > 0 ? (
        <section className={cm.flex({ direction: 'col', gap: 'sm' })}>
          <h2
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('extrabold'), 'tracking-tight')}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {t('trips.liveHeading', {}, { defaultValue: 'Live & planning' })}
          </h2>
          <div
            data-testid="trips-live"
            className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6')}
          >
            {live.map((trip) => (
              <TripCoverCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>
      ) : null}

      {past.length > 0 ? (
        <section className={cm.flex({ direction: 'col', gap: 'sm' })}>
          <h2
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('extrabold'), 'tracking-tight')}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {t('trips.pastHeading', {}, { defaultValue: 'Past adventures' })}
          </h2>
          <div
            data-testid="trips-past"
            className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6')}
          >
            {past.map((trip) => (
              <TripCoverCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
