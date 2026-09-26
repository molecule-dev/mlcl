import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { KpiStatCard } from '../components/KpiStatCard.js'
import { ResponsesHeroCard } from '../components/ResponsesHeroCard.js'
import { StatusPill, type StatusVariant } from '../components/StatusPill.js'

interface SurveyApiRow {
  id: string
  title: string
  description: string
  status: string
  slug: string | null
  response_count: number
  published_at: string | null
}

interface AnalyticsSummary {
  total_responses: number
  completed_responses: number
  completion_rate: number
  nps: number | null
  promoters: number
  passives: number
  detractors: number
}

function statusToVariant(status?: string): StatusVariant {
  switch (status) {
    case 'published':
      return 'active'
    case 'closed':
    case 'archived':
      return 'closed'
    default:
      return 'draft'
  }
}

interface TabLinkProps {
  to: string
  active?: boolean
  icon: string
  label: string
}

function TabLink({ to, active, icon, label }: TabLinkProps) {
  const cm = getClassMap()
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 2 }),
        cm.sp('px', 4),
        cm.sp('py', 2),
        cm.fontWeight('semibold'),
        cm.textSize('sm'),
        'rounded-full transition-colors',
        active
          ? 'bg-primary text-white shadow-sm'
          : 'bg-surface text-on-surface-variant hover:text-primary border border-[color:var(--color-border)]',
      )}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">
        {icon}
      </span>
      {label}
    </Link>
  )
}

