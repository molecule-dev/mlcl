import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { KpiStatCard } from '../components/KpiStatCard.js'
import type { StatusVariant } from '../components/StatusPill.js'
import { StatusPill } from '../components/StatusPill.js'

interface ResponseApiRow {
  id: string
  respondent_id: string | null
  respondent_email: string | null
  status: string
  score: string | number | null
  submitted_at: string
}

interface AnalyticsSummary {
  total_responses: number
  completed_responses: number
  completion_rate: number
  nps: number | null
}

function relativeTime(iso?: string): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const diffMs = Date.now() - then
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function npsToVariant(score?: number | null): StatusVariant | null {
  if (score === undefined || score === null) return null
  if (score >= 9) return 'promoter'
  if (score >= 7) return 'passive'
  return 'detractor'
}

function statusVariant(status: string): StatusVariant {
  switch (status) {
    case 'completed':
      return 'complete'
    case 'partial':
      return 'partial'
    case 'abandoned':
      return 'abandoned'
    default:
      return 'partial'
  }
}

export function Responses() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const surveyId = id ?? ''

  const [rows, setRows] = useState<ResponseApiRow[] | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!surveyId) return
    let cancelled = false
    Promise.allSettled([
      http.get<ResponseApiRow[] | { data?: ResponseApiRow[] }>(
        `/api/responses?survey_id=${surveyId}`,
      ),
      http.get<AnalyticsSummary>(`/api/responses/analytics/summary?survey_id=${surveyId}`),
    ]).then(([rowsResult, analyticsResult]) => {
      if (cancelled) return
      if (rowsResult.status === 'fulfilled') {
        const body = rowsResult.value?.data
        const list = Array.isArray(body)
          ? body
          : Array.isArray((body as { data?: ResponseApiRow[] } | undefined)?.data)
            ? (body as { data: ResponseApiRow[] }).data
            : []
        setRows(list)
      } else {
        setRows([])
        setError(
          rowsResult.reason instanceof Error
            ? rowsResult.reason.message
            : 'Could not load responses.',
        )
      }
      if (analyticsResult.status === 'fulfilled' && analyticsResult.value?.data) {
        setAnalytics(analyticsResult.value.data)
      }
    })
    return () => {
      cancelled = true
    }
  }, [http, surveyId])

  async function exportCsv() {
    setExporting(true)
    setError(null)
    try {
      const response = await http.get<string>(`/api/responses/export/csv?survey_id=${surveyId}`, {
        responseType: 'text',
      })
      const csv = typeof response?.data === 'string' ? response.data : ''
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `responses-${surveyId}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export responses.')
    } finally {
      setExporting(false)
    }
  }

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
          {t('responses.back', {}, { defaultValue: 'Survey overview' })}
        </Link>
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 4 }), 'flex-wrap')}
        >
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('responses.heading', {}, { defaultValue: 'Responses' })}
          </h1>
          <button
            type="button"
            onClick={exportCsv}
            disabled={exporting}
            data-testid="export-responses-csv"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-md border border-[color:var(--color-border)] bg-surface text-on-surface hover:bg-surface-secondary transition-colors disabled:opacity-60',
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">
              file_download
            </span>
            {exporting
              ? t('common.exportingEllipsis', {}, { defaultValue: 'Exporting…' })
              : t('common.exportCsv', {}, { defaultValue: 'Export CSV' })}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-[color:var(--color-on-error)] text-sm">
            {error}
          </p>
        )}
      </div>

      <section className={cm.cn(cm.grid({ cols: 1, gap: 4 }), 'sm:grid-cols-3')}>
        <KpiStatCard
          label={t('responses.kpiTotal', {}, { defaultValue: 'Total responses' })}
          value={String(analytics?.total_responses ?? rows?.length ?? 0)}
          trend={t('responses.kpiTotalTrend', {}, { defaultValue: 'All-time' })}
          icon="how_to_vote"
          accent="primary"
          trendTone="up"
        />
        <KpiStatCard
          label={t('responses.kpiCompletion', {}, { defaultValue: 'Completion rate' })}
          value={`${analytics?.completion_rate ?? 0}%`}
          trend={t(
            'responses.kpiCompletionTrend',
            { count: analytics?.completed_responses ?? 0 },
            { defaultValue: '{{count}} completed' },
          )}
          icon="task_alt"
          accent="success"
          trendTone="neutral"
        />
        <KpiStatCard
          label={t('responses.kpiNps', {}, { defaultValue: 'NPS' })}
          value={
            analytics?.nps !== null && analytics?.nps !== undefined ? String(analytics.nps) : '—'
          }
          trend={t('responses.kpiNpsTrend', {}, { defaultValue: '−100..100' })}
          icon="thumb_up"
          accent="secondary"
          trendTone="up"
        />
      </section>

      <section
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'rounded-xl bg-surface border border-[color:var(--color-border)] overflow-hidden',
        )}
        aria-labelledby="responses-table-title"
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 3 }),
            cm.sp('p', 5),
            'border-b border-[color:var(--color-border)]',
          )}
        >
          <h2
            id="responses-table-title"
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'text-on-surface')}
          >
            {t('responses.tableTitle', {}, { defaultValue: 'Latest responses' })}
          </h2>
          <span
            data-testid="responses-count"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t(
              'responses.tableMeta',
              { count: rows?.length ?? 0 },
              { defaultValue: 'Showing {{count}}' },
            )}
          </span>
        </div>
        {rows === null ? (
          <p className={cm.cn(cm.sp('p', 6), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('responses.loading', {}, { defaultValue: 'Loading responses…' })}
          </p>
        ) : rows.length === 0 ? (
          <div
            data-testid="responses-empty"
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 2 }),
              cm.sp('p', 8),
              'text-center',
            )}
          >
            <span
              className="material-symbols-outlined text-on-surface-variant"
              style={{ fontSize: 36 }}
              aria-hidden="true"
            >
              inbox
            </span>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'responses.empty',
                {},
                {
                  defaultValue:
                    'No responses yet — share your survey link to start collecting feedback.',
                },
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={cm.cn(cm.w('full'), cm.textSize('sm'), 'min-w-[720px]')}>
              <thead>
                <tr
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-on-surface-variant bg-surface-secondary',
                  )}
                >
                  <th className={cm.cn(cm.sp('px', 5), cm.sp('py', 3), 'text-left')}>
                    {t('responses.col.respondent', {}, { defaultValue: 'Respondent' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 5), cm.sp('py', 3), 'text-left')}>
                    {t('responses.col.nps', {}, { defaultValue: 'NPS' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 5), cm.sp('py', 3), 'text-left')}>
                    {t('nav.status', {}, { defaultValue: 'Status' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 5), cm.sp('py', 3), 'text-left')}>
                    {t('responses.col.submitted', {}, { defaultValue: 'Submitted' })}
                  </th>
                </tr>
              </thead>
              <tbody className={cm.cn('divide-y divide-[color:var(--color-border)]')}>
                {rows.map((row) => {
                  const score = typeof row.score === 'string' ? Number(row.score) : row.score
                  const npsVariant = npsToVariant(typeof score === 'number' ? score : null)
                  return (
                    <tr
                      key={row.id}
                      className={cm.cn('hover:bg-surface-secondary transition-colors')}
                    >
                      <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 4))}>
                        <Link
                          to={`/surveys/${surveyId}/responses/${row.id}`}
                          data-testid={`response-link-${row.id}`}
                          className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}
                        >
                          <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                            {row.respondent_email ??
                              t('responses.anonymous', {}, { defaultValue: 'Anonymous' })}
                          </span>
                          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                            #{row.id.slice(0, 8)}
                          </span>
                        </Link>
                      </td>
                      <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 4))}>
                        {typeof score === 'number' && Number.isFinite(score) ? (
                          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                            <span
                              className={cm.cn(
                                cm.fontWeight('bold'),
                                'tabular-nums text-on-surface',
                              )}
                            >
                              {score}
                            </span>
                            {npsVariant && <StatusPill variant={npsVariant} />}
                          </div>
                        ) : (
                          <span className="text-on-surface-variant">—</span>
                        )}
                      </td>
                      <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 4))}>
                        <StatusPill variant={statusVariant(row.status)} />
                      </td>
                      <td
                        className={cm.cn(cm.sp('px', 5), cm.sp('py', 4), 'text-on-surface-variant')}
                      >
                        {relativeTime(row.submitted_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default Responses
