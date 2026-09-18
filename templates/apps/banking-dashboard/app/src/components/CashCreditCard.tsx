import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface CashCreditCardProps {
  cashCents: number
  creditUsedCents: number
  creditLimitCents: number
}

function fmt(cents: number) {
  return `$${(Math.abs(cents) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Companion card to BalanceHeroCard — cash on hand + credit utilization
 * meter. Surface-container-lowest with rounded-2xl, hover shadow.
 */
export function CashCreditCard({
  cashCents,
  creditUsedCents,
  creditLimitCents,
}: CashCreditCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const utilization = creditLimitCents > 0 ? Math.min(1, creditUsedCents / creditLimitCents) : 0
  const utilizationPct = Math.round(utilization * 100)
  const utilizationTone =
    utilization >= 0.7 ? 'bg-error' : utilization >= 0.3 ? 'bg-warning' : 'bg-success'

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
          {t('cashCreditCard.title', {}, { defaultValue: 'Cash & Credit' })}
        </h3>
        <div className={cm.stack(5)}>
          <div>
            <p className="text-[11px] uppercase tracking-widest font-bold text-on-surface-variant">
              {t('cashCreditCard.cashLabel', {}, { defaultValue: 'Cash on hand' })}
            </p>
            <p
              className={cm.cn(
                cm.textSize('2xl'),
                cm.sp('mt', 1),
                'font-extrabold text-primary tabular-nums',
              )}
            >
              {fmt(cashCents)}
            </p>
          </div>
          <div>
            <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
              <p className="text-[11px] uppercase tracking-widest font-bold text-on-surface-variant">
                {t('cashCreditCard.creditLabel', {}, { defaultValue: 'Credit used' })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
                {t(
                  'cashCreditCard.utilizationPct',
                  { pct: utilizationPct },
                  { defaultValue: '{{pct}}% utilized' },
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
            >
              <div
                className={cm.cn(cm.h('full'), 'rounded-full transition-all', utilizationTone)}
                style={{ width: `${utilizationPct}%` }}
                aria-hidden="true"
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
                'cashCreditCard.usedOfLimit',
                { used: fmt(creditUsedCents), limit: fmt(creditLimitCents) },
                { defaultValue: '{{used}} of {{limit}}' },
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
