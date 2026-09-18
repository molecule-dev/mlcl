import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CashHeroCard } from '../components/CashHeroCard.js'
import { LedgerStatTriad } from '../components/LedgerStatTriad.js'
import { type RecentInvoiceItem, RecentInvoicesCard } from '../components/RecentInvoicesCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface DashboardStats {
  cash_on_hand_cents: number
  outstanding_cents: number
  overdue_cents: number
  mtd_revenue_cents: number
  mtd_expenses_cents: number
  ytd_revenue_cents: number
  ytd_profit_cents: number
  revenue_history: { month: string; amount_cents: number }[]
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recent, setRecent] = useState<RecentInvoiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/reports/dashboard_stats').catch(() => null),
      http.get('/api/invoices').catch(() => null),
    ])
      .then(([sRes, iRes]) => {
        if (cancelled) return
        setStats(unwrapSingle<DashboardStats>(sRes))
        setRecent(unwrapList<RecentInvoiceItem>(iRes).slice(0, 6))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('nav.failedToLoadDashboard', {}, { defaultValue: 'Failed to load dashboard.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }
  if (error || !stats) {
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-error')}>
        {error ?? t('dashboard.empty', {}, { defaultValue: 'No data.' })}
      </div>
    )
  }

  const revenue = stats.revenue_history.map((p) => ({
    month: p.month,
    amountCents: p.amount_cents,
  }))

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-8')}>
      <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 1),
              'uppercase tracking-[0.2em] text-on-surface-variant',
            )}
          >
            {t('status.today', {}, { defaultValue: 'Today' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('dashboard.heading', {}, { defaultValue: 'The books, in a glance' })}
          </h1>
        </div>
        <Link
          to="/invoices/new"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-full hover:bg-primary-dark transition-colors',
          )}
        >
          {t('nav.newInvoice', {}, { defaultValue: 'New invoice' })}
        </Link>
      </header>

      <CashHeroCard
        cashOnHandCents={stats.cash_on_hand_cents}
        outstandingCents={stats.outstanding_cents}
        overdueCents={stats.overdue_cents}
        ytdRevenueCents={stats.ytd_revenue_cents}
        ytdProfitCents={stats.ytd_profit_cents}
        revenueHistory={revenue}
      />

      <LedgerStatTriad
        mtdRevenueCents={stats.mtd_revenue_cents}
        mtdExpensesCents={stats.mtd_expenses_cents}
        outstandingCents={stats.outstanding_cents}
        overdueCents={stats.overdue_cents}
      />

      <RecentInvoicesCard invoices={recent} />
    </div>
  )
}
