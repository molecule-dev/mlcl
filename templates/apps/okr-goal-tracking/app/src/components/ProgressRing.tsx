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
    <div className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), 'shrink-0', className)}>
      {/* Ring + centered percent live in a fixed size×size box; the label
          renders BELOW the box, never inside it — an in-ring label wraps
          against the arc's chord and collides with the stroke on small
          screens (fleet-qa 2026-09-22: dashboard/team heroes at 390px). */}
      <div className="relative" style={{ width: size, height: size }}>
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
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            'absolute inset-0',
          )}
        >
          {/* Number inherits currentColor: white on hero gradients (callers
              pass className="text-white"), the page ink on plain cards. */}
          <span
            className={cm.cn(cm.fontWeight('bold'), 'tabular-nums tracking-tight')}
            style={{ fontSize: size * 0.28 }}
          >
            {Math.round(safe)}
            {/* Inherit + fade, not a themed token: hero rings render on dark
                gradients where on-surface-variant would be near-invisible. */}
            <span className={cm.cn('opacity-60 text-[0.5em] ml-0.5')}>%</span>
          </span>
        </div>
      </div>
      {label && (
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            // Inherits the ring's currentColor (white on hero gradients, ink
            // on plain cards) — a themed variant token fails on one of those.
            'opacity-80 text-[10px] uppercase tracking-widest mt-1.5 text-center leading-tight max-w-full',
          )}
        >
          {label}
        </span>
      )}
    </div>
  )
}

export default ProgressRing
