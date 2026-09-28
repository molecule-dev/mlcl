import { getClassMap } from '@molecule/app-ui'

import { LogVolumeSparkline } from './LogVolumeSparkline.js'

/**
 * KPI / observability stat card — uppercase 10px tracking-widest eyebrow,
 * mono-extrabold value, optional change pill, optional inline sparkline,
 * coloured inset accent bar (`cm.accentCard`), hover lift.
 *
 * Translated from ci-cd-dashboard's MetricStatCard (in turn translated
 * from personal-finance's DashboardAccountOverview triad). Recoloured to
 * the Signalink severity tones — error/warn/info map onto severity colors
 * directly, primary stays cyan to match `--color-primary`.
 */

export type MetricTone = 'primary' | 'info' | 'success' | 'warning' | 'error' | 'accent' | 'neutral'

const TONE: Record<
  MetricTone,
  { accent: string; sparkStroke: string; pillBg: string; pillText: string }
> = {
  primary: {
    accent: 'var(--color-primary)',
    sparkStroke: 'var(--color-primary)',
    pillBg: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
    pillText: 'var(--color-primary-hover)',
  },
  info: {
    accent: 'var(--color-severity-info)',
    sparkStroke: 'var(--color-severity-info)',
    pillBg: 'color-mix(in srgb, var(--color-severity-info) 15%, transparent)',
    pillText: 'var(--color-severity-info-light)',
  },
  success: {
    accent: 'var(--color-success)',
    sparkStroke: 'var(--color-success)',
    pillBg: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
    pillText: 'var(--color-success-light)',
  },
  warning: {
    accent: 'var(--color-severity-warn)',
    sparkStroke: 'var(--color-severity-warn)',
    pillBg: 'color-mix(in srgb, var(--color-severity-warn) 15%, transparent)',
    pillText: 'var(--color-severity-warn-light)',
  },
  error: {
    accent: 'var(--color-severity-fatal)',
    sparkStroke: 'var(--color-severity-fatal-light)',
    pillBg: 'color-mix(in srgb, var(--color-severity-fatal) 15%, transparent)',
    pillText: 'var(--color-severity-fatal-light)',
  },
  accent: {
    accent: 'var(--color-accent)',
    sparkStroke: 'var(--color-accent)',
    pillBg: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
    pillText: 'var(--color-accent-hover)',
  },
  neutral: {
    accent: 'var(--color-severity-debug)',
    sparkStroke: 'var(--color-severity-debug)',
    pillBg: 'color-mix(in srgb, var(--color-severity-debug) 15%, transparent)',
    pillText: 'var(--color-severity-debug-light)',
  },
}

interface MetricStatCardProps {
  eyebrow: string
  value: string
  unit?: string
  /** Optional small caption under the value (e.g. "vs last 24h"). */
  caption?: string
  /** Small frosted-glass change pill (e.g. "+12%"). */
  changeLabel?: string
  changeTone?: MetricTone
  tone?: MetricTone
  /** Material Symbols name to render in the eyebrow row. */
  icon?: string
  /** Optional sparkline data to render at the bottom right. */
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
        cm.accentCard({ tone: 'custom' }),
        'group overflow-hidden rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl',
      )}
      style={{
        backgroundColor: 'var(--color-surface-container)',
        border: '1px solid var(--color-border)',
        ['--mol-accent' as string]: palette.accent,
      }}
      data-mol-id="metric-stat-card"
    >
      <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
        <span className={cm.accentCardLabel({ tone: 'custom' })}>{eyebrow}</span>
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
          className={cm.cn('font-mono text-3xl font-extrabold tracking-tighter text-on-surface')}
        >
          {value}
        </span>
        {unit ? (
          <span className={cm.cn('font-mono text-sm font-medium text-on-surface-variant')}>
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
            <span className={cm.cn('text-xs text-on-surface-variant')}>{caption}</span>
          ) : null}
        </div>
        {sparkline && sparkline.length > 1 ? (
          <LogVolumeSparkline
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
