import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type TripItinerary, TripItineraryCard } from '../components/TripItineraryCard.js'

interface ApiTrip {
  id: string
  status: string
  kind: string
  flight_payload?: Record<string, unknown>
  passenger_count?: number
  cabin?: string
  total_cents?: number
  confirmation_code?: string | null
  created_at?: string
}

function mapTripStatus(api: ApiTrip): TripItinerary['status'] {
  if (api.status === 'cancelled') return 'cancelled'
  if (api.status === 'booked') {
    const dep = (api.flight_payload as { departure_time?: string } | undefined)?.departure_time
    if (dep && new Date(dep).getTime() < Date.now()) return 'completed'
    return 'upcoming'
  }
  if (api.status === 'pending_payment' || api.status === 'draft') return 'upcoming'
  return 'upcoming'
}

function toItinerary(api: ApiTrip): TripItinerary {
  const fp = (api.flight_payload ?? {}) as {
    airline?: string
    origin_code?: string
    origin_city?: string
    destination_code?: string
    destination_city?: string
    departure_time?: string
    arrival_time?: string
    cabin?: string
  }
  return {
    id: String(api.id),
    airline: fp.airline ?? '',
    origin_code: fp.origin_code ?? '',
    origin_city: fp.origin_city ?? '',
    destination_code: fp.destination_code ?? '',
    destination_city: fp.destination_city ?? '',
    departure_iso: fp.departure_time ?? api.created_at ?? '',
    return_iso: fp.arrival_time ?? null,
    passenger_count: api.passenger_count ?? 1,
    cabin_class: api.cabin ?? fp.cabin ?? 'economy',
    status: mapTripStatus(api),
    total_price: (api.total_cents ?? 0) / 100,
    confirmation_code: api.confirmation_code ?? `SKYL-${String(api.id).slice(0, 4).toUpperCase()}`,
  }
}

export function Trips() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [trips, setTrips] = useState<TripItinerary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/trips')
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray((res as { data?: unknown }).data)
          ? (res as { data: ApiTrip[] }).data
          : Array.isArray(res as unknown as ApiTrip[])
            ? (res as unknown as ApiTrip[])
            : []
        setTrips(list.map(toItinerary))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        console.error('[Trips] load failed:', err)
        setTrips([])
        setError(t('trips.errorMessage', {}, { defaultValue: 'Could not load trips.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const upcoming = trips.filter(
    (trip) => trip.status === 'upcoming' || trip.status === 'in_progress',
  )
  const past = trips.filter((trip) => trip.status === 'completed' || trip.status === 'cancelled')

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <div
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
            {t('trips.eyebrow', {}, { defaultValue: 'Your itineraries' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 2),
              'leading-tight tracking-tight',
            )}
          >
            {t('trips.heading', {}, { defaultValue: 'Trips' })}
          </h1>
        </div>
        <Link
          to="/search"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'sm' }),
            'rounded-full bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-sm',
          )}
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            add
          </span>
          {t('trips.bookNew', {}, { defaultValue: 'Book new trip' })}
        </Link>
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('trips.loading', {}, { defaultValue: 'Loading itineraries…' })}
        </p>
      ) : trips.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 20), cm.textCenter)}>
          <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
            {t('trips.empty', {}, { defaultValue: 'No trips yet — find your first deal.' })}
          </p>
          <Link
            to="/search"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.sp('mt', 4),
              cm.fontWeight('bold'),
              'inline-block rounded-full bg-accent text-on-accent hover:bg-accent/90 transition-colors shadow-sm',
            )}
          >
            {t('trips.searchCta', {}, { defaultValue: 'Search flights' })}
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 ? (
            <section className={cm.sp('mb', 10)}>
              <h2
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 4),
                  'uppercase tracking-[0.25em] text-on-surface-variant',
                )}
              >
                {t('status.upcoming', {}, { defaultValue: 'Upcoming' })}
              </h2>
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
                {upcoming.map((trip) => (
                  <TripItineraryCard key={trip.id} trip={trip} />
                ))}
              </div>
            </section>
          ) : null}
          {past.length > 0 ? (
            <section>
              <h2
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 4),
                  'uppercase tracking-[0.25em] text-on-surface-variant',
                )}
              >
                {t('trips.pastHeading', {}, { defaultValue: 'Past Trips' })}
                <span
                  className={cm.cn('material-symbols-outlined text-on-surface-variant')}
                  aria-hidden="true"
                >
                  expand_more
                </span>
              </h2>
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
                {past.map((trip) => (
                  <TripItineraryCard key={trip.id} trip={trip} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
