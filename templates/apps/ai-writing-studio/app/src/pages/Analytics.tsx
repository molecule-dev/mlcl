import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { WritingStatCard } from '../components/WritingStatCard.js'

interface AnalyticsPayload {
  totals: {
    totalWords: number
    totalReadMinutes: number
    publishedCount: number
    draftCount: number
  }
  series: Array<{ date: string; value: number }>
  topArticles: Array<{
    id: string
    title: string
    wordCount: number
    readingMinutes: number
  }>
  trafficSources: Array<{ label: string; value: number }>
  geography: Array<{ country: string; pct: number }>
}

function readMinutesLabel(total: number): string {
  if (total <= 0) return '0:00'
  const minutes = Math.floor(total)
  const seconds = Math.round((total - minutes) * 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function Analytics() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [data, setData] = useState<AnalyticsPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<AnalyticsPayload>('/analytics')
      .then((res) => {
        if (cancelled) return
        setData(res.data ?? null)
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setError(t('analytics.loadError', {}, { defaultValue: 'Could not load analytics.' }))
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const series = data?.series ?? []
  const topArticles = data?.topArticles ?? []
  const totals = data?.totals
  const trafficSources = data?.trafficSources ?? []
  const geography = data?.geography ?? []

  const w = 400
  const h = 100
  const max = Math.max(1, ...series.map((s) => s.value))
  const points =
    series.length > 1
      ? series
          .map((s, i) => `${(i * w) / (series.length - 1)},${h - (s.value / max) * h}`)
          .join(' L')
      : ''
  const linePath = points ? `M${points}` : ''
  const areaPath = points ? `M0,${h} L${points} L${w},${h} Z` : ''
  const avgRead =
    totals && totals.publishedCount + totals.draftCount > 0
      ? totals.totalReadMinutes / (totals.publishedCount + totals.draftCount)
      : 0

  return (
    <div className={cm.cn(cm.sp('p', 8), 'bg-background min-h-screen')}>
      <div className={cm.cn('max-w-7xl', cm.mxAuto, cm.stack(8))}>
        <div>
          <h1
            className={cm.cn(
              'text-3xl font-extrabold tracking-tight font-serif text-on-background',
            )}
          >
            {t('nav.analytics', {}, { defaultValue: 'Analytics' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.textMuted)}>
            {t(
              'analytics.subtitle',
              {},
              { defaultValue: 'How your writing is travelling — last 30 days.' },
            )}
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('p', 4),
              cm.textSize('sm'),
              'rounded-lg bg-error-container text-on-error-container',
            )}
          >
            {error}
          </div>
        ) : null}

        <section
          className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
        >
          <WritingStatCard
            labelKey="analytics.kpi.totalWords"
            labelDefault="Total words"
            value={(totals?.totalWords ?? 0).toLocaleString()}
            icon="text_snippet"
            tone="primary"
          />
          <WritingStatCard
            labelKey="analytics.kpi.published"
            labelDefault="Published"
            value={String(totals?.publishedCount ?? 0)}
            icon="check_circle"
            tone="success"
          />
          <WritingStatCard
            labelKey="analytics.kpi.drafts"
            labelDefault="Drafts"
            value={String(totals?.draftCount ?? 0)}
            icon="edit_note"
            tone="info"
          />
          <WritingStatCard
            labelKey="analytics.kpi.avgRead"
            labelDefault="Avg read time"
            value={readMinutesLabel(avgRead)}
            icon="schedule"
            tone="secondary"
          />
        </section>

        <section
          className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface border border-outline-variant')}
        >
          <header
            className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}
          >
            <h2
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                'text-lg font-extrabold tracking-tight font-serif',
              )}
            >
              <span className="material-symbols-outlined text-primary" aria-hidden="true">
                stacked_line_chart
              </span>
              {t('analytics.activityTitle', {}, { defaultValue: 'Writing activity' })}
            </h2>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.textMuted,
                'uppercase tracking-widest',
              )}
            >
              {t('status.last30Days', {}, { defaultValue: 'Last 30 days' })}
            </span>
          </header>
          {data === null ? (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t('nav.loadingActivity', {}, { defaultValue: 'Loading activity…' })}
            </p>
          ) : series.every((s) => s.value === 0) ? (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'font-serif italic')}>
              {t(
                'analytics.activityEmpty',
                {},
                {
                  defaultValue:
                    'No writing activity recorded yet. Start drafting and your trend line will appear here.',
                },
              )}
            </p>
          ) : (
            <svg
              viewBox={`0 0 ${w} ${h}`}
              className={cm.cn('w-full h-40')}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="analyticsAreaFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#analyticsAreaFill)" />
              <path
                d={linePath}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </section>

        <div className={cm.cn(cm.grid({ gap: 'xl' }), 'grid-cols-1 lg:grid-cols-3')}>
          <section
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-xl bg-surface border border-outline-variant lg:col-span-2',
            )}
          >
            <h2
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('mb', 4),
                'text-lg font-extrabold tracking-tight font-serif',
              )}
            >
              <span className="material-symbols-outlined text-primary" aria-hidden="true">
                trending_up
              </span>
              {t('analytics.topArticlesTitle', {}, { defaultValue: 'Top articles by length' })}
            </h2>
            {data === null ? (
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
              </p>
            ) : topArticles.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'font-serif italic')}>
                {t(
                  'analytics.topArticlesEmpty',
                  {},
                  { defaultValue: 'No published articles yet.' },
                )}
              </p>
            ) : (
              <table className={cm.cn('w-full text-sm')}>
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                    <th className={cm.cn('text-left pb-3')}>
                      {t('form.title', {}, { defaultValue: 'Title' })}
                    </th>
                    <th className={cm.cn('text-right pb-3')}>
                      {t('analytics.col.words', {}, { defaultValue: 'Words' })}
                    </th>
                    <th className={cm.cn('text-right pb-3')}>
                      {t('analytics.col.readMin', {}, { defaultValue: 'Read time' })}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {topArticles.map((a) => (
                    <tr
                      key={a.id}
                      className={cm.cn('hover:bg-surface-container-low transition-colors')}
                    >
                      <td className={cm.cn('py-3 font-serif')}>{a.title}</td>
                      <td className={cm.cn('py-3 text-right font-mono tabular-nums')}>
                        {a.wordCount.toLocaleString()}
                      </td>
                      <td className={cm.cn('py-3 text-right font-mono tabular-nums')}>
                        {a.readingMinutes} min
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section
            className={cm.cn(cm.sp('p', 6), 'rounded-xl bg-surface border border-outline-variant')}
          >
            <h2
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('mb', 4),
                'text-lg font-extrabold tracking-tight font-serif',
              )}
            >
              <span className="material-symbols-outlined text-primary" aria-hidden="true">
                donut_large
              </span>
              {t('analytics.trafficTitle', {}, { defaultValue: 'Traffic sources' })}
            </h2>
            {trafficSources.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'font-serif italic')}>
                {t(
                  'analytics.trafficEmpty',
                  {},
                  {
                    defaultValue:
                      'Traffic ingestion is not configured for this template. Connect a source to see the breakdown.',
                  },
                )}
              </p>
            ) : (
              <ul className={cm.stack(3)}>
                {trafficSources.map((src) => (
                  <li key={src.label}>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.textSize('sm'),
                      )}
                    >
                      <span>{src.label}</span>
                      <span className="font-mono tabular-nums text-on-surface-variant">
                        {src.value}%
                      </span>
                    </div>
                    <div
                      className={cm.cn(
                        'mt-1 h-1.5 w-full rounded-full bg-surface-container-low overflow-hidden',
                      )}
                    >
                      <div
                        className={cm.cn('h-full rounded-full bg-primary')}
                        style={{ width: `${src.value}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section
          className={cm.cn(cm.sp('p', 6), 'rounded-xl bg-surface border border-outline-variant')}
        >
          <h2
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('mb', 4),
              'text-lg font-extrabold tracking-tight font-serif',
            )}
          >
            <span className="material-symbols-outlined text-primary" aria-hidden="true">
              public
            </span>
            {t('analytics.geographyTitle', {}, { defaultValue: 'Reader geography' })}
          </h2>
          {geography.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'font-serif italic')}>
              {t(
                'analytics.geographyEmpty',
                {},
                {
                  defaultValue: 'Reader geography requires a CDN or analytics provider connection.',
                },
              )}
            </p>
          ) : (
            <ul className={cm.stack(3)}>
              {geography.map((g) => (
                <li key={g.country}>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.textSize('sm'),
                    )}
                  >
                    <span className="font-serif">{g.country}</span>
                    <span className="font-mono tabular-nums text-on-surface-variant">{g.pct}%</span>
                  </div>
                  <div
                    className={cm.cn(
                      'mt-1 h-2 w-full rounded-full bg-surface-container-low overflow-hidden',
                    )}
                  >
                    <div
                      className={cm.cn('h-full rounded-full bg-primary')}
                      style={{ width: `${g.pct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

export default Analytics
export { Analytics as AnalyticsPage }
