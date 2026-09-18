/**
 * Editorial reservation row — landscape `4:3` thumbnail, venue name in
 * DM Sans bold, status pill (upcoming / completed / cancelled),
 * date-range with hour breakdown, guest count, and a tabular-numerals
 * total on the right. Hover lifts a half-step.
 *
 * Translated from hotel-booking's TripItineraryRow.tsx — same anatomy,
 * with venue-bookings status semantics (upcoming / in_progress /
 * completed / cancelled), hour-vs-day duration display, and Alcove's
 * forest/copper palette.
 *
 * Props match `reservations.json` fixture shape exactly.
 */

import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface Reservation {
  id: string
  venue_id: string
  venue_name: string
  venue_subtitle?: string
  city: string
  country?: string
  thumbnail_url?: string | null
  starts_at_iso: string
  ends_at_iso: string
  guest_count?: number
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
  cancellable?: boolean
  rate_kind?: 'hour' | 'day'
  rate_unit_cents?: number
  total_cents: number
  host_id?: string
  host_name?: string
  host_avatar_url?: string | null
  host_message_count?: number
  confirmation_code?: string
}

const STATUS_THEME: Record<
  Reservation['status'],
  { bg: string; text: string; label: string; icon: string }
> = {
  upcoming: {
    bg: 'bg-teal-100 dark:bg-teal-900/40',
    text: 'text-teal-800 dark:text-teal-100',
    label: 'Upcoming',
    icon: 'event_upcoming',
  },
  in_progress: {
    bg: 'bg-success-light',
    text: 'text-success',
    label: 'In progress',
    icon: 'event_available',
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

function fmtDateRange(starts: string, ends: string): string {
  const a = new Date(starts)
  const b = new Date(ends)
  const sameDay = a.toDateString() === b.toDateString()
  const aStr = a.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  if (sameDay) {
    const aTime = a.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    const bTime = b.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    return `${aStr} · ${aTime}–${bTime}`
  }
  const bStr = b.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  return `${aStr} – ${bStr}`
}

function durationLabel(starts: string, ends: string, kind?: 'hour' | 'day'): string | null {
  const ms = new Date(ends).getTime() - new Date(starts).getTime()
  if (Number.isNaN(ms) || ms <= 0) return null
  const hours = Math.round(ms / (1000 * 60 * 60))
  if (kind === 'day' || hours >= 24) {
    const days = Math.max(1, Math.round(hours / 24))
    return `${days} ${days === 1 ? 'day' : 'days'}`
  }
  return `${hours} ${hours === 1 ? 'hr' : 'hrs'}`
}

export function ReservationRow({ reservation }: { reservation: Reservation }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const theme = STATUS_THEME[reservation.status]
  const duration = durationLabel(
    reservation.starts_at_iso,
    reservation.ends_at_iso,
    reservation.rate_kind,
  )

  return (
    <Link
      to={`/reservations/${reservation.id}`}
      className={cm.cn(
        cm.sp('p', 4),
        cm.flex({ align: 'center', gap: 'md' }),
        'group block bg-surface rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all',
      )}
    >
      <div
        className={cm.cn(
          'w-40 aspect-[4/3] flex-shrink-0 bg-surface-variant rounded-xl overflow-hidden',
        )}
      >
        {reservation.thumbnail_url ? (
          <img
            src={reservation.thumbnail_url}
            alt={t(
              'common.photographOf',
              { name: reservation.venue_name },
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
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            {reservation.venue_name}
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
            {t(`reservationRow.status.${reservation.status}`, {}, { defaultValue: theme.label })}
          </span>
        </div>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {reservation.city}
          {reservation.host_name
            ? ` · ${t('reservationRow.hostedBy', { host: reservation.host_name }, { defaultValue: 'hosted by {{host}}' })}`
            : null}
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
            {fmtDateRange(reservation.starts_at_iso, reservation.ends_at_iso)}
          </span>
          {duration ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{duration}</span>
            </>
          ) : null}
          {typeof reservation.guest_count === 'number' ? (
            <>
              <span aria-hidden="true">·</span>
              <span>
                {t(
                  'common.countGuests',
                  { count: reservation.guest_count },
                  { defaultValue: '{{count}} guests' },
                )}
              </span>
            </>
          ) : null}
          {reservation.host_message_count && reservation.host_message_count > 0 ? (
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
                  { count: reservation.host_message_count },
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
          {fmtPrice(reservation.total_cents)}
        </p>
        {reservation.confirmation_code ? (
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
            {reservation.confirmation_code}
          </p>
        ) : null}
      </div>
    </Link>
  )
}
