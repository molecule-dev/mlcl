import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Property card — gradient placeholder image, occupancy progress
 * track, monthly revenue with tabular-nums. Used on the Properties
 * list page.
 *
 * Translated from property-listing/SearchPropertyCard.tsx with a
 * landlord-portfolio lens (units occupied, monthly revenue) instead
 * of a buyer-search lens (price, beds, baths).
 */
export interface PropertySummary {
  id: string
  name: string
  address: string
  unit_count: number
  occupied_units: number
  monthly_revenue_cents: number
  photo_url?: string | null
  status?: 'active' | 'archived' | 'onboarding'
}

function fmtCurrency(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  return `${sign}$${(abs / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

const STATUS_PILL: Record<
  NonNullable<PropertySummary['status']>,
  { label: string; classes: string }
> = {
  active: { label: 'Active', classes: 'bg-success-light text-success' },
  archived: { label: 'Archived', classes: 'bg-surface-secondary text-foreground' },
  onboarding: { label: 'Onboarding', classes: 'bg-warning-light text-warning' },
}

export function PropertyListCard({ property }: { property: PropertySummary }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const status = property.status ?? 'active'
  const pill = STATUS_PILL[status]
  const occupancyPct =
    property.unit_count > 0 ? Math.round((property.occupied_units / property.unit_count) * 100) : 0

  return (
    <Link
      to={`/properties/${property.id}`}
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden border border-outline-variant/40',
      )}
      data-mol-id="property-list-card"
    >
      <div
        className={cm.cn(
          'aspect-[16/9] relative overflow-hidden',
          'bg-gradient-to-br from-primary/80 to-primary-container',
        )}
      >
        {property.photo_url ? (
          <img
            src={property.photo_url}
            alt=""
            loading="lazy"
            className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
          />
        ) : (
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.h('full'))}>
            <span
              className={cm.cn('material-symbols-outlined text-on-primary/60')}
              style={{ fontSize: '64px' }}
              aria-hidden="true"
            >
              apartment
            </span>
          </div>
        )}
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.roundedFull,
            'absolute top-3 right-3 text-[10px] font-black uppercase tracking-widest shadow-sm',
            pill.classes,
          )}
        >
          {t(`propertyListCard.status.${status}`, {}, { defaultValue: pill.label })}
        </span>
      </div>

      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('p', 5))}>
        <div>
          <h3
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'text-on-surface line-clamp-1',
            )}
          >
            {property.name}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant line-clamp-1')}>
            {property.address}
          </p>
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.sp('mt', 1))}>
          <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('propertyListCard.occupancy', {}, { defaultValue: 'Occupancy' })}
            </span>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'tabular-nums text-on-surface',
              )}
            >
              {t(
                'propertyListCard.occupancyValue',
                {
                  occupied: property.occupied_units,
                  total: property.unit_count,
                  pct: occupancyPct,
                },
                { defaultValue: '{{occupied}}/{{total}} · {{pct}}%' },
              )}
            </span>
          </div>
          <div className={cm.cn(cm.h(2), cm.roundedFull, 'bg-surface-container overflow-hidden')}>
            <div
              className={cm.cn(
                cm.h('full'),
                cm.roundedFull,
                'bg-gradient-to-r from-primary to-secondary',
              )}
              style={{ width: `${occupancyPct}%` }}
            />
          </div>
        </div>

        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('mt', 3),
            cm.sp('pt', 3),
            'border-t border-outline-variant/40',
          )}
        >
          <span
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), 'text-on-surface-variant')}
          >
            {t('propertyListCard.monthlyRevenue', {}, { defaultValue: 'Monthly revenue' })}
          </span>
          <span className={cm.cn(cm.textSize('lg'), 'font-extrabold tabular-nums text-on-surface')}>
            {fmtCurrency(property.monthly_revenue_cents)}
          </span>
        </div>
      </div>
    </Link>
  )
}

export default PropertyListCard
