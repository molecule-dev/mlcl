import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { IncidentCard, type IncidentCardData } from '../components/IncidentCard.js'
import { MetricKpiCard } from '../components/MetricKpiCard.js'
import { ServiceRow, type ServiceRowData } from '../components/ServiceRow.js'
import { StatusOverviewCard } from '../components/StatusOverviewCard.js'
import type { ComponentStatus } from '../components/StatusPill.js'
import { aggregateUptimePct, generateUptime90 } from '../lib/sampleUptime.js'
import { unwrapList } from '../lib/unwrap.js'

interface RawComponent {
  id: string
  name: string
  description?: string | null
  group?: string | null
  status: ComponentStatus
  monitor_url?: string | null
  uptime_pct_90?: number | null
}

interface RawIncident {
  id: string
  title: string
  message?: string | null
  impact: 'minor' | 'major' | 'critical' | 'maintenance'
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved'
  affected_components?: string[]
  created_at: string
  resolved_at?: string | null
  latest_update?: {
    status: 'investigating' | 'identified' | 'monitoring' | 'resolved'
    message: string
    created_at: string
  } | null
}

const STATUS_RANK: Record<ComponentStatus, number> = {
  operational: 0,
  under_maintenance: 1,
  degraded_performance: 2,
  partial_outage: 3,
  major_outage: 4,
  unknown: -1,
}

