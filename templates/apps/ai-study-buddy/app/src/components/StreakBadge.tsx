import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface StreakBadgeProps {
  /** Current streak count in days. */
  days: number
  /** Whether the streak is active (today logged) or broken. */
  active?: boolean
  /** Optional `'active' | 'broken'` shorthand mirrored from older call sites. */
  status?: 'active' | 'broken'
  /** Extra wrapper classes. */
  className?: string
}

/**
 * Pill badge with a flame icon and tabular-nums day count. Used in the
 * dashboard topbar and the Profile/Progress hero. Active variant gets a
 * warm-orange tint; broken variant uses muted surface.
 */
export function StreakBadge({ days, active, status, className }: StreakBadgeProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isActive = active ?? status !== 'broken'
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.sp('px', 4),
        cm.sp('py', 2),
        cm.roundedFull,
        isActive
          ? 'border border-secondary/20 bg-secondary-fixed-dim/20'
          : 'border border-outline-variant/30 bg-surface-container',
        className,
      )}
      data-mol-id="streak-badge"
    >
      <span
        className={cm.cn('material-symbols-outlined', isActive ? 'text-secondary' : 'text-outline')}
        style={{ fontVariationSettings: "'FILL' 1" }}
        aria-hidden="true"
      >
        local_fire_department
      </span>
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          cm.textSize('sm'),
          'tabular-nums',
          isActive ? 'text-on-secondary-container text-glow-secondary' : 'text-on-surface-variant',
        )}
      >
        {t('streakBadge.days', { count: days }, { defaultValue: '{{count}} day streak' })}
      </span>
    </div>
  )
}
