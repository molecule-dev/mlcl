import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'

export interface EventTypeRow {
  id: string
  name: string
  slug: string
  duration_minutes: number
  description?: string | null
  location?: string | null
  color?: string | null
  active: boolean
}

interface EventTypeCardProps {
  eventType: EventTypeRow
  /** Optional bookings-this-week count for the footer pill. */
  bookingsThisWeek?: number
}

/**
 * Bookable event-type card — colored top accent bar (DESIGN.md booking
 * card style: 4-px left accent colored by status), 3xl extrabold duration,
 * editorial slug + share row, frosted-pill status indicator.
 *
 * Translated from project-management's KpiCard.tsx (top-accent + KPI
 * pattern) crossed with crm/StatsRow visual treatment.
 */
export function EventTypeCard({ eventType, bookingsThisWeek }: EventTypeCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const accent = eventType.color || BRAND_COLOR

  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        cm.flex({ direction: 'col' }),
        'gap-5 bg-surface-container-lowest rounded-2xl shadow-sm border-t-4 hover:-translate-y-0.5 transition-transform',
      )}
      style={{ borderTopColor: accent }}
    >
      <div className={cm.flex({ justify: 'between', align: 'start' })}>
        <div
          className={cm.cn(
            cm.sp('p', 3),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'shadow-sm',
          )}
          style={{
            backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
            color: accent,
          }}
        >
          <span
            className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            event
          </span>
        </div>
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.roundedFull,
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest',
            eventType.active
              ? 'bg-success-container text-on-success-container'
              : 'bg-surface-container text-on-surface-variant',
          )}
        >
          {eventType.active
            ? t('status.active', {}, { defaultValue: 'Active' })
            : t('status.paused', {}, { defaultValue: 'Paused' })}
        </span>
      </div>

      <div className={cm.stack(2)}>
        <h3 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
          {eventType.name}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant line-clamp-2')}>
          {eventType.description ||
            t(
              'eventTypeCard.noDescription',
              {},
              { defaultValue: 'A clean meeting slot — share the link to start booking.' },
            )}
        </p>
      </div>

      <div className={cm.flex({ align: 'end', justify: 'between' })}>
        <div>
          <p
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.duration', {}, { defaultValue: 'Duration' })}
          </p>
          <p className={cm.cn(cm.textSize('3xl'), 'font-extrabold text-on-surface tabular-nums')}>
            {t(
              'common.minutesMin',
              { minutes: eventType.duration_minutes },
              { defaultValue: '{{minutes}} min' },
            )}
          </p>
        </div>
        {typeof bookingsThisWeek === 'number' ? (
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant',
            )}
          >
            {t(
              'eventTypeCard.bookingsThisWeek',
              { count: bookingsThisWeek },
              { defaultValue: '{{count}} this week' },
            )}
          </p>
        ) : null}
      </div>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('pt', 4),
          'border-t border-outline-variant/40',
        )}
      >
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            'font-mono text-on-surface-variant truncate',
          )}
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            link
          </span>
          /book/{eventType.slug}
        </span>
        <Link
          to={`/event-types/${eventType.id}`}
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'text-primary hover:underline',
          )}
        >
          {t('eventTypeCard.editLink', {}, { defaultValue: 'Edit →' })}
        </Link>
      </div>
    </div>
  )
}

export default EventTypeCard
