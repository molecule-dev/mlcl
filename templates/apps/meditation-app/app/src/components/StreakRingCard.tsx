import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface StreakRingCardProps {
  /** Number of consecutive days the user meditated. */
  days: number
  /** Total minutes meditated this week. */
  minutesThisWeek: number
  /** Goal minutes for the week (renders ring fill). */
  weeklyGoalMinutes: number
  /** Translated streak headline ("12 day streak"). */
  headline: string
  /** Translated subline ("Keep your stillness going"). */
  subline: string
}

/**
 * Brand streak card — saffron ring SVG with the streak count centered,
 * weekly minutes goal pill below.
 *
 * Translated from calorie-counter's CalorieRingCard.tsx — same animated SVG
 * ring anatomy retuned to Stillpoint's saffron-on-cream palette.
 */
export function StreakRingCard({
  days,
  minutesThisWeek,
  weeklyGoalMinutes,
  headline,
  subline,
}: StreakRingCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const ratio = weeklyGoalMinutes > 0 ? Math.min(1, minutesThisWeek / weeklyGoalMinutes) : 0
  const circumference = 2 * Math.PI * 40
  const offset = circumference * (1 - ratio)

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 8),
        'bg-surface rounded-2xl shadow-sm relative min-h-[320px] border border-outline/30 overflow-hidden',
      )}
    >
      <div
        className={cm.cn(
          'absolute inset-0 bg-gradient-to-br from-accent-container/40 via-transparent to-transparent pointer-events-none',
        )}
      />
      <div className={cm.cn('relative')} style={{ width: 220, height: 220 }}>
        <svg className={cm.cn('w-full h-full -rotate-90')} viewBox="0 0 100 100" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            fill="transparent"
            r="40"
            strokeWidth="8"
            className={cm.cn('text-accent-container stroke-current')}
          />
          <circle
            cx="50"
            cy="50"
            fill="transparent"
            r="40"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            strokeWidth="8"
            className={cm.cn(
              'text-accent stroke-current transition-[stroke-dashoffset] duration-700 ease-out',
            )}
          />
        </svg>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            'absolute inset-0 text-center',
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-2xl text-accent')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            local_fire_department
          </span>
          <span
            className={cm.cn(
              'text-5xl font-extrabold text-on-surface tabular-nums leading-none mt-1',
            )}
          >
            {days}
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mt', 2),
              'uppercase tracking-widest text-on-surface-variant font-bold',
            )}
          >
            {headline}
          </span>
        </div>
      </div>
      <div className={cm.cn('relative z-10 mt-6 text-center')}>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface font-semibold')}>
          {minutesThisWeek}
          <span className={cm.cn('text-on-surface-variant font-normal')}>
            {' '}
            {t(
              'streakRingCard.ofWeeklyGoal',
              { goal: weeklyGoalMinutes },
              { defaultValue: '/ {{goal}} min this week' },
            )}
          </span>
        </p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant mt-1')}>{subline}</p>
      </div>
    </div>
  )
}
