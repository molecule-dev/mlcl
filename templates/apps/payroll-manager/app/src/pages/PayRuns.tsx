import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { PayRun } from '../components/PayRunsList.js'
import { PayRunsList } from '../components/PayRunsList.js'
import { fmtMoney } from '../lib/money.js'
import { unwrapList } from '../lib/unwrap.js'

const SAMPLE_PAY_RUNS: PayRun[] = [
  {
    id: 'pr-2026-08',
    pay_date: '2026-04-30',
    period_start: '2026-04-13',
    period_end: '2026-04-26',
    status: 'approved',
    total_gross: 184_250,
    total_net: 138_975,
    employee_count: 42,
  },
  {
    id: 'pr-2026-07',
    pay_date: '2026-04-16',
    period_start: '2026-03-30',
    period_end: '2026-04-12',
    status: 'processed',
    total_gross: 180_830,
    total_net: 135_402,
    employee_count: 41,
  },
  {
    id: 'pr-2026-06',
    pay_date: '2026-04-02',
    period_start: '2026-03-16',
    period_end: '2026-03-29',
    status: 'processed',
    total_gross: 178_960,
    total_net: 134_115,
    employee_count: 41,
  },
  {
    id: 'pr-2026-05',
    pay_date: '2026-03-19',
    period_start: '2026-03-02',
    period_end: '2026-03-15',
    status: 'processed',
    total_gross: 176_840,
    total_net: 132_487,
    employee_count: 41,
  },
  {
    id: 'pr-2026-04',
    pay_date: '2026-03-05',
    period_start: '2026-02-16',
    period_end: '2026-03-01',
    status: 'processed',
    total_gross: 173_900,
    total_net: 130_217,
    employee_count: 40,
  },
  {
    id: 'pr-2026-03',
    pay_date: '2026-02-19',
    period_start: '2026-02-02',
    period_end: '2026-02-15',
    status: 'processed',
    total_gross: 171_500,
    total_net: 128_415,
    employee_count: 40,
  },
  {
    id: 'pr-2026-02',
    pay_date: '2026-05-14',
    period_start: '2026-04-27',
    period_end: '2026-05-10',
    status: 'draft',
    total_gross: 0,
    total_net: 0,
    employee_count: 0,
  },
]

// Mirrors the pay-run status lifecycle used by the API
// (draft → approved → processed) so every filter chip can match data.
const FILTERS = ['all', 'draft', 'approved', 'processed'] as const

type Filter = (typeof FILTERS)[number]

export function PayRuns() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [payRuns, setPayRuns] = useState<PayRun[]>(SAMPLE_PAY_RUNS)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/pay-runs')
      .then((res) => {
        if (cancelled) return
        setPayRuns(unwrapList<PayRun>(res))
      })
      .catch(() => {
        // Network failed — keep the design-time sample so the list does
        // not collapse to an empty state during a brief outage.
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const filtered = useMemo(
    () => (filter === 'all' ? payRuns : payRuns.filter((p) => p.status === filter)),
    [payRuns, filter],
  )

  const totalGross = filtered.reduce(
    (s, p) => s + (typeof p.total_gross === 'string' ? Number(p.total_gross) : p.total_gross),
    0,
  )
  const totalProcessed = payRuns.filter((p) => p.status === 'processed').length
  const totalPending = payRuns.filter((p) => p.status === 'draft' || p.status === 'approved').length

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('payRuns.eyebrow', {}, { defaultValue: 'Cycle history' })}
          </p>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
            {t('payRuns.heading', {}, { defaultValue: 'Pay runs' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'payRuns.subheading',
              { processed: totalProcessed, pending: totalPending, total: fmtMoney(totalGross) },
              {
                defaultValue: '{{processed}} processed · {{pending}} pending · {{total}} this view',
              },
            )}
          </p>
        </div>
        <Link
          to="/run-payroll"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.roundedFull,
            cm.flex({ align: 'center', gap: 'xs' }),
            'text-white bg-gradient-to-r from-primary to-secondary shadow-md hover:shadow-lg transition-all',
          )}
        >
          <span className={cm.cn(`material-symbols-outlined text-base`)} aria-hidden="true">
            play_circle
          </span>
          {t('payRuns.runNow', {}, { defaultValue: 'Run payroll' })}
        </Link>
      </header>

      <div className={cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' })}>
        {FILTERS.map((f) => {
          const isActive = filter === f
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'uppercase tracking-widest transition-colors',
                isActive
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
              )}
            >
              {t(
                `payRuns.filter.${f}`,
                {},
                { defaultValue: f.charAt(0).toUpperCase() + f.slice(1) },
              )}
            </button>
          )
        })}
      </div>

      <PayRunsList payRuns={filtered} />
    </div>
  )
}
