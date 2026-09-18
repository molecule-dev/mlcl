import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface ReportDetail {
  id: string
  title: string
  description: string
  hero: { type: 'bar' | 'line'; series: { label: string; value: number }[] }
  kpis: { label: string; value: string; delta_pct?: number }[]
  sub_charts: { title: string; series: { label: string; value: number }[]; color: string }[]
  ai_summary: string
  data_table: { col: string; values: (string | number)[] }[]
}

function deltaClass(n: number): string {
  if (n > 0) return 'text-success'
  if (n < 0) return 'text-error'
  return ''
}

export function ReportDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [report, setReport] = useState<ReportDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/saved_reports/${id}`)
      .then((res) => {
        if (!cancelled) setReport(unwrapSingle<ReportDetail>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('reportDetail.loadError', {}, { defaultValue: 'Failed to load report.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (loading)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  if (error || !report)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-error')}>
        {error ?? t('reportDetail.notFound', {}, { defaultValue: 'Report not found.' })}
      </div>
    )

  const heroMax = Math.max(...report.hero.series.map((s) => s.value), 1)
  // Honor the report's stored hero.type: 'line' renders a line chart (mirroring
  // the thumbnail's line render), 'bar' keeps the horizontal-bar list. The type
  // was persisted + served but the detail view always drew bars.
  const heroMin = Math.min(...report.hero.series.map((s) => s.value), 0)
  const heroRange = Math.max(1, heroMax - heroMin)
  const isHeroLine = report.hero.type === 'line'
  const heroLinePoints = report.hero.series
    .map((s, i, arr) => {
      const x = (i / Math.max(1, arr.length - 1)) * 200
      const y = 80 - ((s.value - heroMin) / heroRange) * 72
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <Link to="/reports" className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}>
        ← {t('reportDetail.back', {}, { defaultValue: 'All reports' })}
      </Link>

      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>{report.title}</h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {report.description}
        </p>
      </header>

      <section className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
          {t('reportDetail.heroHeading', {}, { defaultValue: 'Hero chart' })}
        </h2>
        {isHeroLine ? (
          <div>
            <svg
              viewBox="0 0 200 80"
              preserveAspectRatio="none"
              className={cm.cn('w-full', 'h-48')}
              aria-hidden="true"
            >
              <path
                d={`M0,80 L${heroLinePoints.split(' ').join(' L')} L200,80 Z`}
                fill="var(--chart-color-1)"
                opacity="0.12"
              />
              <polyline
                points={heroLinePoints}
                fill="none"
                stroke="var(--chart-color-1)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div
              className={cm.cn(
                cm.flex({ justify: 'between' }),
                cm.textSize('xs'),
                cm.sp('mt', 2),
                'text-on-surface-variant',
              )}
            >
              {report.hero.series.map((s) => (
                <span key={s.label}>{s.label}</span>
              ))}
            </div>
          </div>
        ) : (
          <ul className={'space-y-2'}>
            {report.hero.series.map((s) => (
              <li key={s.label}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.textSize('sm'),
                    cm.sp('mb', 1),
                  )}
                >
                  <span className={cm.fontWeight('medium')}>{s.label}</span>
                  <span className={cm.cn('tabular-nums', 'text-on-surface-variant')}>
                    {s.value.toLocaleString()}
                  </span>
                </div>
                <div
                  className={cm.cn('h-3', cm.roundedFull, 'bg-surface-container overflow-hidden')}
                >
                  <div
                    className={cm.cn('h-full', cm.roundedFull)}
                    style={{
                      width: `${(s.value / heroMax) * 100}%`,
                      backgroundColor: 'var(--chart-color-1)',
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className={cm.grid({ cols: report.kpis.length, gap: 'md' })}>
        {report.kpis.map((k) => (
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
            {k.delta_pct != null ? (
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.sp('mt', 1),
                  'tabular-nums',
                  deltaClass(k.delta_pct),
                )}
              >
                {k.delta_pct >= 0 ? '+' : ''}
                {k.delta_pct.toFixed(1)}% {t('reportDetail.momSuffix', {}, { defaultValue: 'MoM' })}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <section className={cm.cn('col-span-12 lg:col-span-8 space-y-4')}>
          <div className={cm.grid({ cols: 2, gap: 'md' })}>
            {report.sub_charts.map((sc, i) => {
              const max = Math.max(...sc.series.map((s) => s.value), 1)
              return (
                <div key={i} className={cm.cn(cm.card(), cm.sp('p', 5))}>
                  <h3
                    className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.sp('mb', 3))}
                  >
                    {sc.title}
                  </h3>
                  <ul className={'space-y-1'}>
                    {sc.series.map((s) => (
                      <li key={s.label}>
                        <div
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'between' }),
                            cm.textSize('xs'),
                            cm.sp('mb', 1),
                          )}
                        >
                          <span>{s.label}</span>
                          <span className={cm.cn('tabular-nums', 'text-on-surface-variant')}>
                            {s.value.toLocaleString()}
                          </span>
                        </div>
                        <div
                          className={cm.cn(
                            'h-2',
                            cm.roundedFull,
                            'bg-surface-container overflow-hidden',
                          )}
                        >
                          <div
                            className={cm.cn('h-full', cm.roundedFull)}
                            style={{
                              width: `${(s.value / max) * 100}%`,
                              backgroundColor: sc.color,
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </section>

        <aside
          className={cm.cn(
            'col-span-12 lg:col-span-4',
            cm.card(),
            cm.sp('p', 5),
            'space-y-3 sticky top-24',
          )}
        >
          <h2 className={cm.sectionHeading}>
            ✨ {t('reportDetail.aiSummaryHeading', {}, { defaultValue: 'AI summary' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'whitespace-pre-line')}>{report.ai_summary}</p>
        </aside>
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
            {t('reportDetail.dataHeading', {}, { defaultValue: 'Full data' })}
          </h2>
        </header>
        <table className={'w-full'}>
          <thead
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-wide',
              'text-on-surface-variant',
            )}
          >
            <tr>
              {report.data_table.map((c) => (
                <th
                  key={c.col}
                  className={cm.cn(cm.sp('px', 4), cm.sp('py', 2), 'text-left font-mono')}
                >
                  {c.col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={'divide-y divide-outline-variant'}>
            {report.data_table[0]?.values.map((_, rowIdx) => (
              <tr key={rowIdx}>
                {report.data_table.map((c) => (
                  <td
                    key={c.col}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      'tabular-nums font-mono',
                    )}
                  >
                    {c.values[rowIdx]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
