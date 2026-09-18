import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ConfidencePill } from '../components/ConfidencePill.js'
import { type DocumentType, DocumentTypeBadge } from '../components/DocumentTypeBadge.js'
import { DocumentTypeBreakdown } from '../components/DocumentTypeBreakdown.js'
import { ParcelaHeroCard } from '../components/ParcelaHeroCard.js'
import { ParcelaMetricTile } from '../components/ParcelaMetricTile.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface DocumentSummary {
  id: string
  original_name: string
  document_type: DocumentType | null
  processing_status: 'pending' | 'processing' | 'extracted' | 'classified' | 'complete' | 'error'
  classification_confidence: number | null
  page_count: number | null
  created_at: string
}

interface DashboardStats {
  processed_today: number
  processed_change_pct: number
  pending_review: number
  avg_accuracy_pct: number
  queue_size: number
  avg_processing_seconds: number
  history_7d?: Array<{ date: string; count: number }>
  type_breakdown?: Array<{ type: DocumentType; count: number }>
}

const EMPTY_STATS: DashboardStats = {
  processed_today: 0,
  processed_change_pct: 0,
  pending_review: 0,
  avg_accuracy_pct: 0,
  queue_size: 0,
  avg_processing_seconds: 0,
  history_7d: [],
  type_breakdown: [],
}

