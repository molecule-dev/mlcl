import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { fmtCompact, fmtMoney, toNum } from '../lib/money.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface PayrollSummary {
  total_gross: number | string
  total_taxes: number | string
  total_deductions: number | string
  total_net: number | string
  run_count: number
  runs: { id: string; pay_date: string; total_gross: number; total_net: number }[]
}

interface DepartmentCostsRow {
  department: string
  head_count: number
  total_salary: number | string
}

interface TaxLiability {
  year: number
  quarter: number
  stub_count: number
  federal_tax: number | string
  state_tax: number | string
  fica: number | string
  medicare: number | string
  total_liability: number | string
}

const DEPT_COLORS = [
  '#0e7490',
  '#059669',
  '#7c3aed',
  '#d97706',
  '#0891b2',
  '#be185d',
  '#6366f1',
  '#16a34a',
]

function startOfMonth(d: Date): Date {
  const x = new Date(d)
  x.setDate(1)
  x.setHours(0, 0, 0, 0)
  return x
}
function endOfMonth(d: Date): Date {
  const x = new Date(d)
  x.setMonth(d.getMonth() + 1, 0)
  x.setHours(23, 59, 59, 999)
  return x
}
function monthLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short' })
}

interface MonthBucket {
  label: string
  start: Date
  end: Date
  amount: number
}

