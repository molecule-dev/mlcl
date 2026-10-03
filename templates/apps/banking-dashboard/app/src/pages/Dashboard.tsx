import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { DataTableCard } from '@molecule/app-data-table-ui-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { AccountsTriad } from '../components/AccountsTriad.js'
import { BalanceHeroCard } from '../components/BalanceHeroCard.js'
import { CashCreditCard } from '../components/CashCreditCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Account {
  id: string
  name: string
  kind: 'checking' | 'savings' | 'credit' | 'brokerage' | 'loan'
  balance_cents: number
  available_cents: number
  /** ISO-4217 code for this account's balances (defaults to USD). */
  currency?: string
  last4: string
}

interface Transaction {
  id: string
  account_id: string
  merchant: string
  amount_cents: number
  posted_at: string
  category: string
}

interface DashboardStats {
  net_worth_cents: number
  net_worth_change_30d_cents: number
  cash_on_hand_cents: number
  credit_used_cents: number
  credit_limit_cents: number
  balance_history_30d?: Array<{ date: string; net_worth_cents: number }>
}

function fmt(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  return `${sign}$${(abs / 100).toFixed(2)}`
}

function fmtRelative(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [recent, setRecent] = useState<Transaction[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<{ a: boolean; t: boolean; s: boolean }>({
    a: true,
    t: true,
    s: true,
  })
  const aOk = ok.a
  const tOk = ok.t
  const sOk = ok.s

  // Extracted so the shared LoadErrorBanner's Retry can re-run the same
  // fetches the mount effect uses (the banner owns the retry pending state).
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Per-request success flags: every GET below swallows its own failure,
      // so "all three failed" is the only reliable total-failure signal and
      // must surface the error state instead of a silent empty dashboard.
      const [aRes, tRes, sRes] = await Promise.all([
        http.get('/api/accounts').catch(() => null),
        http.get('/api/transactions').catch(() => null),
        http.get('/api/reports/dashboard_stats').catch(() => null),
      ])
      setOk({ a: aRes !== null, t: tRes !== null, s: sRes !== null })
      setAccounts(unwrapList<Account>(aRes))
      setRecent(unwrapList<Transaction>(tRes).slice(0, 5))
      setStats(unwrapSingle<DashboardStats>(sRes))
    } catch (_error) {
      setError(t('nav.failedToLoadDashboard', {}, { defaultValue: 'Failed to load dashboard.' }))
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void load()
  }, [load])

  if (error || (!loading && !aOk && !tOk && !sOk)) {
    return (
      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
        <LoadErrorBanner
          message={
            error ??
            t('nav.failedToLoadDashboard', {}, { defaultValue: 'Failed to load dashboard.' })
          }
          onRetry={load}
        />
      </div>
    )
  }
  if (loading) {
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('dashboard.heading', {}, { defaultValue: 'Overview' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t('dashboard.subheading', {}, { defaultValue: 'Money in motion, always clear.' })}
        </p>
      </header>

      {/* Hero row: BalanceHero (8 col) + CashCredit (4 col) */}
      {stats && (
        <section
          className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12 items-stretch')}
        >
          <BalanceHeroCard
            totalCents={stats.net_worth_cents}
            changeCents={stats.net_worth_change_30d_cents}
            history={stats.balance_history_30d}
          />
          <CashCreditCard
            cashCents={stats.cash_on_hand_cents}
            creditUsedCents={stats.credit_used_cents}
            creditLimitCents={stats.credit_limit_cents}
          />
        </section>
      )}

      {/* Featured accounts triad */}
      <section className={cm.stack(4)}>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('dashboard.accountsHeading', {}, { defaultValue: 'Accounts' })}
          </h2>
          <Link
            to="/accounts"
            className={cm.cn(
              cm.textSize('sm'),
              'font-bold text-primary hover:underline',
              'inline-flex items-center min-h-[36px] self-center',
            )}
          >
            {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
          </Link>
        </div>
        <AccountsTriad accounts={accounts} />
      </section>

      {/* Recent activity table */}
      <DataTableCard<Transaction>
        title={t('nav.recentActivity', {}, { defaultValue: 'Recent activity' })}
        titleAction={
          <Link
            to="/transactions"
            className={cm.cn(
              cm.textSize('sm'),
              'font-bold text-primary hover:underline',
              'inline-flex items-center min-h-[36px] self-center',
            )}
          >
            {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
          </Link>
        }
        columns={[
          {
            key: 'description',
            header: t('form.description', {}, { defaultValue: 'Description' }),
            cell: (tx) => (
              <div>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'text-on-surface line-clamp-1',
                  )}
                >
                  {tx.merchant}
                </p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{tx.category}</p>
              </div>
            ),
          },
          {
            key: 'date',
            header: t('form.date', {}, { defaultValue: 'Date' }),
            cell: (tx) => (
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {fmtRelative(tx.posted_at)}
              </span>
            ),
          },
          {
            key: 'amount',
            header: t('form.amount', {}, { defaultValue: 'Amount' }),
            headerClassName: cm.textCenter,
            cellClassName: cm.textCenter,
            cell: (tx) => (
              <span
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  'tabular-nums',
                  tx.amount_cents >= 0 ? 'text-success' : 'text-error',
                )}
              >
                {fmt(tx.amount_cents)}
              </span>
            ),
          },
        ]}
        rows={recent}
        rowKey={(tx) => tx.id}
        emptyMessage={t('dashboard.recentEmpty', {}, { defaultValue: 'No transactions yet.' })}
      />
    </div>
  )
}
