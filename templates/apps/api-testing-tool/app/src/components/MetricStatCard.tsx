import { getClassMap } from '@molecule/app-ui'

import { LatencySparkline } from './LatencySparkline.js'

/**
 * KPI / response-stat card — uppercase 10px tracking-widest eyebrow,
 * large mono-extrabold value, optional change pill, optional sparkline,
 * coloured `border-l-4` accent, hover lift. Used on Workspace stats,
 * Monitors, TestRunner, History summary.
 *
 * Translated from ci-cd-dashboard's MetricStatCard with the latency
 * gradient palette mapped to Pylon's response-time semantics from
 * DESIGN.md (fast/normal/slow + 2xx/5xx tints).
 */

export type MetricTone = 'primary' | 'info' | 'success' | 'warning' | 'error' | 'neutral' | 'accent'

const TONE: Record<
  MetricTone,
  { accent: string; sparkStroke: string; pillBg: string; pillText: string }
> = {
  primary: {
    accent: 'var(--color-primary)',
    sparkStroke: 'var(--color-primary)',
    pillBg: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
    pillText: 'var(--color-primary)',
  },
  info: {
    accent: 'var(--color-info)',
    sparkStroke: 'var(--color-info)',
    pillBg: 'color-mix(in srgb, var(--color-info) 15%, transparent)',
    pillText: 'var(--color-info)',
  },
  success: {
    accent: 'var(--color-success)',
    sparkStroke: 'var(--color-success)',
    pillBg: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
    pillText: 'var(--color-success)',
  },
  warning: {
    accent: 'var(--color-warning)',
    sparkStroke: 'var(--color-warning)',
    pillBg: 'color-mix(in srgb, var(--color-warning) 15%, transparent)',
    pillText: 'var(--color-warning)',
  },
  error: {
    accent: 'var(--color-error)',
    sparkStroke: 'var(--color-error)',
    pillBg: 'color-mix(in srgb, var(--color-error) 15%, transparent)',
    pillText: 'var(--color-error)',
  },
  neutral: {
    accent: 'var(--color-text-muted)',
    sparkStroke: 'var(--color-text-muted)',
    pillBg: 'color-mix(in srgb, var(--color-text-muted) 15%, transparent)',
    pillText: 'var(--color-text-muted)',
  },
  accent: {
    accent: 'var(--color-method-patch)',
    sparkStroke: 'var(--color-method-patch)',
    pillBg: 'color-mix(in srgb, var(--color-method-patch) 18%, transparent)',
    pillText: 'var(--color-method-patch)',
  },
}

interface MetricStatCardProps {
  eyebrow: string
  value: string
  unit?: string
  caption?: string
  changeLabel?: string
  changeTone?: MetricTone
  tone?: MetricTone
  /** Material Symbols name to render in the eyebrow row. */
  icon?: string
  sparkline?: number[]
}

export function MetricStatCard({
  eyebrow,
  value,
  unit,
  caption,
  changeLabel,
  changeTone,
  tone = 'primary',
  icon,
  sparkline,
}: MetricStatCardProps) {
  const cm = getClassMap()
  const palette = TONE[tone]
  const change = changeLabel ? TONE[changeTone ?? tone] : null

  return (
    <div
      className={cm.cn(
        'group relative overflow-hidden rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl',
      )}
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-surface-elevated) 60%, transparent)',
        border: '1px solid var(--color-border)',
        borderLeft: `4px solid ${palette.accent}`,
      }}
      data-mol-id="metric-stat-card"
    >
      <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
        <span
          className={cm.cn('text-[10px] font-black uppercase tracking-widest')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {eyebrow}
        </span>
        {icon ? (
          <span
            className={cm.cn('material-symbols-outlined text-base')}
            aria-hidden="true"
            style={{ color: palette.accent }}
          >
            {icon}
          </span>
        ) : null}
      </div>

      <div className={cm.cn('mt-2 flex items-baseline gap-1.5')}>
        <span
          className={cm.cn('font-mono text-3xl font-extrabold tracking-tighter')}
          style={{ color: 'var(--color-text-primary)' }}
        >
          {value}
        </span>
        {unit ? (
          <span
            className={cm.cn('font-mono text-sm font-medium')}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {unit}
          </span>
        ) : null}
      </div>

      <div className={cm.cn('mt-3 flex items-end justify-between gap-3 min-h-[36px]')}>
        <div className={cm.cn('flex flex-col gap-1')}>
          {change ? (
            <span
              className={cm.cn(
                'inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider',
              )}
              style={{ backgroundColor: change.pillBg, color: change.pillText }}
            >
              {changeLabel}
            </span>
          ) : null}
          {caption ? (
            <span className={cm.cn('text-xs')} style={{ color: 'var(--color-text-secondary)' }}>
              {caption}
            </span>
          ) : null}
        </div>
        {sparkline && sparkline.length > 1 ? (
          <LatencySparkline
            values={sparkline}
            width={92}
            height={28}
            stroke={palette.sparkStroke}
            ariaLabel={eyebrow}
          />
        ) : null}
      </div>
    </div>
  )
}
