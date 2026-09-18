import { useEffect, useState } from 'react'

import { get } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ConfidenceMeter } from '../components/ConfidenceMeter.js'
import { RapportLayout } from '../components/RapportLayout.js'

interface AnalyticsResponse {
  summary: {
    totalConversations: number
    resolvedConversations: number
    escalatedConversations: number
    openConversations: number
    resolutionRate: number
    averageCsat: number
    helpfulRate: number
    knowledgeArticles: number
    totalFeedback: number
  }
  channels: Record<string, number>
  timeseries: Array<{ date: string; total: number; resolved: number; escalated: number }>
}

function buildSparkPath(spark: number[], width = 200, height = 48): string {
  if (spark.length === 0) return ''
  const min = Math.min(...spark)
  const max = Math.max(...spark)
  const range = max - min || 1
  const step = spark.length === 1 ? 0 : width / (spark.length - 1)
  return spark
    .map((v, i) => {
      const x = i * step
      const y = height - ((v - min) / range) * height
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

function buildAreaPath(values: number[], width = 600, height = 220): string {
  if (values.length === 0) return ''
  const max = Math.max(...values, 1)
  const step = values.length === 1 ? 0 : width / (values.length - 1)
  const line = values
    .map((v, i) => {
      const x = i * step
      const y = height - (v / max) * (height - 20)
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
  return line
}

function Analytics() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const response = await get<AnalyticsResponse>('/api/analytics')
        if (!cancelled) setData(response.data ?? null)
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error
              ? err.message
              : t('analytics.loadError', {}, { defaultValue: 'Failed to load analytics' }),
          )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const summary = data?.summary
  const timeseries = data?.timeseries ?? []
  const channels = data?.channels ?? {}

  const totalsSeries = timeseries.map((d) => d.total)
  const resolvedSeries = timeseries.map((d) => d.resolved)
  const escalatedSeries = timeseries.map((d) => d.escalated)

  const KPIS = summary
    ? [
        {
          key: 'csat',
          labelKey: 'analytics.kpi.csat',
          labelDefault: 'Avg CSAT',
          value: summary.averageCsat ? summary.averageCsat.toFixed(2) : '0.00',
          unit: '/ 5',
          spark: totalsSeries,
        },
        {
          key: 'resolution',
          labelKey: 'analytics.kpi.resolution',
          labelDefault: 'Resolution rate',
          value: `${Math.round(summary.resolutionRate * 100)}`,
          unit: '%',
          spark: resolvedSeries,
        },
        {
          key: 'helpful',
          labelKey: 'analytics.kpi.helpful',
          labelDefault: 'Helpful feedback',
          value: `${Math.round(summary.helpfulRate * 100)}`,
          unit: '%',
          spark: totalsSeries,
        },
        {
          key: 'escalations',
          labelKey: 'analytics.kpi.escalations',
          labelDefault: 'Escalations',
          value: String(summary.escalatedConversations),
          unit: t('analytics.kpi.escalationsUnit', {}, { defaultValue: 'total' }),
          spark: escalatedSeries,
        },
      ]
    : []

  return (
    <RapportLayout>
      <div data-mol-id="page-analytics" className={cm.cn(cm.flex({ direction: 'col', gap: 3 }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            'tracking-widest uppercase text-primary',
          )}
        >
          {t('analytics.eyebrow', {}, { defaultValue: 'Last 14 days' })}
        </span>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-4xl tracking-tight text-on-background leading-tight',
          )}
        >
          {t(
            'analytics.title',
            { appName: APP_NAME },
            { defaultValue: 'How {{appName}} is doing' },
          )}
        </h1>
      </div>

      {loading ? (
        <div
          data-mol-id="analytics-loading"
          className={cm.cn(cm.textCenter, cm.sp('p', 8), 'text-on-surface-variant')}
        >
          {t('analytics.loading', {}, { defaultValue: 'Crunching numbers…' })}
        </div>
      ) : error ? (
        <div
          data-mol-id="analytics-error"
          role="alert"
          className={cm.cn(cm.textCenter, cm.sp('p', 8), 'text-error')}
        >
          {error}
        </div>
      ) : !summary ? (
        <div
          data-mol-id="analytics-empty"
          className={cm.cn(cm.textCenter, cm.sp('p', 8), 'text-on-surface-variant')}
        >
          {t(
            'analytics.empty',
            {},
            {
              defaultValue: 'No conversations yet — analytics will appear once you start a thread.',
            },
          )}
        </div>
      ) : (
        <>
          <div
            className={cm.cn(cm.grid({ cols: 1, gap: 6 }), 'md:grid-cols-2 lg:grid-cols-4')}
            data-mol-id="analytics-kpis"
          >
            {KPIS.map((kpi) => {
              const path = buildSparkPath(kpi.spark.length ? kpi.spark : [0])
              return (
                <div
                  key={kpi.key}
                  data-mol-id={`analytics-kpi-${kpi.key}`}
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 3 }),
                    cm.sp('p', 5),
                    'rounded-2xl bg-surface-container-lowest border-l-4 border-primary hover:-translate-y-0.5 transition-transform shadow-sm',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] tracking-widest uppercase text-on-surface-variant',
                    )}
                  >
                    {t(kpi.labelKey, {}, { defaultValue: kpi.labelDefault })}
                  </span>
                  <div className={cm.cn(cm.flex({ align: 'baseline', gap: 1 }))}>
                    <span
                      data-mol-id={`analytics-kpi-${kpi.key}-value`}
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-4xl tabular-nums tracking-tight text-on-surface',
                      )}
                    >
                      {kpi.value}
                    </span>
                    {kpi.unit && (
                      <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                        {kpi.unit}
                      </span>
                    )}
                  </div>
                  <svg viewBox="0 0 200 48" className="w-full h-12">
                    <path
                      d={path}
                      fill="none"
                      stroke="var(--color-primary)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={`${path} L 200 48 L 0 48 Z`}
                      fill="var(--color-primary)"
                      opacity="0.15"
                    />
                  </svg>
                </div>
              )
            })}
          </div>

          <div className={cm.cn(cm.grid({ cols: 1, gap: 6 }), 'lg:grid-cols-12')}>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 4 }),
                cm.sp('p', 6),
                'lg:col-span-8 rounded-2xl bg-surface-container-lowest shadow-sm',
              )}
              data-mol-id="analytics-trend-chart"
            >
              <div className={cm.flex({ justify: 'between', align: 'center' })}>
                <h2
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('lg'),
                    'text-on-surface tracking-tight',
                  )}
                >
                  {t('analytics.trend.title', {}, { defaultValue: 'Conversations per day' })}
                </h2>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t('analytics.trend.range', {}, { defaultValue: 'Last 14 days' })}
                </span>
              </div>
              <svg viewBox="0 0 600 220" className="w-full h-56">
                {[0, 1, 2, 3, 4].map((i) => (
                  <line
                    key={i}
                    x1="0"
                    x2="600"
                    y1={i * 50}
                    y2={i * 50}
                    stroke="var(--color-outline-variant)"
                    strokeOpacity="0.3"
                    strokeDasharray="2 4"
                  />
                ))}
                <path
                  d={buildAreaPath(totalsSeries)}
                  stroke="var(--color-primary)"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 4 }),
                cm.sp('p', 6),
                'lg:col-span-4 rounded-2xl bg-surface-container-lowest shadow-sm',
              )}
              data-mol-id="analytics-channels"
            >
              <h2
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('lg'),
                  'text-on-surface tracking-tight',
                )}
              >
                {t('analytics.channels.title', {}, { defaultValue: 'By channel' })}
              </h2>
              {Object.keys(channels).length === 0 ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('analytics.channels.empty', {}, { defaultValue: 'No channel data yet.' })}
                </p>
              ) : (
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 3 }))}>
                  {Object.entries(channels).map(([channel, c]) => {
                    const share =
                      summary.totalConversations > 0 ? c / summary.totalConversations : 0
                    return (
                      <div
                        key={channel}
                        data-mol-id={`analytics-channel-${channel}`}
                        className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}
                      >
                        <div className={cm.flex({ justify: 'between', align: 'baseline' })}>
                          <span className={cm.cn(cm.textSize('sm'), 'text-on-surface capitalize')}>
                            {channel}
                          </span>
                          <span
                            className={cm.cn(
                              cm.textSize('xs'),
                              'tabular-nums text-on-surface-variant',
                            )}
                          >
                            {c}
                          </span>
                        </div>
                        <div
                          className={cm.cn(
                            cm.h(2),
                            cm.w('full'),
                            cm.roundedFull,
                            'bg-surface-container overflow-hidden',
                          )}
                        >
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.max(4, share * 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 4 }),
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest shadow-sm',
            )}
            data-mol-id="analytics-quality"
          >
            <h2
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('lg'),
                'text-on-surface tracking-tight',
              )}
            >
              {t('analytics.quality.title', {}, { defaultValue: 'Quality signals' })}
            </h2>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 4 }))}>
              <div
                data-mol-id="analytics-quality-helpful"
                className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}
              >
                <div className={cm.flex({ justify: 'between', align: 'baseline' })}>
                  <span className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                    {t('analytics.quality.helpful', {}, { defaultValue: 'Helpful feedback rate' })}
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'tabular-nums text-on-surface',
                    )}
                  >
                    {Math.round(summary.helpfulRate * 100)}%
                  </span>
                </div>
                <ConfidenceMeter
                  value={summary.helpfulRate}
                  hideValue
                  label={t(
                    'analytics.quality.helpfulSubtitle',
                    {},
                    { defaultValue: 'thumbs-up share' },
                  )}
                />
              </div>
              <div
                data-mol-id="analytics-quality-resolution"
                className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}
              >
                <div className={cm.flex({ justify: 'between', align: 'baseline' })}>
                  <span className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                    {t('analytics.quality.resolution', {}, { defaultValue: 'Resolution rate' })}
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'tabular-nums text-on-surface',
                    )}
                  >
                    {Math.round(summary.resolutionRate * 100)}%
                  </span>
                </div>
                <ConfidenceMeter
                  value={summary.resolutionRate}
                  hideValue
                  label={t(
                    'analytics.quality.resolutionSubtitle',
                    {},
                    { defaultValue: 'closed without escalation' },
                  )}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </RapportLayout>
  )
}

export default Analytics
export { Analytics, Analytics as AnalyticsPage }
