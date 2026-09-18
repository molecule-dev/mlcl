import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}
export default function AccountSummaryBar({
  totalAssets = 0,
  totalLiabilities = 0,
  netWorth = 0,
}: {
  totalAssets?: number
  totalLiabilities?: number
  netWorth?: number
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.grid({ cols: 1, gap: 'xs' }),
        'md:grid-cols-3 bg-surface-container-low rounded-2xl overflow-hidden',
      )}
      data-mol-id="summary-bar"
    >
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'between' }),
          cm.sp('p', 8),
          'bg-surface-container-lowest',
        )}
        data-mol-id="stat-assets"
      >
        <span
          className={cm.cn(
            cm.textSize('sm'),
            'font-label uppercase tracking-widest text-foreground-tertiary',
          )}
          data-mol-id="stat-label-1"
        >
          {t('accountSummaryBar.assetsLabel', {}, { defaultValue: 'Total Assets' })}
        </span>
        <div className={cm.sp('mt', 4)}>
          <span
            className={cm.cn(
              cm.textSize('4xl'),
              'font-headline font-extrabold tracking-tight text-on-surface',
            )}
            data-mol-id="stat-val-1"
          >
            {formatCurrency(totalAssets)}
          </span>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'between' }),
          cm.sp('p', 8),
          'bg-surface-container-lowest',
        )}
        data-mol-id="stat-liabilities"
      >
        <span
          className={cm.cn(
            cm.textSize('sm'),
            'font-label uppercase tracking-widest text-foreground-tertiary',
          )}
          data-mol-id="stat-label-2"
        >
          {t('accountSummaryBar.liabilitiesLabel', {}, { defaultValue: 'Total Liabilities' })}
        </span>
        <div className={cm.sp('mt', 4)}>
          <span
            className={cm.cn(
              cm.textSize('4xl'),
              'font-headline font-extrabold tracking-tight text-tertiary',
            )}
            data-mol-id="stat-val-2"
          >
            {t(
              'accountSummaryBar.liabilitiesAmount',
              { amount: formatCurrency(totalLiabilities) },
              { defaultValue: '-{{amount}}' },
            )}
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('sm'),
              cm.sp('mt', 2),
              cm.fontWeight('medium'),
              'text-foreground-tertiary',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>remove</span>
            <span>
              {t('accountSummaryBar.liabilitiesTrend', {}, { defaultValue: 'No change' })}
            </span>
          </div>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'between' }),
          cm.sp('p', 8),
          'bg-surface-container-lowest',
        )}
        data-mol-id="stat-networth"
      >
        <span
          className={cm.cn(
            cm.textSize('sm'),
            'font-label uppercase tracking-widest text-foreground-tertiary',
          )}
          data-mol-id="stat-label-3"
        >
          {t('accountSummaryBar.netWorthLabel', {}, { defaultValue: 'Net Worth' })}
        </span>
        <div className={cm.sp('mt', 4)}>
          <span
            className={cm.cn(
              cm.textSize('4xl'),
              'font-headline font-extrabold tracking-tight text-success',
            )}
            data-mol-id="stat-val-3"
          >
            {formatCurrency(netWorth)}
          </span>
        </div>
      </div>
    </div>
  )
}
export { AccountSummaryBar }
