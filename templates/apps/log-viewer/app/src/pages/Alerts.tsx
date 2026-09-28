import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { MetricStatCard } from '../components/MetricStatCard.js'
import { type Severity, SeverityPill } from '../components/SeverityPill.js'
import { unwrapList } from '../lib/unwrap.js'

interface AlertRule {
  id: string
  name: string
  service: string
  severity: Severity
  condition: string
  channels: string[]
  status: 'firing' | 'monitoring' | 'ok'
  last_fired_at: string
  fire_count_24h: number
}

const STATUS_TINT: Record<
  AlertRule['status'],
  { bg: string; text: string; defaultLabel: string; accent: string }
> = {
  firing: {
    bg: 'color-mix(in srgb, var(--color-severity-fatal) 16%, transparent)',
    text: 'var(--color-severity-fatal-light)',
    defaultLabel: 'Firing',
    accent: 'var(--color-severity-fatal)',
  },
  monitoring: {
    bg: 'color-mix(in srgb, var(--color-severity-warn) 16%, transparent)',
    text: 'var(--color-severity-warn-light)',
    defaultLabel: 'Monitoring',
    accent: 'var(--color-severity-warn)',
  },
  ok: {
    bg: 'color-mix(in srgb, var(--color-success) 16%, transparent)',
    text: 'var(--color-success-light)',
    defaultLabel: 'OK',
    accent: 'var(--color-success)',
  },
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function loadAlerts(http: ReturnType<typeof useHttpClient>): Promise<AlertRule[]> {
  return http.get('/api/alerts').then((res) => unwrapList<AlertRule>(res))
}

export function Alerts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState<AlertRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newService, setNewService] = useState('')
  const [newSeverity, setNewSeverity] = useState<Severity>('error')
  const [newCondition, setNewCondition] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    loadAlerts(http)
      .then((items) => {
        if (!cancelled) setAlerts(items)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('alerts.loadError', {}, { defaultValue: 'Failed to load alerts.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  function openCreate() {
    setNewName('')
    setNewService('')
    setNewSeverity('error')
    setNewCondition('')
    setCreateError(null)
    setShowCreate(true)
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !newService.trim() || !newCondition.trim()) return
    setSubmitting(true)
    setCreateError(null)
    try {
      const created = (await http.post('/api/alerts', {
        name: newName.trim(),
        service: newService.trim(),
        severity: newSeverity,
        condition: newCondition.trim(),
        channels: ['email'],
      })) as { id?: string; data?: { id?: string } }
      track({
        name: 'alert.created',
        properties: {
          alert_id: created?.id ?? created?.data?.id ?? null,
          name: newName.trim(),
          severity: newSeverity,
        },
      })
      setShowCreate(false)
      const items = await loadAlerts(http)
      setAlerts(items)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setCreateError(
        msg || t('alerts.createError', {}, { defaultValue: 'Could not create alert rule.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const counts = useMemo(() => {
    return alerts.reduce(
      (acc, a) => {
        acc.total += 1
        if (a.status === 'firing') acc.firing += 1
        else if (a.status === 'monitoring') acc.monitoring += 1
        else acc.ok += 1
        acc.fired24h += a.fire_count_24h
        return acc
      },
      { total: 0, firing: 0, monitoring: 0, ok: 0, fired24h: 0 },
    )
  }, [alerts])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.cn('flex items-end justify-between flex-wrap gap-6 mb-8')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: BRAND_COLOR }}
          >
            {t('alerts.eyebrow', {}, { defaultValue: '$ signalink alerts --watch' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('alerts.heading', {}, { defaultValue: 'Alert rules' })}
          </h1>
        </div>
        <button
          type="button"
          onClick={openCreate}
          data-mol-id="alerts-new"
          className={cm.cn(
            'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90',
          )}
          style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-background)' }}
        >
          {t('alerts.newCta', {}, { defaultValue: '+ New rule' })}
        </button>
      </header>

      <section className={cm.cn('grid gap-4 grid-cols-2 md:grid-cols-4 mb-8')}>
        <MetricStatCard
          eyebrow={t('alerts.metric.firing', {}, { defaultValue: 'Firing' })}
          value={String(counts.firing)}
          icon="notifications_active"
          tone="error"
          caption={t('alerts.metric.firingCaption', {}, { defaultValue: 'on call now' })}
        />
        <MetricStatCard
          eyebrow={t('alerts.metric.monitoring', {}, { defaultValue: 'Monitoring' })}
          value={String(counts.monitoring)}
          icon="visibility"
          tone="warning"
          caption={t('alerts.metric.monitoringCaption', {}, { defaultValue: 'soft thresholds' })}
        />
        <MetricStatCard
          eyebrow={t('alerts.metric.ok', {}, { defaultValue: 'Quiet' })}
          value={String(counts.ok)}
          icon="check_circle"
          tone="success"
          caption={t('alerts.metric.okCaption', {}, { defaultValue: 'all green' })}
        />
        <MetricStatCard
          eyebrow={t('alerts.metric.fired24h', {}, { defaultValue: 'Fires / 24h' })}
          value={counts.fired24h.toLocaleString()}
          icon="bolt"
          tone="primary"
          caption={t('alerts.metric.fired24hCaption', {}, { defaultValue: 'rolling window' })}
        />
      </section>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('alerts.loading', {}, { defaultValue: 'Loading alerts…' })}
        </p>
      ) : alerts.length === 0 ? (
        <div
          className={cm.cn(cm.sp('py', 12), cm.textCenter, 'rounded-xl')}
          data-mol-id="alerts-empty"
          style={{
            backgroundColor: 'var(--color-surface-container)',
            border: '1px dashed var(--color-border)',
          }}
        >
          <p className={cm.cn('font-mono text-sm font-bold text-on-surface')}>
            {t('alerts.empty', {}, { defaultValue: 'No alert rules yet.' })}
          </p>
          <p className={cm.cn(cm.sp('mt', 1), 'font-mono text-xs text-on-surface-variant')}>
            {t(
              'alerts.emptyBody',
              {},
              { defaultValue: 'Create a rule to page yourself when a service misbehaves.' },
            )}
          </p>
          <button
            type="button"
            onClick={openCreate}
            data-mol-id="alerts-empty-create"
            className={cm.cn(
              cm.sp('mt', 4),
              'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90',
            )}
            style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-background)' }}
          >
            {t('alerts.newCta', {}, { defaultValue: '+ New rule' })}
          </button>
        </div>
      ) : (
        <ul className={cm.cn('space-y-3')}>
          {alerts.map((a) => {
            const tint = STATUS_TINT[a.status]
            return (
              <li key={a.id}>
                <Link
                  to={`/alerts/${a.id}`}
                  className={cm.cn(
                    cm.accentCard({ tone: 'custom' }),
                    'block rounded-xl px-5 py-4 transition-all hover:-translate-y-0.5 hover:shadow-lg',
                  )}
                  style={{
                    backgroundColor: 'var(--color-surface-container)',
                    border: '1px solid var(--color-border)',
                    ['--mol-accent' as string]: tint.accent,
                  }}
                >
                  <div className={cm.cn('flex items-center justify-between gap-4 flex-wrap')}>
                    <div className={cm.cn('flex-1 min-w-0')}>
                      <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
                        <SeverityPill severity={a.severity} />
                        <span
                          className={cm.cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full font-mono text-[10px] font-black uppercase tracking-widest',
                          )}
                          style={{ backgroundColor: tint.bg, color: tint.text }}
                        >
                          {t(`alerts.status.${a.status}`, {}, { defaultValue: tint.defaultLabel })}
                        </span>
                        <p
                          className={cm.cn(
                            'font-mono text-base font-bold text-on-surface truncate',
                          )}
                        >
                          {a.name}
                        </p>
                      </div>
                      <p
                        className={cm.cn('mt-1 font-mono text-xs text-on-surface-variant truncate')}
                      >
                        <span
                          className={cm.cn('font-semibold')}
                          style={{ color: 'var(--color-accent)' }}
                        >
                          {a.service}
                        </span>
                        <span className={cm.cn('mx-1.5 opacity-50')}>·</span>
                        {a.condition}
                      </p>
                    </div>

                    <div className={cm.cn('flex items-center gap-5')}>
                      <div className={cm.cn('text-right')}>
                        <p
                          className={cm.cn(
                            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                          )}
                        >
                          {t('alerts.col.lastFired', {}, { defaultValue: 'Last fired' })}
                        </p>
                        <p
                          className={cm.cn(
                            'font-mono text-xs font-semibold text-on-surface mt-0.5',
                          )}
                        >
                          {fmtRelative(a.last_fired_at)}
                        </p>
                      </div>
                      <div className={cm.cn('text-right')}>
                        <p
                          className={cm.cn(
                            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                          )}
                        >
                          {t('alerts.col.fired24h', {}, { defaultValue: 'Fires 24h' })}
                        </p>
                        <p
                          className={cm.cn(
                            'font-mono text-xs font-extrabold text-on-surface mt-0.5',
                          )}
                        >
                          {a.fire_count_24h}
                        </p>
                      </div>
                      <div className={cm.cn('hidden md:flex flex-wrap gap-1')}>
                        {a.channels.map((ch) => (
                          <span
                            key={ch}
                            className={cm.cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-medium',
                            )}
                            style={{
                              backgroundColor: 'var(--color-surface-container)',
                              color: 'var(--color-severity-trace-light)',
                            }}
                          >
                            <span
                              className={cm.cn('material-symbols-outlined text-[12px]')}
                              aria-hidden="true"
                            >
                              forum
                            </span>
                            {ch}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {showCreate ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="alerts-create-title"
          className={cm.cn('fixed inset-0 z-50 flex items-center justify-center px-4')}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-background) 65%, transparent)',
          }}
        >
          <form
            onSubmit={submitCreate}
            className={cm.cn('w-full max-w-md rounded-xl p-6 space-y-4')}
            style={{
              backgroundColor: 'var(--color-input-background)',
              border: '1px solid var(--color-border)',
            }}
          >
            <h2
              id="alerts-create-title"
              className={cm.cn('text-lg font-semibold tracking-tight text-on-surface')}
            >
              {t('alerts.create.title', {}, { defaultValue: 'New alert rule' })}
            </h2>
            <div>
              <label
                htmlFor="alerts-new-name"
                className={cm.cn(
                  'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono text-on-surface-variant',
                )}
              >
                {t('form.name', {}, { defaultValue: 'Name' })}
              </label>
              <input
                id="alerts-new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
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
                htmlFor="alerts-new-service"
                className={cm.cn(
                  'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono text-on-surface-variant',
                )}
              >
                {t('alerts.create.serviceLabel', {}, { defaultValue: 'Service' })}
              </label>
              <input
                id="alerts-new-service"
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
                htmlFor="alerts-new-severity"
                className={cm.cn(
                  'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono text-on-surface-variant',
                )}
              >
                {t('alerts.create.severityLabel', {}, { defaultValue: 'Severity' })}
              </label>
              <select
                id="alerts-new-severity"
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value as Severity)}
                className={cm.cn('w-full py-2.5 px-3 rounded-md font-mono text-sm')}
                style={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-severity-debug-light)',
                }}
              >
                <option value="fatal">fatal</option>
                <option value="error">error</option>
                <option value="warn">warn</option>
                <option value="info">info</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="alerts-new-condition"
                className={cm.cn(
                  'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono text-on-surface-variant',
                )}
              >
                {t('alerts.create.conditionLabel', {}, { defaultValue: 'Condition' })}
              </label>
              <input
                id="alerts-new-condition"
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                required
                placeholder={t(
                  'alerts.create.conditionPlaceholder',
                  {},
                  { defaultValue: 'rate(severity:error) > 5/min' },
                )}
                className={cm.cn('w-full py-2.5 px-3 rounded-md font-mono text-sm')}
                style={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-severity-debug-light)',
                }}
              />
            </div>
            {createError ? (
              <div className={cm.cn('text-sm text-error')}>
                {createError}{' '}
                {/maxAlerts|alert limit|Upgrade/i.test(createError) ? (
                  <button
                    type="button"
                    onClick={() => navigate('/pricing')}
                    className={cm.cn('underline font-bold')}
                    style={{ color: BRAND_COLOR }}
                  >
                    {t('alerts.create.upgradeLink', {}, { defaultValue: 'Upgrade plan' })}
                  </button>
                ) : null}
              </div>
            ) : null}
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
                disabled={
                  submitting || !newName.trim() || !newService.trim() || !newCondition.trim()
                }
                data-mol-id="alerts-create-submit"
                className={cm.cn(
                  'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed',
                )}
                style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-background)' }}
              >
                {submitting
                  ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                  : t('alerts.create.submit', {}, { defaultValue: 'Create rule' })}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