export function SurveyDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const surveyId = id ?? ''

  const [survey, setSurvey] = useState<SurveyApiRow | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [closing, setClosing] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')

  useEffect(() => {
    let cancelled = false
    if (!surveyId) return
    setLoading(true)
    Promise.allSettled([
      http.get<SurveyApiRow>(`/api/surveys/${surveyId}`),
      http.get<AnalyticsSummary>(`/api/responses/analytics/summary?survey_id=${surveyId}`),
    ])
      .then(([surveyResult, analyticsResult]) => {
        if (cancelled) return
        if (surveyResult.status === 'fulfilled' && surveyResult.value?.data) {
          setSurvey(surveyResult.value.data)
        } else if (surveyResult.status === 'rejected') {
          setError(
            surveyResult.reason instanceof Error
              ? surveyResult.reason.message
              : 'Could not load survey.',
          )
        }
        if (analyticsResult.status === 'fulfilled' && analyticsResult.value?.data) {
          setAnalytics(analyticsResult.value.data)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, surveyId])

  const shareUrl = useMemo(() => {
    if (!survey?.slug) return null
    return `${window.location.origin}/s/${survey.slug}`
  }, [survey?.slug])

  async function handlePublish() {
    if (!surveyId) return
    setPublishing(true)
    setError(null)
    try {
      const response = await http.post<SurveyApiRow>(`/api/surveys/${surveyId}/publish`)
      if (response?.data) {
        // Domain event: go-live from the overview page.
        void track({ name: 'survey.published', properties: { survey_id: String(surveyId) } })
        setSurvey(response.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish the survey.')
    } finally {
      setPublishing(false)
    }
  }

  async function handleClose() {
    if (!surveyId) return
    setClosing(true)
    setError(null)
    try {
      const response = await http.post<SurveyApiRow>(`/api/surveys/${surveyId}/close`)
      if (response?.data) {
        // Domain event: survey lifecycle end.
        void track({ name: 'survey.closed', properties: { survey_id: String(surveyId) } })
        setSurvey(response.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not close the survey.')
    } finally {
      setClosing(false)
    }
  }

  async function handleCopyShareUrl() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 1600)
    } catch (_error) {
      // Clipboard write failed — error state is shown to the user via setCopyState
      setCopyState('error')
      setTimeout(() => setCopyState('idle'), 2400)
    }
  }

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('surveyDetail.loading', {}, { defaultValue: 'Loading survey…' })}
      </div>
    )
  }

  if (!survey) {
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {error ?? t('surveyDetail.notFound', {}, { defaultValue: 'Survey not found.' })}
      </div>
    )
  }

  const variant = statusToVariant(survey.status)
  const responses = analytics?.total_responses ?? survey.response_count ?? 0
  const completionPct = analytics?.completion_rate ?? 0
  const npsValue = analytics?.nps

  return (
    <div className={cm.cn(cm.stack(8), cm.sp('p', 8), cm.maxW('7xl'), cm.mxAuto, cm.w('full'))}>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 3 }))}>
        <Link
          to="/surveys"
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
          {t('surveyDetail.back', {}, { defaultValue: 'All surveys' })}
        </Link>
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 4 }), 'flex-wrap')}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
              <StatusPill variant={variant} />
              <span
                data-testid="survey-id-label"
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('surveyDetail.surveyId', { id: surveyId }, { defaultValue: 'ID {{id}}' })}
              </span>
            </div>
            <h1
              data-testid="survey-title"
              className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {survey.title}
            </h1>
            {survey.description && (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-2xl')}>
                {survey.description}
              </p>
            )}
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'flex-wrap')}>
            <Link
              to={`/surveys/${surveyId}/build`}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-md bg-primary text-white shadow-md hover:opacity-90 transition-opacity',
              )}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18 }}
                aria-hidden="true"
              >
                edit
              </span>
              {t('surveyDetail.editCta', {}, { defaultValue: 'Edit survey' })}
            </Link>
            {survey.status === 'draft' && (
              <button
                type="button"
                data-testid="publish-survey"
                disabled={publishing}
                onClick={handlePublish}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-md border border-[color:var(--color-border)] text-on-surface hover:bg-surface-secondary transition-colors disabled:opacity-60',
                )}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 18 }}
                  aria-hidden="true"
                >
                  publish
                </span>
                {publishing
                  ? t('common.publishingEllipsis', {}, { defaultValue: 'Publishing…' })
                  : t('common.publish', {}, { defaultValue: 'Publish' })}
              </button>
            )}
            {survey.status === 'published' && (
              <button
                type="button"
                data-testid="close-survey"
                disabled={closing}
                onClick={handleClose}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-md border border-[color:var(--color-border)] text-on-surface hover:bg-surface-secondary transition-colors disabled:opacity-60',
                )}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 18 }}
                  aria-hidden="true"
                >
                  block
                </span>
                {closing
                  ? t('surveyDetail.closing', {}, { defaultValue: 'Closing…' })
                  : t('surveyDetail.closeCta', {}, { defaultValue: 'Close survey' })}
              </button>
            )}
          </div>
        </div>
        {error && (
          <p role="alert" className="text-[color:var(--color-on-error)] text-sm">
            {error}
          </p>
        )}
      </div>

      <nav
        aria-label={t('surveyDetail.tabsAria', {}, { defaultValue: 'Survey sections' })}
        className={cm.cn(cm.flex({ gap: 2 }), 'flex-wrap')}
      >
        <TabLink
          to={`/surveys/${surveyId}`}
          active
          icon="dashboard"
          label={t('surveyDetail.tabOverview', {}, { defaultValue: 'Overview' })}
        />
        <TabLink
          to={`/surveys/${surveyId}/build`}
          icon="edit_note"
          label={t('surveyDetail.tabBuilder', {}, { defaultValue: 'Builder' })}
        />
        <TabLink
          to={`/surveys/${surveyId}/responses`}
          icon="how_to_vote"
          label={t('surveyDetail.tabResponses', {}, { defaultValue: 'Responses' })}
        />
        <TabLink
          to={`/surveys/${surveyId}/analytics`}
          icon="analytics"
          label={t('nav.analytics', {}, { defaultValue: 'Analytics' })}
        />
      </nav>

      <ResponsesHeroCard
        responsesThisWeek={responses}
        changeLabel={t(
          'surveyDetail.heroChange',
          { count: responses },
          { defaultValue: '{{count}} total responses' },
        )}
        npsAverage={typeof npsValue === 'number' ? npsValue : 0}
        avgCompletion={`${completionPct}%`}
      />

      <section className={cm.cn(cm.grid({ cols: 1, gap: 4 }), 'sm:grid-cols-3')}>
        <KpiStatCard
          label={t('surveyDetail.kpiResponses', {}, { defaultValue: 'Total responses' })}
          value={responses.toLocaleString()}
          trend={t('surveyDetail.kpiResponsesTrend', {}, { defaultValue: 'All-time count' })}
          icon="how_to_vote"
          accent="primary"
          trendTone="up"
        />
        <KpiStatCard
          label={t('surveyDetail.kpiCompletion', {}, { defaultValue: 'Completion' })}
          value={`${completionPct}%`}
          trend={t(
            'surveyDetail.kpiCompletionTrend',
            { count: analytics?.completed_responses ?? 0 },
            { defaultValue: '{{count}} completed' },
          )}
          icon="task_alt"
          accent="success"
          trendTone="up"
        />
        <KpiStatCard
          label={t('surveyDetail.kpiNps', {}, { defaultValue: 'Latest NPS' })}
          value={typeof npsValue === 'number' ? String(npsValue) : '—'}
          trend={t(
            'surveyDetail.kpiNpsTrend',
            { p: analytics?.promoters ?? 0, d: analytics?.detractors ?? 0 },
            { defaultValue: '{{p}} promoters · {{d}} detractors' },
          )}
          icon="thumb_up"
          accent="secondary"
          trendTone="up"
        />
      </section>

      <section
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 3 }),
          cm.sp('p', 6),
          'rounded-xl bg-surface border border-[color:var(--color-border)]',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 2 }))}>
          <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'text-on-surface')}>
            {t('surveyDetail.shareTitle', {}, { defaultValue: 'Share link' })}
          </h2>
          <StatusPill variant={shareUrl ? 'active' : 'draft'} />
        </div>
        {shareUrl ? (
          <>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'surveyDetail.shareBody',
                {},
                {
                  defaultValue:
                    'Anyone with this link can respond. We auto-record device, locale, and submission timestamp.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                cm.sp('px', 4),
                'h-12 rounded-md border border-[color:var(--color-border)] bg-surface-secondary',
              )}
            >
              <span
                className="material-symbols-outlined text-on-surface-variant"
                style={{ fontSize: 18 }}
                aria-hidden="true"
              >
                link
              </span>
              <code
                data-testid="share-url"
                className={cm.cn(
                  cm.flex1,
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'text-on-surface truncate font-mono',
                )}
              >
                {shareUrl}
              </code>
              <button
                type="button"
                data-testid="copy-share-url"
                onClick={handleCopyShareUrl}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  'rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors',
                )}
              >
                {copyState === 'copied'
                  ? t('common.copiedBang', {}, { defaultValue: 'Copied!' })
                  : copyState === 'error'
                    ? t('surveyDetail.copyError', {}, { defaultValue: 'Copy failed' })
                    : t('common.copy', {}, { defaultValue: 'Copy' })}
              </button>
            </div>
            <Link
              to={`/s/${survey.slug}`}
              target="_blank"
              rel="noreferrer"
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'text-primary hover:underline self-start',
              )}
            >
              {t('surveyDetail.openPublic', {}, { defaultValue: 'Open public survey →' })}
            </Link>
          </>
        ) : (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'surveyDetail.shareBodyUnpublished',
              {},
              {
                defaultValue: 'Publish the survey to generate a public share link.',
              },
            )}
          </p>
        )}
      </section>
    </div>
  )
}

export default SurveyDetail
