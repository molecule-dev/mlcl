import { getClassMap } from '@molecule/app-ui'

export type RingStatus = 'on-track' | 'at-risk' | 'behind' | 'not-started' | 'completed'

interface ProgressRingProps {
  /** Progress value 0-100. */
  value: number
  /** Ring diameter in pixels. */
  size?: number
  /** Stroke width in pixels. */
  stroke?: number
  /** Status drives the ring color. */
  status?: RingStatus
  /** Optional label rendered under the percent. */
  label?: string
  /** Additional className for outer wrapper. */
  className?: string
}

const STATUS_COLOR: Record<RingStatus, string> = {
  'on-track': 'var(--color-status-on-track, #16a34a)',
  'at-risk': 'var(--color-status-at-risk, #f59e0b)',
  behind: 'var(--color-status-behind, #dc2626)',
  'not-started': 'var(--color-outline, #94a3b8)',
  completed: 'var(--color-status-completed, #7c3aed)',
}

/**
 * Circular OKR progress ring — large numeric center with tabular-nums,
 * tail-of-ring colored by status. Translated from the personal-finance
 * NetWorthCard sparkline treatment, adapted to a circular shape that
 * matches DESIGN.md's "progress rings prominently displayed" rule.
 */
export function ProgressRing({
  value,
  size = 120,
  stroke = 10,
  status = 'on-track',
  label,
  className,
}: ProgressRingProps) {
  const cm = getClassMap()
  const safe = Math.max(0, Math.min(100, value))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (safe / 100) * circumference
  const color = STATUS_COLOR[status]

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        'relative shrink-0',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-surface-container-high"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 600ms ease' }}
        />
      </svg>
      <div className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), 'relative')}>
        <span
          className={cm.cn(cm.fontWeight('bold'), 'tabular-nums tracking-tight text-on-surface')}
          style={{ fontSize: size * 0.28 }}
        >
          {Math.round(safe)}
          <span className={cm.cn('text-on-surface-variant text-[0.5em] ml-0.5')}>%</span>
        </span>
        {label && (
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant mt-1',
            )}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  )
}

export default ProgressRing
