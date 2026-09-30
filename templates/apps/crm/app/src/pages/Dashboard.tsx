import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface PipelineStats {
  total_open: number
  total_value: number
  won_count: number
  won_value: number
}

interface PipelineStage {
  stage: string
  label: string
  deals: Array<{ id: string; title: string; value: number; probability: number }>
  total: number
  count: number
}

interface DealRecord {
  id: string
  title: string
  value: number
  stage: string
  probability: number
  expected_close_date: string | null
  updated_at: string
}

interface ActivityRecord {
  id: string
  type: string
  subject: string
  due_date: string | null
  completed: boolean
}

const STAGE_LABEL: Record<string, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Closed won',
  closed_lost: 'Closed lost',
}

const STAGE_TONE: Record<string, string> = {
  lead: 'bg-border text-foreground',
  qualified: 'bg-secondary-container text-on-secondary-container',
  proposal: 'bg-tertiary-container text-on-tertiary-container',
  negotiation: 'bg-primary-container text-on-primary-container',
  closed_won: 'bg-success-light text-success',
  closed_lost: 'bg-rose-100 text-error',
}

function formatCurrency(value: number | null | undefined): string {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '$0'
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString()
  } catch (_error) {
    // Date parsing failed; return the placeholder dash as a safe fallback
    return '—'
  }
}

