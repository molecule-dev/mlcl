import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BookingStatusPill } from '../components/BookingStatusPill.js'
import { formatDateTime, formatMoney } from '../lib/format.js'

export interface BookingSummary {
  id: string
  status: 'booked' | 'delayed' | 'rebooked' | 'cancelled'
  flight_number: string
  airline: string
  origin_iata: string
  destination_iata: string
  depart_at: string
  arrive_at: string
  passenger_count: number
  total_cents: number
  currency: string
  confirmation_code: string
  delay_minutes: number
}

export interface TripSummary {
  id: string
  title: string
  status: 'planned' | 'booked' | 'rebooked' | 'cancelled'
  origin_iata: string | null
  destination_iata: string | null
  depart_date: string | null
  traveler_count: number
  created_at: string
  bookings: BookingSummary[]
}

/** The current booking of a trip: the one that was not moved or cancelled, else the latest. */
export function currentBooking(trip: TripSummary): BookingSummary | null {
  const live = trip.bookings.filter((b) => b.status === 'booked' || b.status === 'delayed')
  if (live.length > 0) return live[live.length - 1] ?? null
  return trip.bookings[trip.bookings.length - 1] ?? null
}

function Trips() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [trips, setTrips] = useState<TripSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await http.get<TripSummary[]>('/trips')
        if (cancelled) return
        setTrips(Array.isArray(res.data) ? res.data : [])
      } catch (e) {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('trips.fetchError', {}, { defaultValue: 'Could not load your trips.' }),
        )
        setTrips([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background text-foreground',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('px', 6),
          cm.sp('py', 6),
          'border-b border-border',
        )}
      >
        <div className={cm.cn(cm.flex({ direction: 'col' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.textMuted,
              'uppercase tracking-widest font-semibold',
            )}
          >
            {t('trips.eyebrow', {}, { defaultValue: 'Booked by your agent' })}
          </span>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('nav.trips', {}, { defaultValue: 'Trips' })}
          </h1>
        </div>
        <Link
          to="/talk"
          data-mol-id="trips-new"
          className={cm.cn(
            cm.roundedFull,
            cm.fontWeight('semibold'),
            cm.sp('px', 5),
            cm.sp('py', 2),
            'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:opacity-90 transition-opacity',
          )}
        >
          {t('trips.book', {}, { defaultValue: 'Book a flight' })}
        </Link>
      </header>

      <main
        className={cm.cn(cm.sp('px', 6), cm.sp('py', 6), cm.mxAuto, cm.w('full'), 'max-w-[960px]')}
      >
        {trips === null ? (
          <p className={cm.cn(cm.textMuted, cm.textSize('sm'))}>
            {t('trips.loading', {}, { defaultValue: 'Loading trips…' })}
          </p>
        ) : trips.length === 0 ? (
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
              cm.sp('py', 16),
              cm.textCenter,
            )}
            data-mol-id="trips-empty"
          >
            <span
              className={cm.cn(
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'h-16 w-16 bg-surface border border-border text-foreground-tertiary',
              )}
            >
              <span className="material-symbols-outlined text-[28px]">flight</span>
            </span>
            <p className={cm.cn(cm.fontWeight('semibold'))}>
              {t('trips.emptyTitle', {}, { defaultValue: 'No trips yet.' })}
            </p>
            <p className={cm.cn(cm.textMuted, cm.textSize('sm'))}>
              {t(
                'trips.emptyBody',
                {},
                { defaultValue: 'Tell the agent where you want to go and it books the flight.' },
              )}
            </p>
          </div>
        ) : (
          <ul
            className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(3))}
            data-mol-id="trips-list"
          >
            {trips.map((trip) => {
              const booking = currentBooking(trip)
              return (
                <li key={trip.id}>
                  <Link
                    to={`/trips/${trip.id}`}
                    data-mol-id="trip-card"
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                      cm.sp('p', 5),
                      'rounded-2xl bg-surface border border-border hover:border-primary/50 transition-colors',
                    )}
                  >
                    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'min-w-0')}>
                      <span
                        className={cm.cn(
                          cm.textSize('lg'),
                          cm.fontWeight('bold'),
                          'tracking-tight',
                        )}
                      >
                        {trip.origin_iata ?? '—'} → {trip.destination_iata ?? '—'}
                      </span>
                      {booking ? (
                        <span className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                          {booking.airline} {booking.flight_number} ·{' '}
                          {formatDateTime(booking.depart_at)} ·{' '}
                          {t(
                            'trips.travelers',
                            { count: booking.passenger_count },
                            { defaultValue: '{{count}} travelers' },
                          )}
                        </span>
                      ) : (
                        <span className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                          {t('trips.noBooking', {}, { defaultValue: 'Nothing booked yet' })}
                        </span>
                      )}
                    </div>
                    <div
                      className={cm.cn(
                        cm.flex({ direction: 'col', align: 'end', gap: 'xs' }),
                        'shrink-0',
                      )}
                    >
                      {booking ? (
                        <span className={cm.cn(cm.fontWeight('bold'), 'tabular-nums')}>
                          {formatMoney(booking.total_cents, booking.currency)}
                        </span>
                      ) : null}
                      <BookingStatusPill
                        status={booking?.status ?? trip.status}
                        delayMinutes={booking?.delay_minutes}
                      />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
        {error ? (
          <p
            role="alert"
            className={cm.cn(
              cm.sp('mt', 4),
              cm.textSize('sm'),
              cm.sp('p', 3),
              'rounded-xl bg-error/15 text-error border border-error/30',
            )}
          >
            {error}
          </p>
        ) : null}
      </main>
    </div>
  )
}

export default Trips
export { Trips, Trips as TripsPage }
