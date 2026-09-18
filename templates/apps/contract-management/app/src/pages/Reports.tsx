import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface ThroughputBucket {
  month: string
  sent: number
  signed: number
}

interface ValueByType {
  type: string
  total_cents: number
}

interface RenewalRow {
  counterparty: string
  count: number
  total_cents: number
}

interface StatusMixRow {
  status: string
  count: number
}

interface ReportsResponse {
  throughput_history: ThroughputBucket[]
  value_by_type: ValueByType[]
  renewal_pipeline: RenewalRow[]
  status_mix: StatusMixRow[]
}

const EMPTY_REPORTS: ReportsResponse = {
  throughput_history: [],
  value_by_type: [],
  renewal_pipeline: [],
  status_mix: [],
}

function fmtUsd(cents: number): string {
  const abs = cents / 100
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `$${(abs / 1_000).toFixed(0)}K`
  return `$${abs.toFixed(2)}`
}

export function Reports() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [data, setData] = useState<ReportsResponse>(EMPTY_REPORTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/reports/full')
      .then((res) => {
        if (cancelled) return
        const parsed = unwrapSingle<ReportsResponse>(res)
        setData({
          throughput_history: parsed?.throughput_history ?? [],
          value_by_type: parsed?.value_by_type ?? [],
          renewal_pipeline: parsed?.renewal_pipeline ?? [],
          status_mix: parsed?.status_mix ?? [],
        })
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

  const maxThroughput = Math.max(
    ...data.throughput_history.map((p) => Math.max(p.sent, p.signed)),
    1,
  )
  const totalValue = data.value_by_type.reduce((acc, v) => acc + v.total_cents, 0)
  const totalPipeline = data.renewal_pipeline.reduce((acc, p) => acc + p.total_cents, 0)
  const totalContracts = data.status_mix.reduce((s, r) => s + r.count, 0)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
        {t('nav.reports', {}, { defaultValue: 'Reports' })}
      </h1>

      {error ? (
        <p role="alert" className={cm.cn(cm.sp('py', 4), 'text-error')}>
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className={cm.cn(cm.sp('py', 4), 'text-on-surface-variant')}>
          {t('reports.loading', {}, { defaultValue: 'Loading\u2026' })}
        </p>
      ) : null}

      <section className={cm.cn(cm.card(), cm.sp('p', 6))} data-testid="reports-throughput">
        <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
          {t('reports.throughputHeading', {}, { defaultValue: 'Throughput (6 months)' })}
        </h2>
        {data.throughput_history.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('reports.empty', {}, { defaultValue: 'No data yet.' })}
          </p>
        ) : (
          <>
            <svg
              viewBox="0 0 600 200"
              className={'w-full h-48'}
              role="img"
              aria-label={t(
                'reports.throughputChartLabel',
                {},
                { defaultValue: 'Throughput chart' },
              )}
            >
              {data.throughput_history.map((p, i, arr) => {
                const w = 600 / arr.length
                const x = i * w + 4
                const sentH = (p.sent / maxThroughput) * 180
                const signedH = (p.signed / maxThroughput) * 180
                return (
                  <g key={`${p.month}-${i}`}>
                    <rect
                      x={x}
                      y={190 - sentH}
                      width={(w - 8) / 2}
                      height={sentH}
                      fill="var(--mol-color-secondary)"
                      opacity="0.6"
                    />
                    <rect
                      x={x + (w - 8) / 2 + 2}
                      y={190 - signedH}
                      width={(w - 8) / 2}
                      height={signedH}
                      fill="var(--mol-color-success)"
                    />
                  </g>
                )
              })}
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
                <span
                  className={'inline-block w-3 h-3 bg-secondary opacity-60 align-middle mr-1'}
                />{' '}
                {t('reports.sent', {}, { defaultValue: 'Sent' })}
              </span>
              <span>
                <span className={'inline-block w-3 h-3 bg-success align-middle mr-1'} />{' '}
                {t('reports.signed', {}, { defaultValue: 'Signed' })}
              </span>
            </div>
          </>
        )}
      </section>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <section
          className={cm.cn('col-span-12 lg:col-span-6', cm.card(), cm.sp('p', 6))}
          data-testid="reports-status-mix"
        >
          <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
            {t('reports.statusMixHeading', {}, { defaultValue: 'Status mix' })}
          </h2>
          {data.status_mix.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('reports.empty', {}, { defaultValue: 'No data yet.' })}
            </p>
          ) : (
            <ul className={'space-y-2'}>
              {data.status_mix.map((r) => {
                const pct = totalContracts > 0 ? (r.count / totalContracts) * 100 : 0
                return (
                  <li key={r.status}>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.textSize('sm'),
                        cm.sp('mb', 1),
                      )}
                    >
                      <span className={cm.cn(cm.fontWeight('medium'), 'capitalize')}>
                        {r.status}
                      </span>
                      <span className={cm.cn('tabular-nums', 'text-on-surface-variant')}>
                        {r.count} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className={'h-2 rounded-full bg-surface-container overflow-hidden'}>
                      <div
                        className={'h-full bg-primary rounded-full'}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section
          className={cm.cn('col-span-12 lg:col-span-6', cm.card(), cm.sp('p', 6))}
          data-testid="reports-value-by-type"
        >
          <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
            {t('reports.valueByTypeHeading', {}, { defaultValue: 'Value by contract type' })}
          </h2>
          {data.value_by_type.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('reports.empty', {}, { defaultValue: 'No data yet.' })}
            </p>
          ) : (
            <ul className={'space-y-2'}>
              {data.value_by_type.map((v) => {
                const pct = totalValue > 0 ? (v.total_cents / totalValue) * 100 : 0
                return (
                  <li key={v.type}>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.textSize('sm'),
                        cm.sp('mb', 1),
                      )}
                    >
                      <span className={cm.cn(cm.fontWeight('medium'), 'uppercase')}>{v.type}</span>
                      <span className={cm.cn('tabular-nums', 'text-on-surface-variant')}>
                        {fmtUsd(v.total_cents)} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className={'h-2 rounded-full bg-surface-container overflow-hidden'}>
                      <div
                        className={'h-full bg-primary rounded-full'}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <section className={cm.cn(cm.card(), cm.sp('p', 6))} data-testid="reports-renewals">
        <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
          <h2 className={cm.sectionHeading}>
            {t('reports.pipelineHeading', {}, { defaultValue: 'Renewal pipeline (next 90 days)' })}
          </h2>
          <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'reports.totalPipeline',
              { value: fmtUsd(totalPipeline) },
              { defaultValue: 'Total: {{value}}' },
            )}
          </span>
        </header>
        {data.renewal_pipeline.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('reports.empty', {}, { defaultValue: 'No upcoming renewals.' })}
          </p>
        ) : (
          <table className={'w-full'}>
            <thead
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-wide',
                'text-on-surface-variant',
              )}
            >
              <tr>
                <th className={cm.cn(cm.sp('py', 2), 'text-left')}>
                  {t('reports.col.counterparty', {}, { defaultValue: 'Counterparty' })}
                </th>
                <th className={cm.cn(cm.sp('py', 2), 'text-right')}>
                  {t('reports.col.count', {}, { defaultValue: 'Contracts' })}
                </th>
                <th className={cm.cn(cm.sp('py', 2), 'text-right')}>
                  {t('reports.col.value', {}, { defaultValue: 'Value' })}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {data.renewal_pipeline.map((p) => (
                <tr key={p.counterparty}>
                  <td className={cm.cn(cm.sp('py', 2), cm.fontWeight('medium'))}>
                    {p.counterparty || '\u2014'}
                  </td>
                  <td className={cm.cn(cm.sp('py', 2), 'text-right tabular-nums')}>{p.count}</td>
                  <td
                    className={cm.cn(
                      cm.sp('py', 2),
                      'text-right tabular-nums',
                      cm.fontWeight('semibold'),
                    )}
                  >
                    {fmtUsd(p.total_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
