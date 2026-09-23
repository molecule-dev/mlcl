import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { MetricKpiCard } from '../components/MetricKpiCard.js'
import { ServiceRow, type ServiceRowData } from '../components/ServiceRow.js'
import type { ComponentStatus } from '../components/StatusPill.js'
import { aggregateUptimePct, deriveUptime90, type IncidentLike } from '../lib/deriveUptime.js'
import { unwrapList } from '../lib/unwrap.js'

interface RawComponent {
  id: string
  name: string
  description?: string | null
  group?: string | null
  status: ComponentStatus
  monitor_url?: string | null
  uptime_pct_90?: number | null
  created_at?: string | null
}

export function Components() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [components, setComponents] = useState<RawComponent[]>([])
  const [incidents, setIncidents] = useState<IncidentLike[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [group, setGroup] = useState('')
  const [description, setDescription] = useState('')

  const refresh = async () => {
    const [compRes, incRes] = await Promise.all([
      http.get('/api/components'),
      http.get('/api/incidents').catch(() => null),
    ])
    setComponents(unwrapList<RawComponent>(compRes))
    if (incRes) setIncidents(unwrapList<IncidentLike>(incRes))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    refresh()
      .catch(() => {
        if (!cancelled)
          setError(t('components.loadError', {}, { defaultValue: 'Failed to load components.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, t])

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    setAddError(null)
    try {
      const res = await http.post('/api/components', {
        name: name.trim(),
        group: group.trim() || undefined,
        description: description.trim() || undefined,
      })
      const created = (res.data ?? {}) as { id?: string }
      track({ name: 'component.added', properties: { id: created.id, name: name.trim() } })
      setName('')
      setGroup('')
      setDescription('')
      setShowAdd(false)
      await refresh()
    } catch (err) {
      setAddError(
        err instanceof Error
          ? err.message
          : t('components.createError', {}, { defaultValue: 'Could not create component' }),
      )
    } finally {
      setAdding(false)
    }
  }

  const services = useMemo<ServiceRowData[]>(
    () =>
      components.map((c) => {
        const days = deriveUptime90(c, incidents)
        return {
          id: c.id,
          name: c.name,
          description: c.description ?? null,
          group: c.group ?? null,
          status: c.status,
          monitor_url: c.monitor_url ?? null,
          uptime90Days: days,
          uptimePct90: c.uptime_pct_90 ?? aggregateUptimePct(days),
        }
      }),
    [components, incidents],
  )

  const counts = useMemo(() => {
    const byStatus: Record<ComponentStatus, number> = {
      operational: 0,
      degraded_performance: 0,
      partial_outage: 0,
      major_outage: 0,
      under_maintenance: 0,
      unknown: 0,
    }
    for (const c of components) byStatus[c.status] = (byStatus[c.status] || 0) + 1
    return byStatus
  }, [components])

  const grouped = useMemo(() => {
    const map = new Map<string, ServiceRowData[]>()
    for (const s of services) {
      const g = s.group || 'platform'
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(s)
    }
    return Array.from(map.entries())
  }, [services])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))} data-mol-id="page-components">
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-8')}>
        <div>
          <p
            className={cm.cn(
              'font-mono text-xs font-bold uppercase tracking-widest text-primary mb-2',
            )}
          >
            {t(
              'components.eyebrow',
              { app: APP_NAME },
              { defaultValue: '$ {{app}} components --list' },
            )}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('components.heading', {}, { defaultValue: 'Components' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'components.subheading',
              {},
              {
                defaultValue:
                  'Monitored services, organised into groups for the public status page.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          data-testid="add-component-btn"
          className={cm.cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest transition-all hover:opacity-90',
          )}
          style={{
            backgroundColor: 'var(--color-status-operational)',
            color: 'var(--color-on-status-operational)',
          }}
          onClick={() => setShowAdd((s) => !s)}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            add_circle
          </span>
          {t('components.add', {}, { defaultValue: 'Add component' })}
        </button>
      </header>

      {showAdd ? (
        <form
          onSubmit={onCreate}
          data-testid="add-component-form"
          className={cm.cn('rounded-2xl p-6 mb-8')}
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.65)',
            border: '1px solid var(--color-border-card)',
          }}
        >
          <p
            className={cm.cn(
              'font-mono text-[10px] font-black uppercase tracking-widest text-primary mb-3',
            )}
          >
            {t('components.addHeading', {}, { defaultValue: 'New component' })}
          </p>
          <div className={cm.cn('grid gap-3 grid-cols-1 md:grid-cols-3')}>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="add-component-name"
              placeholder={t(
                'components.namePlaceholder',
                {},
                { defaultValue: 'Name (e.g. API gateway)' },
              )}
              className={cm.cn('px-3 py-2 rounded-md font-mono text-sm')}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--color-border-card)',
                color: 'var(--mol-color-text)',
              }}
            />
            <input
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              data-testid="add-component-group"
              placeholder={t(
                'components.groupPlaceholder',
                {},
                { defaultValue: 'Group (e.g. platform)' },
              )}
              className={cm.cn('px-3 py-2 rounded-md font-mono text-sm')}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--color-border-card)',
                color: 'var(--mol-color-text)',
              }}
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="add-component-description"
              placeholder={t(
                'form.descriptionOptional',
                {},
                { defaultValue: 'Description (optional)' },
              )}
              className={cm.cn('px-3 py-2 rounded-md font-mono text-sm')}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--color-border-card)',
                color: 'var(--mol-color-text)',
              }}
            />
          </div>
          {addError ? (
            <p
              role="alert"
              data-testid="add-component-error"
              className={cm.cn('mt-3 font-mono text-[11px]')}
              style={{ color: 'var(--color-error-text-vivid-on-dark)' }}
            >
              {addError}
            </p>
          ) : null}
          <div className={cm.cn('mt-4 flex items-center justify-end gap-2')}>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className={cm.cn(
                'px-3 py-1.5 rounded-md font-mono text-xs font-bold uppercase tracking-widest',
              )}
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.6)',
                color: 'var(--color-chip-text)',
                border: '1px solid var(--color-border-card)',
              }}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="submit"
              disabled={adding || !name.trim()}
              data-testid="add-component-submit"
              className={cm.cn(
                'px-3 py-1.5 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50',
              )}
              style={{
                backgroundColor: 'var(--color-status-operational)',
                color: 'var(--color-on-status-operational)',
              }}
            >
              {adding
                ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                : t('components.addSubmit', {}, { defaultValue: 'Add component' })}
            </button>
          </div>
        </form>
      ) : null}

      <section className={cm.cn('grid gap-4 grid-cols-2 md:grid-cols-4 mb-8')}>
        <MetricKpiCard
          eyebrow={t('components.kpi.operational', {}, { defaultValue: 'Operational' })}
          value={String(counts.operational)}
          icon="task_alt"
          tone="operational"
          caption={t('components.kpi.operationalCaption', {}, { defaultValue: 'All checks green' })}
        />
        <MetricKpiCard
          eyebrow={t('components.kpi.degraded', {}, { defaultValue: 'Degraded' })}
          value={String(counts.degraded_performance)}
          icon="speed"
          tone="degraded"
          caption={t(
            'components.kpi.degradedCaption',
            {},
            { defaultValue: 'Latency or error budget at risk' },
          )}
        />
        <MetricKpiCard
          eyebrow={t('components.kpi.partial', {}, { defaultValue: 'Partial outage' })}
          value={String(counts.partial_outage)}
          icon="warning"
          tone="partial"
          caption={t('components.kpi.partialCaption', {}, { defaultValue: 'Some users impacted' })}
        />
        <MetricKpiCard
          eyebrow={t('components.kpi.major', {}, { defaultValue: 'Major outage' })}
          value={String(counts.major_outage)}
          icon="report"
          tone="major"
          caption={t('components.kpi.majorCaption', {}, { defaultValue: 'Service down' })}
        />
      </section>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('components.loading', {}, { defaultValue: 'Loading components…' })}
        </p>
      ) : services.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t(
            'components.empty',
            {},
            { defaultValue: 'No components yet — add one to start monitoring.' },
          )}
        </p>
      ) : (
        <div className={cm.cn('space-y-6')}>
          {grouped.map(([group, list]) => (
            <section
              key={group}
              className={cm.cn('rounded-2xl overflow-hidden')}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--color-border-card)',
              }}
            >
              <header
                className={cm.cn(
                  'px-5 py-3 border-b font-mono text-[10px] font-black uppercase tracking-widest flex items-center justify-between',
                )}
                style={{ borderColor: 'var(--mol-color-border)', color: 'var(--color-text-muted)' }}
              >
                <span>
                  {group} · {list.length}
                </span>
                <Link to={`/components`} className={cm.cn('text-primary hover:opacity-80')}>
                  {t('common.manage', {}, { defaultValue: 'Manage' })}
                </Link>
              </header>
              <ul className={cm.cn('p-3 space-y-3')}>
                {list.map((s) => (
                  <li key={s.id}>
                    <ServiceRow service={s} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
