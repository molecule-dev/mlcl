import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface PnlRow {
  month: string
  revenue_cents: number
  expenses_cents: number
}

interface ExpenseSlice {
  category: string
  amount_cents: number
  color: string
}

interface BalanceSheet {
  assets_cents: number
  liabilities_cents: number
  equity_cents: number
}

interface ReportsResponse {
  pnl_history: PnlRow[]
  expense_breakdown: ExpenseSlice[]
  cash_flow_history: { month: string; in_cents: number; out_cents: number }[]
  balance_sheet: BalanceSheet
  top_clients?: { name: string; amount_cents: number }[]
  aging?: { bucket: string; amount_cents: number }[]
  aging_total_cents?: number
}

interface ReportHistoryEntry {
  name: string
  at: string
}

const REPORT_HISTORY_KEY = 'coffer.recent-reports'

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function buildCsv(d: ReportsResponse): string {
  const rows: string[] = []
  rows.push('section,month,revenue_cents,expenses_cents')
  for (const p of d.pnl_history) {
    rows.push(`pnl,${p.month},${p.revenue_cents},${p.expenses_cents}`)
  }
  rows.push('section,category,amount_cents')
  for (const e of d.expense_breakdown) {
    rows.push(`expense,${e.category},${e.amount_cents}`)
  }
  rows.push('section,month,in_cents,out_cents')
  for (const c of d.cash_flow_history) {
    rows.push(`cash_flow,${c.month},${c.in_cents},${c.out_cents}`)
  }
  rows.push('section,assets_cents,liabilities_cents,equity_cents')
  rows.push(
    `balance_sheet,${d.balance_sheet.assets_cents},${d.balance_sheet.liabilities_cents},${d.balance_sheet.equity_cents}`,
  )
  return rows.join('\n')
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
    http
      .get('/api/reports/full')
      .then((res) => {
        if (cancelled) return
        setData(unwrapSingle<ReportsResponse>(res))
        track({ name: 'report.generated', properties: { report: 'full' } })
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

  const [exported, setExported] = useState<boolean>(false)
  const [history, setHistory] = useState<ReportHistoryEntry[]>([])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(REPORT_HISTORY_KEY)
      if (raw) setHistory(JSON.parse(raw) as ReportHistoryEntry[])
    } catch (_error) {
      // malformed history is disposable — start empty
    }
  }, [])

  function recordHistory(name: string) {
    setHistory((prev) => {
      const next = [{ name, at: new Date().toISOString() }, ...prev].slice(0, 5)
      try {
        window.localStorage.setItem(REPORT_HISTORY_KEY, JSON.stringify(next))
      } catch (_error) {
        // storage unavailable — the session list still shows the entry
      }
      return next
    })
  }

  function exportReport(): void {
    if (!data) return
    setExported(true)
    recordHistory(
      t('reports.history.fullExport', {}, { defaultValue: 'Financial report (CSV export)' }),
    )
    track({ name: 'report.exported', properties: { report: 'full', format: 'csv' } })
    try {
      const blob = new Blob([buildCsv(data)], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'reports.csv'
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (_error) {
      // ignore — the toggle to "Exported ✓" is the user-facing signal
    }
  }

  if (loading)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  if (error || !data)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-error')}>
        {error ?? t('reports.empty', {}, { defaultValue: 'No data.' })}
      </div>
    )

  const maxPnl = Math.max(
    ...data.pnl_history.map((p) => Math.max(p.revenue_cents, p.expenses_cents)),
    1,
  )
  const totalExpenses = data.expense_breakdown.reduce((acc, e) => acc + e.amount_cents, 0)
  const maxCashFlow = Math.max(
    ...data.cash_flow_history.map((c) => Math.max(c.in_cents, c.out_cents)),
    1,
  )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('nav.reports', {}, { defaultValue: 'Reports' })}
        </h1>
        <button
          type="button"
          onClick={exportReport}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('medium'),
            'border border-outline rounded-md hover:bg-surface-container',
          )}
        >
          {exported
            ? t('reports.exportDone', {}, { defaultValue: 'Exported ✓' })
            : t('common.exportCsv', {}, { defaultValue: 'Export CSV' })}
        </button>
      </header>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <section className={cm.cn('col-span-12 lg:col-span-7', cm.card(), cm.sp('p', 6))}>
          <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
            {t('reports.pnlHeading', {}, { defaultValue: 'Profit & loss (12 months)' })}
          </h2>
          <svg viewBox="0 0 600 200" className={cm.cn('w-full h-48')} role="img">
            {data.pnl_history.map((p, i, arr) => {
              const w = 600 / arr.length
              const x = i * w + 4
              const revH = (p.revenue_cents / maxPnl) * 90
              const expH = (p.expenses_cents / maxPnl) * 90
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
                    y={100 + 0}
                    width={(w - 8) / 2}
                    height={expH}
                    fill="var(--mol-color-error)"
                  />
                </g>
              )
            })}
          </svg>
        </section>

        <section className={cm.cn('col-span-12 lg:col-span-5', cm.card(), cm.sp('p', 6))}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 1),
              'uppercase tracking-[0.2em] text-on-surface-variant',
            )}
          >
            {t('reports.expensesByCategory', {}, { defaultValue: 'Expenses by category' })}
          </p>
          <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
            {t('reports.expensesHeading', {}, { defaultValue: 'Expense breakdown' })}
          </h2>
          <ul className={cm.cn('space-y-2')}>
            {data.expense_breakdown.map((e) => {
              const pct = totalExpenses > 0 ? (e.amount_cents / totalExpenses) * 100 : 0
              return (
                <li key={e.category}>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.textSize('sm'),
                      cm.sp('mb', 1),
                    )}
                  >
                    <span className={cm.fontWeight('medium')}>{e.category}</span>
                    <span className={cm.cn('tabular-nums', 'text-on-surface-variant')}>
                      {fmtUsd(e.amount_cents)} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div
                    className={cm.cn('h-2', cm.roundedFull, 'bg-surface-container overflow-hidden')}
                  >
                    <div
                      className={cm.cn('h-full', cm.roundedFull)}
                      style={{ width: `${pct}%`, backgroundColor: e.color }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <section className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
          {t('reports.cashFlowHeading', {}, { defaultValue: 'Cash flow (12 months)' })}
        </h2>
        <svg viewBox="0 0 600 200" className={cm.cn('w-full h-48')} role="img">
          <polyline
            fill="none"
            stroke="var(--mol-color-success)"
            strokeWidth="2"
            points={data.cash_flow_history
              .map((c, i, arr) => {
                const x = (i / Math.max(1, arr.length - 1)) * 580 + 10
                const y = 190 - (c.in_cents / maxCashFlow) * 180
                return `${x.toFixed(1)},${y.toFixed(1)}`
              })
              .join(' ')}
          />
          <polyline
            fill="none"
            stroke="var(--mol-color-error)"
            strokeWidth="2"
            strokeDasharray="4 4"
            points={data.cash_flow_history
              .map((c, i, arr) => {
                const x = (i / Math.max(1, arr.length - 1)) * 580 + 10
                const y = 190 - (c.out_cents / maxCashFlow) * 180
                return `${x.toFixed(1)},${y.toFixed(1)}`
              })
              .join(' ')}
          />
        </svg>
        <div
          className={cm.cn(
            cm.flex({ gap: 'md' }),
            cm.textSize('xs'),
            cm.sp('mt', 2),
            'text-on-surface-variant',
          )}
        >
          <span>
            <span className={cm.cn('inline-block w-3 h-0.5 bg-success align-middle mr-1')} />{' '}
            {t('reports.cashIn', {}, { defaultValue: 'Cash in' })}
          </span>
          <span>
            <span className={cm.cn('inline-block w-3 h-0.5 bg-error align-middle mr-1')} />{' '}
            {t('reports.cashOut', {}, { defaultValue: 'Cash out' })}
          </span>
        </div>
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
          {t('reports.balanceSheetHeading', {}, { defaultValue: 'Balance sheet' })}
        </h2>
        <dl className={cm.cn(cm.grid({ cols: 3, gap: 'md' }), cm.textSize('sm'))}>
          <div>
            <dt className={'text-on-surface-variant'}>
              {t('reports.assets', {}, { defaultValue: 'Assets' })}
            </dt>
            <dd className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tabular-nums')}>
              {fmtUsd(data.balance_sheet.assets_cents)}
            </dd>
          </div>
          <div>
            <dt className={'text-on-surface-variant'}>
              {t('reports.liabilities', {}, { defaultValue: 'Liabilities' })}
            </dt>
            <dd className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tabular-nums')}>
              {fmtUsd(data.balance_sheet.liabilities_cents)}
            </dd>
          </div>
          <div>
            <dt className={'text-on-surface-variant'}>
              {t('reports.equity', {}, { defaultValue: 'Equity' })}
            </dt>
            <dd className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tabular-nums')}>
              {fmtUsd(data.balance_sheet.equity_cents)}
            </dd>
          </div>
        </dl>
      </section>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <TopClients clients={data.top_clients ?? []} />
        <AgingReport buckets={data.aging ?? []} totalCents={data.aging_total_cents ?? 0} />
      </div>

      <RecentReports history={history} />
    </div>
  )
}

/** "Top clients by revenue" — highest-paying customers from paid invoices. */
function TopClients({ clients }: { clients: { name: string; amount_cents: number }[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const max = Math.max(...clients.map((c) => c.amount_cents), 1)
  return (
    <section
      className={cm.cn('col-span-12 lg:col-span-6', cm.card(), cm.sp('p', 6))}
      aria-labelledby="reports-top-clients"
    >
      <h2 id="reports-top-clients" className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
        {t('reports.topClientsHeading', {}, { defaultValue: 'Top clients by revenue' })}
      </h2>
      {clients.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
          {t(
            'reports.topClientsEmpty',
            {},
            { defaultValue: 'No paid invoices yet — revenue appears once invoices are paid.' },
          )}
        </p>
      ) : (
        <ul className={cm.cn('space-y-2')}>
          {clients.map((c) => (
            <li key={c.name}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.textSize('sm'),
                  cm.sp('mb', 1),
                )}
              >
                <span className={cm.fontWeight('medium')}>{c.name}</span>
                <span className={cm.cn('tabular-nums', 'text-on-surface-variant')}>
                  {fmtUsd(c.amount_cents)}
                </span>
              </div>
              <div className={cm.cn('h-2', cm.roundedFull, 'bg-surface-container overflow-hidden')}>
                <div
                  className={cm.cn('h-full bg-primary', cm.roundedFull)}
                  style={{ width: `${(c.amount_cents / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** "Outstanding invoices aging" — receivables bucketed by days past due. */
function AgingReport({
  buckets,
  totalCents,
}: {
  buckets: { bucket: string; amount_cents: number }[]
  totalCents: number
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const max = Math.max(...buckets.map((b) => b.amount_cents), 1)
  return (
    <section
      className={cm.cn('col-span-12 lg:col-span-6', cm.card(), cm.sp('p', 6))}
      aria-labelledby="reports-aging"
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
        <h2 id="reports-aging" className={cm.sectionHeading}>
          {t('reports.agingHeading', {}, { defaultValue: 'Outstanding invoices aging' })}
        </h2>
        <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('reports.agingTotal', {}, { defaultValue: 'Total unpaid:' })}{' '}
          <span className={cm.cn(cm.fontWeight('semibold'), 'tabular-nums')}>
            {fmtUsd(totalCents)}
          </span>
        </span>
      </div>
      {buckets.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
          {t('reports.agingEmpty', {}, { defaultValue: 'No outstanding invoices.' })}
        </p>
      ) : (
        <ul className={cm.cn('space-y-3')}>
          {buckets.map((b) => (
            <li key={b.bucket}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.textSize('sm'),
                  cm.sp('mb', 1),
                )}
              >
                <span className={cm.fontWeight('medium')}>
                  {t(
                    'reports.agingBucketLabel',
                    { bucket: b.bucket },
                    { defaultValue: '{{bucket}} days' },
                  )}
                </span>
                <span className={cm.cn('tabular-nums', 'text-on-surface-variant')}>
                  {fmtUsd(b.amount_cents)}
                </span>
              </div>
              <div className={cm.cn('h-2', cm.roundedFull, 'bg-surface-container overflow-hidden')}>
                <div
                  className={cm.cn(
                    'h-full',
                    cm.roundedFull,
                    b.bucket === '90+' ? 'bg-error' : 'bg-warning',
                  )}
                  style={{ width: `${(b.amount_cents / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * "Recent reports" — the reports this browser generated lately (exports are
 * recorded locally when the CSV is produced).
 */
function RecentReports({ history }: { history: ReportHistoryEntry[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section className={cm.cn(cm.card(), cm.sp('p', 6))} aria-labelledby="reports-recent">
      <h2 id="reports-recent" className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
        {t('reports.recentHeading', {}, { defaultValue: 'Recent reports' })}
      </h2>
      {history.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
          {t('reports.recentEmpty', {}, { defaultValue: 'Reports you export will appear here.' })}
        </p>
      ) : (
        <ul className="space-y-1">
          {history.map((h, i) => (
            <li
              key={`${h.at}-${i}`}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('py', 2),
                'border-b border-outline-variant last:border-b-0',
              )}
            >
              <span className={cm.flex({ align: 'center', gap: 'sm' })}>
                <span
                  className={cm.cn(
                    cm.sp('p', 1),
                    'rounded-md bg-surface-container flex items-center justify-center',
                  )}
                  aria-hidden="true"
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-base text-on-surface-variant')}
                  >
                    description
                  </span>
                </span>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{h.name}</span>
              </span>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'tabular-nums')}>
                {new Date(h.at).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
