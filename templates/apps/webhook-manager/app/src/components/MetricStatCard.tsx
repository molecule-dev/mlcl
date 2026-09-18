import { getClassMap } from '@molecule/app-ui'

import { DeliverySparkline } from './DeliverySparkline.js'

/**
 * KPI / delivery-stat card — uppercase 10px tracking-widest eyebrow,
 * large mono-extrabold value, optional change pill, optional
 * sparkline, coloured `border-l-4` accent, hover lift. Used on the
 * Dashboard summary triad, Billing usage cards, EndpointDetail
 * recent-deliveries, AuditLog summary.
 *
 * Translated from api-testing-tool's MetricStatCard with the latency
 * gradient palette mapped to Pylon's webhook-delivery semantics from
 * DESIGN.md (delivered/retrying/failed + 2xx/5xx tints).
 */

export type MetricTone = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'accent'

const TONE: Record<
  MetricTone,
  { accent: string; sparkStroke: string; pillBg: string; pillText: string }
> = {
  primary: {
    accent: 'var(--mol-color-primary)',
    sparkStroke: 'var(--mol-color-primary)',
    pillBg: 'color-mix(in srgb, var(--mol-color-primary) 15%, transparent)',
    pillText: 'var(--mol-color-primary)',
  },
  success: {
    accent: 'var(--mol-color-success)',
    sparkStroke: 'var(--mol-color-success)',
    pillBg: 'color-mix(in srgb, var(--mol-color-success) 15%, transparent)',
    pillText: 'var(--mol-color-success)',
  },
  warning: {
    accent: 'var(--mol-color-warning)',
    sparkStroke: 'var(--mol-color-warning)',
    pillBg: 'color-mix(in srgb, var(--mol-color-warning) 15%, transparent)',
    pillText: 'var(--mol-color-warning)',
  },
  error: {
    accent: 'var(--mol-color-error)',
    sparkStroke: 'var(--mol-color-error)',
    pillBg: 'color-mix(in srgb, var(--mol-color-error) 15%, transparent)',
    pillText: 'var(--mol-color-error)',
  },
  info: {
    accent: 'var(--mol-color-info)',
    sparkStroke: 'var(--mol-color-info)',
    pillBg: 'color-mix(in srgb, var(--mol-color-info) 15%, transparent)',
    pillText: 'var(--mol-color-info)',
  },
  neutral: {
    accent: 'var(--mol-color-text-tertiary)',
    sparkStroke: 'var(--mol-color-text-tertiary)',
    pillBg: 'color-mix(in srgb, var(--mol-color-text-tertiary) 15%, transparent)',
    pillText: 'var(--mol-color-text-secondary)',
  },
  accent: {
    accent: 'var(--mol-color-secondary)',
    sparkStroke: 'var(--mol-color-secondary)',
    pillBg: 'color-mix(in srgb, var(--mol-color-secondary) 18%, transparent)',
    pillText: 'var(--mol-color-secondary)',
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
        backgroundColor: 'var(--mol-color-surface)',
        border: '1px solid var(--mol-color-border)',
        borderLeft: `4px solid ${palette.accent}`,
      }}
      data-mol-id="metric-stat-card"
    >
      <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
        <span
          className={cm.cn('text-[10px] font-black uppercase tracking-widest')}
          style={{ color: 'var(--mol-color-text-secondary)' }}
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
          style={{ color: 'var(--mol-color-text)' }}
        >
          {value}
        </span>
        {unit ? (
          <span
            className={cm.cn('font-mono text-sm font-medium')}
            style={{ color: 'var(--mol-color-text-secondary)' }}
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
            <span className={cm.cn('text-xs')} style={{ color: 'var(--mol-color-text-secondary)' }}>
              {caption}
            </span>
          ) : null}
        </div>
        {sparkline && sparkline.length > 1 ? (
          <DeliverySparkline
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