function fmtRelative(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recent, setRecent] = useState<DocumentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/reports/dashboard_stats').catch(() => null),
      http.get('/api/documents').catch(() => null),
    ])
      .then(([sRes, dRes]) => {
        if (cancelled) return
        const fetchedStats = unwrapSingle<DashboardStats>(sRes)
        const fetchedDocs = unwrapList<DocumentSummary>(dRes)
        setStats(fetchedStats ?? EMPTY_STATS)
        setRecent(fetchedDocs.slice(0, 5))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('nav.failedToLoadDashboard', {}, { defaultValue: 'Failed to load dashboard.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const view = stats ?? EMPTY_STATS

  if (error) {
    return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  }
  if (loading && !stats) {
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }

  return (
    <div
      data-mol-id="dashboard-page"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}
    >
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-primary font-bold')}
          style={{ fontSize: 10 }}
        >
          {t('dashboard.eyebrow', {}, { defaultValue: 'Today · Operations overview' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('dashboard.heading', {}, { defaultValue: 'Document intelligence' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'dashboard.subheading',
            {},
            {
              defaultValue:
                'Every page classified, extracted, and filed — with confidence colors so review stays focused.',
            },
          )}
        </p>
      </header>

      <section
        className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12 items-stretch')}
      >
        <ParcelaHeroCard
          processedCount={view.processed_today}
          changePercent={view.processed_change_pct}
          accuracyPercent={view.avg_accuracy_pct}
          history={view.history_7d}
        />
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'lg:col-span-4')}>
          <ParcelaMetricTile
            label={t('dashboard.metric.review', {}, { defaultValue: 'Pending review' })}
            value={view.pending_review.toLocaleString()}
            icon="assignment_late"
            tone="warning"
            caption={
              <>
                <span
                  className={cm.cn('material-symbols-outlined')}
                  style={{ fontSize: 14 }}
                  aria-hidden="true"
                >
                  priority_high
                </span>
                {t('dashboard.metric.reviewCaption', {}, { defaultValue: 'Below 70% confidence' })}
              </>
            }
          />
          <ParcelaMetricTile
            label={t('dashboard.metric.queue', {}, { defaultValue: 'Active queue' })}
            value={view.queue_size.toLocaleString()}
            icon="layers"
            tone="info"
            caption={
              <>
                <span
                  className={cm.cn('material-symbols-outlined')}
                  style={{ fontSize: 14 }}
                  aria-hidden="true"
                >
                  timer
                </span>
                {t(
                  'dashboard.metric.queueCaption',
                  { sec: view.avg_processing_seconds.toFixed(1) },
                  { defaultValue: '~{{sec}}s avg per page' },
                )}
              </>
            }
          />
        </div>
      </section>

      <section
        className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
      >
        <ParcelaMetricTile
          label={t('dashboard.metric.processed', {}, { defaultValue: 'Processed today' })}
          value={view.processed_today.toLocaleString()}
          icon="description"
          tone="primary"
          caption={
            <>
              <span
                className={cm.cn('material-symbols-outlined')}
                style={{ fontSize: 14 }}
                aria-hidden="true"
              >
                trending_up
              </span>
              {t(
                'dashboard.metric.processedCaption',
                { pct: view.processed_change_pct },
                { defaultValue: '+{{pct}}% vs yesterday' },
              )}
            </>
          }
        />
        <ParcelaMetricTile
          label={t('dashboard.metric.accuracy', {}, { defaultValue: 'Avg accuracy' })}
          value={`${view.avg_accuracy_pct.toFixed(1)}%`}
          icon="verified"
          tone="success"
          meter={view.avg_accuracy_pct}
        />
        <ParcelaMetricTile
          label={t('dashboard.metric.review', {}, { defaultValue: 'Pending review' })}
          value={view.pending_review.toLocaleString()}
          icon="assignment_late"
          tone="warning"
          caption={t('dashboard.metric.reviewCaption2', {}, { defaultValue: 'Needs a human eye' })}
        />
        <ParcelaMetricTile
          label={t('dashboard.metric.filed', {}, { defaultValue: 'Filed today' })}
          value={(view.processed_today - view.pending_review).toLocaleString()}
          icon="folder_open"
          tone="accent"
          caption={t(
            'dashboard.metric.filedCaption',
            {},
            { defaultValue: 'Routed by filing rules' },
          )}
        />
      </section>

      {view.type_breakdown && view.type_breakdown.length > 0 ? (
        <DocumentTypeBreakdown segments={view.type_breakdown} />
      ) : null}

      <section className={cm.stack(4)}>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), 'font-bold')}>
            {t('dashboard.recent.heading', {}, { defaultValue: 'Recent documents' })}
          </h2>
          <Link
            to="/documents"
            className={cm.cn(cm.textSize('sm'), 'font-bold text-primary hover:underline')}
          >
            {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
          </Link>
        </div>
        <div
          className={cm.cn(
            'rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm overflow-hidden',
          )}
        >
          <table className={cm.cn('w-full text-left')}>
            <thead className={cm.cn('bg-surface-container')}>
              <tr>
                <th
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('dashboard.recent.col.name', {}, { defaultValue: 'Document' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.type', {}, { defaultValue: 'Type' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-center',
                  )}
                >
                  {t('dashboard.recent.col.confidence', {}, { defaultValue: 'Confidence' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right',
                  )}
                >
                  {t('dashboard.recent.col.uploaded', {}, { defaultValue: 'Uploaded' })}
                </th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-surface-container')}>
              {recent.map((d) => (
                <tr
                  key={d.id}
                  className={cm.cn('hover:bg-surface-container-low transition-colors')}
                >
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <Link
                      to={`/documents/${d.id}`}
                      className={cm.cn(cm.textSize('sm'), 'font-semibold hover:text-primary')}
                    >
                      {d.original_name}
                    </Link>
                    {d.page_count ? (
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(
                          'dashboard.recent.pages',
                          { count: d.page_count },
                          { defaultValue: `${d.page_count} pages` },
                        )}
                      </p>
                    ) : null}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    {d.document_type ? (
                      <DocumentTypeBadge type={d.document_type} />
                    ) : (
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant italic')}>
                        {t(
                          'dashboard.recent.typeUnknown',
                          {},
                          { defaultValue: 'Awaiting classification' },
                        )}
                      </span>
                    )}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-center')}>
                    {typeof d.classification_confidence === 'number' ? (
                      <ConfidencePill value={d.classification_confidence} />
                    ) : (
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>—</span>
                    )}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'text-right text-on-surface-variant tabular-nums',
                    )}
                  >
                    {fmtRelative(d.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
