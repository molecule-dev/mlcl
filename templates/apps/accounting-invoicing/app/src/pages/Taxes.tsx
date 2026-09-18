import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface JurisdictionRow {
  jurisdiction: string
  rate_pct: number
  collected_cents: number
  remitted_cents: number
}

interface QuarterlyEstimate {
  quarter: string
  due_date: string
  estimated_cents: number
  paid_cents: number
  status: 'paid' | 'due' | 'upcoming'
}

interface FilingItem {
  id: string
  description: string
  due_date: string
  done: boolean
}

interface TaxesResponse {
  collected_cents: number
  owed_cents: number
  estimated_cents: number
  deductible_cents: number
  by_jurisdiction: JurisdictionRow[]
  deductibles_breakdown: { category: string; amount_cents: number }[]
  quarterly_estimates: QuarterlyEstimate[]
  filing_checklist: FilingItem[]
}

const ESTIMATE_COLOR: Record<QuarterlyEstimate['status'], string> = {
  paid: 'bg-success/15 text-success',
  due: 'bg-error/15 text-error',
  upcoming: 'bg-info/15 text-info',
}

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function Taxes() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [data, setData] = useState<TaxesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/reports/taxes')
      .then((res) => {
        if (!cancelled) setData(unwrapSingle<TaxesResponse>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('taxes.loadError', {}, { defaultValue: 'Failed to load tax summary.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  if (loading)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  if (error || !data)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-error')}>
        {error ?? t('taxes.empty', {}, { defaultValue: 'No data.' })}
      </div>
    )

  const totalDeductible = data.deductibles_breakdown.reduce((acc, d) => acc + d.amount_cents, 0)
  const maxJurisdiction = Math.max(...data.by_jurisdiction.map((j) => j.collected_cents), 1)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
        {t('taxes.heading', {}, { defaultValue: 'Taxes' })}
      </h1>

      <div className={cm.grid({ cols: 4, gap: 'md' })}>
        <Stat
          label={t('taxes.kpi.collected', {}, { defaultValue: 'Sales tax collected' })}
          value={fmtUsd(data.collected_cents)}
        />
        <Stat
          label={t('taxes.kpi.owed', {}, { defaultValue: 'Owed' })}
          value={fmtUsd(data.owed_cents)}
        />
        <Stat
          label={t('taxes.kpi.estimated', {}, { defaultValue: 'Est. quarterly' })}
          value={fmtUsd(data.estimated_cents)}
        />
        <Stat
          label={t('taxes.kpi.deductible', {}, { defaultValue: 'Deductible expenses' })}
          value={fmtUsd(data.deductible_cents)}
        />
      </div>

      <section className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
          {t('taxes.byJurisdictionHeading', {}, { defaultValue: 'Sales tax by jurisdiction' })}
        </h2>
        <ul className={cm.cn('space-y-3')}>
          {data.by_jurisdiction.map((j) => {
            const pct = (j.collected_cents / maxJurisdiction) * 100
            const remittedPct =
              j.collected_cents > 0 ? (j.remitted_cents / j.collected_cents) * 100 : 0
            return (
              <li key={j.jurisdiction}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.textSize('sm'),
                    cm.sp('mb', 1),
                  )}
                >
                  <span className={cm.fontWeight('medium')}>
                    {j.jurisdiction}{' '}
                    <span className={'text-on-surface-variant'}>({j.rate_pct.toFixed(2)}%)</span>
                  </span>
                  <span className={cm.cn('tabular-nums', 'text-on-surface-variant')}>
                    {fmtUsd(j.remitted_cents)} / {fmtUsd(j.collected_cents)}{' '}
                    {t(
                      'taxes.remittedPct',
                      { pct: remittedPct.toFixed(0) },
                      { defaultValue: '({{pct}}% remitted)' },
                    )}
                  </span>
                </div>
                <div
                  className={cm.cn('h-2', cm.roundedFull, 'bg-surface-container overflow-hidden')}
                >
                  <div
                    className={cm.cn('h-full bg-primary', cm.roundedFull)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <section className={cm.cn('col-span-12 lg:col-span-7', cm.card(), cm.sp('p', 6))}>
          <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
            {t('taxes.estimatesHeading', {}, { defaultValue: 'Quarterly estimates' })}
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
                  {t('taxes.col.quarter', {}, { defaultValue: 'Quarter' })}
                </th>
                <th className={cm.cn(cm.sp('py', 2), 'text-left')}>
                  {t('form.due', {}, { defaultValue: 'Due' })}
                </th>
                <th className={cm.cn(cm.sp('py', 2), 'text-right')}>
                  {t('taxes.col.estimated', {}, { defaultValue: 'Estimated' })}
                </th>
                <th className={cm.cn(cm.sp('py', 2), 'text-right')}>
                  {t('taxes.col.paid', {}, { defaultValue: 'Paid' })}
                </th>
                <th className={cm.cn(cm.sp('py', 2), 'text-left')}>
                  {t('nav.status', {}, { defaultValue: 'Status' })}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {data.quarterly_estimates.map((q) => (
                <tr key={q.quarter}>
                  <td className={cm.cn(cm.sp('py', 2), cm.fontWeight('medium'))}>{q.quarter}</td>
                  <td
                    className={cm.cn(cm.sp('py', 2), cm.textSize('sm'), 'text-on-surface-variant')}
                  >
                    {fmtDate(q.due_date)}
                  </td>
                  <td className={cm.cn(cm.sp('py', 2), 'text-right tabular-nums')}>
                    {fmtUsd(q.estimated_cents)}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('py', 2),
                      'text-right tabular-nums',
                      'text-on-surface-variant',
                    )}
                  >
                    {fmtUsd(q.paid_cents)}
                  </td>
                  <td className={cm.cn(cm.sp('py', 2))}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        cm.roundedFull,
                        ESTIMATE_COLOR[q.status],
                      )}
                    >
                      {q.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={cm.cn('col-span-12 lg:col-span-5', cm.card(), cm.sp('p', 6))}>
          <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
            {t('taxes.deductiblesHeading', {}, { defaultValue: 'Deductibles by category' })}
          </h2>
          <ul className={cm.cn('space-y-2')}>
            {data.deductibles_breakdown.map((d) => {
              const pct = totalDeductible > 0 ? (d.amount_cents / totalDeductible) * 100 : 0
              return (
                <li key={d.category}>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.textSize('sm'),
                      cm.sp('mb', 1),
                    )}
                  >
                    <span className={cm.fontWeight('medium')}>{d.category}</span>
                    <span className={cm.cn('tabular-nums', 'text-on-surface-variant')}>
                      {fmtUsd(d.amount_cents)} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div
                    className={cm.cn('h-2', cm.roundedFull, 'bg-surface-container overflow-hidden')}
                  >
                    <div
                      className={cm.cn('h-full bg-secondary', cm.roundedFull)}
                      style={{ width: `${pct}%` }}
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
          {t('taxes.checklistHeading', {}, { defaultValue: 'Filing checklist' })}
        </h2>
        {data.filing_checklist.length === 0 ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('taxes.checklistEmpty', {}, { defaultValue: 'No filings due right now.' })}
          </p>
        ) : null}
        <ul className={cm.cn('space-y-2')}>
          {data.filing_checklist.map((item) => (
            <li
              key={item.id}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('py', 2),
                'border-b border-outline-variant last:border-b-0',
              )}
            >
              <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'cursor-pointer')}>
                <input type="checkbox" checked={item.done} readOnly className={cm.cn('h-4 w-4')} />
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    item.done ? cm.cn('line-through', 'text-on-surface-variant') : '',
                  )}
                >
                  {item.description}
                </span>
              </label>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {fmtDate(item.due_date)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.card(), cm.sp('p', 5))}>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'uppercase tracking-wide',
          'text-on-surface-variant',
        )}
      >
        {label}
      </p>
      <p
        className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mt', 1), 'tabular-nums')}
      >
        {value}
      </p>
    </div>
  )
}
