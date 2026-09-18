import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface EnergyMeterCardProps {
  /** Current power draw across all devices, in watts. */
  currentWatts: number
  /** Daily kWh consumed today. */
  todayKwh: number
  /** Estimated cost so far today (USD). */
  todayCost: number
  /** Soft target draw in watts; the meter colour is keyed off this. */
  targetWatts?: number
}

/**
 * Companion card to HomeHeroCard — current power draw + a utilization
 * meter against a soft daily target. Surface-container-lowest with
 * rounded-2xl and tinted accent bar.
 *
 * Translated from banking-dashboard's CashCreditCard pattern (single
 * primary number + utilization meter + bottom usedOfLimit row).
 */
export function EnergyMeterCard({
  currentWatts,
  todayKwh,
  todayCost,
  targetWatts = 4000,
}: EnergyMeterCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const utilization = targetWatts > 0 ? Math.min(1, currentWatts / targetWatts) : 0
  const utilizationPct = Math.round(utilization * 100)
  const tone = utilization >= 0.85 ? 'bg-error' : utilization >= 0.5 ? 'bg-warning' : 'bg-success'

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 6),
        'lg:col-span-4 bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all',
      )}
    >
      <div>
        <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), cm.sp('mb', 6))}>
          {t('energyMeterCard.title', {}, { defaultValue: 'Power right now' })}
        </h3>
        <div className={cm.stack(5)}>
          <div>
            <p
              className={cm.cn(
                'text-[11px] uppercase tracking-widest font-bold text-on-surface-variant',
              )}
            >
              {t('energyMeterCard.drawLabel', {}, { defaultValue: 'Live draw' })}
            </p>
            <p
              className={cm.cn(
                cm.textSize('2xl'),
                cm.sp('mt', 1),
                'font-extrabold text-primary tabular-nums',
              )}
            >
              {t(
                'energyMeterCard.watts',
                { watts: currentWatts.toLocaleString() },
                { defaultValue: '{{watts}} W' },
              )}
            </p>
          </div>
          <div>
            <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
              <p
                className={cm.cn(
                  'text-[11px] uppercase tracking-widest font-bold text-on-surface-variant',
                )}
              >
                {t('energyMeterCard.utilizationLabel', {}, { defaultValue: 'Of target' })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
                {t(
                  'energyMeterCard.utilizationPct',
                  { pct: utilizationPct },
                  { defaultValue: '{{pct}}%' },
                )}
              </p>
            </div>
            <div
              className={cm.cn(
                cm.sp('mt', 2),
                cm.h(2),
                cm.w('full'),
                'bg-surface-container rounded-full overflow-hidden',
              )}
              aria-hidden="true"
            >
              <div
                className={cm.cn(cm.h('full'), 'rounded-full transition-all', tone)}
                style={{ width: `${utilizationPct}%` }}
              />
            </div>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mt', 2),
                cm.fontWeight('semibold'),
                'tabular-nums',
              )}
            >
              {t(
                'energyMeterCard.todaySummary',
                {
                  kwh: todayKwh.toFixed(1),
                  cost: todayCost.toFixed(2),
                },
                { defaultValue: '{{kwh}} kWh today · ${{cost}}' },
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
