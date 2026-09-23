import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import BottomNavBar from '../components/BottomNavBar.js'
import DashboardTopNavBar from '../components/DashboardTopNavBar.js'
import SideNavBar from '../components/SideNavBar.js'

interface Account {
  id: string
  name: string
  type: string
  balance: number
  currency?: string
}

interface Transaction {
  id: string
  account_id?: string
  amount: number
  type?: string
  description?: string
  date?: string
  category_name?: string
}

interface Budget {
  id: string
  category_id?: string
  category_name?: string
  amount: number
  spent?: number
  icon?: string
}

interface Goal {
  id: string
  name: string
  target_amount: number
  current_amount: number
}

const ACCOUNT_TYPE_TO_KIND: Record<string, 'cash' | 'investments' | 'other'> = {
  checking: 'cash',
  savings: 'cash',
  cash: 'cash',
  investment: 'investments',
  brokerage: 'investments',
  retirement: 'investments',
  crypto: 'investments',
  credit: 'other',
  credit_card: 'other',
  loan: 'other',
}

function formatMoney(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  const value = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${sign}$${value}`
}

function iconForAccountType(type: string): string {
  switch (type) {
    case 'savings':
      return 'savings'
    case 'credit':
    case 'credit_card':
      return 'credit_card'
    case 'investment':
    case 'brokerage':
    case 'retirement':
      return 'trending_up'
    default:
      return 'account_balance'
  }
}

function iconForCategory(name: string | undefined): string {
  const norm = (name || '').toLowerCase()
  if (norm.includes('groc')) return 'local_grocery_store'
  if (norm.includes('din') || norm.includes('restaurant') || norm.includes('food'))
    return 'restaurant'
  if (norm.includes('rent') || norm.includes('home') || norm.includes('housing')) return 'home'
  if (norm.includes('transport') || norm.includes('uber') || norm.includes('lyft')) return 'commute'
  if (norm.includes('entertain') || norm.includes('netflix') || norm.includes('movie'))
    return 'theater_comedy'
  if (norm.includes('health') || norm.includes('gym') || norm.includes('fitness'))
    return 'fitness_center'
  if (norm.includes('shop') || norm.includes('amazon')) return 'shopping_bag'
  if (norm.includes('income') || norm.includes('salary') || norm.includes('payroll'))
    return 'payments'
  if (norm.includes('utility') || norm.includes('elec') || norm.includes('water')) return 'flash_on'
  return 'category'
}

function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Month shown in the top bar — drives the budget-progress fetch.
  const [currentDate, setCurrentDate] = useState(() => new Date())

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const month = currentDate.getMonth() + 1
        const year = currentDate.getFullYear()
        const [aRes, tRes, bRes, gRes] = await Promise.all([
          http.get('/api/accounts').catch(() => []),
          http.get('/api/transactions?limit=8').catch(() => []),
          http.get(`/api/budgets?month=${month}&year=${year}`).catch(() => []),
          http.get('/api/goals').catch(() => []),
        ])
        if (cancelled) return
        const arr = <T,>(res: unknown): T[] =>
          Array.isArray(res)
            ? (res as T[])
            : Array.isArray((res as { data?: T[] })?.data)
              ? (res as { data: T[] }).data
              : []
        setAccounts(arr<Account>(aRes))
        setTransactions(arr<Transaction>(tRes))
        setBudgets(arr<Budget>(bRes))
        setGoals(arr<Goal>(gRes))
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : t('dashboard.loadError', {}, { defaultValue: 'Failed to load dashboard data.' }),
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
  }, [http, currentDate]) // t is a stable ref; re-fetch is driven by http/month changes only
  const netWorth = useMemo(
    () => accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0),
    [accounts],
  )

  const allocation = useMemo(() => {
    const totals: Record<'cash' | 'investments' | 'other', number> = {
      cash: 0,
      investments: 0,
      other: 0,
    }
    let totalAbs = 0
    accounts.forEach((a) => {
      const kind = ACCOUNT_TYPE_TO_KIND[a.type] || 'other'
      const v = Math.abs(Number(a.balance || 0))
      totals[kind] += v
      totalAbs += v
    })
    if (totalAbs === 0) {
      return { cash: 0, investments: 0, other: 0 }
    }
    return {
      cash: Math.round((totals.cash / totalAbs) * 100),
      investments: Math.round((totals.investments / totalAbs) * 100),
      other: Math.round((totals.other / totalAbs) * 100),
    }
  }, [accounts])

  const featuredAccounts = accounts.slice(0, 3)
  const featuredGoal = goals[0]

  return (
    <div
      data-mol-id="dashboard"
      className={cm.cn(
        'bg-background text-on-background selection:bg-primary-fixed selection:text-on-primary-fixed',
      )}
      aria-label={t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
    >
      <SideNavBar />
      <DashboardTopNavBar
        currentDate={currentDate}
        onPrevMonth={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
        onNextMonth={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
      />
      <main
        className={cm.cn(cm.sp('p', 8), cm.minH('screen'), 'md:ml-64 pt-24 pb-28 md:pb-8')}
        aria-label={t('dashboard.mainRegion', {}, { defaultValue: 'Dashboard main content' })}
      >
        <div className={cm.cn('max-w-7xl', cm.mxAuto, cm.stack(8))}>
          {error && (
            <div role="alert" className={cm.alert({ variant: 'error' })}>
              <div className={cm.alertDescription}>{error}</div>
            </div>
          )}

          {/* Net worth + Allocation */}
          <section
            className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-12 items-stretch')}
          >
            <div
              data-mol-id="dashboard-net-worth"
              className={cm.cn(
                cm.flex({ direction: 'col', justify: 'between' }),
                cm.sp('p', 10),
                'min-h-[320px] lg:col-span-8 bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-white relative overflow-hidden',
              )}
            >
              <div className={cm.cn('relative z-10')}>
                <h2
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    cm.sp('mb', 2),
                    'font-headline uppercase tracking-widest text-primary-fixed/80',
                  )}
                >
                  {t('netWorthCard.title', {}, { defaultValue: 'Total Net Worth' })}
                </h2>
                <span
                  data-mol-id="dashboard-net-worth-amount"
                  className={cm.cn('text-6xl font-extrabold tracking-tighter')}
                >
                  {loading ? '—' : formatMoney(netWorth)}
                </span>
                {!loading && accounts.length === 0 && (
                  <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 4), 'text-white/80')}>
                    {t(
                      'dashboard.noAccounts',
                      {},
                      {
                        defaultValue:
                          'Add your first account to start tracking your financial picture.',
                      },
                    )}{' '}
                    <Link to="/accounts" className="underline">
                      {t('dashboard.addAccountLink', {}, { defaultValue: 'Add an account →' })}
                    </Link>
                  </p>
                )}
              </div>
              <div
                className={cm.cn(
                  cm.w(80),
                  cm.h(80),
                  cm.roundedFull,
                  'absolute -right-20 -bottom-20 bg-surface/10 blur-3xl',
                )}
              ></div>
            </div>

            <div
              data-mol-id="dashboard-asset-allocation"
              className={cm.cn(
                cm.flex({ direction: 'col', justify: 'center' }),
                cm.sp('p', 6),
                'lg:col-span-4 bg-surface-container-lowest rounded-2xl',
              )}
            >
              <h3
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('lg'),
                  cm.sp('mb', 6),
                  'font-headline',
                )}
              >
                {t('assetAllocationCard.title', {}, { defaultValue: 'Asset Allocation' })}
              </h3>
              <div className={cm.stack(6)}>
                {(['cash', 'investments', 'other'] as const).map((kind) => (
                  <div
                    key={kind}
                    className={cm.flex({ align: 'center', justify: 'between' })}
                    data-mol-id={`dashboard-allocation-${kind}`}
                  >
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <div
                        className={cm.cn(
                          cm.roundedFull,
                          cm.w(3),
                          cm.h(3),
                          kind === 'cash'
                            ? 'bg-primary'
                            : kind === 'investments'
                              ? 'bg-secondary'
                              : 'bg-tertiary',
                        )}
                      ></div>
                      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                        {kind === 'cash'
                          ? t('assetAllocationCard.cash', {}, { defaultValue: 'Cash' })
                          : kind === 'investments'
                            ? t(
                                'assetAllocationCard.investments',
                                {},
                                { defaultValue: 'Investments' },
                              )
                            : t('assetAllocationCard.other', {}, { defaultValue: 'Other' })}
                      </span>
                    </div>
                    <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                      {allocation[kind]}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Account overview */}
          <section
            data-mol-id="dashboard-account-overview"
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}
          >
            {featuredAccounts.length === 0 && !loading ? (
              <div
                className={cm.cn(
                  cm.sp('p', 6),
                  'md:col-span-3 bg-surface-container-low rounded-2xl text-center',
                )}
              >
                <p className={cm.textMuted}>
                  {t(
                    'dashboard.noAccountsHint',
                    {},
                    { defaultValue: 'No accounts yet — head to Accounts to add one.' },
                  )}
                </p>
              </div>
            ) : (
              featuredAccounts.map((a) => (
                <Link
                  key={a.id}
                  to={`/accounts/${a.id}`}
                  data-mol-id="dashboard-account-card"
                  className={cm.cn(
                    cm.sp('p', 6),
                    cm.cursorPointer,
                    'bg-surface-container-low rounded-2xl hover:bg-surface-container-lowest transition-all group block',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ justify: 'between', align: 'start' }),
                      cm.sp('mb', 6),
                    )}
                  >
                    <div
                      className={cm.cn(
                        cm.sp('p', 3),
                        cm.textPrimary,
                        'bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
                      )}
                    >
                      <span className={cm.cn('material-symbols-outlined')}>
                        {iconForAccountType(a.type)}
                      </span>
                    </div>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest text-foreground-tertiary',
                      )}
                    >
                      {a.name}
                    </span>
                  </div>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      cm.sp('mb', 1),
                      'text-foreground-secondary capitalize',
                    )}
                  >
                    {a.type.replace(/_/g, ' ')}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('3xl'),
                      'font-manrope font-extrabold',
                      a.balance < 0 ? 'text-tertiary' : '',
                    )}
                  >
                    {formatMoney(Number(a.balance || 0))}
                  </p>
                </Link>
              ))
            )}
          </section>

          {/* Activity + Budgets/Goals */}
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'xl' }), 'lg:grid-cols-12')}>
            {/* Recent Activity */}
            <div
              data-mol-id="dashboard-recent-activity"
              className={cm.cn(
                cm.sp('p', 6),
                'lg:col-span-8 bg-surface-container-lowest rounded-2xl',
              )}
            >
              <div
                className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 4))}
              >
                <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'font-headline')}>
                  {t('dashboard.recentActivity', {}, { defaultValue: 'Recent Activity' })}
                </h3>
                <Link
                  to="/transactions"
                  className={cm.cn(cm.textSize('sm'), 'text-primary font-medium')}
                >
                  {t('dashboard.viewAll', {}, { defaultValue: 'View All' })}
                </Link>
              </div>
              {loading && (
                <div className={cm.stack(2)}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className={cm.cn('h-14 rounded-xl bg-surface-container-low animate-pulse')}
                    />
                  ))}
                </div>
              )}
              {!loading && transactions.length === 0 && (
                <p className={cm.textMuted} data-mol-id="dashboard-no-transactions">
                  {t(
                    'dashboard.noTransactions',
                    {},
                    {
                      defaultValue:
                        'No transactions yet — add one from the Add Transaction page to get started.',
                    },
                  )}
                </p>
              )}
              {!loading && transactions.length > 0 && (
                <ul className={cm.stack(2)}>
                  {transactions.slice(0, 8).map((tx) => {
                    const positive = (tx.type ?? '').toLowerCase() === 'income' || tx.amount > 0
                    return (
                      <li key={tx.id}>
                        <Link
                          to={`/transactions/${tx.id}`}
                          data-mol-id="dashboard-transaction-row"
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'between' }),
                            cm.sp('p', 3),
                            cm.cursorPointer,
                            'rounded-xl hover:bg-surface-container-low',
                          )}
                        >
                          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                            <span
                              className={cm.cn(
                                cm.flex({ align: 'center', justify: 'center' }),
                                cm.w(10),
                                cm.h(10),
                                cm.roundedFull,
                                'material-symbols-outlined bg-surface-container text-on-surface-variant',
                              )}
                            >
                              {iconForCategory(tx.category_name)}
                            </span>
                            <div>
                              <p className={cm.cn(cm.fontWeight('semibold'))}>
                                {tx.description || tx.category_name || '—'}
                              </p>
                              <div
                                className={cm.cn(
                                  cm.flex({ gap: 'sm' }),
                                  cm.textSize('xs'),
                                  'text-foreground-secondary',
                                )}
                              >
                                {tx.category_name && <span>{tx.category_name}</span>}
                                {tx.date && <span>{new Date(tx.date).toLocaleDateString()}</span>}
                              </div>
                            </div>
                          </div>
                          <span
                            className={cm.cn(
                              cm.fontWeight('bold'),
                              positive ? 'text-secondary' : 'text-on-surface',
                            )}
                          >
                            {positive ? '+' : '-'}${Math.abs(Number(tx.amount || 0)).toFixed(2)}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Budgets & Goals sidebar */}
            <aside
              data-mol-id="dashboard-budget-goals"
              className={cm.cn(cm.stack(6), 'lg:col-span-4')}
            >
              <div
                data-mol-id="dashboard-budget-progress"
                className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl')}
              >
                <h3
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('lg'),
                    cm.sp('mb', 4),
                    'font-headline',
                  )}
                >
                  {t('dashboard.budgetProgress', {}, { defaultValue: 'Budget Progress' })}
                </h3>
                {loading && (
                  <div className="h-16 rounded-xl bg-surface-container-low animate-pulse" />
                )}
                {!loading && budgets.length === 0 && (
                  <p className={cm.textMuted}>
                    {t(
                      'dashboard.noBudgets',
                      {},
                      { defaultValue: 'No budgets yet for this month.' },
                    )}{' '}
                    <Link
                      to="/budgets"
                      className={cm.cn('text-primary underline underline-offset-2')}
                    >
                      {t('dashboard.addBudgetLink', {}, { defaultValue: 'Add one' })}
                    </Link>
                  </p>
                )}
                {!loading && budgets.length > 0 && (
                  <ul className={cm.stack(4)}>
                    {budgets.slice(0, 4).map((b) => {
                      const pct = b.amount > 0 ? Math.round(((b.spent || 0) / b.amount) * 100) : 0
                      const over = pct > 100
                      return (
                        <li key={b.id} data-mol-id="dashboard-budget-row">
                          <div
                            className={cm.cn(
                              cm.flex({ justify: 'between', align: 'center' }),
                              cm.sp('mb', 1),
                            )}
                          >
                            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                              <span className={cm.cn('material-symbols-outlined')}>
                                {iconForCategory(b.category_name)}
                              </span>
                              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                                {b.category_name || '—'}
                              </span>
                            </div>
                            <span className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>
                              ${Number(b.spent || 0).toFixed(2)} / $
                              {Number(b.amount || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className={cm.cn('h-2 w-full rounded-full bg-surface-container')}>
                            <div
                              className={cm.cn(
                                'h-2 rounded-full',
                                over ? 'bg-error' : 'bg-primary',
                              )}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              {featuredGoal && (
                <Link
                  to="/goals"
                  data-mol-id="dashboard-goal"
                  className={cm.cn(
                    cm.sp('p', 6),
                    'block bg-secondary-container text-on-secondary-container rounded-2xl',
                  )}
                >
                  <p className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest opacity-70')}>
                    {t('dashboard.savingGoal', {}, { defaultValue: 'Saving Goal' })}
                  </p>
                  <h4 className={cm.cn(cm.fontWeight('bold'), cm.textSize('xl'), cm.sp('mt', 1))}>
                    {featuredGoal.name}
                  </h4>
                  <div
                    className={cm.cn(
                      cm.flex({ justify: 'between' }),
                      cm.sp('mt', 4),
                      cm.textSize('sm'),
                    )}
                  >
                    <span className={cm.fontWeight('semibold')}>
                      ${Number(featuredGoal.current_amount || 0).toFixed(2)}
                    </span>
                    <span>
                      {t('dashboard.goalTarget', {}, { defaultValue: 'Target' })}: $
                      {Number(featuredGoal.target_amount || 0).toFixed(2)}
                    </span>
                  </div>
                </Link>
              )}
            </aside>
          </div>
        </div>
      </main>
      {/* Mobile Navigation (Fixed Bottom) */}
      <BottomNavBar />
    </div>
  )
}

export default Dashboard
export { Dashboard, Dashboard as DashboardPage }
