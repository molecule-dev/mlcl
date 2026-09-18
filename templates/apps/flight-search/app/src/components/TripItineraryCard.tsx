/**
 * Booked trip itinerary card — origin/destination airport-code header
 * with status pill, dashed route connector with circle endpoints,
 * passenger + cabin meta line, departure/return dates in tabular
 * numerals, and a tabular-numeral total on the right.
 *
 * Translated from hotel-booking's TripItineraryRow.tsx (status pill +
 * meta-stack + tabular total) but reshaped for airline itineraries:
 * the visual anchor is the airport-code route rather than a property
 * thumbnail, and dates use a duration-monospace stack instead of a
 * checkin/checkout span.
 *
 * Props match `trips.json` fixture shape (id, origin_code,
 * destination_code, airline, departure_iso, return_iso?, status,
 * total_price, passenger_count, cabin_class).
 */

import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface TripItinerary {
  id: string
  airline: string
  origin_code: string
  origin_city?: string
  destination_code: string
  destination_city?: string
  departure_iso: string
  return_iso?: string | null
  passenger_count?: number
  cabin_class?: string
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
  total_price: number
  confirmation_code?: string
}

const STATUS_THEME: Record<
  TripItinerary['status'],
  { bg: string; text: string; label: string; icon: string }
> = {
  upcoming: { bg: 'bg-info/10', text: 'text-info', label: 'Upcoming', icon: 'flight_takeoff' },
  in_progress: {
    bg: 'bg-cheapest-light',
    text: 'text-cheapest',
    label: 'In flight',
    icon: 'flight',
  },
  completed: {
    bg: 'bg-surface-container',
    text: 'text-on-surface-variant',
    label: 'Completed',
    icon: 'check_circle',
  },
  cancelled: {
    bg: 'bg-expensive-light',
    text: 'text-expensive',
    label: 'Cancelled',
    icon: 'cancel',
  },
}

function fmtPrice(value: number): string {
  return `$${Math.round(value).toLocaleString()}`
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function TripItineraryCard({ trip }: { trip: TripItinerary }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const theme = STATUS_THEME[trip.status]

  return (
    <Link
      to={`/trips/${trip.id}`}
      className={cm.cn(
        cm.sp('p', 5),
        'group relative block bg-surface rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all ring-1 ring-outline-variant/40',
      )}
    >
      <div className={cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' })}>
        <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-md bg-primary/10 text-primary tracking-widest uppercase',
            )}
          >
            {trip.origin_code}
          </span>
          <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">
            arrow_right_alt
          </span>
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-md bg-primary/10 text-primary tracking-widest uppercase',
            )}
          >
            {trip.destination_code}
          </span>
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'uppercase tracking-widest rounded-full',
              theme.bg,
              theme.text,
            )}
          >
            <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
              {theme.icon}
            </span>
            {t(`tripItineraryCard.status.${trip.status}`, {}, { defaultValue: theme.label })}
          </span>
        </div>
        <div className="text-right">
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('tripItineraryCard.totalLabel', {}, { defaultValue: 'Total' })}
          </p>
          <p
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tabular-nums leading-none')}
          >
            {fmtPrice(trip.total_price)}
          </p>
        </div>
      </div>

      <div
        className={cm.cn(
          cm.sp('mt', 4),
          cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
          cm.textSize('sm'),
          'text-on-surface-variant',
        )}
      >
        <span className={cm.flex({ align: 'center', gap: 'xs' })}>
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            flight
          </span>
          {trip.airline}
        </span>
        <span className={cm.flex({ align: 'center', gap: 'xs' })}>
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            event
          </span>
          <span className="tabular-nums">
            {fmtDate(trip.departure_iso)}
            {trip.return_iso ? ` – ${fmtDate(trip.return_iso)}` : ''}
          </span>
        </span>
        {typeof trip.passenger_count === 'number' ? (
          <span className={cm.flex({ align: 'center', gap: 'xs' })}>
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              group
            </span>
            {t(
              'tripItineraryCard.passengers',
              { count: trip.passenger_count },
              { defaultValue: '{{count}} traveler' },
            )}
          </span>
        ) : null}
        {trip.cabin_class ? (
          <span className={cm.flex({ align: 'center', gap: 'xs' })}>
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              airline_seat_recline_normal
            </span>
            {t(
              `tripItineraryCard.cabin.${trip.cabin_class}`,
              {},
              { defaultValue: trip.cabin_class.replace('_', ' ') },
            )}
          </span>
        ) : null}
        {trip.confirmation_code ? (
          <span className={cm.flex({ align: 'center', gap: 'xs' })}>
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              confirmation_number
            </span>
            <span className="tabular-nums tracking-widest">{trip.confirmation_code}</span>
          </span>
        ) : null}
      </div>
    </Link>
  )
}
