import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Booking / vet appointment timeline entry — left gutter date stack +
 * connector node, content card with sitter / vet chip, service summary,
 * and a status pill.
 *
 * Translated from health-records' VisitTimelineEntry.tsx — same left-gutter
 * date + connector + colour-accented content card pattern, recoloured to
 * Nuzzle's pet-care palette and re-keyed to booking statuses (confirmed,
 * upcoming, in_progress, completed, cancelled).
 */
export type BookingStatus =
  'confirmed' | 'upcoming' | 'in_progress' | 'completed' | 'cancelled' | 'pending'

export type BookingType =
  'walk' | 'sitting' | 'boarding' | 'grooming' | 'vet' | 'training' | 'other'

export interface BookingTimelineEntryProps {
  /** Booking id — when present the card links to /bookings/:id. */
  id?: string
  /** Display-formatted booking date, e.g. "Apr 30". */
  dateLabel: string
  /** Time label, e.g. "3:00 PM". */
  timeLabel?: string
  type: BookingType
  status: BookingStatus
  /** Service title, e.g. "Daily walk · Bella". */
  title: string
  /** Sitter / vet name. */
  providerName: string
  /** Pet name(s) involved, comma-separated. */
  petsLabel?: string
  /** One-sentence summary. */
  summary?: string
  /** Whether this is the last entry (suppresses connector below). */
  isLast?: boolean
}

const STATUS_COLOR: Record<BookingStatus, string> = {
  confirmed: 'var(--color-pet-booked)',
  upcoming: 'var(--color-pet-booked)',
  in_progress: 'var(--color-pet-attention)',
  completed: 'var(--color-pet-healthy)',
  cancelled: 'var(--color-pet-critical)',
  pending: 'var(--color-pet-vaccinated)',
}

const TYPE_ICON: Record<BookingType, string> = {
  walk: 'directions_walk',
  sitting: 'home',
  boarding: 'hotel',
  grooming: 'shower',
  vet: 'medical_services',
  training: 'school',
  other: 'event',
}

export function BookingTimelineEntry({
  id,
  dateLabel,
  timeLabel,
  type,
  status,
  title,
  providerName,
  petsLabel,
  summary,
  isLast = false,
}: BookingTimelineEntryProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const inner = (
    <div className={cm.cn(cm.flex({ gap: 'md' }), 'relative group')}>
      <div className={cm.cn(cm.shrink0, cm.flex({ direction: 'col', align: 'center' }), 'w-14')}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'tabular-nums uppercase tracking-widest text-on-surface-variant',
          )}
          style={{ fontFamily: 'var(--mol-font-mono)' }}
        >
          {dateLabel}
        </p>
        {timeLabel && (
          <p
            className={cm.cn(cm.textSize('xs'), 'tabular-nums text-on-surface-variant/70')}
            style={{ fontFamily: 'var(--mol-font-mono)' }}
          >
            {timeLabel}
          </p>
        )}
        <div
          className={cm.cn(cm.sp('mt', 2), cm.w(3), cm.h(3), cm.roundedFull, 'shrink-0 z-10')}
          style={{ backgroundColor: STATUS_COLOR[status] }}
          aria-hidden="true"
        />
        {!isLast && (
          <div
            className={cm.cn(
              cm.flex1,
              cm.w(0),
              'border-l-2 border-outline-variant/40 mt-1 min-h-12',
            )}
            aria-hidden="true"
          />
        )}
      </div>

      <article
        className={cm.cn(
          cm.flex1,
          cm.sp('p', 5),
          cm.sp('mb', 4),
          'rounded-xl bg-surface-container-lowest hover:shadow-md transition-all',
          cm.accentCard({ tone: 'custom' }),
        )}
        style={{ ['--mol-accent' as string]: STATUS_COLOR[status] }}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
            cm.sp('mb', 2),
          )}
        >
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span
              className={cm.cn('material-symbols-outlined text-base')}
              style={{ color: STATUS_COLOR[status] }}
              aria-hidden="true"
            >
              {TYPE_ICON[type]}
            </span>
            <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>{title}</p>
          </div>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'px-2.5 py-1 text-[10px] uppercase tracking-widest rounded-full',
            )}
            style={{
              backgroundColor: 'color-mix(in srgb, ' + STATUS_COLOR[status] + ' 14%, white)',
              color: STATUS_COLOR[status],
            }}
          >
            {t(
              `bookingTimelineEntry.status.${status}`,
              {},
              { defaultValue: status.replace('_', ' ') },
            )}
          </span>
        </div>

        <p
          className={cm.cn(
            cm.textSize('xs'),
            'text-on-surface-variant uppercase tracking-wider',
            cm.sp('mb', 2),
          )}
        >
          {petsLabel
            ? t(
                'bookingTimelineEntry.providerWithPet',
                { provider: providerName, pets: petsLabel },
                { defaultValue: '{{provider}} · {{pets}}' },
              )
            : providerName}
        </p>
        {summary && <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>{summary}</p>}
      </article>
    </div>
  )

  return id ? (
    <Link to={`/bookings/${id}`} className={cm.cn('block')}>
      {inner}
    </Link>
  ) : (
    inner
  )
}

export default BookingTimelineEntry
