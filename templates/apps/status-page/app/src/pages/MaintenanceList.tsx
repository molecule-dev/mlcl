import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { MetricKpiCard } from '../components/MetricKpiCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface MaintenanceWindow {
  id: string
  title: string
  message?: string
  status: 'scheduled' | 'in_progress' | 'verifying' | 'completed'
  scheduled_for: string
  scheduled_until: string
  affected_components: string[]
  scheduled_by?: string
  duration_minutes?: number
}

interface ComponentOption {
  id: string
  name: string
}

function durationMinutes(start: string, end: string): number {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return 0
  return Math.round((e - s) / 60_000)
}

const STATUS_LABEL: Record<MaintenanceWindow['status'], string> = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  verifying: 'Verifying',
  completed: 'Completed',
}

const STATUS_COLOR: Record<MaintenanceWindow['status'], string> = {
  scheduled: '#6366f1',
  in_progress: '#f59e0b',
  verifying: '#a78bfa',
  completed: '#10b981',
}

function fmtTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
  return `${month} ${d.getUTCDate()} · ${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')} UTC`
}

export function MaintenanceList() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [windows, setWindows] = useState<MaintenanceWindow[]>([])
  const [loading, setLoading] = useState(true)
  const [components, setComponents] = useState<ComponentOption[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const refresh = async () => {
    const [winRes, compRes] = await Promise.all([
      http.get('/api/maintenance'),
      http.get('/api/components').catch(() => null),
    ])
    setWindows(unwrapList<MaintenanceWindow>(winRes))
    if (compRes) setComponents(unwrapList<ComponentOption>(compRes))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    refresh()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    setAddError(null)
    try {
      const startIso = new Date(start).toISOString()
      const endIso = new Date(end).toISOString()
      if (Number.isNaN(new Date(start).getTime()) || Number.isNaN(new Date(end).getTime())) {
        throw new Error(
          t(
            'maintenanceList.invalidDate',
            {},
            { defaultValue: 'Provide a valid start and end time.' },
          ),
        )
      }
      if (new Date(end).getTime() <= new Date(start).getTime()) {
        throw new Error(
          t('maintenanceList.endAfterStart', {}, { defaultValue: 'End must be after start.' }),
        )
      }
      await http.post('/api/maintenance', {
        title: title.trim(),
        message: message.trim() || undefined,
        scheduled_for: startIso,
        scheduled_until: endIso,
        affected_components: Array.from(selected),
      })
      setTitle('')
      setMessage('')
      setStart('')
      setEnd('')
      setSelected(new Set())
      setShowAdd(false)
      await refresh()
    } catch (err) {
      setAddError(
        err instanceof Error
          ? err.message
          : t(
              'maintenanceList.createError',
              {},
              { defaultValue: 'Could not schedule maintenance' },
            ),
      )
    } finally {
      setAdding(false)
    }
  }

  const toggleAffected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const counts = useMemo(() => {
    return {
      scheduled: windows.filter((w) => w.status === 'scheduled').length,
      inProgress: windows.filter((w) => w.status === 'in_progress').length,
      completed: windows.filter((w) => w.status === 'completed').length,
    }
  }, [windows])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))} data-mol-id="page-maintenance-list">
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-8')}>
        <div>
          <p
            className={cm.cn(
              'font-mono text-xs font-bold uppercase tracking-widest text-secondary mb-2',
            )}
          >
            {t(
              'maintenanceList.eyebrow',
              { app: APP_NAME },
              { defaultValue: '$ {{app}} maintenance --next 7d' },
            )}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('maintenanceList.heading', {}, { defaultValue: 'Maintenance windows' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'maintenanceList.subheading',
              {},
              {
                defaultValue:
                  'Scheduled, in-flight, and historical maintenance — pre-announced to subscribers.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          data-testid="schedule-maintenance-btn"
          onClick={() => setShowAdd((s) => !s)}
          className={cm.cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest transition-all hover:opacity-90',
          )}
          style={{
            backgroundColor: 'var(--color-status-maintenance)',
            color: 'var(--mol-color-background)',
          }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            event_upcoming
          </span>
          {t('maintenanceList.scheduleCta', {}, { defaultValue: 'Schedule window' })}
        </button>
      </header>

      {showAdd ? (
        <form
          onSubmit={onCreate}
          data-testid="schedule-maintenance-form"
          className={cm.cn('rounded-2xl p-6 mb-8')}
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.65)',
            border: '1px solid var(--color-border-card)',
          }}
        >
          <p
            className={cm.cn(
              'font-mono text-[10px] font-black uppercase tracking-widest text-secondary mb-3',
            )}
          >
            {t(
              'maintenanceList.scheduleHeading',
              {},
              { defaultValue: 'Schedule maintenance window' },
            )}
          </p>
          <div className={cm.cn('grid gap-3 grid-cols-1 md:grid-cols-2')}>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="maintenance-title"
              placeholder={t(
                'maintenanceList.titlePlaceholder',
                {},
                { defaultValue: 'Title (e.g. DB upgrade)' },
              )}
              className={cm.cn('md:col-span-2 px-3 py-2 rounded-md font-mono text-sm')}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--color-border-card)',
                color: 'var(--mol-color-text)',
              }}
            />
            <input
              required
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              data-testid="maintenance-start"
              className={cm.cn('px-3 py-2 rounded-md font-mono text-sm')}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--color-border-card)',
                color: 'var(--mol-color-text)',
              }}
            />
            <input
              required
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              data-testid="maintenance-end"
              className={cm.cn('px-3 py-2 rounded-md font-mono text-sm')}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--color-border-card)',
                color: 'var(--mol-color-text)',
              }}
            />
            <textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              data-testid="maintenance-message"
              placeholder={t(
                'maintenanceList.messagePlaceholder',
                {},
                { defaultValue: 'What we will be doing (optional)' },
              )}
              className={cm.cn('md:col-span-2 px-3 py-2 rounded-md font-mono text-sm')}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--color-border-card)',
                color: 'var(--mol-color-text)',
              }}
            />
          </div>
          {components.length > 0 ? (
            <div className={cm.cn('mt-3')}>
              <p
                className={cm.cn(
                  'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2',
                )}
              >
                {t('maintenanceList.affected', {}, { defaultValue: 'Affected components' })}
              </p>
              <div className={cm.cn('flex flex-wrap gap-2')}>
                {components.map((c) => {
                  const checked = selected.has(c.id)
                  return (
                    <label
                      key={c.id}
                      data-testid={`maintenance-affected-${c.id}`}
                      className={cm.cn(
                        'inline-flex items-center gap-2 px-2.5 py-1 rounded-md cursor-pointer font-mono text-[11px]',
                      )}
                      style={{
                        backgroundColor: checked
                          ? 'rgba(99, 102, 241, 0.18)'
                          : 'rgba(15, 23, 42, 0.6)',
                        border: `1px solid ${checked ? 'rgba(99, 102, 241, 0.55)' : 'var(--color-border-card)'}`,
                        color: checked ? '#a5b4fc' : 'var(--color-chip-text)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAffected(c.id)}
                        className={cm.cn('accent-indigo-500')}
                      />
                      {c.name}
                    </label>
                  )
                })}
              </div>
            </div>
          ) : null}
          {addError ? (
            <p
              role="alert"
              data-testid="maintenance-form-error"
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
              disabled={adding || !title.trim() || !start || !end}
              data-testid="maintenance-submit"
              className={cm.cn(
                'px-3 py-1.5 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50',
              )}
              style={{
                backgroundColor: 'var(--color-status-maintenance)',
                color: 'var(--mol-color-background)',
              }}
            >
              {adding
                ? t('maintenanceList.scheduling', {}, { defaultValue: 'Scheduling…' })
                : t('nav.schedule', {}, { defaultValue: 'Schedule' })}
            </button>
          </div>
        </form>
      ) : null}

      <section className={cm.cn('grid gap-4 grid-cols-1 md:grid-cols-3 mb-8')}>
        <MetricKpiCard
          eyebrow={t('maintenanceList.kpi.scheduled', {}, { defaultValue: 'Scheduled' })}
          value={String(counts.scheduled)}
          icon="schedule"
          tone="maintenance"
        />
        <MetricKpiCard
          eyebrow={t('status.inProgress', {}, { defaultValue: 'In progress' })}
          value={String(counts.inProgress)}
          icon="sync"
          tone="degraded"
        />
        <MetricKpiCard
          eyebrow={t('common.completed', {}, { defaultValue: 'Completed' })}
          value={String(counts.completed)}
          icon="check_circle"
          tone="operational"
        />
      </section>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : windows.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('maintenanceList.empty', {}, { defaultValue: 'No maintenance windows on file.' })}
        </p>
      ) : (
        <ul className={cm.cn('space-y-3')}>
          {windows.map((w) => (
            <li key={w.id}>
              <Link
                to={`/maintenance/${w.id}`}
                className={cm.cn(
                  'block rounded-xl px-5 py-4 transition-all hover:-translate-y-0.5 hover:shadow-lg',
                )}
                style={{
                  backgroundColor: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid var(--color-border-card)',
                  borderLeft: `4px solid ${STATUS_COLOR[w.status]}`,
                }}
              >
                <div
                  className={cm.flex({
                    align: 'center',
                    justify: 'between',
                    gap: 'sm',
                    wrap: 'wrap',
                  })}
                >
                  <div className={cm.cn('flex items-center gap-2 min-w-0')}>
                    <span
                      className={cm.cn(
                        'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('maintenanceList.id', { id: w.id }, { defaultValue: 'MN-{{id}}' })}
                    </span>
                    <span
                      className={cm.cn(
                        'font-mono text-[10px] font-extrabold uppercase tracking-widest',
                      )}
                      style={{ color: STATUS_COLOR[w.status] }}
                    >
                      {STATUS_LABEL[w.status]}
                    </span>
                    <span className={cm.cn('font-mono text-[11px] text-on-surface-variant')}>
                      {w.duration_minutes ?? durationMinutes(w.scheduled_for, w.scheduled_until)}m
                    </span>
                  </div>
                  <span className={cm.cn('font-mono text-xs text-on-surface-variant')}>
                    {fmtTimestamp(w.scheduled_for)} → {fmtTimestamp(w.scheduled_until)}
                  </span>
                </div>
                <h3 className={cm.cn('mt-2 text-lg font-extrabold tracking-tight text-on-surface')}>
                  {w.title}
                </h3>
                {w.message ? (
                  <p className={cm.cn('mt-1 text-sm text-on-surface-variant')}>{w.message}</p>
                ) : null}
                <div className={cm.cn('mt-3 flex flex-wrap gap-1.5')}>
                  {w.affected_components.map((c) => (
                    <span
                      key={c}
                      className={cm.cn(
                        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px]',
                      )}
                      style={{
                        backgroundColor: 'var(--color-border-card)',
                        color: 'var(--color-chip-text)',
                      }}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-[11px]')}
                        aria-hidden="true"
                      >
                        lan
                      </span>
                      {c}
                    </span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
