import { getClassMap } from '@molecule/app-ui'

/**
 * KPI dashboard card — DESIGN.md "KPI Dashboard Card" component.
 *
 * 24px padding, sm shadow, hover-lift transition, 2rem metric value with
 * tabular numerals, uppercase tracked-out 10px label, an accent stripe
 * down the leading edge matching the metric's tone, and a tiny inline
 * trend indicator.
 *
 * Translated from property-listing/AgentDashboardKpiCard.tsx, retuned to
 * use the Locus design tokens (semi-transparent leading stripe in the
 * metric tone, tabular metric value, hover-lift instead of just a
 * shadow change).
 */

export type KpiTone = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'overstock'

interface InventoryKpiCardProps {
  label: string
  value: string
  hint?: string
  trend?: { value: string; positive: boolean }
  icon?: string
  tone?: KpiTone
  dataTestId?: string
}

const TONES: Record<KpiTone, { border: string; iconBg: string; iconText: string }> = {
  primary: {
    border: 'var(--color-primary)',
    iconBg: 'color-mix(in srgb, var(--color-primary) 14%, transparent)',
    iconText: 'var(--color-primary)',
  },
  success: {
    border: 'var(--color-stock-in)',
    iconBg: 'var(--color-stock-in-bg)',
    iconText: 'var(--color-stock-in)',
  },
  warning: {
    border: 'var(--color-stock-low)',
    iconBg: 'var(--color-stock-low-bg)',
    iconText: 'var(--color-stock-low)',
  },
  error: {
    border: 'var(--color-stock-out)',
    iconBg: 'var(--color-stock-out-bg)',
    iconText: 'var(--color-stock-out)',
  },
  info: {
    border: 'var(--color-stock-incoming)',
    iconBg: 'var(--color-stock-incoming-bg)',
    iconText: 'var(--color-stock-incoming)',
  },
  overstock: {
    border: 'var(--color-stock-overstock)',
    iconBg: 'var(--color-stock-overstock-bg)',
    iconText: 'var(--color-stock-overstock)',
  },
}

export function InventoryKpiCard({
  label,
  value,
  hint,
  trend,
  icon,
  tone = 'primary',
  dataTestId,
}: InventoryKpiCardProps) {
  const cm = getClassMap()
  const palette = TONES[tone]

  return (
    <article
      data-testid={dataTestId}
      className={cm.cn(
        cm.sp('p', 6),
        cm.flex({ direction: 'col', gap: 'sm' }),
        'rounded-xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all',
        cm.accentCard({ tone: 'custom' }),
      )}
      style={{ ['--mol-accent' as string]: palette.border }}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
        <p
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-[0.2em]',
            cm.accentCardLabel({ tone: 'custom' }),
          )}
        >
          {label}
        </p>
        {icon && (
          <span
            className={cm.cn(
              'inline-flex h-9 w-9',
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-full',
            )}
            style={{ backgroundColor: palette.iconBg, color: palette.iconText }}
          >
            <span className={cm.cn('material-symbols-outlined text-[20px]')} data-icon={icon}>
              {icon}
            </span>
          </span>
        )}
      </div>
      <p
        className={cm.cn(
          'text-[2rem] font-extrabold leading-none text-on-surface tabular-nums tracking-tight',
        )}
      >
        {value}
      </p>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}>
        {hint && <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{hint}</p>}
        {trend && (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'rounded-md px-2 py-0.5 text-xs font-bold tabular-nums',
            )}
            style={{
              backgroundColor: trend.positive
                ? 'var(--color-stock-in-bg)'
                : 'var(--color-stock-out-bg)',
              color: trend.positive ? 'var(--color-stock-in)' : 'var(--color-stock-out)',
            }}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[14px]')}
              data-icon={trend.positive ? 'arrow_upward' : 'arrow_downward'}
            >
              {trend.positive ? 'arrow_upward' : 'arrow_downward'}
            </span>
            {trend.value}
          </span>
        )}
      </div>
    </article>
  )
}

export default InventoryKpiCard
