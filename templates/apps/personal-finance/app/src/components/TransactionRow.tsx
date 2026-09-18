import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function TransactionRow() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <tr className={cm.cn('group hover:bg-surface-container-low transition-colors duration-200')}>
      <td
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 5),
          cm.textSize('sm'),
          'text-foreground-secondary',
        )}
      >
        {t('transactionRow.date', { date: 'Mar 25, 2024' }, { defaultValue: '{{date}}' })}
      </td>
      <td className={cm.cn(cm.sp('px', 6), cm.sp('py', 5))}>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <div
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'bg-success-light text-success',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')}>shopping_cart</span>
          </div>
          <span className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
            {t(
              'transactionRow.merchantName',
              { name: 'Whole Foods Market' },
              { defaultValue: '{{name}}' },
            )}
          </span>
        </div>
      </td>
      <td className={cm.cn(cm.sp('px', 6), cm.sp('py', 5))}>
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.roundedFull,
            cm.fontWeight('bold'),
            'bg-blue-50 text-blue-600 text-[10px] uppercase tracking-wider',
          )}
        >
          {t(
            'transactionRow.categoryLabel',
            { category: 'Groceries' },
            { defaultValue: '{{category}}' },
          )}
        </span>
      </td>
      <td
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 5),
          cm.textSize('sm'),
          'text-foreground-secondary italic',
        )}
      >
        {t('transactionRow.accountType', { type: 'Checking' }, { defaultValue: '{{type}}' })}
      </td>
      <td
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 5),
          cm.textRight,
          cm.fontWeight('bold'),
          'font-headline text-tertiary',
        )}
      >
        {t('transactionRow.amount', { amount: '-$82.50' }, { defaultValue: '{{amount}}' })}
      </td>
    </tr>
  )
}
export default TransactionRow
