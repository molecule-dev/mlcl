import { getClassMap } from '@molecule/app-ui'

import { FrequencySparkline } from './FrequencySparkline.js'

/**
 * Stats counter card — uppercase 10px tracking-widest eyebrow, large
 * mono-extrabold value, optional change pill, optional inline frequency
 * sparkline at bottom-right, coloured inset accent bar, hover lift.
 *
 * Translated from ci-cd-dashboard's MetricStatCard (KPI/DORA stat card)
 * recoloured to error-tracker severity tones (critical/error/warning/info
 * instead of pipeline status). Defaults to a "neutral" emerald ramp so the
 * dashboard reads as one cohesive triad of metrics.
 */

export type StatsTone = 'primary' | 'info' | 'warning' | 'critical' | 'error' | 'neutral' | 'new'

const TONE: Record<StatsTone, { accent: string; spark: string; pillBg: string; pillText: string }> =
  {
    primary: {
      accent: 'var(--color-severity-resolved)',
      spark: 'var(--color-severity-resolved)',
      pillBg: 'var(--color-severity-resolved-light)',
      pillText: 'var(--color-severity-resolved)',
    },
    info: {
      accent: 'var(--color-severity-info)',
      spark: 'var(--color-severity-info)',
      pillBg: 'var(--color-severity-info-light)',
      pillText: 'var(--color-severity-info)',
    },
    warning: {
      accent: 'var(--color-severity-warning)',
      spark: 'var(--color-severity-warning)',
      pillBg: 'var(--color-severity-warning-light)',
      pillText: 'var(--color-severity-warning)',
    },
    critical: {
      accent: 'var(--color-severity-critical)',
      spark: 'var(--color-severity-critical)',
      pillBg: 'var(--color-severity-critical-light)',
      pillText: 'var(--color-severity-critical)',
    },
    error: {
      accent: 'var(--color-severity-error)',
      spark: 'var(--color-severity-error)',
      pillBg: 'var(--color-severity-error-light)',
      pillText: 'var(--color-severity-error)',
    },
    neutral: {
      accent: 'var(--color-severity-muted)',
      spark: 'var(--color-severity-muted)',
      pillBg: 'color-mix(in srgb, var(--color-severity-muted) 15%, transparent)',
      pillText: 'var(--color-text-secondary)',
    },
    new: {
      accent: 'var(--color-severity-new)',
      spark: 'var(--color-severity-new)',
      pillBg: 'var(--color-severity-new-light)',
      pillText: 'var(--color-severity-new)',
    },
  }

interface StatsCounterCardProps {
  eyebrow: string
  value: string
  unit?: string
  /** Optional small caption under the value (e.g. "vs last 7 days"). */
  caption?: string
  /** Small frosted-glass change pill (e.g. "+12%"). */
  changeLabel?: string
  changeTone?: StatsTone
  tone?: StatsTone
  /** Material Symbols name to render in the eyebrow row. */
  icon?: string
  /** Optional sparkline data to render at the bottom right. */
  sparkline?: number[]
  /** Optional explicit href to make the card a link. */
  to?: string
}

export function StatsCounterCard({
  eyebrow,
  value,
  unit,
  caption,
  changeLabel,
  changeTone,
  tone = 'primary',
  icon,
  sparkline,
}: StatsCounterCardProps) {
  const cm = getClassMap()
  const palette = TONE[tone]
  const change = changeLabel ? TONE[changeTone ?? tone] : null

  return (
    <div
      className={cm.cn(
        'group relative overflow-hidden rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl',
        cm.accentCard({ tone: 'custom' }),
      )}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        ['--mol-accent' as string]: palette.accent,
      }}
      data-mol-id="stats-counter-card"
      data-testid="stats-counter-card"
      data-stats-eyebrow={eyebrow}
    >
      <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
        <span
          className={cm.cn(cm.accentCardLabel({ tone: 'custom' }), 'font-black tracking-widest')}
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
          className={cm.cn('font-mono text-3xl font-extrabold tracking-tighter tabular-nums')}
          style={{ color: 'var(--color-text)' }}
          data-testid="stats-counter-value"
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
                'inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider font-mono',
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
          <FrequencySparkline
            values={sparkline}
            width={92}
            height={28}
            color={palette.spark}
            spikeColor={palette.accent}
            mode="bar"
            ariaLabel={eyebrow}
          />
        ) : null}
      </div>
    </div>
  )
}
