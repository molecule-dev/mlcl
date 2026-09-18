import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { TripItineraryRow } from '../components/TripItineraryRow.js'
import { unwrapList } from '../lib/unwrap.js'

interface Trip {
  id: string
  property_id: string
  property_name: string
  city: string
  country: string
  thumbnail_url?: string | null
  check_in_iso: string
  check_out_iso: string
  guests?: number
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
  total_cents: number
  host_message_count?: number
}

const TABS = ['upcoming', 'past'] as const
type Tab = (typeof TABS)[number]

export function Trips() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('upcoming')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/trips')
      .then((res) => {
        if (!cancelled) setTrips(unwrapList<Trip>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('trips.loadError', {}, { defaultValue: 'Failed to load trips.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const upcoming = useMemo(
    () => trips.filter((t) => t.status === 'upcoming' || t.status === 'in_progress'),
    [trips],
  )
  const past = useMemo(
    () => trips.filter((t) => t.status === 'completed' || t.status === 'cancelled'),
    [trips],
  )
  const visible = tab === 'upcoming' ? upcoming : past

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header
        className={cm.cn(
          cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 6),
        )}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.25em] text-primary',
            )}
          >
            {t('trips.eyebrow', {}, { defaultValue: 'Your wanders' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('extrabold'),
              cm.sp('mt', 2),
              'leading-tight tracking-tight',
            )}
            style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
          >
            {t('trips.heading', {}, { defaultValue: 'Trips' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {t(
              'trips.subheading',
              { upcoming: upcoming.length, past: past.length },
              { defaultValue: '{{upcoming}} upcoming · {{past}} past' },
            )}
          </p>
        </div>
        <Link
          to="/search"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-sm',
          )}
        >
          {t('trips.searchCta', {}, { defaultValue: 'Plan another trip' })}
        </Link>
      </header>

      <div
        className={cm.cn(cm.sp('mb', 6), cm.flex({ align: 'center', gap: 'sm' }))}
        role="tablist"
      >
        {TABS.map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            role="tab"
            aria-selected={tab === tabKey}
            onClick={() => setTab(tabKey)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest rounded-full transition-colors',
              tab === tabKey
                ? 'bg-primary text-on-primary'
                : 'bg-surface border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary',
            )}
          >
            {t(
              `trips.tabs.${tabKey}`,
              {},
              { defaultValue: tabKey === 'upcoming' ? 'Upcoming' : 'Past' },
            )}
          </button>
        ))}
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={cm.cn('h-32 rounded-2xl bg-surface-container animate-pulse')} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('py', 20),
            cm.textCenter,
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
          )}
        >
          <span
            className="material-symbols-outlined text-6xl text-on-surface-variant"
            aria-hidden="true"
          >
            luggage
          </span>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {tab === 'upcoming'
              ? t(
                  'trips.empty.upcoming',
                  {},
                  { defaultValue: "No upcoming trips yet — let's fix that." },
                )
              : t(
                  'trips.empty.past',
                  {},
                  { defaultValue: 'Past trips will appear here once you wander.' },
                )}
          </p>
          <Link
            to="/search"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'inline-block bg-primary text-on-primary rounded-full hover:bg-primary-container transition-colors',
            )}
          >
            {t('nav.browseStays', {}, { defaultValue: 'Browse stays' })}
          </Link>
        </div>
      ) : (
        <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          {visible.map((trip) => (
            <li key={trip.id}>
              <TripItineraryRow trip={trip} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