export function DashboardPage() {
  const { t } = useTranslation()
  const http = useHttpClient()
  const cm = getClassMap()
  const [stats, setStats] = useState<PipelineStats | null>(null)
  const [pipeline, setPipeline] = useState<PipelineStage[]>([])
  const [deals, setDeals] = useState<DealRecord[]>([])
  const [activities, setActivities] = useState<ActivityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get<PipelineStats>('/api/pipeline/stats'),
      http.get<PipelineStage[]>('/api/pipeline'),
      http.get<DealRecord[]>('/api/deals'),
      http.get<ActivityRecord[]>('/api/activities'),
    ])
      .then(([s, p, d, a]) => {
        if (cancelled) return
        setStats(s.data ?? { total_open: 0, total_value: 0, won_count: 0, won_value: 0 })
        setPipeline(Array.isArray(p.data) ? p.data : [])
        setDeals(Array.isArray(d.data) ? d.data : [])
        setActivities(Array.isArray(a.data) ? a.data : [])
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load dashboard.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const openStages = useMemo(
    () => pipeline.filter((s) => !s.stage.startsWith('closed_')),
    [pipeline],
  )
  const topOpenDeals = useMemo(
    () =>
      deals
        .filter((d) => !d.stage.startsWith('closed_'))
        .sort((a, b) => Number(b.value) - Number(a.value))
        .slice(0, 5),
    [deals],
  )

  const upcomingActivities = useMemo(() => {
    const now = Date.now()
    return activities
      .filter((a) => !a.completed && a.due_date && new Date(a.due_date).getTime() >= now)
      .sort((a, b) => new Date(a.due_date ?? 0).getTime() - new Date(b.due_date ?? 0).getTime())
      .slice(0, 5)
  }, [activities])

  const conversion = useMemo(() => {
    const won = stats?.won_count ?? 0
    const all = (stats?.total_open ?? 0) + won
    if (all === 0) return 0
    return Math.round((won / all) * 100)
  }, [stats])

  const stageLabel = (stage: string): string =>
    t(`pipeline.stage.${stage}`, {}, { defaultValue: STAGE_LABEL[stage] ?? stage })

  return (
    <div
      data-mol-id="page-dashboard"
      aria-label={t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
      className={cm.cn(cm.flex({ direction: 'col' }), 'gap-6')}
    >
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-3')}
      >
        <div>
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'dashboard.subtitle',
              {},
              { defaultValue: 'Live snapshot of your pipeline and follow-ups.' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex(), 'gap-2 flex-wrap')}>
          <Link
            to="/deals"
            data-mol-id="dashboard-go-deals"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-lg border border-outline-variant/30 hover:bg-surface-container-low',
            )}
          >
            {t('dashboard.goDeals', {}, { defaultValue: 'View deals' })}
          </Link>
          <Link
            to="/activities"
            data-mol-id="dashboard-go-activities"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-lg bg-primary text-on-primary hover:bg-primary/90',
            )}
          >
            {t('dashboard.logActivity', {}, { defaultValue: 'Log activity' })}
          </Link>
        </div>
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

      <section data-mol-id="dashboard-kpis" className={cm.cn(cm.flex(), 'gap-4 flex-wrap')}>
        <Kpi
          label={t('dashboard.activeDeals', {}, { defaultValue: 'Active deals' }) as string}
          value={loading ? '…' : String(stats?.total_open ?? 0)}
          molId="kpi-active-deals"
          accent="var(--color-primary)"
        />
        <Kpi
          label={t('dashboard.pipelineValue', {}, { defaultValue: 'Pipeline value' }) as string}
          value={loading ? '…' : formatCurrency(stats?.total_value)}
          molId="kpi-pipeline-value"
          accent="var(--color-tertiary)"
        />
        <Kpi
          label={t('dashboard.wonDeals', {}, { defaultValue: 'Won deals' }) as string}
          value={loading ? '…' : String(stats?.won_count ?? 0)}
          molId="kpi-won-deals"
          // emerald-500 measured under 4.5:1 on the card surface at this
          // 11px label size (axe serious) — emerald-700 is the same hue,
          // AA-compliant.
          accent="var(--color-emerald-700)"
        />
        <Kpi
          label={t('dashboard.wonValue', {}, { defaultValue: 'Won value' }) as string}
          value={loading ? '…' : formatCurrency(stats?.won_value)}
          molId="kpi-won-value"
          accent="var(--color-emerald-700)"
        />
        <Kpi
          label={t('dashboard.conversion', {}, { defaultValue: 'Win rate' }) as string}
          value={loading ? '…' : `${conversion}%`}
          molId="kpi-conversion"
          accent="var(--color-secondary)"
        />
      </section>

      <div className={cm.cn(cm.flex(), 'gap-6 flex-wrap')}>
        <section
          data-mol-id="dashboard-pipeline"
          className={cm.cn(
            cm.sp('p', 4),
            'flex-1 min-w-[300px] rounded-xl border border-outline-variant/15 bg-surface-container-lowest',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 3))}>
            {t('dashboard.pipelineByStage', {}, { defaultValue: 'Pipeline by stage' })}
          </h2>
          {openStages.length === 0 ? (
            <p className="text-on-surface-variant text-sm">
              {t('dashboard.pipelineEmpty', {}, { defaultValue: 'No open deals yet.' })}
            </p>
          ) : (
            <ul className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
              {openStages.map((s) => (
                <li
                  key={s.stage}
                  data-mol-id="dashboard-stage-row"
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
                    {s.label || stageLabel(s.stage)}
                  </span>
                  <span className="text-sm">
                    {s.count} · {formatCurrency(Number(s.total || 0))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          data-mol-id="dashboard-top-deals"
          className={cm.cn(
            cm.sp('p', 4),
            'flex-1 min-w-[300px] rounded-xl border border-outline-variant/15 bg-surface-container-lowest',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 3))}>
            {t('dashboard.topOpenDeals', {}, { defaultValue: 'Top open deals' })}
          </h2>
          {topOpenDeals.length === 0 ? (
            <p className="text-on-surface-variant text-sm">
              {t(
                'dashboard.dealsEmpty',
                {},
                { defaultValue: 'No open deals yet — create one in Deals.' },
              )}
            </p>
          ) : (
            <ul className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
              {topOpenDeals.map((d) => (
                <li
                  key={d.id}
                  data-mol-id="dashboard-top-deal"
                  data-deal-id={d.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('p', 3),
                    'rounded-lg bg-surface-container-low',
                  )}
                >
                  <div className="min-w-0 mr-3">
                    <div className={cm.cn(cm.fontWeight('semibold'), 'truncate')}>{d.title}</div>
                    <div className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {stageLabel(d.stage)} · {Math.round(Number(d.probability) || 0)}%
                    </div>
                  </div>
                  <div className={cm.fontWeight('semibold')}>{formatCurrency(d.value)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section
        data-mol-id="dashboard-upcoming"
        className={cm.cn(
          cm.sp('p', 4),
          'rounded-xl border border-outline-variant/15 bg-surface-container-lowest',
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 3))}>
          {t('dashboard.upcomingActivities', {}, { defaultValue: 'Upcoming activities' })}
        </h2>
        {upcomingActivities.length === 0 ? (
          <p className="text-on-surface-variant text-sm">
            {t(
              'dashboard.activitiesEmpty',
              {},
              { defaultValue: 'Nothing on the calendar — log a follow-up in Activities.' },
            )}
          </p>
        ) : (
          <ul className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
            {upcomingActivities.map((a) => (
              <li
                key={a.id}
                data-mol-id="dashboard-activity-row"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('p', 3),
                  'rounded-lg bg-surface-container-low',
                )}
              >
                <div className="min-w-0 mr-3">
                  <div className={cm.cn(cm.fontWeight('semibold'), 'truncate')}>{a.subject}</div>
                  <div className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant capitalize')}>
                    {a.type}
                  </div>
                </div>
                <div className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {formatDate(a.due_date)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

interface KpiProps {
  label: string
  value: string
  molId: string
  /** The accent bar color (a CSS color or variable). */
  accent: string
}

function Kpi({ label, value, molId, accent }: KpiProps) {
  const cm = getClassMap()
  return (
    <div
      data-mol-id={molId}
      className={cm.cn(
        cm.sp('p', 5),
        cm.accentCard({ tone: 'custom' }),
        'flex-1 min-w-[160px] rounded-xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm',
      )}
      style={{ ['--mol-accent' as string]: accent }}
    >
      <div className={cm.accentCardLabel({ tone: 'custom' })}>{label}</div>
      <div className={cm.cn(cm.textSize('3xl'), 'font-black mt-2 text-on-surface')}>{value}</div>
    </div>
  )
}

export default DashboardPage
export { DashboardPage as Dashboard }
