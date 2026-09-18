/**
 * Editorial trip itinerary row — landscape `4:3` thumbnail on the left,
 * property name in DM Sans, dates in a tabular run, status pill, and a
 * tabular-numerals total on the right. Hover lifts a half-step like the
 * polished-11 list rows.
 *
 * Translated from hotel-booking's TripItineraryRow.tsx — adapted for
 * travel-booking's "Wander without worry" voice (calm, reassuring) and
 * teal/coral palette.
 *
 * Props match `trips.json` fixture shape exactly.
 */

import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

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

const STATUS_THEME: Record<
  Trip['status'],
  { bg: string; text: string; label: string; icon: string }
> = {
  upcoming: {
    bg: 'bg-sky-100 dark:bg-sky-900/40',
    text: 'text-sky-700 dark:text-sky-200',
    label: 'Upcoming',
    icon: 'event_upcoming',
  },
  in_progress: {
    bg: 'bg-success-light',
    text: 'text-success',
    label: 'Checked in',
    icon: 'flight_land',
  },
  completed: {
    bg: 'bg-surface-secondary',
    text: 'text-foreground-secondary',
    label: 'Completed',
    icon: 'check_circle',
  },
  cancelled: { bg: 'bg-rose-100', text: 'text-error', label: 'Cancelled', icon: 'cancel' },
}

function fmtPrice(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`
}

function fmtDateRange(checkIn: string, checkOut: string): string {
  const a = new Date(checkIn).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const b = new Date(checkOut).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${a} – ${b}`
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)))
}

export function TripItineraryRow({ trip }: { trip: Trip }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const theme = STATUS_THEME[trip.status]
  const nights = nightsBetween(trip.check_in_iso, trip.check_out_iso)

  return (
    <Link
      to={`/trips/${trip.id}`}
      className={cm.cn(
        cm.sp('p', 4),
        cm.flex({ align: 'center', gap: 'md' }),
        'group block bg-surface rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all border-l-4 border-primary',
      )}
    >
      <div
        className={cm.cn(
          'w-40 aspect-[4/3] flex-shrink-0 bg-surface-variant rounded-xl overflow-hidden',
        )}
      >
        {trip.thumbnail_url ? (
          <img
            src={trip.thumbnail_url}
            alt={t(
              'common.photographOf',
              { name: trip.property_name },
              { defaultValue: 'Photograph of {{name}}' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.h('full'),
              'object-cover transition-transform duration-500 group-hover:scale-105',
            )}
          />
        ) : null}
      </div>

      <div className={cm.cn('flex-1 min-w-0', cm.flex({ direction: 'col', gap: 'xs' }))}>
        <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          <h3
            className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'leading-tight')}
            style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
          >
            {trip.property_name}
          </h3>
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
            {t(`tripItineraryRow.status.${trip.status}`, {}, { defaultValue: theme.label })}
          </span>
        </div>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {trip.city}, {trip.country}
        </p>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
            'text-on-surface-variant tabular-nums',
          )}
        >
          <span className={cm.flex({ align: 'center', gap: 'xs' })}>
            <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
              date_range
            </span>
            {fmtDateRange(trip.check_in_iso, trip.check_out_iso)}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {t('tripItineraryRow.nights', { count: nights }, { defaultValue: '{{count}} nights' })}
          </span>
          {typeof trip.guests === 'number' ? (
            <>
              <span aria-hidden="true">·</span>
              <span>
                {t(
                  'common.countGuests',
                  { count: trip.guests },
                  { defaultValue: '{{count}} guests' },
                )}
              </span>
            </>
          ) : null}
          {trip.host_message_count && trip.host_message_count > 0 ? (
            <>
              <span aria-hidden="true">·</span>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'text-primary font-semibold',
                )}
              >
                <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                  forum
                </span>
                {t(
                  'common.countNew',
                  { count: trip.host_message_count },
                  { defaultValue: '{{count}} new' },
                )}
              </span>
            </>
          ) : null}
        </p>
      </div>

      <div className={cm.cn('text-right shrink-0')}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('nav.total', {}, { defaultValue: 'Total' })}
        </p>
        <p className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tabular-nums')}>
          {fmtPrice(trip.total_cents)}
        </p>
      </div>
    </Link>
  )
}
