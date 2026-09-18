import { getClassMap } from '@molecule/app-ui'

/**
 * Animated SVG progress ring — renders a circular track + fill arc with percent
 * label centered. Embark uses two sizes: 80px (large, dashboard hero) and 48px
 * (compact, nav badges).
 *
 * Translated from personal-finance/NetWorthCard.tsx sparkline pattern + the
 * Embark DESIGN.md ProgressRing spec.
 */

export interface ProgressRingProps {
  /** 0–100 percentage. */
  value: number
  /** Diameter in pixels. Defaults to 80 (large). */
  size?: number
  /** Stroke width in pixels. Defaults to 6. */
  stroke?: number
  /** Optional override for the fill color. Defaults to primary (or success when 100). */
  color?: string
  /** Optional label below the percent (e.g. "complete"). */
  label?: string
  /** Whether to render the percentage text in the center. Defaults to true. */
  showText?: boolean
}

export function ProgressRing({
  value,
  size = 80,
  stroke = 6,
  color,
  label,
  showText = true,
}: ProgressRingProps) {
  const cm = getClassMap()
  const safe = Math.max(0, Math.min(100, value))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - safe / 100)
  const fill = color ?? (safe >= 100 ? 'var(--embark-status-complete)' : 'var(--mol-color-primary)')

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col', align: 'center', justify: 'center' }))}
      style={{ width: size, height: size, position: 'relative' }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--embark-progress-track, #e2e8f0)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={fill}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
        />
      </svg>
      {showText && (
        <div
          className={cm.cn(cm.flex({ direction: 'col', align: 'center', justify: 'center' }))}
          style={{ position: 'absolute', inset: 0 }}
        >
          <span
            className={cm.fontWeight('bold')}
            style={{
              fontSize: size >= 64 ? '20px' : '12px',
              color: fill,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {Math.round(safe)}%
          </span>
          {label && size >= 64 && (
            <span className="text-[9px] uppercase tracking-[0.12em] text-on-surface-variant">
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
