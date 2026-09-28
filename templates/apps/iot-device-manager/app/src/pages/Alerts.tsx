import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { FleetAlert } from '../components/AlertHighlightCard.js'
import { unwrapList } from '../lib/unwrap.js'

type AlertStatus = 'open' | 'acknowledged' | 'resolved'

interface FleetAlertRow extends FleetAlert {
  status: AlertStatus
}

const SEVERITY_ORDER: Array<FleetAlert['severity'] | 'all'> = ['all', 'critical', 'warning', 'info']

const SEVERITY_ACCENT: Record<FleetAlert['severity'], 'error' | 'warning' | 'info'> = {
  critical: 'error',
  warning: 'warning',
  info: 'info',
}

const SEVERITY_TONE: Record<FleetAlert['severity'], string> = {
  critical: 'text-error',
  warning: 'text-warning',
  info: 'text-info',
}

const SEVERITY_PILL: Record<FleetAlert['severity'], string> = {
  critical: 'bg-error-container text-on-error-container',
  warning: 'bg-warning-container text-on-warning-container',
  info: 'bg-info-container text-on-info-container',
}

function normalizeAlert(row: Record<string, unknown>): FleetAlertRow {
  const sevRaw = String(row.severity ?? 'info').toLowerCase()
  const severity: FleetAlert['severity'] =
    sevRaw === 'critical' || sevRaw === 'error'
      ? 'critical'
      : sevRaw === 'warning'
        ? 'warning'
        : 'info'
  const statusRaw = String(row.status ?? 'open').toLowerCase()
  const status: AlertStatus =
    statusRaw === 'acknowledged' || statusRaw === 'resolved' ? statusRaw : 'open'
  return {
    id: String(row.id),
    device_id: row.device_id ? String(row.device_id) : '',
    device_name: row.device_name ? String(row.device_name) : '',
    type: String(row.type ?? 'manual'),
    message: String(row.message ?? ''),
    severity,
    created_at: String(row.created_at ?? new Date().toISOString()),
    status,
  }
}

