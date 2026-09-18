import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface CalorieRingCardProps {
  /** Calories consumed so far today. */
  consumed: number
  /** Daily goal in kcal. */
  goal: number
  /** Optional title (e.g. "Today" or "Wednesday"). Falls back to the consumed/goal headline. */
  title?: string
  /** Subtitle below the value (e.g. "calories remaining"). */
  subtitle?: string
  /** Diameter in CSS units. Default 260. */
  size?: number
}

/**
 * Brand hero — animated SVG calorie ring with center value.
 *
 * Uses the DESIGN.md "Calorie Ring" recipe: 8px stroke, primary fill on
 * teal-50 track, large numeric center value. Auto-clamps so values that
 * exceed the goal show a full red ring instead of overflowing.
 */
export function CalorieRingCard({
  consumed,
  goal,
  title,
  subtitle = 'calories remaining',
  size = 260,
}: CalorieRingCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const remaining = Math.max(0, goal - consumed)
  const ratio = goal > 0 ? Math.min(1, consumed / goal) : 0
  const circumference = 2 * Math.PI * 40
  const offset = circumference * (1 - ratio)
  const strokeColor =
    ratio >= 1 ? 'text-over-goal' : ratio >= 0.85 ? 'text-near-goal' : 'text-primary'

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 8),
        'bg-surface rounded-2xl shadow-sm relative min-h-[320px]',
      )}
    >
      <div className={cm.cn('relative')} style={{ width: size, height: size }}>
        <svg className={cm.cn('w-full h-full -rotate-90')} viewBox="0 0 100 100" aria-hidden="true">
          <circle
            className={cm.cn('text-primary-container stroke-current')}
            cx="50"
            cy="50"
            fill="transparent"
            r="40"
            strokeWidth="8"
          />
          <circle
            className={`${strokeColor} stroke-current transition-[stroke-dashoffset] duration-700 ease-out`}
            cx="50"
            cy="50"
            fill="transparent"
            r="40"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            strokeWidth="8"
          />
        </svg>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            'absolute inset-0 text-center',
          )}
        >
          {title ? (
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mb', 2),
                'uppercase tracking-widest text-on-surface-variant font-bold',
              )}
            >
              {title}
            </span>
          ) : null}
          <span
            className={cm.cn('text-5xl font-extrabold text-on-surface tabular-nums leading-none')}
          >
            {remaining.toLocaleString()}
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 2),
              'font-medium text-on-surface-variant',
            )}
          >
            {subtitle}
          </span>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant/70 mt-1')}>
            {t(
              'nosh.today.ofDailyGoal',
              { goal: goal.toLocaleString() },
              { defaultValue: 'of {{goal}} daily goal' },
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
