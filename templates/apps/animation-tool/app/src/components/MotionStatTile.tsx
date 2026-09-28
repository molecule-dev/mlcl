/**
 * Motion stat tile — KPI-style card with mono-uppercase label, large numeric
 * value, optional delta pill and inline sparkline. Used on Dashboard and
 * Settings (storage usage).
 *
 * Pattern source: ai-agent-playground/MetricCard + personal-finance KPI tile.
 */
import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface MotionStatTileProps {
  label: string
  value: string
  /** Optional unit suffix (px, ms, MB). */
  unit?: string
  /** Optional delta pill ("+12%", "-2"). */
  delta?: string
  /** "up" colors with primary, "down" with secondary, "neutral" stays muted. */
  deltaTone?: 'up' | 'down' | 'neutral'
  /** Optional inline icon glyph. */
  icon?: string
  /** Optional sparkline data; values 0–100. */
  spark?: number[]
  /** Optional accent border color — e.g. brand primary/secondary. */
  accent?: 'primary' | 'secondary' | 'accent' | 'warning'
  children?: ReactNode
}

const ACCENT_VAR: Record<NonNullable<MotionStatTileProps['accent']>, string> = {
  primary: 'var(--anim-primary)',
  secondary: 'var(--anim-secondary)',
  accent: 'var(--anim-accent)',
  warning: 'var(--mol-color-warning)',
}

const DELTA_COLOR: Record<NonNullable<MotionStatTileProps['deltaTone']>, string> = {
  up: 'var(--anim-primary)',
  down: 'var(--anim-secondary)',
  neutral: 'var(--anim-text-secondary)',
}

export function MotionStatTile({
  label,
  value,
  unit,
  delta,
  deltaTone = 'neutral',
  icon,
  spark,
  accent = 'primary',
  children,
}: MotionStatTileProps) {
  const cm = getClassMap()

  return (
    <article
      className={cm.cn(
        cm.sp('p', 5),
        cm.accentCard({ tone: 'custom' }),
        'rounded-xl border hover:-translate-y-0.5 transition-transform',
      )}
      style={{
        backgroundColor: 'var(--anim-surface)',
        borderColor: 'var(--anim-border)',
        ['--mol-accent' as string]: ACCENT_VAR[accent],
      }}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
        <span className={cm.cn(cm.accentCardLabel({ tone: 'custom' }), 'font-mono')}>{label}</span>
        {icon && (
          <span
            className={cm.cn('material-symbols-outlined text-[18px]')}
            style={{ color: 'var(--anim-primary)' }}
          >
            {icon}
          </span>
        )}
      </div>
      <div className={cm.cn(cm.flex({ align: 'baseline', gap: 2 }), cm.sp('mt', 2))}>
        <span
          className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'font-mono tabular-nums')}
          style={{ color: 'var(--anim-text)' }}
        >
          {value}
        </span>
        {unit && (
          <span
            className={cm.cn(cm.textSize('xs'), 'font-mono')}
            style={{ color: 'var(--anim-text-muted)' }}
          >
            {unit}
          </span>
        )}
        {delta && (
          <span
            className={cm.cn(cm.textSize('xs'), 'font-mono ml-auto')}
            style={{ color: DELTA_COLOR[deltaTone] }}
          >
            {delta}
          </span>
        )}
      </div>
      {spark && spark.length > 1 && (
        <svg
          viewBox="0 0 100 24"
          className={cm.cn('mt-3 w-full h-6')}
          preserveAspectRatio="none"
          role="img"
          aria-hidden
        >
          <defs>
            <linearGradient id={`spark-${label.replace(/\s+/g, '-')}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--anim-primary)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--anim-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke="var(--anim-primary)"
            strokeWidth="1.5"
            points={spark
              .map(
                (v, i) =>
                  `${(i / (spark.length - 1)) * 100},${24 - (Math.max(0, Math.min(100, v)) / 100) * 22}`,
              )
              .join(' ')}
          />
          <polygon
            fill={`url(#spark-${label.replace(/\s+/g, '-')})`}
            points={`0,24 ${spark
              .map(
                (v, i) =>
                  `${(i / (spark.length - 1)) * 100},${24 - (Math.max(0, Math.min(100, v)) / 100) * 22}`,
              )
              .join(' ')} 100,24`}
          />
        </svg>
      )}
      {children}
    </article>
  )
}

export default MotionStatTile
