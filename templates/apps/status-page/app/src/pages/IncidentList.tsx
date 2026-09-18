import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { IncidentCard, type IncidentCardData } from '../components/IncidentCard.js'
import { MetricKpiCard } from '../components/MetricKpiCard.js'
import { unwrapList } from '../lib/unwrap.js'

type IncidentFilter = 'all' | 'active' | 'resolved' | 'major' | 'critical'

export function IncidentList() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [incidents, setIncidents] = useState<IncidentCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<IncidentFilter>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/incidents')
      .then((res) => {
        if (!cancelled) setIncidents(unwrapList<IncidentCardData>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('incidentList.loadError', {}, { defaultValue: 'Failed to load incidents.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const counts = useMemo(() => {
    return {
      total: incidents.length,
      active: incidents.filter((i) => i.status !== 'resolved').length,
      resolved: incidents.filter((i) => i.status === 'resolved').length,
      major: incidents.filter((i) => i.impact === 'major').length,
      critical: incidents.filter((i) => i.impact === 'critical').length,
    }
  }, [incidents])

  const visible = useMemo(() => {
    switch (filter) {
      case 'active':
        return incidents.filter((i) => i.status !== 'resolved')
      case 'resolved':
        return incidents.filter((i) => i.status === 'resolved')
      case 'major':
        return incidents.filter((i) => i.impact === 'major')
      case 'critical':
        return incidents.filter((i) => i.impact === 'critical')
      default:
        return incidents
    }
  }, [filter, incidents])

  const filters: { key: IncidentFilter; label: string; count: number }[] = [
    { key: 'all', label: t('status.all', {}, { defaultValue: 'All' }), count: counts.total },
    {
      key: 'active',
      label: t('status.active', {}, { defaultValue: 'Active' }),
      count: counts.active,
    },
    {
      key: 'major',
      label: t('incidentList.filter.major', {}, { defaultValue: 'Major' }),
      count: counts.major,
    },
    {
      key: 'critical',
      label: t('incidentList.filter.critical', {}, { defaultValue: 'Critical' }),
      count: counts.critical,
    },
    {
      key: 'resolved',
      label: t('status.resolved', {}, { defaultValue: 'Resolved' }),
      count: counts.resolved,
    },
  ]

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))} data-mol-id="page-incident-list">
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-8')}>
        <div>
          <p
            className={cm.cn(
              'font-mono text-xs font-bold uppercase tracking-widest text-primary mb-2',
            )}
          >
            {t(
              'incidentList.eyebrow',
              { app: APP_NAME },
              { defaultValue: '$ {{app}} incidents --tail' },
            )}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('incidentList.heading', {}, { defaultValue: 'Incidents' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'incidentList.subheading',
              {},
              { defaultValue: 'Active investigations, paged updates, and the resolved backlog.' },
            )}
          </p>
        </div>
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
          {t('incidentList.newCta', {}, { defaultValue: 'Open incident' })}
        </Link>
      </header>

      <section className={cm.cn('grid gap-4 grid-cols-2 md:grid-cols-4 mb-8')}>
        <MetricKpiCard
          eyebrow={t('status.active', {}, { defaultValue: 'Active' })}
          value={String(counts.active)}
          icon="warning"
          tone={counts.active > 0 ? 'major' : 'operational'}
          caption={t(
            'incidentList.kpi.activeCaption',
            {},
            { defaultValue: 'Investigating + monitoring' },
          )}
        />
        <MetricKpiCard
          eyebrow={t('incidentList.kpi.major', {}, { defaultValue: 'Major' })}
          value={String(counts.major)}
          icon="report"
          tone="partial"
          caption={t(
            'incidentList.kpi.majorCaption',
            {},
            { defaultValue: 'High-impact this period' },
          )}
        />
        <MetricKpiCard
          eyebrow={t('incidentList.kpi.critical', {}, { defaultValue: 'Critical' })}
          value={String(counts.critical)}
          icon="emergency"
          tone="major"
          caption={t(
            'incidentList.kpi.criticalCaption',
            {},
            { defaultValue: 'Outage-class events' },
          )}
        />
        <MetricKpiCard
          eyebrow={t('status.resolved', {}, { defaultValue: 'Resolved' })}
          value={String(counts.resolved)}
          icon="check_circle"
          tone="operational"
          caption={t(
            'incidentList.kpi.resolvedCaption',
            {},
            { defaultValue: 'Closed events on file' },
          )}
        />
      </section>

      <div className={cm.cn('flex flex-wrap items-center gap-2 mb-4')}>
        {filters.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cm.cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-xs font-bold uppercase tracking-widest transition-colors',
              )}
              style={{
                backgroundColor: active ? 'rgba(16, 185, 129, 0.20)' : 'rgba(30, 41, 59, 0.6)',
                color: active ? 'var(--color-link-hover)' : 'var(--color-chip-text)',
                border: `1px solid ${active ? 'rgba(16, 185, 129, 0.40)' : 'var(--color-border-card)'}`,
              }}
              data-mol-id={`incident-list-filter-${f.key}`}
            >
              {f.label}
              <span className={cm.cn('opacity-70')}>{f.count}</span>
            </button>
          )
        })}
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('incidentList.loading', {}, { defaultValue: 'Loading incidents…' })}
        </p>
      ) : visible.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          <span
            className={cm.cn('material-symbols-outlined text-5xl opacity-40 mb-3 inline-block')}
            aria-hidden="true"
          >
            check_circle
          </span>
          <p className={cm.cn('text-sm')}>
            {t('incidentList.empty', {}, { defaultValue: 'No incidents match this filter.' })}
          </p>
        </div>
      ) : (
        <ul className={cm.cn('space-y-3')}>
          {visible.map((i) => (
            <li key={i.id}>
              <IncidentCard incident={i} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
