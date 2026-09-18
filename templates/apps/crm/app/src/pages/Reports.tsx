import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface PipelineStage {
  stage: string
  label: string
  deals: Array<{ id: string; title: string; value: number }>
  total: number
  count: number
}

interface PipelineStats {
  total_open: number
  total_value: number
  won_count: number
  won_value: number
}

interface ActivityRecord {
  id: string
  type: string
  completed: boolean
  created_at: string
}

const STAGE_TONE: Record<string, string> = {
  lead: 'bg-border text-foreground',
  qualified: 'bg-secondary-container text-on-secondary-container',
  proposal: 'bg-tertiary-container text-on-tertiary-container',
  negotiation: 'bg-primary-container text-on-primary-container',
  closed_won: 'bg-success-light text-success',
  closed_lost: 'bg-rose-100 text-error',
}

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return '$0'
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function ReportsPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [pipeline, setPipeline] = useState<PipelineStage[]>([])
  const [stats, setStats] = useState<PipelineStats | null>(null)
  const [activities, setActivities] = useState<ActivityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [pipeRes, statsRes, actsRes] = await Promise.all([
        http.get<PipelineStage[]>('/api/pipeline'),
        http.get<PipelineStats>('/api/pipeline/stats'),
        http.get<ActivityRecord[]>('/api/activities'),
      ])
      setPipeline(Array.isArray(pipeRes.data) ? pipeRes.data : [])
      setStats(
        pipeRes.data && typeof statsRes.data === 'object' && statsRes.data !== null
          ? (statsRes.data as PipelineStats)
          : null,
      )
      setActivities(Array.isArray(actsRes.data) ? actsRes.data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reports.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load is defined inline and recreated each render; adding it would cause an infinite loop
  }, [])

  const activityByType = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of activities) {
      map.set(a.type, (map.get(a.type) ?? 0) + 1)
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [activities])

  const completionRate = useMemo(() => {
    if (activities.length === 0) return 0
    return Math.round((activities.filter((a) => a.completed).length / activities.length) * 100)
  }, [activities])

  return (
    <div
      aria-label={t('nav.reports', {}, { defaultValue: 'Reports' })}
      className={cm.cn(cm.flex({ direction: 'col' }), 'gap-6')}
    >
      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('nav.reports', {}, { defaultValue: 'Reports' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'reports.subtitle',
            {},
            { defaultValue: 'Live snapshot of your pipeline, deals and activity.' },
          )}
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'rounded-lg bg-error-container text-on-error-container',
          )}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div data-mol-id="reports-loading" className="text-on-surface-variant">
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </div>
      ) : (
        <>
          <section data-mol-id="reports-stats" className={cm.cn(cm.flex(), 'gap-4 flex-wrap')}>
            <KpiCard
              label={t('reports.openDeals', {}, { defaultValue: 'Open deals' }) as string}
              value={String(stats?.total_open ?? 0)}
              accent="bg-primary-container text-on-primary-container"
              molId="reports-open-count"
            />
            <KpiCard
              label={t('reports.openValue', {}, { defaultValue: 'Open value' }) as string}
              value={formatCurrency(Number(stats?.total_value ?? 0))}
              accent="bg-secondary-container text-on-secondary-container"
              molId="reports-open-value"
            />
            <KpiCard
              label={t('reports.wonCount', {}, { defaultValue: 'Won' }) as string}
              value={String(stats?.won_count ?? 0)}
              accent="bg-success-light text-success"
              molId="reports-won-count"
            />
            <KpiCard
              label={t('reports.wonValue', {}, { defaultValue: 'Won value' }) as string}
              value={formatCurrency(Number(stats?.won_value ?? 0))}
              accent="bg-tertiary-container text-on-tertiary-container"
              molId="reports-won-value"
            />
            <KpiCard
              label={
                t(
                  'reports.activityCompletion',
                  {},
                  { defaultValue: 'Activity completion' },
                ) as string
              }
              value={`${completionRate}%`}
              accent="bg-surface-container-high text-on-surface-variant"
              molId="reports-completion"
            />
          </section>

          <section
            data-mol-id="reports-pipeline"
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-xl bg-surface-container-lowest border border-outline-variant/15',
            )}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 3))}>
              {t('reports.pipelineTitle', {}, { defaultValue: 'Pipeline by stage' })}
            </h2>
            {pipeline.length === 0 ? (
              <div className="text-on-surface-variant text-sm">
                {t(
                  'reports.pipelineEmpty',
                  {},
                  { defaultValue: 'No deals yet. Create deals to see pipeline data.' },
                )}
              </div>
            ) : (
              <ul className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
                {pipeline.map((s) => (
                  <li
                    key={s.stage}
                    data-mol-id="reports-pipeline-stage"
                    data-stage={s.stage}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('p', 3),
                      'rounded-lg bg-surface-container-low',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 0.5),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'rounded uppercase tracking-wider',
                        STAGE_TONE[s.stage] ?? 'bg-border text-foreground',
                      )}
                    >
                      {s.label}
                    </span>
                    <div className={cm.cn(cm.flex(), 'gap-6 text-sm')}>
                      <span data-mol-id="reports-pipeline-count">
                        {s.count === 1
                          ? t(
                              'reports.dealCountOne',
                              { count: s.count },
                              { defaultValue: '{{count}} deal' },
                            )
                          : t(
                              'reports.dealCountMany',
                              { count: s.count },
                              { defaultValue: '{{count}} deals' },
                            )}
                      </span>
                      <span
                        className={cm.cn(cm.fontWeight('semibold'))}
                        data-mol-id="reports-pipeline-value"
                      >
                        {formatCurrency(Number(s.total || 0))}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            data-mol-id="reports-activity"
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-xl bg-surface-container-lowest border border-outline-variant/15',
            )}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 3))}>
              {t('reports.activityTitle', {}, { defaultValue: 'Activity by type' })}
            </h2>
            {activityByType.length === 0 ? (
              <div className="text-on-surface-variant text-sm">
                {t('reports.activityEmpty', {}, { defaultValue: 'No activities logged yet.' })}
              </div>
            ) : (
              <ul className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
                {activityByType.map(([type, count]) => (
                  <li
                    key={type}
                    data-mol-id="reports-activity-row"
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('p', 3),
                      'rounded-lg bg-surface-container-low',
                    )}
                  >
                    <span className="capitalize">{type}</span>
                    <span className={cm.fontWeight('semibold')}>{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}

interface KpiCardProps {
  label: string
  value: string
  accent: string
  molId: string
}

function KpiCard({ label, value, accent, molId }: KpiCardProps) {
  const cm = getClassMap()
  return (
    <div
      data-mol-id={molId}
      className={cm.cn(
        cm.sp('p', 4),
        'flex-1 min-w-[160px] rounded-xl border border-outline-variant/15 bg-surface-container-lowest',
      )}
    >
      <div className={cm.cn(cm.textSize('xs'), 'uppercase tracking-wider text-on-surface-variant')}>
        {label}
      </div>
      <div className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'mt-1 text-on-surface')}>
        {value}
      </div>
      <div
        className={cm.cn(
          cm.sp('px', 2),
          cm.sp('py', 0.5),
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'inline-block mt-2 rounded',
          accent,
        )}
      >
        {label}
      </div>
    </div>
  )
}

export default ReportsPage
export { ReportsPage as Reports }
