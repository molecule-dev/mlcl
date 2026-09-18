import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type PasswordStrength = 'weak' | 'fair' | 'medium' | 'strong'

interface PasswordStrengthMeterProps {
  /** Filled segment count: 1=weak (red), 2=fair (red), 3=medium (amber), 4=strong (emerald). */
  segments: 1 | 2 | 3 | 4
  /** Optional label override; otherwise derived from segments. */
  label?: string
  /** Width preset — 'sm' for table cells, 'md' for cards, 'full' for hero cards. */
  width?: 'sm' | 'md' | 'full'
}

const STRENGTH_BY_SEGMENTS: Record<1 | 2 | 3 | 4, PasswordStrength> = {
  1: 'weak',
  2: 'fair',
  3: 'medium',
  4: 'strong',
}

const COLORS: Record<PasswordStrength, string> = {
  weak: 'bg-red-500',
  fair: 'bg-red-500',
  medium: 'bg-amber-500',
  strong: 'bg-emerald-500',
}

const LABEL_COLORS: Record<PasswordStrength, string> = {
  weak: 'text-error',
  fair: 'text-error',
  medium: 'text-warning',
  strong: 'text-success',
}

/**
 * Sigil's 4-segment password strength meter — emerald for strong,
 * amber for medium, red for weak/fair. Optional inline label.
 *
 * Translated from personal-finance's strength bar treatment used in
 * BudgetCategoryCard / GoalCard, recoloured for security semantics.
 */
export function PasswordStrengthMeter({
  segments,
  label,
  width = 'md',
}: PasswordStrengthMeterProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const strength = STRENGTH_BY_SEGMENTS[segments]
  const fillColor = COLORS[strength]
  const labelColor = LABEL_COLORS[strength]

  const trackWidth = width === 'sm' ? 'w-[80px]' : width === 'md' ? 'w-[140px]' : 'w-full'

  const resolvedLabel =
    label ??
    t(
      `passwordStrengthMeter.${strength}`,
      {},
      {
        defaultValue:
          strength === 'weak'
            ? 'Weak'
            : strength === 'fair'
              ? 'Fair'
              : strength === 'medium'
                ? 'Medium'
                : 'Excellent',
      },
    )

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))} aria-label={resolvedLabel}>
      <div className={cm.cn('flex gap-0.5 h-1.5 rounded-full overflow-hidden', trackWidth)}>
        {[1, 2, 3, 4].map((i) => {
          const isFilled = i <= segments
          return (
            <div
              key={i}
              className={cm.cn(
                'h-full flex-1',
                isFilled ? fillColor : 'bg-surface-container',
                i === 1 && 'rounded-l-full',
                i === 4 && 'rounded-r-full',
              )}
            />
          )
        })}
      </div>
      {(label || width !== 'sm') && (
        <span
          className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), labelColor)}
          aria-hidden="true"
        >
          {resolvedLabel}
        </span>
      )}
    </div>
  )
}

export default PasswordStrengthMeter
