import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Transaction {
  id: string
  date?: string
  description?: string
  amount: number | string
  type?: string
  category_id?: string | null
  account_id?: string | null
}

interface TransactionFiltersProps {
  activeTab: 'all' | 'income' | 'expense'
  onTabChange: (tab: 'all' | 'income' | 'expense') => void
  transactions?: Transaction[]
}

function downloadCsv(rows: Transaction[]) {
  const header = ['id', 'date', 'description', 'amount', 'type', 'category_id', 'account_id']
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const body = rows
    .map((r) =>
      [
        r.id,
        r.date ?? '',
        r.description ?? '',
        r.amount,
        r.type ?? '',
        r.category_id ?? '',
        r.account_id ?? '',
      ]
        .map(escape)
        .join(','),
    )
    .join('\n')
  const csv = header.join(',') + '\n' + body
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    URL.revokeObjectURL(a.href)
    a.remove()
  }, 0)
}

export default function TransactionFilters({
  activeTab,
  onTabChange,
  transactions = [],
}: TransactionFiltersProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-4')}>
      {/* Tabs */}
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.sp('p', 1),
          'lg:col-span-3 bg-surface-container-low rounded-xl w-fit',
        )}
        role="tablist"
      >
        <button
          role="tab"
          aria-selected={activeTab === 'all'}
          className={cm.cn(
            cm.sp('px', 8),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'py-2.5 transition-all',
            activeTab === 'all'
              ? 'text-primary bg-surface shadow-sm rounded-lg'
              : 'text-on-surface-variant hover:text-primary',
          )}
          onClick={() => onTabChange('all')}
        >
          {t('status.all', {}, { defaultValue: 'All' })}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'income'}
          className={cm.cn(
            cm.sp('px', 8),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'py-2.5 transition-all',
            activeTab === 'income'
              ? 'text-primary bg-surface shadow-sm rounded-lg'
              : 'text-on-surface-variant hover:text-primary',
          )}
          onClick={() => onTabChange('income')}
        >
          {t('transactionFilters.income', {}, { defaultValue: 'Income' })}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'expense'}
          className={cm.cn(
            cm.sp('px', 8),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'py-2.5 transition-all',
            activeTab === 'expense'
              ? 'text-primary bg-surface shadow-sm rounded-lg'
              : 'text-on-surface-variant hover:text-primary',
          )}
          onClick={() => onTabChange('expense')}
        >
          {t('transactionFilters.expenses', {}, { defaultValue: 'Expenses' })}
        </button>
      </div>
      <div className={cm.flex({ align: 'center', justify: 'end', gap: 'sm' })}>
        <button
          type="button"
          data-mol-id="transactions-export-csv"
          aria-label={t('transactionFilters.download', {}, { defaultValue: 'Download CSV' })}
          onClick={() => downloadCsv(transactions)}
          disabled={transactions.length === 0}
          className={cm.cn(
            'p-2.5 rounded-xl border-none bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')}>file_download</span>
        </button>
      </div>
    </div>
  )
}
export { TransactionFilters }
