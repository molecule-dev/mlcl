// Phase 1 baseline — verbatim JSX of design-personal-finance-transactions.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { useListRoute } from '@molecule/app-routing-react-router'
import { getClassMap } from '@molecule/app-ui'

import FinanceShell from '../components/FinanceShell.js'
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
  if (range === 'all') return null
  const now = new Date()
  // Transaction dates are calendar dates. Serializing local midnight to UTC
  // shifts the first of the month to the previous day in positive offsets.
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    range === 'month' ? '01' : String(now.getDate()).padStart(2, '0'),
  ].join('-')
}

function Transactions() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { status } = useAuth()

  const listRoute = useListRoute({
    pageSize: 12,
    filters: { search: {}, range: { defaultValue: 'all' } },
    selections: {
      all: { path: '/transactions', query: { type: undefined }, requiresAuth: true },
      income: { path: '/transactions', query: { type: 'income' }, requiresAuth: true },
      expense: { path: '/transactions', query: { type: 'expense' }, requiresAuth: true },
    },
    defaultSelection: 'all',
    auth: { status, redirectTo: '/login' },
  })
  const search = listRoute.filters.search ?? ''
  const activeTab = listRoute.selection ?? 'all'
  const range = listRoute.filters.range
  const activeRange: TransactionsRange = range === 'today' || range === 'month' ? range : 'all'
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const loadTransactions = useCallback(async () => {
    if (!listRoute.canLoad) return
    const request = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (activeTab !== 'all') params.set('type', activeTab)
      const startDate = rangeStartDate(activeRange)
      if (startDate) params.set('start_date', startDate)
      if (search.trim()) params.set('search', search.trim())
      params.set('limit', String(listRoute.pageSize))
      params.set('offset', String(listRoute.offset))
      params.set('include_total', 'true')
      const res = await http.get<Transaction[] | { data: Transaction[]; total: number }>(
        `/api/transactions?${params.toString()}`,
      )
      if (request !== requestId.current) return
      const body = res.data
      const rows = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : []
      setTransactions(rows)
      setTotal(!Array.isArray(body) && typeof body?.total === 'number' ? body.total : rows.length)
    } catch (_error) {
      if (request !== requestId.current) return
      // Failure is surfaced to the user via the error banner below.
      setError(t('transactions.loadError', {}, { defaultValue: 'Failed to load transactions.' }))
    } finally {
      if (request === requestId.current) setLoading(false)
    }
  }, [
    http,
    t,
    activeTab,
    activeRange,
    search,
    listRoute.canLoad,
    listRoute.pageSize,
    listRoute.offset,
  ])

  useEffect(() => {
    void loadTransactions()
    return () => {
      requestId.current += 1
    }
  }, [loadTransactions])

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
    listRoute.select(tab)
  }

  return (
    <FinanceShell>
      {/* TopAppBar */}
      <TopAppBar />
      {/* Content Canvas */}
      <div className={cm.cn(cm.sp('p', 8), 'max-w-7xl', cm.mxAuto, cm.stack(8))}>
        {/* Page Header */}
        <TransactionsPageHeader
          activeRange={activeRange}
          onRangeChange={(range) => listRoute.setFilters({ range })}
        />
        {/* Filters & Stats Section */}
        <TransactionFilters
          activeTab={activeTab}
          onTabChange={handleTabChange}
          transactions={listRoute.canLoad ? visibleTransactions : []}
        />
        {/* Transactions Table Container */}
        <TransactionsTable
          transactions={listRoute.canLoad ? visibleTransactions : []}
          total={total}
          page={listRoute.page}
          pageSize={listRoute.pageSize}
          onPageChange={listRoute.setPage}
          loading={loading || !listRoute.canLoad}
          error={error}
          onRetry={loadTransactions}
        />
      </div>
    </FinanceShell>
  )
}

export default Transactions
export { Transactions, Transactions as TransactionsPage }
