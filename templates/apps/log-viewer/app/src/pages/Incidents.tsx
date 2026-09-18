import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { IncidentRow, type IncidentRowData } from '../components/IncidentRow.js'
import { MetricStatCard } from '../components/MetricStatCard.js'
import { unwrapList } from '../lib/unwrap.js'

type ScopeFilter = 'open' | 'all' | 'resolved'

function loadIncidents(http: ReturnType<typeof useHttpClient>): Promise<IncidentRowData[]> {
  return http.get('/api/incidents').then((res) => unwrapList<IncidentRowData>(res))
}

export function Incidents() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [incidents, setIncidents] = useState<IncidentRowData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scope, setScope] = useState<ScopeFilter>('open')
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSeverity, setNewSeverity] = useState<IncidentRowData['severity']>('sev2')
  const [newService, setNewService] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    loadIncidents(http)
      .then((items) => {
        if (!cancelled) setIncidents(items)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('incidents.loadError', {}, { defaultValue: 'Failed to load incidents.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  function openDeclare() {
    setNewTitle('')
    setNewSeverity('sev2')
    setNewService('')
    setCreateError(null)
    setShowCreate(true)
  }

  async function submitDeclare(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !newService.trim()) return
    setSubmitting(true)
    setCreateError(null)
    try {
      await http.post('/api/incidents', {
        title: newTitle.trim(),
        severity: newSeverity,
        service: newService.trim(),
      })
      setShowCreate(false)
      const items = await loadIncidents(http)
      setIncidents(items)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setCreateError(
        msg || t('incidents.createError', {}, { defaultValue: 'Could not declare incident.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const counts = useMemo(() => {
    const all = incidents.length
    const open = incidents.filter((i) => i.resolved_at === null).length
    const resolved = all - open
    const sev1 = incidents.filter((i) => i.severity === 'sev1').length
    return { all, open, resolved, sev1 }
  }, [incidents])

  const visible = useMemo(() => {
    if (scope === 'all') return incidents
    if (scope === 'resolved') return incidents.filter((i) => i.resolved_at !== null)
    return incidents.filter((i) => i.resolved_at === null)
  }, [incidents, scope])

  const scopes: { key: ScopeFilter; defaultLabel: string; count: number }[] = [
    { key: 'open', defaultLabel: 'Open', count: counts.open },
    { key: 'all', defaultLabel: 'All', count: counts.all },
    { key: 'resolved', defaultLabel: 'Resolved', count: counts.resolved },
  ]

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.cn('flex items-end justify-between flex-wrap gap-6 mb-8')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: BRAND_COLOR }}
          >
            {t('incidents.eyebrow', {}, { defaultValue: '$ signalink incidents --severity=high' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('incidents.heading', {}, { defaultValue: 'Incidents' })}
          </h1>
        </div>
        <button
          type="button"
          onClick={openDeclare}
          data-mol-id="incidents-declare"
          className={cm.cn(
            'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90',
          )}
          style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-background)' }}
        >
          {t('incidents.declareCta', {}, { defaultValue: '+ Declare incident' })}
        </button>
      </header>

      <section className={cm.cn('grid gap-4 grid-cols-2 md:grid-cols-4 mb-8')}>
        <MetricStatCard
          eyebrow={t('common.open', {}, { defaultValue: 'Open' })}
          value={String(counts.open)}
          icon="whatshot"
          tone="error"
          caption={t('incidents.metric.openCaption', {}, { defaultValue: 'on call now' })}
        />
        <MetricStatCard
          eyebrow={t('incidents.metric.sev1', {}, { defaultValue: 'SEV1' })}
          value={String(counts.sev1)}
          icon="priority_high"
          tone="error"
          caption={t('incidents.metric.sev1Caption', {}, { defaultValue: 'critical impact' })}
        />
        <MetricStatCard
          eyebrow={t('status.resolved', {}, { defaultValue: 'Resolved' })}
          value={String(counts.resolved)}
          icon="check_circle"
          tone="success"
          caption={t('incidents.metric.resolvedCaption', {}, { defaultValue: 'closed in window' })}
        />
        <MetricStatCard
          eyebrow={t('incidents.metric.mttr', {}, { defaultValue: 'MTTR' })}
          value="42"
          unit="m"
          icon="timer"
          tone="primary"
          caption={t('incidents.metric.mttrCaption', {}, { defaultValue: 'rolling 30d' })}
        />
      </section>

      <div className={cm.cn('flex flex-wrap items-center gap-2 mb-4')}>
        {scopes.map((s) => {
          const active = scope === s.key
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setScope(s.key)}
              className={cm.cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-xs font-bold uppercase tracking-widest transition-colors',
              )}
              style={{
                backgroundColor: active
                  ? 'color-mix(in srgb, var(--color-primary) 20%, transparent)'
                  : 'var(--color-surface-container)',
                color: active ? 'var(--color-primary-hover)' : 'var(--color-severity-trace-light)',
                border: `1px solid ${active ? 'color-mix(in srgb, var(--color-primary) 45%, transparent)' : 'var(--color-border)'}`,
              }}
            >
              {t(`incidents.scope.${s.key}`, {}, { defaultValue: s.defaultLabel })}
              <span className={cm.cn('opacity-70')}>{s.count}</span>
            </button>
          )
        })}
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('incidents.loading', {}, { defaultValue: 'Loading incidents…' })}
        </p>
      ) : visible.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('incidents.empty', {}, { defaultValue: 'No incidents in this scope.' })}
        </p>
      ) : (
        <ul className={cm.cn('space-y-3')}>
          {visible.map((inc) => (
            <li key={inc.id}>
              <IncidentRow incident={inc} />
            </li>
          ))}
        </ul>
      )}

      {showCreate ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="incidents-declare-title"
          className={cm.cn('fixed inset-0 z-50 flex items-center justify-center px-4')}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-background) 65%, transparent)',
          }}
        >
          <form
            onSubmit={submitDeclare}
            className={cm.cn('w-full max-w-md rounded-xl p-6 space-y-4')}
            style={{
              backgroundColor: 'var(--color-input-background)',
              border: '1px solid var(--color-border)',
            }}
          >
            <h2
              id="incidents-declare-title"
              className={cm.cn('text-lg font-semibold tracking-tight text-on-surface')}
            >
              {t('incidents.create.title', {}, { defaultValue: 'Declare incident' })}
            </h2>
            <div>
              <label
                htmlFor="incidents-new-title"
                className={cm.cn(
                  'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono text-on-surface-variant',
                )}
              >
                {t('form.title', {}, { defaultValue: 'Title' })}
              </label>
              <input
                id="incidents-new-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className={cm.cn('w-full py-2.5 px-3 rounded-md font-mono text-sm')}
                style={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-severity-debug-light)',
                }}
              />
            </div>
            <div>
              <label
                htmlFor="incidents-new-service"
                className={cm.cn(
                  'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono text-on-surface-variant',
                )}
              >
                {t('incidents.create.serviceLabel', {}, { defaultValue: 'Service' })}
              </label>
              <input
                id="incidents-new-service"
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                required
                className={cm.cn('w-full py-2.5 px-3 rounded-md font-mono text-sm')}
                style={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-severity-debug-light)',
                }}
              />
            </div>
            <div>
              <label
                htmlFor="incidents-new-severity"
                className={cm.cn(
                  'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono text-on-surface-variant',
                )}
              >
                {t('incidents.create.severityLabel', {}, { defaultValue: 'Severity' })}
              </label>
              <select
                id="incidents-new-severity"
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value as IncidentRowData['severity'])}
                className={cm.cn('w-full py-2.5 px-3 rounded-md font-mono text-sm')}
                style={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-severity-debug-light)',
                }}
              >
                <option value="sev1">SEV1 — critical</option>
                <option value="sev2">SEV2 — major</option>
                <option value="sev3">SEV3 — minor</option>
                <option value="sev4">SEV4 — informational</option>
              </select>
            </div>
            {createError ? <div className={cm.cn('text-sm text-error')}>{createError}</div> : null}
            <div className={cm.cn('flex items-center justify-end gap-3 pt-2')}>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className={cm.cn(
                  'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border border-outline-variant',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="submit"
                disabled={submitting || !newTitle.trim() || !newService.trim()}
                data-mol-id="incidents-declare-submit"
                className={cm.cn(
                  'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed',
                )}
                style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-background)' }}
              >
                {submitting
                  ? t('incidents.create.submitting', {}, { defaultValue: 'Declaring…' })
                  : t('incidents.create.submit', {}, { defaultValue: 'Declare' })}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
