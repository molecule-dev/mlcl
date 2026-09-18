import { getClassMap } from '@molecule/app-ui'

interface StreakCardProps {
  /** Number of consecutive days the user has logged. */
  days: number
  /** Translated headline ("14-day streak!"). */
  headline: string
  /** Translated encouragement subtitle. */
  subtitle: string
}

/**
 * Decorative streak counter for the right-rail or dashboard.
 *
 * Warm orange gradient (DESIGN.md "Streak" recipe) with a flame symbol in a
 * white pill — designed to feel like a friendly nudge, not a guilt trip.
 */
export function StreakCard({ days, headline, subtitle }: StreakCardProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('p', 5),
        'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/30 rounded-2xl border border-orange-200/50 shadow-sm',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'w-12 h-12 bg-surface rounded-full shadow-sm shrink-0',
        )}
      >
        <span
          aria-hidden="true"
          className={cm.cn('material-symbols-outlined text-2xl text-accent')}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          local_fire_department
        </span>
      </div>
      <div>
        <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>{headline}</p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant mt-0.5')}>{subtitle}</p>
        <p className={cm.cn('sr-only')}>{days}</p>
      </div>
    </div>
  )
}