function aggregate(components: RawComponent[]): {
  aggregate: 'all_operational' | ComponentStatus
  operational: number
} {
  if (components.length === 0) return { aggregate: 'unknown', operational: 0 }
  let worst: ComponentStatus = 'operational'
  let operational = 0
  for (const c of components) {
    if (c.status === 'operational') operational += 1
    if (STATUS_RANK[c.status] > STATUS_RANK[worst]) worst = c.status
  }
  return { aggregate: worst === 'operational' ? 'all_operational' : worst, operational }
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [components, setComponents] = useState<RawComponent[]>([])
  const [incidents, setIncidents] = useState<RawIncident[]>([])
  const [subscribers, setSubscribers] = useState<{ id: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/components').catch(() => ({ data: [] })),
      http.get('/api/incidents').catch(() => ({ data: [] })),
      http.get('/api/subscribers').catch(() => ({ data: [] })),
    ])
      .then(([cRes, iRes, sRes]) => {
        if (cancelled) return
        setComponents(unwrapList<RawComponent>(cRes))
        setIncidents(unwrapList<RawIncident>(iRes))
        setSubscribers(unwrapList<{ id: string }>(sRes))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('dashboard.loadError', {}, { defaultValue: 'Failed to load service health.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const services = useMemo<ServiceRowData[]>(() => {
    return components.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description ?? null,
      group: c.group ?? null,
      status: c.status,
      monitor_url: c.monitor_url ?? null,
      uptime90Days: generateUptime90(c.id, c.status === 'operational' ? 'operational' : 'degraded'),
      uptimePct90: c.uptime_pct_90 ?? null,
    }))
  }, [components])

  const totals = useMemo(() => aggregate(components), [components])
  const overallUptime = useMemo(() => {
    if (services.length === 0) return null
    return aggregateUptimePct(services.flatMap((s) => s.uptime90Days ?? []))
  }, [services])

  const counts = useMemo(() => {
    const open = incidents.filter((i) => i.status !== 'resolved').length
    const resolved24h = incidents.filter(
      (i) =>
        i.status === 'resolved' &&
        i.resolved_at &&
        Date.now() - new Date(i.resolved_at).getTime() < 24 * 3600_000,
    ).length
    return { open, resolved24h, subscribers: subscribers.length }
  }, [incidents, subscribers])

  const activeIncidents = useMemo(
    () => incidents.filter((i) => i.status !== 'resolved').slice(0, 5),
    [incidents],
  )

  const lastUpdatedAt = incidents[0]?.latest_update?.created_at ?? incidents[0]?.created_at ?? null

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))} data-mol-id="page-dashboard">
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-8')}>
        <div>
          <p
            className={cm.cn(
              'font-mono text-xs font-bold uppercase tracking-widest text-primary mb-2',
            )}
          >
            {t(
              'dashboard.eyebrow',
              { app: APP_NAME },
              { defaultValue: '$ {{app}} status --watch' },
            )}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('dashboard.heading', {}, { defaultValue: 'Operations dashboard' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'dashboard.subheading',
              {},
              {
                defaultValue:
                  'Live service health, paged incidents, and scheduled maintenance windows.',
              },
            )}
          </p>
        </div>

        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <Link
            to="/incidents/new"
            className={cm.cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest transition-all hover:opacity-90',
            )}
            style={{
              backgroundColor: 'var(--color-status-operational)',
              color: 'var(--color-on-status-operational)',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              add_alert
            </span>
            {t('dashboard.newIncident', {}, { defaultValue: 'New incident' })}
          </Link>
          <Link
            to="/components"
            className={cm.cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest transition-all',
            )}
            style={{
              backgroundColor: 'rgba(30, 41, 59, 0.6)',
              color: 'var(--color-chip-text)',
              border: '1px solid var(--color-border-card)',
            }}
          >
            {t('dashboard.manageComponents', {}, { defaultValue: 'Components' })}
          </Link>
        </div>
      </header>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : (
        <>
          <StatusOverviewCard
            status={totals.aggregate}
            totalServices={services.length}
            operationalServices={totals.operational}
            uptimePct90={overallUptime}
            lastUpdatedAt={lastUpdatedAt}
          />

          <section className={cm.cn('mt-8 grid gap-4 grid-cols-2 md:grid-cols-4')}>
            <MetricKpiCard
              eyebrow={t('dashboard.kpi.openIncidents', {}, { defaultValue: 'Open incidents' })}
              value={String(counts.open)}
              icon="warning"
              tone={counts.open > 0 ? 'major' : 'operational'}
              caption={t(
                'dashboard.kpi.openCaption',
                {},
                { defaultValue: 'investigating + monitoring' },
              )}
            />
            <MetricKpiCard
              eyebrow={t('dashboard.kpi.resolved24h', {}, { defaultValue: 'Resolved · 24h' })}
              value={String(counts.resolved24h)}
              icon="check_circle"
              tone="operational"
              caption={t(
                'dashboard.kpi.resolvedCaption',
                {},
                { defaultValue: 'Closed in the last day' },
              )}
            />
            <MetricKpiCard
              eyebrow={t('nav.subscribers', {}, { defaultValue: 'Subscribers' })}
              value={counts.subscribers.toLocaleString('en-US')}
              icon="mail"
              tone="maintenance"
              caption={t(
                'dashboard.kpi.subscribersCaption',
                {},
                { defaultValue: 'Paged on every status change' },
              )}
            />
            <MetricKpiCard
              eyebrow={t('dashboard.kpi.uptime', {}, { defaultValue: 'Avg uptime · 90d' })}
              value={overallUptime != null ? overallUptime.toFixed(2) : '—'}
              unit="%"
              icon="trending_up"
              tone="operational"
              caption={t(
                'dashboard.kpi.uptimeCaption',
                {},
                { defaultValue: 'Across all monitored components' },
              )}
            />
          </section>

          <section className={cm.cn('mt-10 grid gap-6 grid-cols-1 lg:grid-cols-[1.5fr_1fr]')}>
            <div>
              <header
                className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
              >
                <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
                  {t('dashboard.servicesHeading', {}, { defaultValue: 'Component health' })}
                </h2>
                <Link
                  to="/components"
                  className={cm.cn(
                    'font-mono text-xs font-bold uppercase tracking-widest text-primary hover:opacity-80',
                  )}
                >
                  {t('dashboard.viewAll', {}, { defaultValue: 'All components →' })}
                </Link>
              </header>
              <ul className={cm.cn('space-y-3')}>
                {services.slice(0, 6).map((s) => (
                  <li key={s.id}>
                    <ServiceRow service={s} />
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <header
                className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
              >
                <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
                  {t('dashboard.incidentsHeading', {}, { defaultValue: 'Active incidents' })}
                </h2>
                <Link
                  to="/incidents"
                  className={cm.cn(
                    'font-mono text-xs font-bold uppercase tracking-widest text-primary hover:opacity-80',
                  )}
                >
                  {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
                </Link>
              </header>

              {activeIncidents.length === 0 ? (
                <div
                  className={cm.cn('rounded-xl p-6 text-center')}
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.30)',
                  }}
                >
                  <span
                    className={cm.cn(
                      'material-symbols-outlined text-3xl text-success mb-2 inline-block',
                    )}
                    aria-hidden="true"
                  >
                    verified
                  </span>
                  <p
                    className={cm.cn(
                      'font-mono text-sm font-extrabold text-success uppercase tracking-widest',
                    )}
                  >
                    {t('dashboard.allClear', {}, { defaultValue: 'All clear' })}
                  </p>
                  <p className={cm.cn('mt-1 text-xs text-on-surface-variant')}>
                    {t(
                      'dashboard.allClearBody',
                      {},
                      { defaultValue: 'No open incidents on any monitored component.' },
                    )}
                  </p>
                </div>
              ) : (
                <ul className={cm.cn('space-y-3')}>
                  {activeIncidents.map((i) => (
                    <li key={i.id}>
                      <IncidentCard incident={i as IncidentCardData} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
