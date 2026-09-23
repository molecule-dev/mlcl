import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import BottomNavBar from '../components/BottomNavBar.js'
import ReportsFilterBar from '../components/ReportsFilterBar.js'
import ReportsPageHeader from '../components/ReportsPageHeader.js'
import SideNavBar from '../components/SideNavBar.js'
import TopNavBar from '../components/TopNavBar.js'

interface SpendingRow {
  category_id: string
  total_amount: number | string
  transaction_count: number | string
}

interface Category {
  id: string
  name: string
  color?: string
}

interface IncomePoint {
  bucket?: string
  date?: string
  total_amount?: number | string
}

interface NetWorthRow {
  type: string
  total_balance: number | string
}

interface Account {
  id: string
  type: string
  balance: number | string
}

const RANGE_TO_DAYS: Record<string, number> = {
  '1m': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
  ytd: 0,
}

function formatMoney(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  const value = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${sign}$${value}`
}

function rangeBoundaries(range: string): { startDate: string; endDate: string } {
  const end = new Date()
  let start: Date
  if (range === 'ytd') {
    start = new Date(end.getFullYear(), 0, 1)
  } else {
    const days = RANGE_TO_DAYS[range] ?? 90
    start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000)
  }
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { startDate: fmt(start), endDate: fmt(end) }
}

function asArray<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[]
  const data = (res as { data?: unknown })?.data
  if (Array.isArray(data)) return data as T[]
  return []
}

function Reports() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [activeTab, setActiveTab] = useState('3m')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [spending, setSpending] = useState<SpendingRow[]>([])
  const [incomeSeries, setIncomeSeries] = useState<IncomePoint[]>([])
  const [netWorthRows, setNetWorthRows] = useState<NetWorthRow[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { startDate, endDate } = rangeBoundaries(activeTab)
        const [aRes, cRes, sRes, iRes, nRes] = await Promise.all([
          http.get('/api/accounts').catch(() => []),
          http.get('/api/categories').catch(() => []),
          http
            .get(`/api/reports/spending-by-category?start_date=${startDate}&end_date=${endDate}`)
            .catch(() => []),
          http
            .get(
              `/api/reports/income-vs-expenses?start_date=${startDate}&end_date=${endDate}&interval=month`,
            )
            .catch(() => []),
          http.get('/api/reports/net-worth').catch(() => []),
        ])
        if (cancelled) return
        setAccounts(asArray<Account>(aRes))
        setCategories(asArray<Category>(cRes))
        setSpending(asArray<SpendingRow>(sRes))
        setIncomeSeries(asArray<IncomePoint>(iRes))
        setNetWorthRows(asArray<NetWorthRow>(nRes))
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : t('nav.failedToLoadReports', {}, { defaultValue: 'Failed to load reports.' }),
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, activeTab]) // t is a stable ref; re-fetch is driven by http/activeTab changes only

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>()
    categories.forEach((c) => map.set(c.id, c))
    return map
  }, [categories])

  const totalSpending = useMemo(
    () => spending.reduce((s, r) => s + Number(r.total_amount || 0), 0),
    [spending],
  )

  const incomeBuckets = useMemo(() => {
    return incomeSeries.map((p) => ({
      label: (p.bucket || p.date || '').slice(0, 10),
      total: Number(p.total_amount || 0),
    }))
  }, [incomeSeries])

  const totalIncome = useMemo(() => incomeBuckets.reduce((s, b) => s + b.total, 0), [incomeBuckets])

  const totalNetWorth = useMemo(
    () => netWorthRows.reduce((s, r) => s + Number(r.total_balance || 0), 0),
    [netWorthRows],
  )

  const totalAssets = useMemo(
    () =>
      accounts
        .filter((a) => Number(a.balance || 0) >= 0)
        .reduce((s, a) => s + Number(a.balance || 0), 0),
    [accounts],
  )

  const activeAccounts = accounts.length

  return (
    <div
      data-mol-id="reports-page"
      className={cm.cn(cm.surface, 'font-body text-on-surface antialiased')}
    >
      <TopNavBar />
      <SideNavBar />
      <main
        className={cm.cn(cm.sp('p', 8), 'md:ml-64 pt-24 pb-28 md:pb-12')}
        data-mol-id="main-canvas"
        data-loading={loading}
      >
        <div className={cm.cn('max-w-7xl', cm.mxAuto, cm.stack(8))}>
          <ReportsPageHeader />
          <ReportsFilterBar activeTab={activeTab} onTabChange={setActiveTab} />

          {error && (
            <div role="alert" className={cm.alert({ variant: 'error' })}>
              <div className={cm.alertDescription}>{error}</div>
            </div>
          )}

          <div
            className={cm.cn(cm.grid({ cols: 1, gap: 'xl' }), 'lg:grid-cols-2')}
            data-mol-id="reports-grid"
          >
            <section
              data-mol-id="reports-spending-by-category"
              className={cm.cn(cm.sp('p', 8), 'bg-surface-container-lowest rounded-3xl')}
            >
              <div
                className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 6))}
              >
                <h3
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('lg'),
                    'font-headline text-on-surface',
                  )}
                >
                  {t(
                    'reports.spendingByCategoryTitle',
                    {},
                    { defaultValue: 'Spending by category' },
                  )}
                </h3>
                <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {formatMoney(totalSpending)}
                </span>
              </div>
              {loading ? (
                <p className={cm.textMuted}>
                  {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                </p>
              ) : spending.length === 0 ? (
                <p className={cm.textMuted} data-mol-id="reports-spending-empty">
                  {t(
                    'reports.spendingEmpty',
                    {},
                    {
                      defaultValue:
                        'No spending logged in this range. Add a few transactions to see this fill in.',
                    },
                  )}
                </p>
              ) : (
                <ul className={cm.stack(3)}>
                  {spending.map((row) => {
                    const value = Number(row.total_amount || 0)
                    const pct = totalSpending > 0 ? Math.round((value / totalSpending) * 100) : 0
                    const cat = categoryMap.get(row.category_id)
                    const name = cat?.name || row.category_id || 'Uncategorized'
                    return (
                      <li key={row.category_id || name} data-mol-id="reports-spending-row">
                        <div
                          className={cm.cn(
                            cm.flex({ justify: 'between', align: 'center' }),
                            cm.sp('mb', 1),
                          )}
                        >
                          <span className={cm.cn(cm.fontWeight('semibold'))}>{name}</span>
                          <span className={cm.cn(cm.textSize('sm'))}>
                            {formatMoney(value)} <span className={cm.textMuted}>({pct}%)</span>
                          </span>
                        </div>
                        <div className={cm.cn('h-2 w-full rounded-full bg-surface-container')}>
                          <div
                            className={cm.cn('h-2 rounded-full bg-primary')}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section
              data-mol-id="reports-income-vs-expenses"
              className={cm.cn(cm.sp('p', 8), 'bg-surface-container-lowest rounded-3xl')}
            >
              <div
                className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 6))}
              >
                <h3
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('lg'),
                    'font-headline text-on-surface',
                  )}
                >
                  {t('reports.incomeVsExpensesTitle', {}, { defaultValue: 'Income vs expenses' })}
                </h3>
                <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {formatMoney(totalIncome - totalSpending)}
                </span>
              </div>
              {loading ? (
                <p className={cm.textMuted}>
                  {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                </p>
              ) : incomeBuckets.length === 0 ? (
                <p className={cm.textMuted} data-mol-id="reports-income-empty">
                  {t(
                    'reports.incomeEmpty',
                    {},
                    {
                      defaultValue:
                        'No transactions logged in this range. Add some to see the trend over time.',
                    },
                  )}
                </p>
              ) : (
                <ul className={cm.stack(2)}>
                  {incomeBuckets.map((b) => (
                    <li
                      key={b.label}
                      className={cm.cn(
                        cm.flex({ justify: 'between', align: 'center' }),
                        cm.sp('p', 2),
                      )}
                      data-mol-id="reports-income-row"
                    >
                      <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                        {b.label}
                      </span>
                      <span className={cm.cn(cm.fontWeight('semibold'))}>
                        {formatMoney(b.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section
              data-mol-id="reports-net-worth"
              className={cm.cn(cm.sp('p', 8), 'bg-surface-container-lowest rounded-3xl')}
            >
              <h3
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('lg'),
                  cm.sp('mb', 6),
                  'font-headline text-on-surface',
                )}
              >
                {t('reports.netWorthTitle', {}, { defaultValue: 'Net worth by account type' })}
              </h3>
              {loading ? (
                <p className={cm.textMuted}>
                  {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                </p>
              ) : netWorthRows.length === 0 ? (
                <p className={cm.textMuted} data-mol-id="reports-net-worth-empty">
                  {t(
                    'reports.netWorthEmpty',
                    {},
                    {
                      defaultValue: 'No accounts yet — add an account to start tracking net worth.',
                    },
                  )}
                </p>
              ) : (
                <ul className={cm.stack(3)}>
                  {netWorthRows.map((row) => {
                    const value = Number(row.total_balance || 0)
                    const total = Math.abs(totalNetWorth) || 1
                    const pct = Math.round((Math.abs(value) / total) * 100)
                    return (
                      <li
                        key={row.type}
                        data-mol-id="reports-net-worth-row"
                        className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}
                      >
                        <span className={cm.cn(cm.fontWeight('semibold'), 'capitalize')}>
                          {row.type.replace(/_/g, ' ')}
                        </span>
                        <span className={cm.cn(cm.textSize('sm'))}>
                          {formatMoney(value)} <span className={cm.textMuted}>({pct}%)</span>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
              <div
                className={cm.cn(
                  cm.flex({ justify: 'between', align: 'center' }),
                  cm.sp('mt', 6),
                  cm.sp('pt', 4),
                  'border-t border-surface-container-high',
                )}
              >
                <span className={cm.cn(cm.fontWeight('bold'))}>
                  {t('reports.netWorthTotal', {}, { defaultValue: 'Total net worth' })}
                </span>
                <span
                  className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'))}
                  data-mol-id="reports-net-worth-total"
                >
                  {formatMoney(totalNetWorth)}
                </span>
              </div>
            </section>

            <section
              data-mol-id="reports-portfolio"
              className={cm.cn(cm.sp('p', 8), 'bg-surface-container-lowest rounded-3xl')}
            >
              <h3
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('lg'),
                  cm.sp('mb', 6),
                  'font-headline text-on-surface',
                )}
              >
                {t('reports.portfolioTitle', {}, { defaultValue: 'Portfolio summary' })}
              </h3>
              <ul className={cm.stack(3)}>
                <li className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
                  <span className={cm.cn('text-on-surface-variant')}>
                    {t('reports.activeAccounts', {}, { defaultValue: 'Active Accounts' })}
                  </span>
                  <span
                    className={cm.cn(cm.fontWeight('bold'))}
                    data-mol-id="reports-active-accounts"
                  >
                    {activeAccounts}
                  </span>
                </li>
                <li className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
                  <span className={cm.cn('text-on-surface-variant')}>
                    {t('reports.totalAssets', {}, { defaultValue: 'Total Assets' })}
                  </span>
                  <span className={cm.cn(cm.fontWeight('bold'))} data-mol-id="reports-total-assets">
                    {formatMoney(totalAssets)}
                  </span>
                </li>
                <li className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
                  <span className={cm.cn('text-on-surface-variant')}>
                    {t('reports.totalCategories', {}, { defaultValue: 'Categories tracked' })}
                  </span>
                  <span className={cm.cn(cm.fontWeight('bold'))}>{categories.length}</span>
                </li>
                <li className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
                  <span className={cm.cn('text-on-surface-variant')}>
                    {t('reports.netSavings', {}, { defaultValue: 'Net savings (range)' })}
                  </span>
                  <span className={cm.cn(cm.fontWeight('bold'))} data-mol-id="reports-net-savings">
                    {formatMoney(totalIncome - totalSpending)}
                  </span>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </main>
      {/* Mobile Navigation (Fixed Bottom) */}
      <BottomNavBar />
    </div>
  )
}

export default Reports
export { Reports, Reports as ReportsPage }
