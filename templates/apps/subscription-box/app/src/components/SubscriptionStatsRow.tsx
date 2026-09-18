import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * 4-up KPI row for the subscription dashboard. Icon-chip-triad treatment
 * (§2.3 of the polished pattern catalog) with semantic-tinted icon
 * backgrounds and uppercase eyebrow labels.
 *
 * Translated from property-listing/AgentDashboardKpiCard + online-store
 * AdminDashboardKpiGrid — square icon chips, 3xl-extrabold values,
 * delivery/shipment/value-saved metrics specific to subscription boxes.
 */
export interface SubscriptionStat {
  icon: string
  labelKey: string
  labelDefault: string
  value: string
  trend?: { label: string; tone: 'success' | 'warning' | 'neutral' }
  tint: 'primary' | 'success' | 'warning' | 'info'
}

const tintMap: Record<SubscriptionStat['tint'], string> = {
  primary: 'bg-primary-fixed/30 text-primary',
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  info: 'bg-info-light text-info',
}

const trendToneMap: Record<NonNullable<SubscriptionStat['trend']>['tone'], string> = {
  success: 'text-success bg-success-light',
  warning: 'text-warning bg-warning-light',
  neutral: 'text-on-surface-variant bg-surface-container-low',
}

export function SubscriptionStatsRow({ stats }: { stats: SubscriptionStat[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}>
      {stats.map((stat) => (
        <div
          key={stat.labelKey}
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm' }),
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/40 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200',
          )}
        >
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }))}>
            <span
              className={cm.cn(
                cm.sp('p', 3),
                'material-symbols-outlined rounded-xl',
                tintMap[stat.tint],
              )}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {stat.icon}
            </span>
            {stat.trend && (
              <span
                className={cm.cn(
                  cm.flex({ align: 'center' }),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.sp('px', 2),
                  cm.sp('py', 1),
                  'rounded-md',
                  trendToneMap[stat.trend.tone],
                )}
              >
                {stat.trend.label}
              </span>
            )}
          </div>
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 1),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(stat.labelKey, {}, { defaultValue: stat.labelDefault })}
            </p>
            <p className={cm.cn('text-3xl font-extrabold tracking-tight text-on-surface')}>
              {stat.value}
            </p>
          </div>
        </div>
      ))}
    </section>
  )
}

export default SubscriptionStatsRow
