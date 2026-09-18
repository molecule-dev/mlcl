import { useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatMoney } from '../lib/money.js'

const CATEGORY_ICONS: Record<string, string> = {
  groceries: 'shopping_bag',
  income: 'payments',
  dining: 'coffee',
  dining_out: 'coffee',
  utilities: 'electric_bolt',
  transport: 'directions_car',
  transportation: 'directions_car',
  entertainment: 'subscriptions',
}
const getCategoryIcon = (cat: string) => CATEGORY_ICONS[(cat ?? '').toLowerCase()] ?? 'receipt_long'

function AccountRecentTransactions({
  transactions,
  currency,
}: {
  transactions: {
    id: string
    amount: number
    type: string
    description: string
    date: string
    category_name: string
  }[]
  currency?: string
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const filtered = search
    ? transactions.filter(
        (tx) =>
          tx.description.toLowerCase().includes(search.toLowerCase()) ||
          tx.category_name.toLowerCase().includes(search.toLowerCase()),
      )
    : transactions
  return (
    <section
      className={cm.cn(cm.sp('p', 10), 'col-span-12 bg-surface-container-low rounded-[2rem]')}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 8))}>
        <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
          {t('accountRecentTransactions.title', {}, { defaultValue: 'Recent Transactions' })}
        </h3>
        <div className={cm.cn('relative group')}>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary',
            )}
          >
            search
          </span>
          <input
            className={cm.cn(
              cm.sp('pl', 10),
              cm.sp('pr', 6),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.roundedFull,
              cm.w(64),
              'bg-surface-container-lowest border-none focus:ring-2 ring-primary/20 placeholder:text-foreground-tertiary',
            )}
            aria-label={t(
              'accountRecentTransactions.searchAriaLabel',
              {},
              { defaultValue: 'Search activity' },
            )}
            placeholder={t(
              'accountRecentTransactions.searchPlaceholder',
              {},
              { defaultValue: 'Search activity...' },
            )}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className={cm.stack(4)}>
        {filtered.map((tx) => {
          const isIncome = tx.type === 'income' || tx.amount > 0
          const icon = getCategoryIcon(tx.category_name)
          return (
            <Link
              key={tx.id}
              to={`/transactions/${tx.id}`}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('p', 5),
                'bg-surface-container-lowest rounded-2xl hover:shadow-xl hover:shadow-on-surface/5 transition-all duration-300 group',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
                <div
                  className={cm.cn(
                    cm.w(12),
                    cm.h(12),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    isIncome ? 'bg-success-light' : 'bg-surface-secondary',
                  )}
                >
                  <span
                    className={cm.cn(
                      'material-symbols-outlined',
                      isIncome ? 'text-success' : 'text-foreground-secondary',
                    )}
                  >
                    {icon}
                  </span>
                </div>
                <div>
                  <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                    {tx.description}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-foreground-tertiary')}>
                    {t(
                      'accountRecentTransactions.transactionMeta',
                      {
                        date: new Date(tx.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        }),
                        category: tx.category_name,
                      },
                      { defaultValue: '{{date}} • {{category}}' },
                    )}
                  </p>
                </div>
              </div>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  `${isIncome ? 'text-primary' : 'text-tertiary'}`,
                )}
              >
                {isIncome
                  ? t('accountRecentTransactions.incomeSign', {}, { defaultValue: '+ ' })
                  : t('accountRecentTransactions.expenseSign', {}, { defaultValue: '- ' })}
                {formatMoney(Math.abs(tx.amount), currency)}
              </span>
            </Link>
          )
        })}
      </div>
      <Link
        className={cm.cn(
          'block w-full mt-8 py-4 text-sm font-bold text-center text-foreground-secondary hover:text-primary transition-colors',
        )}
        to="/transactions"
      >
        {t('accountRecentTransactions.viewAll', {}, { defaultValue: 'View All Transactions' })}
      </Link>
    </section>
  )
}

export default AccountRecentTransactions
export { AccountRecentTransactions }
