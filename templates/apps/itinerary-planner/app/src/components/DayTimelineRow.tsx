/**
 * Day-timeline activity row — fixed-width tabular time column on the left
 * (per DESIGN.md "Time display: 600 weight, time color, left-aligned
 * fixed 72px column"), inset category accent bar whose color
 * comes from the activity category, duration pill, and a circular
 * timeline node aligned to the rail. Hover lifts a half-step.
 *
 * Translated from personal-finance's ActivityRow.tsx (accent bar +
 * timestamp + tabular nums) and crm/ActivityFeed.tsx (rail + node +
 * connector treatment) — adapted for trip-planning's day-by-day cadence
 * and the six DESIGN.md category colors (accommodation, food,
 * sightseeing, transport, activity, shopping).
 */

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type ActivityCategory =
  'accommodation' | 'food' | 'sightseeing' | 'transport' | 'activity' | 'shopping'

export interface ActivityItem {
  id: string
  title: string
  category: ActivityCategory
  start_time: string
  duration_minutes: number
  location?: string
  notes?: string
  transport_mode?: 'flight' | 'train' | 'car' | 'walking' | 'bus' | 'ferry'
  confirmation_code?: string
}

const CATEGORY_THEME: Record<
  ActivityCategory,
  { stripe: string; chip: string; chipText: string; icon: string; defaultLabel: string }
> = {
  accommodation: {
    stripe: 'var(--color-cyan-700)',
    chip: 'bg-cyan-100 dark:bg-cyan-900/40',
    chipText: 'text-cyan-800 dark:text-cyan-200',
    icon: 'hotel',
    defaultLabel: 'Stay',
  },
  food: {
    stripe: 'var(--color-orange-600)',
    chip: 'bg-orange-100 dark:bg-orange-900/40',
    chipText: 'text-orange-800 dark:text-orange-200',
    icon: 'restaurant',
    defaultLabel: 'Food & drink',
  },
  sightseeing: {
    stripe: 'var(--color-violet-500)',
    chip: 'bg-violet-100 dark:bg-violet-900/40',
    chipText: 'text-violet-800 dark:text-violet-200',
    icon: 'photo_camera',
    defaultLabel: 'Sightseeing',
  },
  transport: {
    stripe: 'var(--color-border-secondary)',
    chip: 'bg-surface-secondary',
    chipText: 'text-foreground',
    icon: 'directions',
    defaultLabel: 'Transport',
  },
  activity: {
    stripe: 'var(--color-emerald-600)',
    chip: 'bg-success-light',
    chipText: 'text-success',
    icon: 'hiking',
    defaultLabel: 'Activity',
  },
  shopping: {
    stripe: 'var(--color-pink-500)',
    chip: 'bg-pink-100 dark:bg-pink-900/40',
    chipText: 'text-pink-800 dark:text-pink-200',
    icon: 'shopping_bag',
    defaultLabel: 'Shopping',
  },
}

const TRANSPORT_ICONS: Record<NonNullable<ActivityItem['transport_mode']>, string> = {
  flight: 'flight',
  train: 'train',
  car: 'directions_car',
  walking: 'directions_walk',
  bus: 'directions_bus',
  ferry: 'directions_boat',
}

function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function DayTimelineRow({
  activity,
  isLast = false,
}: {
  activity: ActivityItem
  isLast?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const theme = CATEGORY_THEME[activity.category]
  const transportIcon = activity.transport_mode ? TRANSPORT_ICONS[activity.transport_mode] : null

  return (
    <li className={cm.cn('relative', cm.flex({ gap: 'md' }))}>
      <div className={cm.cn('flex-shrink-0 w-16 text-right', cm.sp('pt', 4))}>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-primary tabular-nums')}>
          {activity.start_time}
        </p>
        <p className={cm.cn(cm.textSize('xs'), 'mt-0.5 text-on-surface-variant tabular-nums')}>
          {fmtDuration(activity.duration_minutes)}
        </p>
      </div>

      <div
        className={cm.cn('relative flex-shrink-0', cm.flex({ direction: 'col', align: 'center' }))}
      >
        <span
          className={
            'material-symbols-outlined text-base text-primary z-10 bg-surface rounded-full'
          }
          aria-hidden="true"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {transportIcon ?? theme.icon}
        </span>
        {!isLast ? (
          <span
            aria-hidden="true"
            className={'flex-1 w-0.5 bg-cyan-100 dark:bg-cyan-900/40 mt-1'}
            style={{ minHeight: '2.5rem' }}
          />
        ) : null}
      </div>

      <div
        className={cm.cn(
          cm.sp('p', 4),
          cm.sp('mb', 3),
          cm.accentCard({ tone: 'custom' }),
          'flex-1 bg-surface rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all',
        )}
        style={{ ['--mol-accent' as string]: theme.stripe }}
      >
        <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          <span
            className={cm.cn(
              cm.sp('px', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'py-0.5 uppercase tracking-widest rounded-full',
              theme.chip,
              theme.chipText,
            )}
          >
            {t(
              `dayTimelineRow.category.${activity.category}`,
              {},
              { defaultValue: theme.defaultLabel },
            )}
          </span>
          {activity.confirmation_code ? (
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'tabular-nums text-on-surface-variant',
              )}
            >
              #{activity.confirmation_code}
            </span>
          ) : null}
        </div>
        <h4
          className={cm.cn(
            cm.textSize('base'),
            cm.fontWeight('bold'),
            cm.sp('mt', 2),
            'leading-snug',
          )}
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          {activity.title}
        </h4>
        {activity.location ? (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 1),
              cm.flex({ align: 'center', gap: 'xs' }),
              'text-on-surface-variant',
            )}
          >
            <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
              place
            </span>
            {activity.location}
          </p>
        ) : null}
        {activity.notes ? (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 2),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {activity.notes}
          </p>
        ) : null}
      </div>
    </li>
  )
}
