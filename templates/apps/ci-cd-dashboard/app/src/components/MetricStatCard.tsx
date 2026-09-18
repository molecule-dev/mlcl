import { getClassMap } from '@molecule/app-ui'

import { BuildSparkline } from './BuildSparkline.js'

/**
 * KPI / DORA stat card — uppercase 10px tracking-widest eyebrow, large
 * mono-extrabold value, optional change pill, optional inline sparkline,
 * coloured `border-l-4` accent, hover lift.
 *
 * Translated from personal-finance's DashboardAccountOverview triad
 * (eyebrow + value + delta) and crm's StatsRow accent stripe.
 */

export type MetricTone = 'primary' | 'info' | 'success' | 'warning' | 'error' | 'neutral'

const TONE: Record<
  MetricTone,
  { accent: string; sparkStroke: string; pillBg: string; pillText: string }
> = {
  primary: {
    accent: 'var(--color-pill-success-dot)',
    sparkStroke: 'var(--color-pill-success-dot)',
    pillBg: 'var(--color-pill-success-bg)',
    pillText: 'var(--color-pill-success-text)',
  },
  info: {
    accent: 'var(--color-pill-running-dot)',
    sparkStroke: 'var(--color-pill-running-text)',
    pillBg: 'var(--color-pill-running-bg)',
    pillText: 'var(--color-pill-running-text)',
  },
  success: {
    accent: 'var(--color-pill-success-dot)',
    sparkStroke: 'var(--color-pill-success-dot)',
    pillBg: 'var(--color-pill-success-bg)',
    pillText: 'var(--color-pill-success-text)',
  },
  warning: {
    accent: 'var(--color-pill-degraded-dot)',
    sparkStroke: 'var(--color-pill-degraded-text)',
    pillBg: 'var(--color-pill-degraded-bg)',
    pillText: 'var(--color-pill-degraded-text)',
  },
  error: {
    accent: 'var(--color-pill-failed-dot)',
    sparkStroke: 'var(--color-pill-failed-text)',
    pillBg: 'var(--color-pill-failed-bg)',
    pillText: 'var(--color-pill-failed-text)',
  },
  neutral: {
    accent: 'var(--color-pill-cancelled-dot)',
    sparkStroke: 'var(--color-pill-cancelled-text)',
    pillBg: 'var(--color-pill-cancelled-bg)',
    pillText: 'var(--color-pill-cancelled-text)',
  },
}

interface MetricStatCardProps {
  eyebrow: string
  value: string
  unit?: string
  /** Optional small caption under the value (e.g. "vs last 7 days"). */
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
        'group relative overflow-hidden rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl',
      )}
      style={{
        backgroundColor: 'rgba(30, 34, 53, 0.6)',
        border: '1px solid rgba(30, 41, 59, 0.8)',
        borderLeft: `4px solid ${palette.accent}`,
      }}
      data-mol-id="metric-stat-card"
    >
      <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
        <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          {eyebrow}
        </span>
        {icon ? (
          <span
            className={'material-symbols-outlined text-base'}
            aria-hidden="true"
            style={{ color: palette.accent }}
          >
            {icon}
          </span>
        ) : null}
      </div>

      <div className={cm.cn('mt-2 flex items-baseline gap-1.5')}>
        <span className="font-mono text-3xl font-extrabold tracking-tighter text-on-surface">
          {value}
        </span>
        {unit ? (
          <span className={'font-mono text-sm font-medium text-on-surface-variant'}>{unit}</span>
        ) : null}
      </div>

      <div className={'mt-3 flex items-end justify-between gap-3 min-h-[36px]'}>
        <div className={'flex flex-col gap-1'}>
          {change ? (
            <span
              className={
                'inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider'
              }
              style={{ backgroundColor: change.pillBg, color: change.pillText }}
            >
              {changeLabel}
            </span>
          ) : null}
          {caption ? <span className={'text-xs text-on-surface-variant'}>{caption}</span> : null}
        </div>
        {sparkline && sparkline.length > 1 ? (
          <BuildSparkline
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
