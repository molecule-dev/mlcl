import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CashHeroCard } from '../components/CashHeroCard.js'
import { LedgerStatTriad } from '../components/LedgerStatTriad.js'
import { type RecentInvoiceItem, RecentInvoicesCard } from '../components/RecentInvoicesCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface MonthPoint {
  month: string
  amount_cents: number
}

interface DashboardStats {
  cash_on_hand_cents: number
  outstanding_cents: number
  overdue_cents: number
  mtd_revenue_cents: number
  mtd_expenses_cents: number
  ytd_revenue_cents: number
  ytd_profit_cents: number
  revenue_history: MonthPoint[]
  expenses_history?: MonthPoint[]
}

interface DueInvoice {
  id: string
  number: string
  customer_name: string
  due_date: string
  amount_cents: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void'
}

const DAY_MS = 86_400_000

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** "In 3 days" / "Due today" / "Overdue" chip copy for a due date. */
function dueChip(days: number): string {
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  return `in ${days} ${days === 1 ? 'day' : 'days'}`
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [invoices, setInvoices] = useState<RecentInvoiceItem[]>([])
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
        setInvoices(unwrapList<RecentInvoiceItem>(iRes))
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
  const expenses = (stats.expenses_history ?? []).map((p) => ({
    month: p.month,
    amountCents: p.amount_cents,
  }))

  // Due this week: unpaid invoices whose due date falls inside the next 7
  // days, plus anything already overdue — "action needed" items, soonest due
  // first. Drafts are excluded (nothing is owed on a draft).
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekAhead = today.getTime() + 7 * DAY_MS
  const dueThisWeek = invoices
    .filter((inv) => {
      if (inv.status === 'paid' || inv.status === 'void' || inv.status === 'draft') return false
      const due = Date.parse(inv.due_date)
      return Number.isFinite(due) && due <= weekAhead
    })
    .sort((a, b) => Date.parse(a.due_date) - Date.parse(b.due_date))
    .slice(0, 5)

  const todayLabel = today.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

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
          data-mol-id="dashboard-new-invoice-cta"
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

      <section aria-labelledby="dashboard-financial-overview">
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 1),
            'uppercase tracking-[0.2em] text-on-surface-variant',
          )}
        >
          {todayLabel}
        </p>
        <h2 id="dashboard-financial-overview" className={cm.sectionHeading}>
          {t('dashboard.financialOverview', {}, { defaultValue: 'Financial overview' })}
        </h2>
        <div className={cm.cn('space-y-8', cm.sp('mt', 4))}>
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
        </div>
      </section>

      <RevenueVsExpenses revenue={revenue} expenses={expenses} />

      <RecentInvoicesCard invoices={invoices.slice(0, 6)} />

      <DueThisWeekCard items={dueThisWeek} />
    </div>
  )
}

/**
 * "Revenue vs expenses" — paired bar chart over the same 12-month window the
 * hero sparkline uses, revenue in success green and expenses in error red,
 * mirroring the design's dual-series chart card.
 */
