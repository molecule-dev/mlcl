import { getClassMap } from '@molecule/app-ui'

/**
 * KPI / SRE stat card — uppercase tracking-widest eyebrow, large mono
 * extrabold value, optional caption + change pill, coloured `border-l-4`
 * accent, hover lift.
 *
 * Translated from ci-cd-dashboard's MetricStatCard treatment, recoloured
 * to status-page's status-semantic chain (operational emerald / degraded
 * amber / partial orange / major red / maintenance indigo).
 */

export type MetricTone =
  'operational' | 'degraded' | 'partial' | 'major' | 'maintenance' | 'neutral'

const TONE: Record<
  MetricTone,
  { accent: string; pillBg: string; pillText: string; iconColor: string }
> = {
  operational: {
    accent: '#10b981',
    pillBg: 'rgba(16, 185, 129, 0.18)',
    pillText: '#6ee7b7',
    iconColor: '#10b981',
  },
  degraded: {
    accent: '#f59e0b',
    pillBg: 'rgba(245, 158, 11, 0.18)',
    pillText: '#fcd34d',
    iconColor: '#f59e0b',
  },
  partial: {
    accent: '#f97316',
    pillBg: 'rgba(249, 115, 22, 0.18)',
    pillText: '#fdba74',
    iconColor: '#f97316',
  },
  major: {
    accent: '#ef4444',
    pillBg: 'rgba(239, 68, 68, 0.18)',
    pillText: '#fca5a5',
    iconColor: '#ef4444',
  },
  maintenance: {
    accent: '#6366f1',
    pillBg: 'rgba(99, 102, 241, 0.18)',
    pillText: '#a5b4fc',
    iconColor: '#6366f1',
  },
  neutral: {
    accent: '#475569',
    pillBg: 'rgba(148, 163, 184, 0.15)',
    pillText: '#cbd5e1',
    iconColor: '#94a3b8',
  },
}

interface MetricKpiCardProps {
  eyebrow: string
  value: string
  unit?: string
  caption?: string
  changeLabel?: string
  changeTone?: MetricTone
  tone?: MetricTone
  /** Material Symbols icon name. */
  icon?: string
}

export function MetricKpiCard({
  eyebrow,
  value,
  unit,
  caption,
  changeLabel,
  changeTone,
  tone = 'operational',
  icon,
}: MetricKpiCardProps) {
  const cm = getClassMap()
  const palette = TONE[tone]
  const change = changeLabel ? TONE[changeTone ?? tone] : null

  return (
    <div
      className={cm.cn(
        'group relative overflow-hidden rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl',
      )}
      style={{
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid var(--color-border-card)',
        borderLeft: `4px solid ${palette.accent}`,
      }}
      data-mol-id="metric-kpi-card"
    >
      <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
        <span
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {eyebrow}
        </span>
        {icon ? (
          <span
            className={cm.cn('material-symbols-outlined text-base')}
            aria-hidden="true"
            style={{ color: palette.iconColor }}
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

      <div className={cm.cn('mt-3 flex flex-col gap-1 min-h-[36px]')}>
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
    </div>
  )
}
