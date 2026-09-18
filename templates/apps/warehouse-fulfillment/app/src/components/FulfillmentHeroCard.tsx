import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Gradient hero card for the Sorthaus dashboard — large 6xl orders-shipped
 * number, frosted-glass status pill, decorative blurred orbs, and an inline
 * SVG sparkline showing the last 12 shifts of throughput.
 *
 * Translated from inventory-management/InventoryHeroCard.tsx, retuned to
 * the warehouse-fulfillment domain (orders shipped today, on-time rate,
 * teal→navy gradient that matches the dark sidebar from DESIGN.md).
 */

interface FulfillmentHeroCardProps {
  ordersShipped: number
  unitsShipped: number
  onTimePercent: number
  trend: number[]
  periodLabel?: string
}

export function FulfillmentHeroCard({
  ordersShipped,
  unitsShipped,
  onTimePercent,
  trend,
  periodLabel,
}: FulfillmentHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const numberFmt = new Intl.NumberFormat('en-US')
  const onTrack = onTimePercent >= 95

  const max = Math.max(...trend, 1)
  const min = Math.min(...trend, 0)
  const span = Math.max(max - min, 1)
  const points = trend
    .map((v, i) => {
      const x = (i / Math.max(trend.length - 1, 1)) * 100
      const y = 100 - ((v - min) / span) * 100
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  return (
    <section
      className={cm.cn(
        'relative overflow-hidden rounded-[2rem] text-white shadow-xl shadow-primary/20',
        cm.sp('p', 8),
      )}
      style={{
        backgroundImage:
          'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 55%, var(--color-sidebar) 100%)',
      }}
    >
      <div
        aria-hidden="true"
        className={cm.cn(
          'pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-surface/10 blur-3xl',
        )}
      />
      <div
        aria-hidden="true"
        className={cm.cn(
          'pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-secondary/30 blur-3xl',
        )}
      />

      <div
        className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'md' }), 'relative')}
      >
        <div className={cm.stack(2)}>
          <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-white/70')}>
            {t('fulfillmentHeroCard.eyebrow', {}, { defaultValue: 'Shifts in motion' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-white/70')}>
            {t(
              'fulfillmentHeroCard.subtitle',
              { units: numberFmt.format(unitsShipped) },
              { defaultValue: '{{units}} units packed and out the dock' },
            )}
          </p>
        </div>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            'rounded-full bg-surface/20 px-4 py-1.5 text-xs font-bold tracking-wide backdrop-blur-md',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-[16px]')}
            data-icon={onTrack ? 'check_circle' : 'pending'}
          >
            {onTrack ? 'check_circle' : 'pending'}
          </span>
          {t(
            'fulfillmentHeroCard.onTime',
            { rate: onTimePercent.toFixed(1) },
            { defaultValue: '{{rate}}% on time' },
          )}
        </span>
      </div>

      <div className={cm.cn('relative mt-8 grid grid-cols-1 md:grid-cols-2 items-end gap-6')}>
        <div>
          <p className={cm.cn('text-6xl font-extrabold tracking-tighter tabular-nums')}>
            {numberFmt.format(ordersShipped)}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-white/70')}>
            {periodLabel
              ? t(
                  'fulfillmentHeroCard.ordersShippedWithPeriod',
                  { period: periodLabel },
                  { defaultValue: 'orders shipped · {{period}}' },
                )
              : t(
                  'fulfillmentHeroCard.ordersShipped',
                  {},
                  { defaultValue: 'orders shipped today' },
                )}
          </p>
        </div>

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className={cm.cn('h-24 w-full text-white')}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="sorthaus-hero-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0.45" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon
            points={`0,100 ${points} 100,100`}
            fill="url(#sorthaus-hero-fill)"
            stroke="none"
          />
          <polyline
            points={points}
            fill="none"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </section>
  )
}

export default FulfillmentHeroCard
