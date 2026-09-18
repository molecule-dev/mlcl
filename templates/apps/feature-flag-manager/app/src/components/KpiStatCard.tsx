import { getClassMap } from '@molecule/app-ui'

/**
 * Dashboard KPI / stat card — uppercase 10px tracking-widest eyebrow,
 * large mono-extrabold value, optional change pill, optional inline
 * sparkline placeholder, coloured `border-l-4` accent, hover lift.
 *
 * Translated from ci-cd-dashboard's MetricStatCard (same shape) and
 * personal-finance's DashboardAccountOverview triad. Recoloured to
 * Pennant's flag-on / rollout-partial / flag-killed / accent palette.
 */

export type KpiTone = 'flag-on' | 'rollout-partial' | 'flag-killed' | 'accent' | 'stale' | 'neutral'

const TONE: Record<
  KpiTone,
  { accent: string; pillBg: string; pillText: string; iconBg: string; iconText: string }
> = {
  'flag-on': {
    accent: 'var(--color-flag-on)',
    pillBg: 'var(--color-emerald-chip-bg)',
    pillText: 'var(--color-emerald-chip-text)',
    iconBg: 'var(--color-env-filter-active-bg)',
    iconText: 'var(--color-emerald-chip-text)',
  },
  'rollout-partial': {
    accent: 'var(--color-rollout-partial)',
    pillBg: 'color-mix(in srgb, var(--color-rollout-partial) 15%, transparent)',
    pillText: 'var(--color-rollout-partial)',
    iconBg: 'color-mix(in srgb, var(--color-rollout-partial) 18%, transparent)',
    iconText: 'var(--color-rollout-partial)',
  },
  'flag-killed': {
    accent: 'var(--color-flag-killed)',
    pillBg: 'var(--color-error-chip-bg)',
    pillText: 'var(--color-error-chip-text)',
    iconBg: 'var(--color-error-chip-bg)',
    iconText: 'var(--color-error-chip-text)',
  },
  accent: {
    accent: 'var(--color-accent)',
    pillBg: 'var(--color-accent-chip-bg)',
    pillText: 'var(--color-accent-chip-text)',
    iconBg: 'var(--color-accent-chip-bg)',
    iconText: 'var(--color-accent-chip-text)',
  },
  stale: {
    accent: 'var(--color-stale-flag)',
    pillBg: 'color-mix(in srgb, var(--color-stale-flag) 15%, transparent)',
    pillText: 'var(--color-stale-flag)',
    iconBg: 'color-mix(in srgb, var(--color-stale-flag) 18%, transparent)',
    iconText: 'var(--color-stale-flag)',
  },
  neutral: {
    accent: 'var(--color-flag-off)',
    pillBg: 'color-mix(in srgb, var(--color-flag-off) 15%, transparent)',
    pillText: 'var(--color-on-surface-variant, var(--color-text-secondary))',
    iconBg: 'color-mix(in srgb, var(--color-flag-off) 15%, transparent)',
    iconText: 'var(--color-on-surface-variant, var(--color-text-secondary))',
  },
}

interface KpiStatCardProps {
  eyebrow: string
  value: string
  unit?: string
  caption?: string
  /** Frosted-glass change pill (e.g. "+12%"). */
  changeLabel?: string
  changeTone?: KpiTone
  tone?: KpiTone
  /** Material Symbols name to render in the eyebrow row. */
  icon?: string
}

export function KpiStatCard({
  eyebrow,
  value,
  unit,
  caption,
  changeLabel,
  changeTone,
  tone = 'flag-on',
  icon,
}: KpiStatCardProps) {
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
      data-mol-id="kpi-stat-card"
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
            className={cm.cn('inline-flex items-center justify-center rounded-md p-1.5')}
            style={{ backgroundColor: palette.iconBg, color: palette.iconText }}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>{icon}</span>
          </span>
        ) : null}
      </div>

      <div className={cm.cn('mt-3 flex items-baseline gap-1.5')}>
        <span
          className={cm.cn('font-mono text-4xl font-extrabold tracking-tighter text-on-surface')}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </span>
        {unit ? (
          <span className={cm.cn('font-mono text-sm font-medium text-on-surface-variant')}>
            {unit}
          </span>
        ) : null}
      </div>

      <div className={cm.cn('mt-3 flex flex-wrap items-center gap-2 min-h-[20px]')}>
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