export function Alerts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<FleetAlertRow[]>([])
  const [filter, setFilter] = useState<(typeof SEVERITY_ORDER)[number]>('all')
  const [showResolved, setShowResolved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await http.get('/api/alerts')
      const fetched = unwrapList<Record<string, unknown>>(res)
      setList(fetched.map(normalizeAlert))
    } catch (error) {
      logError('alerts.refresh', error)
      setList([])
    }
  }, [http])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    refresh().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [refresh])

  const updateStatus = useCallback(
    async (id: string, status: 'acknowledged' | 'resolved') => {
      if (busyId) return
      setBusyId(id)
      setFeedback(null)
      try {
        await http.put(`/api/alerts/${id}`, { status })
        void track({ name: `alert.${status}`, properties: { alert_id: id } })
        await refresh()
        setFeedback({
          kind: 'success',
          text:
            status === 'resolved'
              ? t('alerts.resolved', {}, { defaultValue: 'Alert resolved.' })
              : t('alerts.acked', {}, { defaultValue: 'Alert acknowledged.' }),
        })
      } catch (err) {
        setFeedback({
          kind: 'error',
          text:
            err instanceof Error
              ? err.message
              : t('common.failed', {}, { defaultValue: 'Failed.' }),
        })
      } finally {
        setBusyId(null)
      }
    },
    [busyId, http, refresh, t],
  )

  const evaluateNow = useCallback(async () => {
    setFeedback(null)
    try {
      const res = await http.post('/api/alerts/check', { offline_threshold_minutes: 10 })
      const data = (res as { data?: { created?: number } })?.data ?? (res as { created?: number })
      const created = Number(data?.created ?? 0)
      void track({ name: 'alert.check_run', properties: { alerts_created: created } })
      await refresh()
      setFeedback({
        kind: 'success',
        text: t(
          'alerts.evaluated',
          { count: created },
          { defaultValue: 'Evaluation complete · {{count}} new alert(s) created.' },
        ),
      })
    } catch (err) {
      setFeedback({
        kind: 'error',
        text:
          err instanceof Error ? err.message : t('common.failed', {}, { defaultValue: 'Failed.' }),
      })
    }
  }, [http, refresh, t])

  const visible = useMemo(() => {
    return list.filter((a) => {
      if (!showResolved && a.status === 'resolved') return false
      if (filter !== 'all' && a.severity !== filter) return false
      return true
    })
  }, [list, filter, showResolved])

  const counts = useMemo(
    () => ({
      critical: list.filter((a) => a.severity === 'critical' && a.status !== 'resolved').length,
      warning: list.filter((a) => a.severity === 'warning' && a.status !== 'resolved').length,
      info: list.filter((a) => a.severity === 'info' && a.status !== 'resolved').length,
    }),
    [list],
  )

  if (loading) {
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }

  const activeCount = list.filter((a) => a.status !== 'resolved').length

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header
        className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
      >
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>
            {t('nav.alerts', {}, { defaultValue: 'Alerts' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'alerts.subheading',
              { count: activeCount },
              { defaultValue: '{{count}} active across the fleet · escalated by severity' },
            )}
          </p>
        </div>
        <div className={cm.flex({ gap: 'sm', align: 'center', wrap: 'wrap' })}>
          <button
            type="button"
            onClick={() => setShowResolved((s) => !s)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('xs'),
              'font-bold uppercase tracking-widest rounded-full bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:bg-surface-container-low',
            )}
            aria-pressed={showResolved}
          >
            {showResolved
              ? t('alerts.hideResolved', {}, { defaultValue: 'Hide resolved' })
              : t('alerts.showResolved', {}, { defaultValue: 'Show resolved' })}
          </button>
          <button
            type="button"
            onClick={evaluateNow}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('xs'),
              'font-bold uppercase tracking-widest rounded-full text-white hover:opacity-90 transition-opacity',
            )}
            style={{
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
            }}
          >
            {t('alerts.evaluateNow', {}, { defaultValue: 'Run offline check' })}
          </button>
        </div>
      </header>

      {feedback && (
        <div
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            'rounded-lg text-sm font-medium border',
            feedback.kind === 'success'
              ? 'bg-success-container text-on-success-container border-success'
              : 'bg-error-container text-on-error-container border-error',
          )}
        >
          {feedback.text}
        </div>
      )}

      <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
        <nav className={cm.flex({ gap: 'xs', align: 'center', wrap: 'wrap' })}>
          {SEVERITY_ORDER.map((s) => {
            const active = filter === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  'font-bold uppercase tracking-widest rounded-full',
                  active
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:bg-surface-container-low',
                )}
                aria-pressed={active}
                data-mol-id={`alerts-filter-${s}`}
              >
                {t(`alerts.filter.${s}`, {}, { defaultValue: s })}
                {s !== 'all' && (
                  <span
                    className={cm.cn(
                      'ml-2 font-mono tabular-nums',
                      active ? 'text-on-primary' : 'text-on-surface-variant',
                    )}
                  >
                    {counts[s]}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {visible.length === 0 ? (
        <p
          className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant text-sm')}
          data-mol-id="alerts-empty"
        >
          {list.length === 0
            ? t('alerts.empty', {}, { defaultValue: 'No alerts. All devices are healthy.' })
            : t(
                'alerts.emptyForFilter',
                {},
                { defaultValue: 'No alerts match the current filter.' },
              )}
        </p>
      ) : (
        <ul className={cm.cn('space-y-3')} data-mol-id="alerts-list">
          {visible.map((a) => (
            <li key={a.id} data-mol-id={`alerts-row-${a.id}`}>
              <div
                className={cm.cn(
                  cm.sp('p', 5),
                  'flex items-center gap-4 bg-surface-container-lowest rounded-xl shadow-sm',
                  cm.accentCard({ tone: SEVERITY_ACCENT[a.severity] }),
                  a.status === 'resolved' && 'opacity-60',
                )}
              >
                <Link
                  to={a.device_id ? `/devices/${a.device_id}` : '/alerts'}
                  className={cm.cn(
                    'flex items-center gap-4 flex-1 min-w-0 hover:opacity-90 transition-opacity',
                  )}
                  aria-label={t(
                    'alerts.viewDeviceAria',
                    { message: a.message },
                    { defaultValue: 'View device for alert: {{message}}' },
                  )}
                >
                  <div className={cm.cn('shrink-0')}>
                    <span
                      className={cm.cn(
                        'material-symbols-outlined text-3xl',
                        SEVERITY_TONE[a.severity],
                      )}
                      aria-hidden="true"
                    >
                      {a.severity === 'critical'
                        ? 'error'
                        : a.severity === 'warning'
                          ? 'warning'
                          : 'info'}
                    </span>
                  </div>
                  <div className={cm.cn('flex-1 min-w-0')}>
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span
                        className={cm.cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest',
                          SEVERITY_PILL[a.severity],
                        )}
                      >
                        {t(`alerts.filter.${a.severity}`, {}, { defaultValue: a.severity })}
                      </span>
                      <span
                        className={cm.cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest',
                          a.status === 'resolved'
                            ? 'bg-success-container text-on-success-container'
                            : a.status === 'acknowledged'
                              ? 'bg-info-container text-on-info-container'
                              : 'bg-warning-container text-on-warning-container',
                        )}
                        data-mol-id={`alerts-status-${a.id}`}
                      >
                        {t(`alerts.status.${a.status}`, {}, { defaultValue: a.status })}
                      </span>
                      <span className={cm.cn('text-[10px] font-mono text-on-surface-variant')}>
                        {a.device_name}
                      </span>
                      <span className={cm.cn('text-[10px] text-on-surface-variant')}>·</span>
                      <span className={cm.cn('text-[10px] font-mono text-on-surface-variant')}>
                        {a.type}
                      </span>
                    </div>
                    <p className={cm.cn('text-sm font-semibold mt-1 text-on-surface line-clamp-2')}>
                      {a.message}
                    </p>
                  </div>
                </Link>
                <div className={cm.cn('shrink-0 text-right')}>
                  <span
                    className={cm.cn(
                      'block text-[10px] font-mono text-on-surface-variant tabular-nums',
                    )}
                  >
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                  <div className={cm.flex({ gap: 'xs', justify: 'end', align: 'center' })}>
                    {a.status === 'open' && (
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={() => updateStatus(a.id, 'acknowledged')}
                        className={cm.cn(
                          'mt-2 text-[10px] font-bold uppercase tracking-widest text-info hover:underline disabled:opacity-50',
                        )}
                        data-mol-id={`alerts-ack-${a.id}`}
                      >
                        {t('alerts.acknowledge', {}, { defaultValue: 'Acknowledge' })}
                      </button>
                    )}
                    {a.status !== 'resolved' && (
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={() => updateStatus(a.id, 'resolved')}
                        className={cm.cn(
                          'mt-2 text-[10px] font-bold uppercase tracking-widest text-success hover:underline disabled:opacity-50',
                        )}
                        data-mol-id={`alerts-resolve-${a.id}`}
                      >
                        {t('alerts.resolve', {}, { defaultValue: 'Resolve' })}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
