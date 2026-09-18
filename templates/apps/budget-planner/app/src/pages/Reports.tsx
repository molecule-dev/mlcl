import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatMoney, getCurrency } from '../lib/format.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface SpendingSlice {
  category: string
  amount_cents: number
}

interface NetWorthPoint {
  date: string
  net_worth_cents: number
}

interface IncomeExpensePoint {
  month: string
  income_cents: number
  expenses_cents: number
}

interface ReportsResponse {
  spending_by_category_30d: SpendingSlice[]
  net_worth_history: NetWorthPoint[]
  income_vs_expenses: IncomeExpensePoint[]
  top_payees_30d: { payee: string; spent_cents: number; transaction_count: number }[]
}

function fmt(cents: number): string {
  return formatMoney(cents, getCurrency(), { grouping: false })
}

function fmtMonth(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString(undefined, {
    month: 'short',
    year: '2-digit',
  })
}

export function Reports() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [data, setData] = useState<ReportsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/reports/full')
      .then((res) => {
        if (!cancelled) setData(unwrapSingle<ReportsResponse>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('nav.failedToLoadReports', {}, { defaultValue: 'Failed to load reports.' }))
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
  if (error || !data) {
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-error')}>
        {error ?? t('reports.empty', {}, { defaultValue: 'No data.' })}
      </div>
    )
  }

  const totalSpent = data.spending_by_category_30d.reduce((a, s) => a + s.amount_cents, 0)
  const maxNetWorth = Math.max(...data.net_worth_history.map((p) => p.net_worth_cents), 1)
  const minNetWorth = Math.min(...data.net_worth_history.map((p) => p.net_worth_cents), 0)
  const range = Math.max(1, maxNetWorth - minNetWorth)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('nav.reports', {}, { defaultValue: 'Reports' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t('reports.subheading', {}, { defaultValue: 'Where your money went, by the numbers.' })}
        </p>
      </header>

      <section className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
          {t('reports.netWorthHeading', {}, { defaultValue: 'Net worth (90 days)' })}
        </h2>
        <svg
          viewBox="0 0 600 160"
          className={cm.cn('w-full h-40')}
          role="img"
          aria-label={t('reports.netWorthChartAria', {}, { defaultValue: 'Net worth over time' })}
        >
          <polyline
            fill="none"
            stroke="var(--mol-color-primary)"
            strokeWidth="2"
            points={data.net_worth_history
              .map((p, i, arr) => {
                const x = (i / Math.max(1, arr.length - 1)) * 580 + 10
                const y = 150 - ((p.net_worth_cents - minNetWorth) / range) * 140
                return `${x.toFixed(1)},${y.toFixed(1)}`
              })
              .join(' ')}
          />
        </svg>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.textSize('xs'),
            cm.sp('mt', 2),
            'text-on-surface-variant',
          )}
        >
          <span>{fmt(minNetWorth)}</span>
          <span>{fmt(maxNetWorth)}</span>
        </div>
      </section>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <section className={cm.cn('col-span-12 lg:col-span-7', cm.card(), cm.sp('p', 6))}>
          <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
            {t(
              'reports.spendingByCategoryHeading',
              {},
              { defaultValue: 'Spending by category (30 days)' },
            )}
          </h2>
          <ul className={cm.stack(2)}>
            {data.spending_by_category_30d.map((s) => {
              const slicePct = totalSpent > 0 ? Math.round((s.amount_cents / totalSpent) * 100) : 0
              return (
                <li key={s.category}>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.textSize('sm'),
                      cm.sp('mb', 1),
                    )}
                  >
                    <span className={cm.fontWeight('medium')}>{s.category}</span>
                    <span className={cm.cn('tabular-nums', 'text-on-surface-variant')}>
                      {fmt(s.amount_cents)} ({slicePct}%)
                    </span>
                  </div>
                  <div className={cm.cn('h-2 rounded-full bg-surface-container overflow-hidden')}>
                    <div
                      className={cm.cn('h-full bg-primary rounded-full')}
                      style={{ width: `${slicePct}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        <section className={cm.cn('col-span-12 lg:col-span-5', cm.card(), cm.sp('p', 6))}>
          <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
            {t('reports.topPayeesHeading', {}, { defaultValue: 'Top payees (30 days)' })}
          </h2>
          <ul className={cm.stack(3)}>
            {data.top_payees_30d.map((p) => (
              <li key={p.payee} className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <div>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{p.payee}</p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'reports.txCount',
                      { count: p.transaction_count },
                      { defaultValue: '{{count}} transactions' },
                    )}
                  </p>
                </div>
                <span
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'tabular-nums')}
                >
                  {fmt(p.spent_cents)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
          {t(
            'reports.incomeExpensesHeading',
            {},
            { defaultValue: 'Income vs expenses (6 months)' },
          )}
        </h2>
        <table className={cm.cn('w-full')}>
          <thead
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-wide',
              'text-on-surface-variant',
            )}
          >
            <tr>
              <th className={cm.cn(cm.sp('py', 2), 'text-left')}>
                {t('reports.col.month', {}, { defaultValue: 'Month' })}
              </th>
              <th className={cm.cn(cm.sp('py', 2), 'text-right')}>
                {t('reports.col.income', {}, { defaultValue: 'Income' })}
              </th>
              <th className={cm.cn(cm.sp('py', 2), 'text-right')}>
                {t('reports.col.expenses', {}, { defaultValue: 'Expenses' })}
              </th>
              <th className={cm.cn(cm.sp('py', 2), 'text-right')}>
                {t('reports.col.net', {}, { defaultValue: 'Net' })}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {data.income_vs_expenses.map((r) => {
              const net = r.income_cents - r.expenses_cents
              return (
                <tr key={r.month}>
                  <td className={cm.cn(cm.sp('py', 2), cm.textSize('sm'))}>{fmtMonth(r.month)}</td>
                  <td
                    className={cm.cn(
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      'text-right tabular-nums text-success',
                    )}
                  >
                    {fmt(r.income_cents)}
                  </td>
                  <td
                    className={cm.cn(cm.sp('py', 2), cm.textSize('sm'), 'text-right tabular-nums')}
                  >
                    {fmt(r.expenses_cents)}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      'text-right tabular-nums',
                      cm.fontWeight('semibold'),
                      net < 0 ? 'text-error' : 'text-success',
                    )}
                  >
                    {fmt(net)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