export function Reports() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [spend, setSpend] = useState<MonthBucket[]>([])
  const [departments, setDepartments] = useState<DepartmentCostsRow[]>([])
  const [taxes, setTaxes] = useState<TaxLiability | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const today = new Date()
    const earliest = startOfMonth(new Date(today.getFullYear(), today.getMonth() - 5, 1))
    const latest = endOfMonth(today)

    const months: MonthBucket[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      months.push({ label: monthLabel(d), start: startOfMonth(d), end: endOfMonth(d), amount: 0 })
    }

    Promise.all([
      http
        .get(
          `/api/reports/payroll-summary?start_date=${earliest.toISOString()}&end_date=${latest.toISOString()}`,
        )
        .then(unwrapSingle<PayrollSummary>)
        .catch(() => null),
      http
        .get('/api/reports/department-costs')
        .then((res) => {
          const data = unwrapSingle<{ departments: DepartmentCostsRow[] }>(res)
          return data?.departments ?? []
        })
        .catch(() => [] as DepartmentCostsRow[]),
      http
        .get('/api/reports/tax-liability')
        .then(unwrapSingle<TaxLiability>)
        .catch(() => null),
    ])
      .then(([summary, depts, tax]) => {
        if (cancelled) return
        if (summary?.runs) {
          for (const run of summary.runs) {
            const d = new Date(run.pay_date)
            const bucket = months.find((m) => d >= m.start && d <= m.end)
            if (bucket) bucket.amount += toNum(run.total_gross)
          }
        }
        setSpend(months)
        setDepartments(depts)
        setTaxes(tax)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('reports.loadError', {}, { defaultValue: 'Could not load reports.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [http, t])

  const totalHeadcount = departments.reduce((s, d) => s + d.head_count, 0)
  const taxBreakdown = taxes
    ? [
        {
          key: 'federal',
          label: t('reports.tax.federal', {}, { defaultValue: 'Federal income' }),
          amount: toNum(taxes.federal_tax),
          color: '#0e7490',
        },
        {
          key: 'fica',
          label: t('reports.tax.fica', {}, { defaultValue: 'FICA' }),
          amount: toNum(taxes.fica),
          color: '#059669',
        },
        {
          key: 'state',
          label: t('reports.tax.state', {}, { defaultValue: 'State income' }),
          amount: toNum(taxes.state_tax),
          color: '#7c3aed',
        },
        {
          key: 'medicare',
          label: t('reports.tax.medicare', {}, { defaultValue: 'Medicare' }),
          amount: toNum(taxes.medicare),
          color: '#d97706',
        },
      ].filter((b) => b.amount > 0)
    : []
  const taxTotal = taxBreakdown.reduce((s, b) => s + b.amount, 0)

  const maxSpend = Math.max(1, ...spend.map((p) => p.amount))
  const minSpend = Math.min(...spend.map((p) => p.amount))
  const spendRange = Math.max(1, maxSpend - minSpend)
  const sparklinePath = spend.length
    ? spend
        .map((p, i) => {
          const x = (i / Math.max(1, spend.length - 1)) * 320
          const y = 80 - ((p.amount - minSpend) / spendRange) * 60 - 5
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
        })
        .join(' ')
    : ''
  const latestSpend = spend.length ? spend[spend.length - 1].amount : 0
  const earliestSpend = spend.length ? spend[0].amount : 0
  const spendDelta = latestSpend - earliestSpend

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('reports.eyebrow', {}, { defaultValue: 'Operations · Last 6 months' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('nav.reports', {}, { defaultValue: 'Reports' })}
        </h1>
      </header>

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : error ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p>
      ) : (
        <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-2')}>
          <section
            className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface-container-lowest shadow-sm')}
          >
            <header className={cm.flex({ align: 'baseline', justify: 'between' })}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
                {t('reports.spendHeading', {}, { defaultValue: 'Payroll spend' })}
              </h2>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t('reports.spendRange', {}, { defaultValue: 'Last 6 months' })}
              </span>
            </header>
            <p
              className={cm.cn(
                cm.textSize('3xl'),
                cm.sp('mt', 3),
                'font-extrabold tabular-nums tracking-tight',
              )}
            >
              {fmtMoney(latestSpend)}
            </p>
            {spend.length > 1 ? (
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.sp('mt', 1),
                  spendDelta >= 0 ? 'text-secondary' : 'text-error',
                  'font-bold',
                )}
              >
                {t(
                  'reports.spendDelta',
                  { amount: `${spendDelta >= 0 ? '+' : ''}${fmtCompact(spendDelta)}` },
                  { defaultValue: '{{amount}} since {{first}}' },
                )}{' '}
                {spend[0].label}
              </p>
            ) : null}

            <div className={cm.cn(cm.h(48), cm.sp('mt', 6), 'relative')}>
              {spend.some((p) => p.amount > 0) ? (
                <svg
                  className={cm.cn(`w-full h-full`)}
                  viewBox="0 0 320 100"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="spendArea" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--mol-color-primary)" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="var(--mol-color-primary)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={`${sparklinePath} L320,100 L0,100 Z`} fill="url(#spendArea)" />
                  <path
                    d={sparklinePath}
                    fill="none"
                    stroke="var(--mol-color-primary)"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {spend.map((p, i) => {
                    const x = (i / Math.max(1, spend.length - 1)) * 320
                    const y = 80 - ((p.amount - minSpend) / spendRange) * 60 - 5
                    return (
                      <circle
                        key={p.label + i}
                        cx={x}
                        cy={y}
                        r={3}
                        fill="var(--mol-color-primary)"
                      />
                    )
                  })}
                </svg>
              ) : (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'reports.noSpend',
                    {},
                    { defaultValue: 'No processed runs in this window yet.' },
                  )}
                </p>
              )}
            </div>
            <div
              className={cm.cn(
                cm.flex({ justify: 'between' }),
                cm.sp('mt', 2),
                cm.textSize('xs'),
                'text-on-surface-variant',
              )}
            >
              {spend.map((p, i) => (
                <span key={p.label + i}>{p.label}</span>
              ))}
            </div>
          </section>

          <section
            className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface-container-lowest shadow-sm')}
          >
            <header className={cm.flex({ align: 'baseline', justify: 'between' })}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
                {t('reports.headcountHeading', {}, { defaultValue: 'Headcount by department' })}
              </h2>
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant tabular-nums')}>
                {t(
                  'reports.headcountTotal',
                  { count: totalHeadcount },
                  { defaultValue: '{{count}} total' },
                )}
              </span>
            </header>
            {departments.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 4), 'text-on-surface-variant')}>
                {t('reports.noDepartments', {}, { defaultValue: 'No active employees yet.' })}
              </p>
            ) : (
              <ul className={cm.cn(cm.stack(3), cm.sp('mt', 5))}>
                {departments.map((d, i) => {
                  const pct = totalHeadcount === 0 ? 0 : (d.head_count / totalHeadcount) * 100
                  const color = DEPT_COLORS[i % DEPT_COLORS.length]
                  return (
                    <li key={d.department}>
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'baseline', justify: 'between' }),
                          cm.textSize('sm'),
                        )}
                      >
                        <span>{d.department}</span>
                        <span className="font-semibold tabular-nums">{d.head_count}</span>
                      </div>
                      <div
                        className={cm.cn(
                          cm.h(2),
                          cm.sp('mt', 1),
                          'rounded-full bg-surface-container overflow-hidden',
                        )}
                      >
                        <div
                          className={cm.cn(`h-full rounded-full transition-all`)}
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                      <p
                        className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}
                      >
                        {fmtCompact(d.total_salary)}{' '}
                        {t('reports.totalSalary', {}, { defaultValue: 'total salary' })}
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest shadow-sm lg:col-span-2',
            )}
          >
            <header className={cm.flex({ align: 'baseline', justify: 'between' })}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
                {t('reports.taxHeading', {}, { defaultValue: 'Quarter tax breakdown' })}
              </h2>
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant tabular-nums')}>
                {fmtMoney(taxTotal)}
              </span>
            </header>
            {!taxes || taxBreakdown.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 4), 'text-on-surface-variant')}>
                {t(
                  'reports.noTaxes',
                  {},
                  {
                    defaultValue:
                      'No tax stubs in this quarter yet — process a pay run to populate this section.',
                  },
                )}
              </p>
            ) : (
              <>
                <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                  {t(
                    'reports.taxQuarter',
                    { quarter: taxes.quarter, year: taxes.year },
                    { defaultValue: 'Q{{quarter}} {{year}}' },
                  )}
                </p>
                <div
                  className={cm.cn(
                    cm.h(3),
                    cm.sp('mt', 5),
                    'flex w-full rounded-full overflow-hidden bg-surface-container',
                  )}
                >
                  {taxBreakdown.map((b) => (
                    <div
                      key={b.key}
                      className={cm.cn(`h-full`)}
                      style={{
                        width: `${(b.amount / Math.max(1, taxTotal)) * 100}%`,
                        backgroundColor: b.color,
                      }}
                      title={b.label}
                    />
                  ))}
                </div>
                <ul
                  className={cm.cn(
                    cm.grid({ gap: 'md', cols: 2 }),
                    cm.sp('mt', 5),
                    'sm:grid-cols-4',
                  )}
                >
                  {taxBreakdown.map((b) => (
                    <li key={b.key} className={cm.flex({ align: 'center', gap: 'xs' })}>
                      <span
                        className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull)}
                        style={{ backgroundColor: b.color }}
                        aria-hidden="true"
                      />
                      <div>
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {b.label}
                        </p>
                        <p
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('bold'),
                            'tabular-nums',
                          )}
                        >
                          {fmtCompact(b.amount)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
