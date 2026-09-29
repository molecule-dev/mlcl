import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface ReportsResponse {
  kpi?: { label: string; value: string; sub?: string }[]
  funnel_conversion?: { from: string; to: string; rate_pct: number }[]
  time_in_stage?: { stage: string; days: number }[]
  source_breakdown?: { source: string; count: number; color: string }[]
  by_department?: { department: string; hires: number }[]
  top_jobs?: {
    title: string
    department?: string | null
    applicants: number
    in_pipeline_pct?: number
    avg_score?: number | null
    days_open: number
  }[]
  fairness?: { stage: string; pass_rate_majority_pct: number; pass_rate_underrep_pct: number }[]
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
      <div data-mol-id="page-reports" className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  if (error || !data)
    return (
      <div data-mol-id="page-reports" className={cm.cn(cm.sp('p', 8), 'text-error')}>
        {error ?? t('reports.empty', {}, { defaultValue: 'No data.' })}
      </div>
    )

  const kpi = data.kpi ?? []
  const funnelConversion = data.funnel_conversion ?? []
  const timeInStage = data.time_in_stage ?? []
  const sourceBreakdown = data.source_breakdown ?? []
  const topJobs = data.top_jobs ?? []
  const fairness = data.fairness ?? []
  const totalSource = sourceBreakdown.reduce((acc, s) => acc + s.count, 0)
  const maxStage = Math.max(...timeInStage.map((s) => s.days), 1)

  return (
    <div data-mol-id="page-reports" className={cm.cn(cm.sp('py', 8), 'px-4 md:px-8 space-y-6')}>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
        {t('nav.reports', {}, { defaultValue: 'Reports' })}
      </h1>

      <div className={cm.cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4')}>
        {kpi.map((k) => (
          <div key={k.label} className={cm.cn(cm.card(), cm.sp('p', 5))}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-wide',
                'text-on-surface-variant',
              )}
            >
              {k.label}
            </p>
            <p
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 1),
                'tabular-nums',
              )}
            >
              {k.value}
            </p>
            {k.sub ? (
              <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                {k.sub}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <section className={cm.cn('col-span-12 lg:col-span-7', cm.card(), cm.sp('p', 6))}>
          <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
            {t('reports.funnelHeading', {}, { defaultValue: 'Funnel conversion' })}
          </h2>
          <ul className={cm.cn('space-y-3')}>
            {funnelConversion.map((f) => (
              <li key={`${f.from}->${f.to}`}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.textSize('sm'),
                    cm.sp('mb', 1),
                  )}
                >
                  <span className={cm.fontWeight('medium')}>
                    {f.from} → {f.to}
                  </span>
                  <span className={cm.cn('tabular-nums', cm.fontWeight('semibold'))}>
                    {f.rate_pct.toFixed(0)}%
                  </span>
                </div>
                <div
                  className={cm.cn('h-2', cm.roundedFull, 'bg-surface-container overflow-hidden')}
                >
                  <div
                    className={cm.cn('h-full bg-primary', cm.roundedFull)}
                    style={{ width: `${f.rate_pct}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={cm.cn('col-span-12 lg:col-span-5', cm.card(), cm.sp('p', 6))}>
          <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
            {t('reports.sourceHeading', {}, { defaultValue: 'Source breakdown' })}
          </h2>
          <ul className={cm.cn('space-y-2')}>
            {sourceBreakdown.map((s) => {
              const pct = totalSource > 0 ? (s.count / totalSource) * 100 : 0
              return (
                <li key={s.source}>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.textSize('sm'),
                      cm.sp('mb', 1),
                    )}
                  >
                    <span className={cm.fontWeight('medium')}>{s.source}</span>
                    <span className={cm.cn('tabular-nums', 'text-on-surface-variant')}>
                      {s.count} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div
                    className={cm.cn('h-2', cm.roundedFull, 'bg-surface-container overflow-hidden')}
                  >
                    <div
                      className={cm.cn('h-full', cm.roundedFull)}
                      style={{ width: `${pct}%`, backgroundColor: s.color }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <section className={cm.cn('col-span-12 lg:col-span-6', cm.card(), cm.sp('p', 6))}>
          <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
            {t('reports.timeInStageHeading', {}, { defaultValue: 'Median time-in-stage (days)' })}
          </h2>
          <ul className={cm.cn('space-y-2')}>
            {timeInStage.map((s) => (
              <li key={s.stage}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.textSize('sm'),
                    cm.sp('mb', 1),
                  )}
                >
                  <span className={cm.fontWeight('medium')}>{s.stage}</span>
                  <span className={cm.cn('tabular-nums', 'text-on-surface-variant')}>
                    {s.days.toFixed(1)}d
                  </span>
                </div>
                <div
                  className={cm.cn('h-2', cm.roundedFull, 'bg-surface-container overflow-hidden')}
                >
                  <div
                    className={cm.cn('h-full bg-secondary', cm.roundedFull)}
                    style={{ width: `${(s.days / maxStage) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={cm.cn('col-span-12 lg:col-span-6', cm.card(), cm.sp('p', 6))}>
          <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
            {t('reports.fairnessHeading', {}, { defaultValue: 'Fairness pulse' })}
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
                  {t('reports.col.stage', {}, { defaultValue: 'Stage' })}
                </th>
                <th className={cm.cn(cm.sp('py', 2), 'text-right')}>
                  {t('reports.col.majority', {}, { defaultValue: 'Majority' })}
                </th>
                <th className={cm.cn(cm.sp('py', 2), 'text-right')}>
                  {t('reports.col.underrep', {}, { defaultValue: 'Underrepresented' })}
                </th>
                <th className={cm.cn(cm.sp('py', 2), 'text-right')}>
                  {t('reports.col.gap', {}, { defaultValue: 'Gap' })}
                </th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-outline-variant')}>
              {fairness.map((f) => {
                const gap = f.pass_rate_majority_pct - f.pass_rate_underrep_pct
                const concerning = Math.abs(gap) > 10
                return (
                  <tr key={f.stage}>
                    <td className={cm.cn(cm.sp('py', 2), cm.fontWeight('medium'))}>{f.stage}</td>
                    <td className={cm.cn(cm.sp('py', 2), 'text-right tabular-nums')}>
                      {f.pass_rate_majority_pct.toFixed(0)}%
                    </td>
                    <td className={cm.cn(cm.sp('py', 2), 'text-right tabular-nums')}>
                      {f.pass_rate_underrep_pct.toFixed(0)}%
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('py', 2),
                        'text-right tabular-nums',
                        cm.fontWeight('semibold'),
                        concerning ? 'text-error' : 'text-on-surface-variant',
                      )}
                    >
                      {gap >= 0 ? '+' : ''}
                      {gap.toFixed(0)}pp
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      </div>

      <section className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
          {t('reports.topJobsHeading', {}, { defaultValue: 'Top performing requisitions' })}
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
                {t('reports.col.jobTitle', {}, { defaultValue: 'Job title & dept' })}
              </th>
              <th className={cm.cn(cm.sp('py', 2), 'text-right')}>
                {t('reports.col.applicants', {}, { defaultValue: 'Applicants' })}
              </th>
              <th className={cm.cn(cm.sp('py', 2), 'text-right')}>
                {t('reports.col.inPipeline', {}, { defaultValue: 'In-pipeline %' })}
              </th>
              <th className={cm.cn(cm.sp('py', 2), 'text-right')}>
                {t('reports.col.avgScore', {}, { defaultValue: 'Avg score' })}
              </th>
              <th className={cm.cn(cm.sp('py', 2), 'text-right')}>
                {t('reports.col.daysOpen', {}, { defaultValue: 'Days open' })}
              </th>
            </tr>
          </thead>
          <tbody className={cm.cn('divide-y divide-outline-variant')}>
            {topJobs.map((j) => (
              <tr key={j.title}>
                <td className={cm.cn(cm.sp('py', 2))}>
                  <p className={cm.fontWeight('medium')}>{j.title}</p>
                  {j.department ? (
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.sp('mt', 1),
                        'text-on-surface-variant',
                      )}
                    >
                      {j.department}
                    </p>
                  ) : null}
                </td>
                <td className={cm.cn(cm.sp('py', 2), 'text-right tabular-nums')}>{j.applicants}</td>
                <td className={cm.cn(cm.sp('py', 2), 'text-right')}>
                  <span
                    className={cm.cn('tabular-nums', cm.textSize('sm'), 'text-on-surface-variant')}
                  >
                    {(j.in_pipeline_pct ?? 0).toFixed(0)}%
                  </span>
                  <span
                    className={cm.cn(
                      'inline-block align-middle w-16 h-1.5 ms-2 rounded-full bg-surface-container overflow-hidden',
                    )}
                    aria-hidden="true"
                  >
                    <span
                      className={cm.cn('block h-full rounded-full bg-primary')}
                      style={{ width: `${Math.min(100, Math.max(0, j.in_pipeline_pct ?? 0))}%` }}
                    />
                  </span>
                </td>
                <td className={cm.cn(cm.sp('py', 2), 'text-right tabular-nums')}>
                  {j.avg_score != null ? j.avg_score : '—'}
                </td>
                <td
                  className={cm.cn(
                    cm.sp('py', 2),
                    'text-right tabular-nums',
                    'text-on-surface-variant',
                  )}
                >
                  {j.days_open}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
