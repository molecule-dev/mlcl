import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Transaction {
  account_name: string
  amount: number
  type: string
  description: string
  date: string
  category_name: string
  status: string
}

interface Props {
  transaction: Transaction
  formatCurrency: (amount: number) => string
}

function TransactionHeaderCard({ transaction, formatCurrency }: Props) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isExpense = transaction.amount < 0
  const dateStr = transaction.date
    ? new Date(transaction.date).toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : ''
  return (
    <section className={cm.cn(cm.sp('p', 10), 'bg-surface-container-lowest rounded-[2rem]')}>
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 8))}>
        <div>
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.sp('mb', 4),
              cm.roundedFull,
              cm.textPrimary,
              cm.fontWeight('bold'),
              'inline-flex items-center bg-success-light text-[10px] tracking-wider uppercase',
            )}
          >
            {transaction.status ?? t('common.completed', {}, { defaultValue: 'Completed' })}
          </span>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.sp('mb', 1),
              'font-headline font-extrabold text-on-surface tracking-tight',
            )}
          >
            {transaction.description}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary font-label')}>
            {dateStr}
          </p>
        </div>
        <div className={cm.textRight}>
          <div
            className={cm.cn(
              cm.textSize('4xl'),
              'font-headline font-extrabold tracking-tighter',
              isExpense ? 'text-tertiary' : 'text-success',
            )}
          >
            {isExpense ? '-' : '+'}
            {formatCurrency(transaction.amount)}
          </div>
          <div
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mt', 2),
              'text-[10px] text-foreground-tertiary uppercase tracking-widest',
            )}
          >
            {transaction.type ??
              t('transactionHeaderCard.unknownType', {}, { defaultValue: 'Personal Expense' })}
          </div>
        </div>
      </div>
      <div className={cm.cn(cm.sp('mb', 8), cm.w('full'), 'h-px bg-surface-container-low')}></div>
      <div className={cm.grid({ cols: 2, gap: 'xl' })}>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(12),
              cm.h(12),
              cm.textPrimary,
              'rounded-xl bg-surface-container-low',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="shopping_basket">
              shopping_basket
            </span>
          </div>
          <div>
            <div
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] text-foreground-tertiary uppercase tracking-widest',
              )}
            >
              {t('form.category', {}, { defaultValue: 'Category' })}
            </div>
            <div className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
              {transaction.category_name ??
                t('transactionHeaderCard.uncategorized', {}, { defaultValue: 'Uncategorized' })}
            </div>
          </div>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(12),
              cm.h(12),
              'rounded-xl bg-surface-container-low text-secondary',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="account_balance_wallet">
              account_balance_wallet
            </span>
          </div>
          <div>
            <div
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] text-foreground-tertiary uppercase tracking-widest',
              )}
            >
              {t('settings.account', {}, { defaultValue: 'Account' })}
            </div>
            <div className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
              {transaction.account_name ??
                t('status.unassigned', {}, { defaultValue: 'Unassigned' })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default TransactionHeaderCard
export { TransactionHeaderCard }
