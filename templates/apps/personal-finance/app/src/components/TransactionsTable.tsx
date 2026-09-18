/**
 * Thin shim around @molecule/app-transactions-table-react. Preserves
 * the app's original prop surface ({ transactions, loading, error,
 * onRetry }) so other components don't have to change; the shared
 * package owns rendering + category styling + skeleton + empty state.
 */
import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import {
  type CategoryStyle,
  TransactionsTable as PackageTransactionsTable,
} from '@molecule/app-transactions-table-react'
import { getClassMap } from '@molecule/app-ui'

import TransactionPagination from './TransactionPagination.js'

interface Transaction {
  id: string
  account_id: string
  amount: number
  type: string
  description: string
  date: string
  category_name: string
}

// Category chips bind to the theme's container / on-container CSS variables
// (consumed by the shared package as inline `backgroundColor` / `color`) so
// each chip flips between light and dark mode — a light pastel chip in light
// mode, a deep-tinted chip in dark mode — instead of staying a fixed pastel
// that washes out on dark surfaces. The per-category icon carries the finer
// distinction where two categories share a tone.
const PRIMARY: Pick<CategoryStyle, 'bg' | 'color'> = {
  bg: 'var(--color-primary-container)',
  color: 'var(--color-on-primary-container)',
}
const SECONDARY: Pick<CategoryStyle, 'bg' | 'color'> = {
  bg: 'var(--color-secondary-container)',
  color: 'var(--color-on-secondary-container)',
}
const TERTIARY: Pick<CategoryStyle, 'bg' | 'color'> = {
  bg: 'var(--color-tertiary-container)',
  color: 'var(--color-on-tertiary-container)',
}
const ERROR: Pick<CategoryStyle, 'bg' | 'color'> = {
  bg: 'var(--color-error-container)',
  color: 'var(--color-on-error-container)',
}
const NEUTRAL: Pick<CategoryStyle, 'bg' | 'color'> = {
  bg: 'var(--color-surface-container-high)',
  color: 'var(--color-on-surface-variant)',
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  groceries: { ...PRIMARY, icon: 'shopping_cart' },
  income: { ...PRIMARY, icon: 'payments' },
  investment: { ...PRIMARY, icon: 'trending_up' },
  entertainment: { ...SECONDARY, icon: 'movie' },
  shopping: { ...SECONDARY, icon: 'shopping_bag' },
  dining: { ...TERTIARY, icon: 'coffee' },
  rent: { ...TERTIARY, icon: 'home' },
  health: { ...ERROR, icon: 'fitness_center' },
  transport: { ...NEUTRAL, icon: 'directions_car' },
}

function TransactionsTable({
  transactions = [],
  loading = false,
  error = null,
  onRetry,
}: {
  transactions?: Transaction[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const emptyState = (
    <>
      <span
        className="material-symbols-outlined"
        aria-hidden="true"
        style={{ fontSize: '3rem', opacity: 0.4 }}
      >
        receipt_long
      </span>
      <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'))}>
        {t('transactionsTable.emptyTitle', {}, { defaultValue: 'No transactions yet' })}
      </h3>
      <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
        {t(
          'transactionsTable.emptyDescription',
          {},
          {
            defaultValue:
              'Track every dollar by adding your first transaction. Pick an account and a category, then log income or expenses.',
          },
        )}
      </p>
      <Link
        to="/transactions/new"
        data-mol-id="transactions-table-empty-cta"
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 3),
          cm.fontWeight('bold'),
          cm.cursorPointer,
          'bg-primary text-on-primary rounded-xl inline-block self-center',
        )}
      >
        {t('transactionsTable.emptyCta', {}, { defaultValue: 'Add your first transaction' })}
      </Link>
    </>
  )

  return (
    <PackageTransactionsTable
      transactions={transactions.map((tx) => ({
        id: tx.id,
        date: tx.date,
        description: tx.description,
        categoryKey: tx.category_name ?? '',
        categoryLabel: tx.category_name,
        account: tx.account_id,
        amount: typeof tx.amount === 'number' ? tx.amount : parseFloat(String(tx.amount ?? 0)),
        isIncome: tx.type === 'income',
      }))}
      loading={loading}
      error={error}
      onRetry={onRetry}
      retryLabel={t('transactionsTable.retry', {}, { defaultValue: 'Try again' })}
      categoryStyles={CATEGORY_STYLES}
      onRowClick={(tx) => navigate('/transactions/' + tx.id)}
      headers={{
        date: t('form.date', {}, { defaultValue: 'Date' }),
        description: t('form.description', {}, { defaultValue: 'Description' }),
        category: t('form.category', {}, { defaultValue: 'Category' }),
        account: t('settings.account', {}, { defaultValue: 'Account' }),
        amount: t('form.amount', {}, { defaultValue: 'Amount' }),
      }}
      emptyState={emptyState}
      footer={<TransactionPagination />}
    />
  )
}

export default TransactionsTable
export { TransactionsTable }
