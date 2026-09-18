import { getClassMap } from '@molecule/app-ui'

/**
 * Letter + percentage grade pill — semantic coloured background per
 * letter (A green, B blue, C amber, D orange, F red) per DESIGN.md
 * Grade Badge spec.
 *
 * Bespoke to Chalk's grading vocabulary. No direct sibling component;
 * the visual treatment (rounded-full pill with split-color label) is a
 * specialisation of the §13.5 status-pill pattern.
 */
export type GradeLetter = 'A' | 'B' | 'C' | 'D' | 'F'

export interface GradeBadgeProps {
  letter: GradeLetter
  percentage?: number | string
  size?: 'sm' | 'md'
}

const GRADE_TONE: Record<GradeLetter, string> = {
  A: 'bg-success-light text-success',
  B: 'bg-blue-100 text-blue-700',
  C: 'bg-warning-light text-warning',
  D: 'bg-orange-100 text-orange-700',
  F: 'bg-rose-100 text-error',
}

export function GradeBadge({ letter, percentage, size = 'md' }: GradeBadgeProps) {
  const cm = getClassMap()
  const padding = size === 'sm' ? cm.sp('px', 2) : cm.sp('px', 3)
  const text = size === 'sm' ? cm.textSize('xs') : cm.textSize('sm')
  const tone = GRADE_TONE[letter]

  return (
    <span
      data-mol-id="grade-badge"
      data-grade-letter={letter}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        padding,
        cm.sp('py', 1),
        cm.roundedFull,
        text,
        'font-bold inline-flex tabular-nums',
        tone,
      )}
    >
      <span className={cm.cn('font-extrabold')}>{letter}</span>
      {percentage !== undefined && (
        <span className={cm.cn('font-medium opacity-80')}>
          {typeof percentage === 'number' ? `${percentage}%` : percentage}
        </span>
      )}
    </span>
  )
}

export default GradeBadge
