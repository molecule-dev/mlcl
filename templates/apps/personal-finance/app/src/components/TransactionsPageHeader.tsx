import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type TransactionsRange = 'today' | 'month' | 'all'

function TransactionsPageHeader({
  activeRange = 'all',
  onRangeChange,
}: {
  /** Selected date range — drives the page's transaction fetch. */
  activeRange?: TransactionsRange
  onRangeChange?: (range: TransactionsRange) => void
} = {}) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const rangeButtonClass = (active: boolean) =>
    cm.cn(
      cm.sp('px', 4),
      cm.sp('py', 2),
      cm.textSize('sm'),
      cm.fontWeight('bold'),
      'rounded-xl transition-all',
      active ? 'text-success bg-surface shadow-sm' : 'text-foreground-secondary hover:bg-surface',
    )

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between', gap: 'lg' }),
        'md:flex-row md:items-end',
      )}
    >
      <div>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.sp('mb', 2),
            'font-extrabold font-headline tracking-tight text-on-surface',
          )}
        >
          {t('nav.transactions', {}, { defaultValue: 'Transactions' })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
          {t(
            'transactionsPageHeader.subtitle',
            {},
            { defaultValue: 'Detailed record of your financial movement.' },
          )}
        </p>
      </div>
      {/* Date Range Picker */}
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          'bg-surface-container-low p-1.5 rounded-xl',
        )}
      >
        <button
          className={rangeButtonClass(activeRange === 'today')}
          onClick={() => onRangeChange?.('today')}
        >
          {t('status.today', {}, { defaultValue: 'Today' })}
        </button>
        <button
          className={rangeButtonClass(activeRange === 'month')}
          onClick={() => onRangeChange?.('month')}
        >
          {t('transactionsPageHeader.rangeThisMonth', {}, { defaultValue: 'This Month' })}
        </button>
        <button
          className={cm.cn(
            rangeButtonClass(activeRange === 'all'),
            cm.flex({ align: 'center', gap: 'sm' }),
          )}
          onClick={() => onRangeChange?.('all')}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
            calendar_month
          </span>
          {t('transactionsPageHeader.rangeAllTime', {}, { defaultValue: 'All Time' })}
        </button>
      </div>
    </div>
  )
}

export default TransactionsPageHeader
export { TransactionsPageHeader }
