import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface DailyCostMeterProps {
  /** Today's running cost in the displayed currency. */
  todayCost: number
  /** Forecast cost for the full day (or today's budget). */
  budgetCost: number
  /** Peak vs off-peak split for today (kWh). */
  peakKwh: number
  offPeakKwh: number
  currency?: string
}

/**
 * Companion card to PowerHeroCard — running cost + a utilization meter
 * against the day's budget, with a peak/off-peak kWh footer. Surface
 * containers, rounded-2xl, success/warning/error tone keyed off
 * burn-rate.
 *
 * Translated from smart-home-dashboard's EnergyMeterCard pattern (single
 * primary number + utilization meter + bottom usedOfLimit row), restyled
 * for cost-tracking with a peak/off-peak split row.
 */
export function DailyCostMeter({
  todayCost,
  budgetCost,
  peakKwh,
  offPeakKwh,
  currency = 'USD',
}: DailyCostMeterProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const utilization = budgetCost > 0 ? Math.min(1, todayCost / budgetCost) : 0
  const utilizationPct = Math.round(utilization * 100)
  const tone = utilization >= 0.85 ? 'bg-error' : utilization >= 0.5 ? 'bg-warning' : 'bg-success'
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'

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
          {t('dailyCostMeter.title', {}, { defaultValue: 'Cost so far today' })}
        </h3>
        <div className={cm.stack(5)}>
          <div>
            <p
              className={cm.cn(
                'text-[11px] uppercase tracking-widest font-bold text-on-surface-variant',
              )}
            >
              {t('dailyCostMeter.runningLabel', {}, { defaultValue: 'Running total' })}
            </p>
            <p
              className={cm.cn(
                cm.textSize('2xl'),
                cm.sp('mt', 1),
                'font-mono font-extrabold text-primary tabular-nums',
              )}
            >
              {t(
                'dailyCostMeter.cost',
                { symbol, cost: todayCost.toFixed(2) },
                { defaultValue: '{{symbol}}{{cost}}' },
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
                {t('dailyCostMeter.utilizationLabel', {}, { defaultValue: 'Of daily budget' })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
                {t(
                  'dailyCostMeter.utilizationPct',
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
                'dailyCostMeter.peakSplit',
                {
                  peak: peakKwh.toFixed(1),
                  offPeak: offPeakKwh.toFixed(1),
                },
                { defaultValue: '{{peak}} peak · {{offPeak}} off-peak kWh' },
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