function RevenueVsExpenses({
  revenue,
  expenses,
}: {
  revenue: { month: string; amountCents: number }[]
  expenses: { month: string; amountCents: number }[]
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const points = revenue.map((r, i) => ({
    month: r.month,
    revenueCents: r.amountCents,
    expensesCents: expenses[i]?.amountCents ?? 0,
  }))
  const max = Math.max(...points.map((p) => Math.max(p.revenueCents, p.expensesCents)), 1)

  return (
    <section className={cm.cn(cm.card(), cm.sp('p', 6))} aria-labelledby="dashboard-rev-exp">
      <h2 id="dashboard-rev-exp" className={cm.cn(cm.sectionHeading, cm.sp('mb', 1))}>
        {t('dashboard.revenueVsExpenses', {}, { defaultValue: 'Revenue vs expenses' })}
      </h2>
      <div className={cm.cn(cm.flex({ gap: 'md' }), cm.textSize('xs'), 'text-on-surface-variant')}>
        <span className={cm.flex({ align: 'center', gap: 'xs' })}>
          <span className={cm.cn('inline-block w-3 h-0.5 bg-success')} aria-hidden="true" />
          {t('dashboard.legend.revenue', {}, { defaultValue: 'Revenue' })}
        </span>
        <span className={cm.flex({ align: 'center', gap: 'xs' })}>
          <span className={cm.cn('inline-block w-3 h-0.5 bg-error')} aria-hidden="true" />
          {t('dashboard.legend.expenses', {}, { defaultValue: 'Expenses' })}
        </span>
      </div>
      {points.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
          {t('dashboard.chartEmpty', {}, { defaultValue: 'No activity in the last 12 months.' })}
        </p>
      ) : (
        <svg viewBox="0 0 600 200" className={cm.cn('w-full h-48', cm.sp('mt', 3))} role="img">
          {points.map((p, i, arr) => {
            const w = 600 / arr.length
            const x = i * w + 4
            const revH = (p.revenueCents / max) * 90
            const expH = (p.expensesCents / max) * 90
            return (
              <g key={p.month}>
                <rect
                  x={x}
                  y={100 - revH}
                  width={(w - 8) / 2}
                  height={revH}
                  fill="var(--mol-color-success)"
                />
                <rect
                  x={x + (w - 8) / 2 + 2}
                  y={100}
                  width={(w - 8) / 2}
                  height={expH}
                  fill="var(--mol-color-error)"
                />
              </g>
            )
          })}
        </svg>
      )}
    </section>
  )
}

/**
 * "Due this week" — unpaid invoices due within the next 7 days (overdue
 * included, soonest first) with customer, invoice number, a relative due
 * chip, and the amount, per the design's action-needed panel.
 */
function DueThisWeekCard({ items }: { items: DueInvoice[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <section className={cm.cn(cm.card(), cm.sp('p', 6))} aria-labelledby="dashboard-due-week">
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 3))}>
        <h2 id="dashboard-due-week" className={cm.sectionHeading}>
          {t('dashboard.dueThisWeek', {}, { defaultValue: 'Due this week' })}
        </h2>
        <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('dashboard.dueSubtitle', {}, { defaultValue: 'Action needed on outstanding items' })}
        </span>
      </div>
      {items.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
          {t('dashboard.dueEmpty', {}, { defaultValue: 'Nothing due in the next 7 days.' })}
        </p>
      ) : (
        <ul className="divide-y divide-outline-variant">
          {items.map((inv) => {
            const days = Math.round((Date.parse(inv.due_date) - today.getTime()) / DAY_MS)
            const overdue = days < 0
            return (
              <li key={inv.id}>
                <Link
                  to={`/invoices/${inv.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('py', 3),
                    'hover:bg-surface-container',
                  )}
                >
                  <div>
                    <p className={cm.cn(cm.fontWeight('semibold'))}>{inv.customer_name}</p>
                    <p className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}>
                      {inv.number}
                    </p>
                  </div>
                  <div className={cm.flex({ align: 'center', gap: 'md' })}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        cm.roundedFull,
                        overdue ? 'bg-error/15 text-error' : 'bg-warning/15 text-warning',
                      )}
                    >
                      {overdue
                        ? t('dashboard.dueOverdue', {}, { defaultValue: 'Overdue' })
                        : dueChip(days)}
                    </span>
                    <span className={cm.cn(cm.fontWeight('semibold'), 'tabular-nums')}>
                      {fmtUsd(inv.amount_cents)}
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      <Link
        to="/invoices"
        data-mol-id="dashboard-due-week-view-all"
        className={cm.cn(
          'block w-full pt-3 text-sm font-bold text-center text-on-surface-variant hover:text-primary transition-colors',
        )}
      >
        {t('dashboard.dueViewAll', {}, { defaultValue: 'View all upcoming →' })}
      </Link>
    </section>
  )
}
