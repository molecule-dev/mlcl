import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BalanceHeroCard } from '../components/BalanceHeroCard.js'
import { type CategoryProgress, CategoryProgressRow } from '../components/CategoryProgressRow.js'
import { EnvelopeKpiCard } from '../components/EnvelopeKpiCard.js'
import { type Goal, GoalProgressCard } from '../components/GoalProgressCard.js'
import { type TransactionRecord, TransactionRow } from '../components/TransactionRow.js'
import { formatMoney, getCurrency } from '../lib/format.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface MonthSummary {
  month: string
  income_cents: number
  assigned_cents: number
  spent_cents: number
  available_cents: number
  net_worth_cents: number
  net_worth_change_30d_cents: number
}

interface NetWorthPoint {
  date: string
  net_worth_cents: number
}

function fmt(cents: number): string {
  return formatMoney(cents, getCurrency())
}

function monthLabel(month?: string): string {
  if (!month) return ''
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [summary, setSummary] = useState<MonthSummary | null>(null)
  const [categories, setCategories] = useState<CategoryProgress[]>([])
  const [recent, setRecent] = useState<TransactionRecord[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [history, setHistory] = useState<NetWorthPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/reports/month_summary').catch(() => null),
      http.get('/api/reports/category_progress').catch(() => null),
      http.get('/api/transactions').catch(() => null),
      http.get('/api/goals').catch(() => null),
      http.get('/api/reports/full').catch(() => null),
    ])
      .then(([sRes, cRes, tRes, gRes, fRes]) => {
        if (cancelled) return
        setSummary(unwrapSingle<MonthSummary>(sRes))
        setCategories(unwrapList<CategoryProgress>(cRes))
        setRecent(unwrapList<TransactionRecord>(tRes).slice(0, 6))
        setGoals(unwrapList<Goal>(gRes).slice(0, 3))
        const full = unwrapSingle<{ net_worth_history?: NetWorthPoint[] }>(fRes)
        setHistory(full?.net_worth_history ?? [])
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

  const overspent = useMemo(
    () => categories.filter((c) => c.spent_cents > c.assigned_cents),
    [categories],
  )
  const monthName = monthLabel(summary?.month)

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 10), cm.textCenter, 'text-on-surface-variant')}>
        {t('dashboard.loading', {}, { defaultValue: 'Loading your month…' })}
      </div>
    )
  }
  if (error) {
    return <div className={cm.cn(cm.sp('p', 10), cm.textCenter, 'text-error')}>{error}</div>
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-8')}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div>
          <p
            className={cm.cn(
              cm.fontWeight('extrabold'),
              'text-[11px] uppercase tracking-widest text-primary',
            )}
          >
            {t('dashboard.eyebrow', {}, { defaultValue: 'This month' })}
          </p>
          <h1
            className={cm.cn(
              cm.fontWeight('extrabold'),
              'text-3xl md:text-4xl tracking-tight mt-1',
            )}
          >
            {t('dashboard.heading', { month: monthName }, { defaultValue: '{{month}}' })}
          </h1>
        </div>
        <Link
          to="/budget"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-full bg-primary text-white hover:bg-primary/90 transition-colors inline-flex items-center gap-2',
          )}
        >
          {t('dashboard.openBudget', {}, { defaultValue: 'Open budget' })}
          <span className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}>
            arrow_forward
          </span>
        </Link>
      </header>

      <BalanceHeroCard
        monthLabel={monthName}
        availableCents={summary?.available_cents ?? 0}
        incomeCents={summary?.income_cents ?? 0}
        spentCents={summary?.spent_cents ?? 0}
        assignedCents={summary?.assigned_cents ?? 0}
        netWorthChangeCents={summary?.net_worth_change_30d_cents ?? 0}
        history={history}
      />

      <section className={cm.grid({ cols: 4, gap: 'md' })}>
        <EnvelopeKpiCard
          tone="income"
          icon="south_west"
          label={t('dashboard.kpi.income', {}, { defaultValue: 'Income' })}
          value={fmt(summary?.income_cents ?? 0)}
          caption={t('dashboard.kpi.incomeCaption', {}, { defaultValue: 'Received this month' })}
        />
        <EnvelopeKpiCard
          tone="assigned"
          icon="assignment"
          label={t('dashboard.kpi.assigned', {}, { defaultValue: 'Assigned' })}
          value={fmt(summary?.assigned_cents ?? 0)}
          caption={t('dashboard.kpi.assignedCaption', {}, { defaultValue: 'Across envelopes' })}
        />
        <EnvelopeKpiCard
          tone="spent"
          icon="shopping_cart"
          label={t('dashboard.kpi.spent', {}, { defaultValue: 'Spent' })}
          value={fmt(summary?.spent_cents ?? 0)}
          caption={t('dashboard.kpi.spentCaption', {}, { defaultValue: 'Cleared transactions' })}
        />
        <EnvelopeKpiCard
          tone={summary && summary.available_cents < 0 ? 'overspent' : 'available'}
          icon="account_balance_wallet"
          label={t('dashboard.kpi.available', {}, { defaultValue: 'Available' })}
          value={fmt(summary?.available_cents ?? 0)}
          caption={t('dashboard.kpi.availableCaption', {}, { defaultValue: 'Left to assign' })}
        />
      </section>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <section
          className={cm.cn(
            'col-span-12 lg:col-span-7',
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl shadow-sm',
          )}
        >
          <header
            className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
          >
            <div>
              <p
                className={cm.cn(
                  cm.fontWeight('extrabold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('dashboard.envelopeEyebrow', {}, { defaultValue: 'Envelope progress' })}
              </p>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
                {t('dashboard.envelopeHeading', {}, { defaultValue: 'Where the month stands' })}
              </h2>
            </div>
            <Link
              to="/budget"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                cm.textPrimary,
                'hover:underline',
              )}
            >
              {t('dashboard.viewAllBudget', {}, { defaultValue: 'View budget →' })}
            </Link>
          </header>
          {categories.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('dashboard.noCategories', {}, { defaultValue: 'No categories yet.' })}
            </p>
          ) : (
            <ul className="divide-y divide-outline-variant/40">
              {categories.slice(0, 8).map((c) => (
                <CategoryProgressRow key={c.category_id} row={c} showGroup />
              ))}
            </ul>
          )}
        </section>

        <section
          className={cm.cn(
            'col-span-12 lg:col-span-5',
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl shadow-sm',
          )}
        >
          <header
            className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
          >
            <div>
              <p
                className={cm.cn(
                  cm.fontWeight('extrabold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('dashboard.recentEyebrow', {}, { defaultValue: 'Latest activity' })}
              </p>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
                {t('dashboard.recentHeading', {}, { defaultValue: 'Recent transactions' })}
              </h2>
            </div>
            <Link
              to="/transactions"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                cm.textPrimary,
                'hover:underline',
              )}
            >
              {t('dashboard.viewAllTx', {}, { defaultValue: 'All →' })}
            </Link>
          </header>
          {recent.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('dashboard.noRecent', {}, { defaultValue: 'No transactions yet.' })}
            </p>
          ) : (
            <ul className={cm.stack(1)}>
              {recent.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} showAccount={false} />
              ))}
            </ul>
          )}
        </section>
      </div>

      {goals.length > 0 ? (
        <section>
          <header
            className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
          >
            <div>
              <p
                className={cm.cn(
                  cm.fontWeight('extrabold'),
                  'text-[10px] uppercase tracking-widest text-secondary',
                )}
              >
                {t('dashboard.goalsEyebrow', {}, { defaultValue: 'Savings momentum' })}
              </p>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
                {t('dashboard.goalsHeading', {}, { defaultValue: 'Goals on track' })}
              </h2>
            </div>
            <Link
              to="/goals"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                cm.textPrimary,
                'hover:underline',
              )}
            >
              {t('dashboard.viewAllGoals', {}, { defaultValue: 'All goals →' })}
            </Link>
          </header>
          <div className={cm.grid({ cols: 3, gap: 'md' })}>
            {goals.map((g) => (
              <GoalProgressCard key={g.id} goal={g} />
            ))}
          </div>
        </section>
      ) : null}

      {overspent.length > 0 ? (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.accentCard({ tone: 'error' }),
            'bg-surface-container-lowest rounded-2xl shadow-sm',
          )}
        >
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'bg-error/15 text-error',
              )}
              aria-hidden="true"
            >
              <span className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}>
                priority_high
              </span>
            </span>
            <h2 className={cm.cn(cm.fontWeight('bold'), 'text-error')}>
              {t(
                'dashboard.overspentHeading',
                { count: overspent.length },
                { defaultValue: '{{count}} categories overspent' },
              )}
            </h2>
          </div>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {t(
              'dashboard.overspentBody',
              {},
              {
                defaultValue:
                  'Move money from another envelope on the Budget page to bring these back into the green.',
              },
            )}
          </p>
          <ul className={cm.cn(cm.sp('mt', 4), 'space-y-2')}>
            {overspent.map((c) => (
              <li
                key={c.category_id}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.textSize('sm'),
                )}
              >
                <span className={cm.fontWeight('semibold')}>{c.category_name}</span>
                <span className="text-error tabular-nums font-bold">
                  {fmt(c.spent_cents - c.assigned_cents)}{' '}
                  {t('dashboard.over', {}, { defaultValue: 'over' })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
