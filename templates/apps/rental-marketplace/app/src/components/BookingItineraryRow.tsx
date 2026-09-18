/**
 * Editorial booking itinerary row — landscape `4:3` thumbnail on the left,
 * listing title in DM Sans, dates in a tabular run, status pill, an unread-
 * messages indicator when relevant, and a tabular-nums total on the right.
 * Hover lifts a half-step like the polished-11 list rows.
 *
 * Translated from travel-booking's TripItineraryRow.tsx — adapted for
 * Roost's "Stay like you belong" voice and the marketplace-specific
 * confirmation_code echo on hover.
 *
 * Props match `bookings.json` fixture shape exactly.
 */

import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Booking {
  id: string
  listing_id: string
  listing_title: string
  city: string
  country: string
  thumbnail_url?: string | null
  check_in_iso: string
  check_out_iso: string
  guests: number
  nights: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  total_cents: number
  messages_unread?: number
  confirmation_code?: string
}

const STATUS_THEME: Record<
  Booking['status'],
  { bg: string; text: string; label: string; icon: string }
> = {
  pending: { bg: 'bg-warning-light', text: 'text-warning', label: 'Pending', icon: 'pending' },
  confirmed: {
    bg: 'bg-sky-100 dark:bg-sky-900/40',
    text: 'text-sky-700 dark:text-sky-200',
    label: 'Confirmed',
    icon: 'event_upcoming',
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

export function BookingItineraryRow({ booking }: { booking: Booking }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const theme = STATUS_THEME[booking.status]

  return (
    <Link
      to={`/bookings/${booking.id}`}
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
        {booking.thumbnail_url ? (
          <img
            src={booking.thumbnail_url}
            alt={t(
              'common.photographOf',
              { name: booking.listing_title },
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
            {booking.listing_title}
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
            {t(`bookingItineraryRow.status.${booking.status}`, {}, { defaultValue: theme.label })}
          </span>
        </div>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {booking.city}, {booking.country}
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
            {fmtDateRange(booking.check_in_iso, booking.check_out_iso)}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {t(
              'bookingItineraryRow.nights',
              { count: booking.nights },
              { defaultValue: '{{count}} nights' },
            )}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {t(
              'common.countGuests',
              { count: booking.guests },
              { defaultValue: '{{count}} guests' },
            )}
          </span>
          {booking.messages_unread && booking.messages_unread > 0 ? (
            <>
              <span aria-hidden="true">·</span>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'text-primary-dark font-semibold',
                )}
              >
                <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                  forum
                </span>
                {t(
                  'common.countNew',
                  { count: booking.messages_unread },
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
          {fmtPrice(booking.total_cents)}
        </p>
      </div>
    </Link>
  )
}
