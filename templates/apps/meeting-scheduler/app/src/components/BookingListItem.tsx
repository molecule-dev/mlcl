import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface BookingRow {
  id: string
  invitee_name: string
  invitee_email?: string | null
  /** ISO timestamp — server returns `start_at`, accept legacy `start_time` too. */
  start_at: string
  /** ISO timestamp — server returns `end_at`, accept legacy `end_time` too. */
  end_at: string
  timezone?: string | null
  /** DB statuses: scheduled/cancelled/completed/no_show/pending. Anything else
   * passes through and renders with the "confirmed" tone. */
  status:
    'scheduled' | 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'no_show' | 'past' | string
  event_type_name?: string | null
  notes?: string | null
}

interface BookingListItemProps {
  booking: BookingRow
}

/**
 * Editorial booking row — colored status accent (4px left border by
 * status), uppercase 10px label, monospace tabular-nums time, status
 * pill, hover row tint. Used in Dashboard's "Upcoming today" list and
 * the /bookings index list.
 *
 * Translated from crm/ActivityFeed.tsx + DESIGN.md booking-card spec
 * (inset status accent bar, status pill, Time-font duration badge).
 */
const STATUS_TONE: Record<
  string,
  { bar: string; pillBg: string; pillText: string; label: string }
> = {
  scheduled: {
    bar: 'var(--color-emerald-500)',
    pillBg: 'bg-emerald-500/15',
    pillText: 'text-success',
    label: 'Scheduled',
  },
  confirmed: {
    bar: 'var(--color-emerald-500)',
    pillBg: 'bg-emerald-500/15',
    pillText: 'text-success',
    label: 'Confirmed',
  },
  pending: {
    bar: 'var(--color-amber-500)',
    pillBg: 'bg-amber-500/15',
    pillText: 'text-warning',
    label: 'Pending',
  },
  cancelled: {
    bar: 'var(--color-rose-500)',
    pillBg: 'bg-rose-500/15',
    pillText: 'text-error',
    label: 'Cancelled',
  },
  completed: {
    bar: 'var(--color-border-secondary)',
    pillBg: 'bg-slate-500/15',
    pillText: 'text-foreground-secondary',
    label: 'Completed',
  },
  no_show: {
    bar: 'var(--color-border-secondary)',
    pillBg: 'bg-slate-500/15',
    pillText: 'text-foreground-secondary',
    label: 'No-show',
  },
  past: {
    bar: 'var(--color-border-secondary)',
    pillBg: 'bg-slate-500/15',
    pillText: 'text-foreground-secondary',
    label: 'Past',
  },
}

function formatTimeRange(start: string, end: string) {
  try {
    const s = new Date(start)
    const e = new Date(end)
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
      return `${start} → ${end}`
    }
    const day = s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    const sTime = s.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    const eTime = e.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    return `${day} · ${sTime} – ${eTime}`
  } catch (_error) {
    // date parsing is best-effort; fall back to raw strings if the locale API throws
    return `${start} → ${end}`
  }
}

export function BookingListItem({ booking }: BookingListItemProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tone = STATUS_TONE[booking.status] ?? STATUS_TONE.scheduled
  const initials = (booking.invitee_name || '?')
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <Link
      to={`/bookings/${booking.id}`}
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('p', 4),
        cm.accentCard({ tone: 'custom' }),
        'gap-4 group bg-surface-container-lowest rounded-xl hover:bg-surface-container-low hover:shadow-sm transition-all',
      )}
      style={{ ['--mol-accent' as string]: tone.bar }}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'flex-1 min-w-0')}>
        <div
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'shrink-0 bg-primary/10 text-primary',
          )}
          aria-hidden="true"
        >
          {initials}
        </div>
        <div className={cm.cn(cm.stack(1), 'min-w-0')}>
          <p
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'truncate text-on-surface')}
          >
            {booking.invitee_name}
          </p>
          <p className={cm.cn(cm.accentCardLabel({ tone: 'custom' }), 'truncate')}>
            {booking.event_type_name ||
              t('bookingListItem.defaultEventType', {}, { defaultValue: 'Meeting' })}
          </p>
        </div>
      </div>

      <div
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('medium'),
          'hidden sm:block tabular-nums font-mono text-on-surface-variant',
        )}
      >
        {formatTimeRange(booking.start_at, booking.end_at)}
      </div>

      <span
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 1),
          cm.roundedFull,
          cm.fontWeight('bold'),
          'text-[10px] uppercase tracking-widest',
          tone.pillBg,
          tone.pillText,
        )}
      >
        {t(`bookingListItem.status.${booking.status}`, {}, { defaultValue: tone.label })}
      </span>

      <span
        className={cm.cn(
          'material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity',
        )}
        aria-hidden="true"
      >
        chevron_right
      </span>
    </Link>
  )
}

export default BookingListItem
