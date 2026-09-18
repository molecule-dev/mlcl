import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface AttributionRow {
  factor: string
  contribution_cents: number
  contribution_pct: number
}

interface YearGains {
  year: number
  realized_short_cents: number
  realized_long_cents: number
  unrealized_cents: number
  dividends_cents: number
  total_cents: number
}

interface ReportsResponse {
  performance: { period: string; portfolio_pct: number; benchmark_pct: number }[]
  attribution: AttributionRow[]
  realized_unrealized: YearGains[]
  tax_documents: { year: number; type: string; status: string; url?: string }[]
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function fmtUsd(cents: unknown): string {
  const c = num(cents)
  const sign = c < 0 ? '-' : ''
  const abs = Math.abs(c) / 100
  return `${sign}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtPct(v: unknown): string {
  const n = num(v)
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

function deltaClass(v: unknown): string {
  const n = num(v)
  if (n > 0) return 'text-success'
  if (n < 0) return 'text-error'
  return ''
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

  if (loading)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  if (error) return <div className={cm.cn(cm.sp('p', 8), 'text-error')}>{error}</div>

  const performance = Array.isArray(data?.performance) ? data!.performance : []
  const attribution = Array.isArray(data?.attribution) ? data!.attribution : []
  const realizedUnrealized = Array.isArray(data?.realized_unrealized)
    ? data!.realized_unrealized
    : []
  const taxDocuments = Array.isArray(data?.tax_documents) ? data!.tax_documents : []

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
        {t('nav.reports', {}, { defaultValue: 'Reports' })}
      </h1>

      <section className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
          {t('reports.performanceHeading', {}, { defaultValue: 'Performance vs benchmark' })}
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
                {t('reports.col.period', {}, { defaultValue: 'Period' })}
              </th>
              <th className={cm.cn(cm.sp('py', 2), 'text-right')}>
                {t('reports.col.portfolio', {}, { defaultValue: 'Portfolio' })}
              </th>
              <th className={cm.cn(cm.sp('py', 2), 'text-right')}>
                {t('reports.col.benchmark', {}, { defaultValue: 'S&P 500' })}
              </th>
              <th className={cm.cn(cm.sp('py', 2), 'text-right')}>
                {t('reports.col.alpha', {}, { defaultValue: 'Alpha' })}
              </th>
            </tr>
          </thead>
          <tbody className={cm.cn('divide-y divide-outline-variant')}>
            {performance.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className={cm.cn(cm.sp('py', 6), cm.textCenter, 'text-on-surface-variant')}
                >
                  {t('reports.noPerformance', {}, { defaultValue: 'No performance data yet.' })}
                </td>
              </tr>
            ) : (
              performance.map((p) => {
                const portfolioPct = num(p.portfolio_pct)
                const benchmarkPct = num(p.benchmark_pct)
                const alpha = portfolioPct - benchmarkPct
                return (
                  <tr key={p.period}>
                    <td className={cm.cn(cm.sp('py', 2), cm.fontWeight('medium'))}>{p.period}</td>
                    <td
                      className={cm.cn(
                        cm.sp('py', 2),
                        'text-right tabular-nums',
                        cm.fontWeight('semibold'),
                        deltaClass(portfolioPct),
                      )}
                    >
                      {fmtPct(portfolioPct)}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('py', 2),
                        'text-right tabular-nums',
                        'text-on-surface-variant',
                      )}
                    >
                      {fmtPct(benchmarkPct)}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('py', 2),
                        'text-right tabular-nums',
                        cm.fontWeight('semibold'),
                        deltaClass(alpha),
                      )}
                    >
                      {fmtPct(alpha)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </section>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <section className={cm.cn('col-span-12 lg:col-span-7', cm.card(), cm.sp('p', 6))}>
          <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
            {t('reports.attributionHeading', {}, { defaultValue: 'Performance attribution (1Y)' })}
          </h2>
          {attribution.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('reports.noAttribution', {}, { defaultValue: 'No attribution data yet.' })}
            </p>
          ) : (
            <ul className={cm.cn('space-y-2')}>
              {attribution.map((a) => {
                const pct = num(a.contribution_pct)
                return (
                  <li key={a.factor}>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.textSize('sm'),
                        cm.sp('mb', 1),
                      )}
                    >
                      <span className={cm.fontWeight('medium')}>{a.factor}</span>
                      <span className={cm.cn('tabular-nums', deltaClass(pct))}>
                        {fmtUsd(a.contribution_cents)} ({fmtPct(pct)})
                      </span>
                    </div>
                    <div className={cm.cn('h-2 rounded-full bg-surface-container overflow-hidden')}>
                      <div
                        className={cm.cn(
                          'h-full rounded-full',
                          pct >= 0 ? 'bg-success' : 'bg-error',
                        )}
                        style={{ width: `${Math.min(100, Math.abs(pct) * 10)}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className={cm.cn('col-span-12 lg:col-span-5', cm.card(), cm.sp('p', 6))}>
          <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
            {t('reports.taxHeading', {}, { defaultValue: 'Tax documents' })}
          </h2>
          {taxDocuments.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('reports.noTaxDocs', {}, { defaultValue: 'No tax documents yet.' })}
            </p>
          ) : (
            <ul className={cm.cn('space-y-3')}>
              {taxDocuments.map((d) => (
                <li
                  key={`${d.year}-${d.type}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('py', 2),
                    'border-b border-outline-variant last:border-b-0',
                  )}
                >
                  <div>
                    <p className={cm.fontWeight('medium')}>
                      {d.year} {d.type}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {d.status}
                    </p>
                  </div>
                  {d.url ? (
                    <a
                      href={d.url}
                      className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}
                    >
                      {t('common.download', {}, { defaultValue: 'Download' })}
                    </a>
                  ) : (
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t('status.pending', {}, { defaultValue: 'Pending' })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className={cm.cn(cm.card(), 'overflow-hidden')}>
        <header
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            'bg-surface-container border-b border-outline-variant',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wide',
            )}
          >
            {t('reports.gainsHeading', {}, { defaultValue: 'Realized & unrealized gains' })}
          </h2>
        </header>
        <table className={cm.cn('w-full')}>
          <thead
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-wide',
              'text-on-surface-variant',
            )}
          >
            <tr>
              <th className={cm.cn(cm.sp('px', 5), cm.sp('py', 2), 'text-left')}>
                {t('reports.col.year', {}, { defaultValue: 'Year' })}
              </th>
              <th className={cm.cn(cm.sp('px', 5), cm.sp('py', 2), 'text-right')}>
                {t('reports.col.short', {}, { defaultValue: 'Short-term' })}
              </th>
              <th className={cm.cn(cm.sp('px', 5), cm.sp('py', 2), 'text-right')}>
                {t('reports.col.long', {}, { defaultValue: 'Long-term' })}
              </th>
              <th className={cm.cn(cm.sp('px', 5), cm.sp('py', 2), 'text-right')}>
                {t('reports.col.unrealized', {}, { defaultValue: 'Unrealized' })}
              </th>
              <th className={cm.cn(cm.sp('px', 5), cm.sp('py', 2), 'text-right')}>
                {t('reports.col.dividends', {}, { defaultValue: 'Dividends' })}
              </th>
              <th className={cm.cn(cm.sp('px', 5), cm.sp('py', 2), 'text-right')}>
                {t('nav.total', {}, { defaultValue: 'Total' })}
              </th>
            </tr>
          </thead>
          <tbody className={cm.cn('divide-y divide-outline-variant')}>
            {realizedUnrealized.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className={cm.cn(cm.sp('py', 6), cm.textCenter, 'text-on-surface-variant')}
                >
                  {t(
                    'reports.noGains',
                    {},
                    { defaultValue: 'No realized/unrealized gains data yet.' },
                  )}
                </td>
              </tr>
            ) : (
              realizedUnrealized.map((y) => (
                <tr key={y.year}>
                  <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 3), cm.fontWeight('medium'))}>
                    {y.year}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 3),
                      'text-right tabular-nums',
                      deltaClass(y.realized_short_cents),
                    )}
                  >
                    {fmtUsd(y.realized_short_cents)}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 3),
                      'text-right tabular-nums',
                      deltaClass(y.realized_long_cents),
                    )}
                  >
                    {fmtUsd(y.realized_long_cents)}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 3),
                      'text-right tabular-nums',
                      deltaClass(y.unrealized_cents),
                    )}
                  >
                    {fmtUsd(y.unrealized_cents)}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 3),
                      'text-right tabular-nums text-success',
                    )}
                  >
                    {fmtUsd(y.dividends_cents)}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 3),
                      'text-right tabular-nums',
                      cm.fontWeight('semibold'),
                      deltaClass(y.total_cents),
                    )}
                  >
                    {fmtUsd(y.total_cents)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
