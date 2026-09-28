import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { IncidentCard, type IncidentCardData } from '../components/IncidentCard.js'
import { MetricKpiCard } from '../components/MetricKpiCard.js'
import { type ComponentStatus, StatusPill } from '../components/StatusPill.js'
import { UptimeBar } from '../components/UptimeBar.js'
import { generateUptime90 } from '../lib/sampleUptime.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface RawComponent {
  id: string
  name: string
  description?: string | null
  group?: string | null
  status: ComponentStatus
  monitor_url?: string | null
  uptime_pct_90?: number | null
}

export function ComponentDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()

  const [component, setComponent] = useState<RawComponent | null>(null)
  const [incidents, setIncidents] = useState<IncidentCardData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/api/components/${id}`).catch(() => null),
      http.get('/api/components').catch(() => ({ data: [] })),
      http.get('/api/incidents').catch(() => ({ data: [] })),
    ]).then(([single, listRes, incRes]) => {
      if (cancelled) return
      const onePicked = single ? unwrapSingle<RawComponent>(single) : null
      const list = unwrapList<RawComponent>(listRes)
      setComponent(onePicked ?? list.find((c) => c.id === id) ?? list[0] ?? null)
      setIncidents(unwrapList<IncidentCardData>(incRes))
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [http, id])

  const days = useMemo(
    () =>
      component
        ? generateUptime90(
            component.id,
            component.status === 'operational' ? 'operational' : 'degraded',
          )
        : [],
    [component],
  )

  const dayIncidents = days.reduce((acc, d) => acc + (d.incidentCount ?? 0), 0)
  const downDays = days.filter((d) => d.status === 'major' || d.status === 'partial').length
  const degradedDays = days.filter((d) => d.status === 'degraded').length

  if (loading) {
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}
      >
        {t('componentDetail.loading', {}, { defaultValue: 'Loading component…' })}
      </div>
    )
  }

  if (!component) {
    return (
      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.textCenter, 'text-error')}>
        {t('componentDetail.notFound', {}, { defaultValue: 'Component not found.' })}
      </div>
    )
  }

  const relatedIncidents = incidents.filter((i) =>
    (i.affected_components ?? []).some((c) => c === component.name),
  )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))} data-mol-id="page-component-detail">
      <nav className={cm.cn('mb-6')}>
        <Link
          to="/components"
          className={cm.cn(
            'inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('componentDetail.back', {}, { defaultValue: 'All components' })}
        </Link>
      </nav>

      <header
        className={cm.cn(
          'rounded-2xl p-8 mb-8 relative overflow-hidden',
          cm.accentCard({ tone: 'custom' }),
        )}
        style={{
          backgroundColor: 'rgba(30, 41, 59, 0.65)',
          border: '1px solid var(--color-border-card)',
          ['--mol-accent' as string]: 'var(--color-status-operational)',
        }}
      >
        <div
          className={cm.cn(
            'absolute -right-24 -bottom-24 h-72 w-72 rounded-full blur-3xl pointer-events-none',
          )}
          style={{ backgroundColor: 'rgba(16, 185, 129, 0.30)' }}
          aria-hidden="true"
        />
        <div className={cm.cn('relative')}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span
              className={cm.cn(
                'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {component.group ?? 'platform'}
            </span>
            <StatusPill status={component.status} emphasis />
          </div>
          <h1 className={cm.cn('mt-2 text-3xl md:text-4xl font-extrabold tracking-tight')}>
            {component.name}
          </h1>
          {component.description ? (
            <p className={cm.cn('mt-2 text-base text-on-surface-variant max-w-2xl')}>
              {component.description}
            </p>
          ) : null}
          {component.monitor_url ? (
            <a
              href={component.monitor_url}
              className={cm.cn(
                'mt-3 inline-flex items-center gap-1 font-mono text-xs text-primary hover:opacity-80',
              )}
              target="_blank"
              rel="noreferrer"
            >
              <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                link
              </span>
              {component.monitor_url}
            </a>
          ) : null}
        </div>
      </header>

      <section className={cm.cn('grid gap-4 grid-cols-2 md:grid-cols-4 mb-8')}>
        <MetricKpiCard
          eyebrow={t('componentDetail.kpi.uptime', {}, { defaultValue: '90-day uptime' })}
          value={(component.uptime_pct_90 ?? 99.9).toFixed(2)}
          unit="%"
          icon="trending_up"
          tone="operational"
        />
        <MetricKpiCard
          eyebrow={t('componentDetail.kpi.downDays', {}, { defaultValue: 'Down days' })}
          value={String(downDays)}
          icon="warning"
          tone={downDays > 0 ? 'major' : 'operational'}
        />
        <MetricKpiCard
          eyebrow={t('componentDetail.kpi.degradedDays', {}, { defaultValue: 'Degraded days' })}
          value={String(degradedDays)}
          icon="speed"
          tone={degradedDays > 0 ? 'degraded' : 'operational'}
        />
        <MetricKpiCard
          eyebrow={t('componentDetail.kpi.incidents90', {}, { defaultValue: 'Incidents · 90d' })}
          value={String(dayIncidents)}
          icon="bug_report"
          tone={dayIncidents > 0 ? 'partial' : 'operational'}
        />
      </section>

      <section
        className={cm.cn('rounded-2xl p-6 mb-8')}
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid var(--color-border-card)',
        }}
      >
        <header className={cm.cn('mb-4')}>
          <p
            className={cm.cn(
              'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('componentDetail.history', {}, { defaultValue: '90-day uptime history' })}
          </p>
          <h2 className={cm.cn('text-lg font-extrabold tracking-tight')}>
            {t('componentDetail.historyHeading', {}, { defaultValue: 'Daily check timeline' })}
          </h2>
        </header>
        <UptimeBar
          days={days}
          density="compact"
          uptimeLabel={
            component.uptime_pct_90 != null ? `${component.uptime_pct_90.toFixed(2)}%` : undefined
          }
          rangeLabel={t(
            'componentDetail.range',
            {},
            { defaultValue: '90 days · daily aggregate · UTC' },
          )}
          incidentLabel={t(
            'componentDetail.incidentsLabel',
            { count: dayIncidents },
            { defaultValue: '{{count}} incidents' },
          )}
        />
      </section>

      <section>
        <h2 className={cm.cn('text-xl font-extrabold tracking-tight mb-4')}>
          {t('componentDetail.incidentsHeading', {}, { defaultValue: 'Recent incidents' })}
        </h2>
        {relatedIncidents.length === 0 ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t(
              'componentDetail.incidentsEmpty',
              {},
              { defaultValue: 'No incidents on file for this component.' },
            )}
          </p>
        ) : (
          <ul className={cm.cn('space-y-3')}>
            {relatedIncidents.map((i) => (
              <li key={i.id}>
                <IncidentCard incident={i} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
