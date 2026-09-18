import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Quad of KPI cards summarising portfolio status — Occupied / Vacant
 * / Overdue / Lease Expiring. Each card has a colored left border
 * accent, uppercase 10px label, extrabold value, hover lift.
 *
 * Translated from property-listing/AgentDashboardKpiCard.tsx and
 * personal-finance/DashboardAccountOverview.tsx; status palette
 * sourced from Hearthstone DESIGN.md.
 */
export interface OccupancyKpiQuadProps {
  occupiedUnits: number
  totalUnits: number
  vacantUnits: number
  overdueCount: number
  leaseExpiringCount: number
}

interface CardSpec {
  to: string
  key: string
  defaultLabel: string
  value: string
  defaultSublabel: string
  icon: string
  accentBorder: string
  accentText: string
  iconBg: string
}

export function OccupancyKpiQuad({
  occupiedUnits,
  totalUnits,
  vacantUnits,
  overdueCount,
  leaseExpiringCount,
}: OccupancyKpiQuadProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const occupancyPct = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

  const cards: ReadonlyArray<CardSpec> = [
    {
      to: '/properties?filter=occupied',
      key: 'occupied',
      defaultLabel: 'Occupied',
      value: `${occupancyPct}%`,
      defaultSublabel: '{{occupied}} of {{total}} units',
      icon: 'home',
      accentBorder: 'border-l-emerald-500',
      accentText: 'text-success',
      iconBg: 'bg-success-light text-success',
    },
    {
      to: '/properties?filter=vacancies',
      key: 'vacant',
      defaultLabel: 'Vacant',
      value: String(vacantUnits),
      defaultSublabel: 'ready to list',
      icon: 'meeting_room',
      accentBorder: 'border-l-amber-500',
      accentText: 'text-warning',
      iconBg: 'bg-warning-light text-warning',
    },
    {
      to: '/finances?filter=overdue',
      key: 'overdue',
      defaultLabel: 'Overdue',
      value: String(overdueCount),
      defaultSublabel: 'rent payments late',
      icon: 'warning',
      accentBorder: 'border-l-red-500',
      accentText: 'text-error',
      iconBg: 'bg-error-light text-error',
    },
    {
      to: '/leases?filter=expiring',
      key: 'expiring',
      defaultLabel: 'Lease Expiring',
      value: String(leaseExpiringCount),
      defaultSublabel: 'within 60 days',
      icon: 'event',
      accentBorder: 'border-l-violet-500',
      accentText: 'text-tertiary',
      iconBg: 'bg-tertiary-container text-on-tertiary-container',
    },
  ]

  return (
    <section
      className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
      data-mol-id="occupancy-kpi-quad"
    >
      {cards.map((c) => (
        <Link
          key={c.key}
          to={c.to}
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm' }),
            cm.sp('p', 6),
            `bg-surface-container-lowest rounded-2xl shadow-sm border-l-4 ${c.accentBorder} hover:-translate-y-0.5 hover:shadow-md transition-all`,
          )}
        >
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(`occupancyKpiQuad.${c.key}.label`, {}, { defaultValue: c.defaultLabel })}
            </span>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                c.iconBg,
              )}
              aria-hidden="true"
            >
              <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                {c.icon}
              </span>
            </span>
          </div>
          <span
            className={cm.cn('text-4xl font-extrabold tabular-nums tracking-tight', c.accentText)}
          >
            {c.value}
          </span>
          <span
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), 'text-on-surface-variant')}
          >
            {t(
              `occupancyKpiQuad.${c.key}.sublabel`,
              { occupied: occupiedUnits, total: totalUnits },
              { defaultValue: c.defaultSublabel },
            )}
          </span>
        </Link>
      ))}
    </section>
  )
}

export default OccupancyKpiQuad
