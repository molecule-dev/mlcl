/**
 * Editorial KPI quad — uppercase 10px label, oversized tabular-num value,
 * inset accent bar with the label in its color, hover-lift transform. The 4 cells are tuned to the
 * Bargain dashboard vocabulary (lifetime savings, watching, drops this week,
 * deals expiring soon).
 *
 * Translated from coupon-deals-platform/SavingsKpiGrid.tsx (which traces
 * back to online-store/AdminDashboardKpiGrid.tsx) — same card-with-icon-pill
 * anatomy, re-skinned with Bargain's primary orange and secondary green to
 * match the price-drop / price-rise color semantics from DESIGN.md.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { fmtUsd } from '../lib/unwrap.js'

export interface PriceWatchKpiStats {
  total_savings_cents: number
  watching_count: number
  drops_this_week: number
  expiring_alerts: number
}

export interface PriceWatchKpiGridProps {
  stats: PriceWatchKpiStats
}

interface KpiCellProps {
  label: string
  value: string
  glyph: string
  /** The accent bar color, e.g. `var(--color-secondary)`. */
  accent: string
  /** Tailwind text + bg classes for the icon pill. */
  iconTone: string
  trend?: { delta: string; positive: boolean }
}

function KpiCell({ label, value, glyph, accent, iconTone, trend }: KpiCellProps) {
  const cm = getClassMap()
  return (
    <div
      data-mol-id={`kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}
      className={cm.cn(
        cm.sp('p', 5),
        cm.accentCard({ tone: 'custom' }),
        'rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/30',
        'transition-all hover:-translate-y-0.5 hover:shadow-md',
      )}
      style={{ ['--mol-accent' as string]: accent }}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 3))}>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'h-9 w-9 rounded-lg',
            iconTone,
          )}
          aria-hidden="true"
        >
          <span className={cm.cn('material-symbols-outlined text-xl')}>{glyph}</span>
        </span>
        {trend && (
          <span
            className={cm.cn(
              cm.sp('px', 2),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'rounded-full',
              trend.positive ? 'bg-secondary/15 text-secondary' : 'bg-error/15 text-error',
            )}
          >
            {trend.delta}
          </span>
        )}
      </div>
      <p className={cm.accentCardLabel({ tone: 'custom' })}>{label}</p>
      <p
        className={cm.cn(
          'mt-1 text-3xl font-extrabold tabular-nums tracking-tight text-on-surface',
        )}
      >
        {value}
      </p>
    </div>
  )
}

export function PriceWatchKpiGrid({ stats }: PriceWatchKpiGridProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}>
      <KpiCell
        label={t('priceWatchKpiGrid.savings', {}, { defaultValue: 'Lifetime savings' })}
        value={fmtUsd(stats.total_savings_cents)}
        glyph="savings"
        accent="var(--color-secondary)"
        iconTone="bg-secondary/15 text-secondary"
        trend={{ delta: '+12%', positive: true }}
      />
      <KpiCell
        label={t('priceWatchKpiGrid.watching', {}, { defaultValue: 'Products watched' })}
        value={String(stats.watching_count)}
        glyph="visibility"
        accent="var(--color-primary)"
        iconTone="bg-primary/15 text-primary"
      />
      <KpiCell
        label={t('priceWatchKpiGrid.drops', {}, { defaultValue: 'Drops this week' })}
        value={String(stats.drops_this_week)}
        glyph="trending_down"
        accent="var(--color-tertiary)"
        iconTone="bg-tertiary/15 text-tertiary"
        trend={{ delta: '+5', positive: true }}
      />
      <KpiCell
        label={t('priceWatchKpiGrid.expiring', {}, { defaultValue: 'Alerts firing' })}
        value={String(stats.expiring_alerts)}
        glyph="notifications_active"
        accent="var(--color-error)"
        iconTone="bg-error/15 text-error"
        trend={{ delta: 'live', positive: false }}
      />
    </div>
  )
}
