import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { KpiStatCard } from '../components/KpiStatCard.js'
import { NpsDistributionBar } from '../components/NpsDistributionBar.js'

interface AnalyticsSummary {
  total_responses: number
  completed_responses: number
  completion_rate: number
  nps: number | null
  nps_distribution: Record<string, number>
  promoters: number
  passives: number
  detractors: number
}

function distributionToCounts(dist?: Record<string, number>): number[] {
  const counts: number[] = []
  for (let score = 0; score <= 10; score += 1) {
    counts.push(Number(dist?.[String(score)] ?? 0))
  }
  return counts
}

export function Analytics() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const surveyId = id ?? ''

  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!surveyId) return
    let cancelled = false
    http
      .get<AnalyticsSummary>(`/api/responses/analytics/summary?survey_id=${surveyId}`)
      .then((response) => {
        if (cancelled) return
        if (response?.data) setAnalytics(response.data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not load analytics.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, surveyId])

  const total = analytics?.total_responses ?? 0
  const promoters = analytics?.promoters ?? 0
  const passives = analytics?.passives ?? 0
  const promoterPct = total > 0 ? Math.round((promoters / total) * 100) : 0
  const passivePct = total > 0 ? Math.round((passives / total) * 100) : 0
  const detractorPct = Math.max(0, 100 - promoterPct - passivePct)
  const npsScore = analytics?.nps ?? null
  const counts = distributionToCounts(analytics?.nps_distribution)

  return (
    <div className={cm.cn(cm.stack(8), cm.sp('p', 8), cm.maxW('7xl'), cm.mxAuto, cm.w('full'))}>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
        <Link
          to={`/surveys/${surveyId}`}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 1 }),
            cm.fontWeight('semibold'),
            cm.textSize('xs'),
            'text-primary hover:underline uppercase tracking-widest',
          )}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden="true">
            arrow_back
          </span>
          {t('analytics.back', {}, { defaultValue: 'Survey overview' })}
        </Link>
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('nav.analytics', {}, { defaultValue: 'Analytics' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'analytics.subheading',
            {},
            {
              defaultValue:
                'NPS scoreboard, response funnel, and per-score distribution from real responses.',
            },
          )}
        </p>
        {error && (
          <p role="alert" className="text-[color:var(--color-on-error)] text-sm">
            {error}
          </p>
        )}
      </div>

      <section className={cm.cn(cm.grid({ cols: 1, gap: 4 }), 'sm:grid-cols-3')}>
        <KpiStatCard
          label={t('analytics.kpiNps', {}, { defaultValue: 'NPS score' })}
          value={npsScore !== null ? String(npsScore) : '—'}
          trend={t(
            'analytics.kpiNpsTrend',
            { p: promoterPct, d: detractorPct },
            { defaultValue: 'Promoters {{p}}% · Detractors {{d}}%' },
          )}
          icon="thumb_up"
          accent="primary"
          trendTone="up"
        />
        <KpiStatCard
          label={t('analytics.kpiPromoter', {}, { defaultValue: 'Promoter share' })}
          value={`${promoterPct}%`}
          trend={t(
            'analytics.kpiPromoterTrend',
            { count: promoters },
            { defaultValue: '{{count}} promoter responses' },
          )}
          icon="rocket_launch"
          accent="success"
          trendTone="up"
        />
        <KpiStatCard
          label={t('analytics.kpiResponses', {}, { defaultValue: 'Total responses' })}
          value={String(total)}
          trend={t(
            'analytics.kpiResponsesTrend',
            { rate: analytics?.completion_rate ?? 0 },
            { defaultValue: '{{rate}}% completion' },
          )}
          icon="how_to_vote"
          accent="secondary"
          trendTone="up"
        />
      </section>

      <section
        data-testid="analytics-nps-distribution"
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 4 }),
          cm.sp('p', 6),
          'rounded-xl bg-surface border border-[color:var(--color-border)]',
        )}
      >
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-primary',
            )}
          >
            {t('analytics.npsEyebrow', {}, { defaultValue: 'NPS distribution' })}
          </span>
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
            {t(
              'analytics.npsHeading',
              {},
              { defaultValue: 'How respondents are scoring you, 0-10' },
            )}
          </h2>
        </div>
        {loading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('analytics.loading', {}, { defaultValue: 'Loading analytics…' })}
          </p>
        ) : total === 0 ? (
          <p
            data-testid="analytics-empty"
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {t(
              'analytics.empty',
              {},
              { defaultValue: 'Not enough responses yet to chart a distribution.' },
            )}
          </p>
        ) : (
          <NpsDistributionBar counts={counts} />
        )}
      </section>
    </div>
  )
}

export default Analytics
