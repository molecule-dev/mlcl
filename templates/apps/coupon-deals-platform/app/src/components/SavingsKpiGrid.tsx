/**
 * Editorial KPI quad — uppercase 10px label, oversized value, accent
 * left border, hover-lift transform. The 4 cells are tuned to the
 * Snagr fixture vocabulary (lifetime savings, redeemed, saved, expiring).
 *
 * Translated from online-store's AdminDashboardKpiGrid.tsx — same
 * card-with-icon-pill anatomy, re-skinned with Snagr's accent palette
 * and DESIGN.md typography conventions (font-black tracking-widest labels).
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface SavingsKpiGridStats {
  total_savings_cents: number
  saved_count: number
  redeemed_count: number
  expiring_count: number
}

export interface SavingsKpiGridProps {
  stats: SavingsKpiGridStats
}

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

interface KpiCellProps {
  label: string
  value: string
  glyph: string
  /** Tailwind border-l accent class, e.g. `border-secondary`. */
  accent: string
  /** Tailwind text + bg classes for the icon pill, e.g. `bg-secondary/15 text-secondary`. */
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
        'rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/30',
        'border-l-4',
        accent,
        'transition-all hover:-translate-y-0.5 hover:shadow-md',
      )}
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
              trend.positive ? 'bg-secondary/15 text-secondary' : 'bg-primary/15 text-primary',
            )}
          >
            {trend.delta}
          </span>
        )}
      </div>
      <p
        className={cm.cn(
          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </p>
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

export function SavingsKpiGrid({ stats }: SavingsKpiGridProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}>
      <KpiCell
        label={t('savingsKpiGrid.lifetime', {}, { defaultValue: 'Lifetime savings' })}
        value={fmtUsd(stats.total_savings_cents)}
        glyph="savings"
        accent="border-secondary"
        iconTone="bg-secondary/15 text-secondary"
        trend={{ delta: '+12%', positive: true }}
      />
      <KpiCell
        label={t('savingsKpiGrid.redeemed', {}, { defaultValue: 'Redeemed' })}
        value={String(stats.redeemed_count)}
        glyph="check_circle"
        accent="border-tertiary"
        iconTone="bg-tertiary/15 text-tertiary"
        trend={{ delta: '+3', positive: true }}
      />
      <KpiCell
        label={t('savingsKpiGrid.saved', {}, { defaultValue: 'Saved coupons' })}
        value={String(stats.saved_count)}
        glyph="bookmark"
        accent="border-primary"
        iconTone="bg-primary/15 text-primary"
      />
      <KpiCell
        label={t('savingsKpiGrid.expiring', {}, { defaultValue: 'Expiring < 7d' })}
        value={String(stats.expiring_count)}
        glyph="alarm"
        accent="border-error"
        iconTone="bg-error/15 text-error"
        trend={{
          delta: t('savingsKpiGrid.urgent', {}, { defaultValue: 'urgent' }),
          positive: false,
        }}
      />
    </div>
  )
}
