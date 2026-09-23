// Phase 1 baseline — verbatim JSX of design-personal-finance-transactions.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import BottomNavBar from '../components/BottomNavBar.js'
import SideNavBar from '../components/SideNavBar.js'
import TopAppBar from '../components/TopAppBar.js'
import TransactionFilters from '../components/TransactionFilters.js'
import TransactionsPageHeader, {
  type TransactionsRange,
} from '../components/TransactionsPageHeader.js'
import TransactionsTable from '../components/TransactionsTable.js'
interface Transaction {
  id: string
  account_id: string
  amount: number
  type: string
  description: string
  date: string
  category_name: string
  notes: string
}

/** Start-of-range date (YYYY-MM-DD) for the header's date-range picker. */
function rangeStartDate(range: TransactionsRange): string | null {
  const now = new Date()
  if (range === 'today') return now.toISOString().slice(0, 10)
  if (range === 'month')
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  return null
}

function Transactions() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [searchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense'>('all')
  const [activeRange, setActiveRange] = useState<TransactionsRange>('all')

  const loadTransactions = useCallback(
    async (tab: 'all' | 'income' | 'expense' = 'all', range: TransactionsRange = 'all') => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (tab !== 'all') params.set('type', tab)
        const startDate = rangeStartDate(range)
        if (startDate) params.set('start_date', startDate)
        const res = await http.get(`/api/transactions?${params.toString()}`)
        setTransactions(Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [])
      } catch (_error) {
        // Failure is surfaced to the user via the error banner below.
        setError(t('transactions.loadError', {}, { defaultValue: 'Failed to load transactions.' }))
      } finally {
        setLoading(false)
      }
    },
    [http, t],
  )

  useEffect(() => {
    loadTransactions(activeTab, activeRange)
  }, [loadTransactions, activeTab, activeRange])

  // Free-text filter fed by the top bar's search box (?search=...).
  const visibleTransactions = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return transactions
    return transactions.filter((tx) =>
      [tx.description, tx.category_name, tx.notes].some((field) =>
        (field ?? '').toLowerCase().includes(q),
      ),
    )
  }, [transactions, search])

  function handleTabChange(tab: 'all' | 'income' | 'expense') {
    setActiveTab(tab)
  }

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface')}>
      {/* SideNavBar (Desktop) */}
      <SideNavBar />
      {/* Main Content Area */}
      <main className={cm.cn(cm.minH('screen'), 'md:ml-64')}>
        {/* TopAppBar */}
        <TopAppBar />
        {/* Content Canvas — pb clears the fixed mobile bottom nav */}
        <div className={cm.cn(cm.sp('p', 8), 'max-w-7xl pb-28 md:pb-8', cm.mxAuto, cm.stack(8))}>
          {/* Page Header */}
          <TransactionsPageHeader activeRange={activeRange} onRangeChange={setActiveRange} />
          {/* Filters & Stats Section */}
          <TransactionFilters
            activeTab={activeTab}
            onTabChange={handleTabChange}
            transactions={visibleTransactions}
          />
          {/* Transactions Table Container */}
          <TransactionsTable
            transactions={visibleTransactions}
            loading={loading}
            error={error}
            onRetry={() => loadTransactions(activeTab, activeRange)}
          />
        </div>
      </main>
      {/* Mobile Navigation (Fixed Bottom) */}
      <BottomNavBar />
    </div>
  )
}

export default Transactions
export { Transactions, Transactions as TransactionsPage }
