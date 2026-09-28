/**
 * Studio stat tile — KPI-style card with mono-uppercase label, large numeric
 * value, optional delta pill and inline sparkline. Used on Dashboard and
 * Settings (storage usage).
 *
 * Pattern source: animation-tool/MotionStatTile.tsx adapted to the Rushes
 * cinematic palette (violet primary, pink accent).
 */
import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface StudioStatTileProps {
  label: string
  value: string
  /** Optional unit suffix (px, GB, fps). */
  unit?: string
  /** Optional delta pill ("+12%", "-2"). */
  delta?: string
  /** "up" colors with violet, "down" with pink, "neutral" stays muted. */
  deltaTone?: 'up' | 'down' | 'neutral'
  /** Optional inline icon glyph. */
  icon?: string
  /** Optional sparkline data; values 0–100. */
  spark?: number[]
  /** Optional accent bar color. */
  accent?: 'violet' | 'pink' | 'cyan' | 'amber'
  children?: ReactNode
}

/** The accent bar's color (read by `cm.accentCard({ tone: 'custom' })` via `--mol-accent`). */
const ACCENT: Record<NonNullable<StudioStatTileProps['accent']>, string> = {
  violet: 'var(--video-cta-from)',
  pink: 'var(--video-cta-to)',
  cyan: 'var(--mol-color-info)',
  amber: 'var(--mol-color-warning)',
}

const DELTA_TONE: Record<NonNullable<StudioStatTileProps['deltaTone']>, string> = {
  up: 'text-[var(--video-link)]',
  down: 'text-[var(--video-link-hover)]',
  neutral: 'text-[var(--video-text-muted-alt)]',
}

export function StudioStatTile({
  label,
  value,
  unit,
  delta,
  deltaTone = 'neutral',
  icon,
  spark,
  accent = 'violet',
  children,
}: StudioStatTileProps) {
  const cm = getClassMap()

  return (
    <article
      className={cm.cn(
        cm.sp('p', 5),
        cm.accentCard({ tone: 'custom' }),
        'rounded-xl bg-[var(--video-panel-bg)] border border-[var(--video-border-subtle)] hover:-translate-y-0.5 transition-transform',
      )}
      style={{ ['--mol-accent' as string]: ACCENT[accent] }}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
        <span className={cm.cn(cm.accentCardLabel({ tone: 'custom' }), 'font-mono')}>{label}</span>
        {icon && (
          <span className={cm.cn('material-symbols-outlined text-[18px] text-[var(--video-link)]')}>
            {icon}
          </span>
        )}
      </div>
      <div className={cm.cn(cm.flex({ align: 'baseline', gap: 2 }), cm.sp('mt', 2))}>
        <span
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            'font-mono tabular-nums text-[var(--video-text-primary)]',
          )}
        >
          {value}
        </span>
        {unit && (
          <span className={cm.cn(cm.textSize('xs'), 'font-mono text-[var(--video-text-dim)]')}>
            {unit}
          </span>
        )}
        {delta && (
          <span className={cm.cn(cm.textSize('xs'), 'font-mono ml-auto', DELTA_TONE[deltaTone])}>
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
            <linearGradient
              id={`stat-spark-${label.replace(/\s+/g, '-')}`}
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop offset="0%" stopColor="var(--video-cta-from)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--video-cta-from)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke="var(--video-cta-from)"
            strokeWidth="1.5"
            points={spark
              .map(
                (v, i) =>
                  `${(i / (spark.length - 1)) * 100},${24 - (Math.max(0, Math.min(100, v)) / 100) * 22}`,
              )
              .join(' ')}
          />
          <polygon
            fill={`url(#stat-spark-${label.replace(/\s+/g, '-')})`}
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

export default StudioStatTile
