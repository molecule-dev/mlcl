import { getClassMap } from '@molecule/app-ui'

/**
 * KPI dashboard card — DESIGN.md "KPI Stat Card" component.
 *
 * 24px padding, sm shadow, hover-lift transition, 2rem metric value with
 * tabular numerals, uppercase tracked-out 10px label, an accent stripe
 * down the leading edge matching the metric's tone, and a tiny inline
 * trend indicator.
 *
 * Translated from inventory-management/InventoryKpiCard.tsx, retuned to
 * the order-lifecycle palette (pending / picking / packed / shipped /
 * rush) plus inventory tones (in / low / out).
 */

export type KpiTone =
  | 'primary'
  | 'pending'
  | 'picking'
  | 'packed'
  | 'shipped'
  | 'rush'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'

interface FulfillmentKpiCardProps {
  label: string
  value: string
  hint?: string
  trend?: { value: string; positive: boolean }
  icon?: string
  tone?: KpiTone
}

const TONES: Record<KpiTone, { border: string; iconBg: string; iconText: string }> = {
  primary: {
    border: 'var(--color-primary)',
    iconBg: 'color-mix(in srgb, var(--color-primary) 14%, transparent)',
    iconText: 'var(--color-primary)',
  },
  pending: {
    border: 'var(--color-order-pending)',
    iconBg: 'var(--color-order-pending-bg)',
    iconText: 'var(--color-order-pending)',
  },
  picking: {
    border: 'var(--color-order-picking)',
    iconBg: 'var(--color-order-picking-bg)',
    iconText: 'var(--color-order-picking)',
  },
  packed: {
    border: 'var(--color-order-packed)',
    iconBg: 'var(--color-order-packed-bg)',
    iconText: 'var(--color-order-packed)',
  },
  shipped: {
    border: 'var(--color-order-shipped)',
    iconBg: 'var(--color-order-shipped-bg)',
    iconText: 'var(--color-order-shipped)',
  },
  rush: {
    border: 'var(--color-priority-rush)',
    iconBg: 'var(--color-priority-rush-bg)',
    iconText: 'var(--color-priority-rush)',
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
    border: 'var(--color-zone)',
    iconBg: 'color-mix(in srgb, var(--color-zone) 14%, transparent)',
    iconText: 'var(--color-zone)',
  },
}

export function FulfillmentKpiCard({
  label,
  value,
  hint,
  trend,
  icon,
  tone = 'primary',
}: FulfillmentKpiCardProps) {
  const cm = getClassMap()
  const palette = TONES[tone]

  return (
    <article
      className={cm.cn(
        cm.sp('p', 6),
        cm.flex({ direction: 'col', gap: 'sm' }),
        cm.accentCard({ tone: 'custom' }),
        'rounded-xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all',
      )}
      style={{ ['--mol-accent' as string]: palette.border }}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
        <p className={cm.accentCardLabel({ tone: 'custom' })}>{label}</p>
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

export default FulfillmentKpiCard
