import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LineBadge, type LineBadgeLine } from '../components/LineBadge.js'
import { type ServiceAlert, ServiceAlertCard } from '../components/ServiceAlertCard.js'

interface LineRow extends LineBadgeLine {
  stops?: string[]
}

/**
 * Service alerts: active-by-default list (line-specific + system-wide),
 * with an "include resolved" toggle for the audit view. Severity order is
 * preserved server-side (starts_at desc); the page is presentation-only.
 */
export function Alerts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [alerts, setAlerts] = useState<ServiceAlert[]>([])
  const [lines, setLines] = useState<LineRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/api/alerts${showAll ? '?all=1' : ''}`),
      // Corridor matrix needs the line roster; failure is non-fatal.
      http.get('/api/network/lines').catch(() => ({ data: [] as LineRow[] })),
    ])
      .then(([alertsRes, linesRes]) => {
        if (cancelled) return
        const alertData = (alertsRes as { data?: unknown }).data ?? alertsRes
        setAlerts(Array.isArray(alertData) ? (alertData as ServiceAlert[]) : [])
        const lineData = (linesRes as { data?: unknown }).data ?? linesRes
        setLines(Array.isArray(lineData) ? (lineData as LineRow[]) : [])
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        console.error('[Alerts] load failed:', err)
        setError(
          t('alerts.error', {}, { defaultValue: 'Could not load alerts. Please try again.' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, showAll, t, nonce])

  const severeCount = alerts.filter((a) => a.severity === 'severe').length

  // Corridor status matrix: each line's worst active alert decides its
  // status; lines with no alert run normally.
  const corridorStatus = (lineCode: string): 'severe' | 'warning' | 'normal' => {
    if (alerts.some((a) => a.line_code === lineCode && a.severity === 'severe')) return 'severe'
    if (alerts.some((a) => a.line_code === lineCode && a.severity === 'warning')) return 'warning'
    return 'normal'
  }

  // Design's dispatch log: the active alerts re-presented as an operations
  // timeline (most recent first, as the API already orders them).
  const dispatchLog = alerts.slice(0, 6)

  return (
    <div className={cm.cn(cm.maxW('3xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header
        className={cm.cn(
          cm.flex({ align: 'start', justify: 'between', gap: 'md', wrap: 'wrap' }),
          cm.sp('mb', 6),
        )}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.25em] text-primary',
            )}
          >
            {t('alerts.eyebrow', {}, { defaultValue: 'Service status' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('bold'),
              'leading-tight tracking-tight',
            )}
          >
            {t('alerts.title', {}, { defaultValue: 'Service alerts' })}
          </h1>
          <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {severeCount > 0
              ? t(
                  'alerts.severeSummary',
                  { count: severeCount },
                  { defaultValue: '{{count}} severe disruption(s) right now' },
                )
              : t('alerts.allClear', {}, { defaultValue: 'No severe disruptions reported.' })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          data-mol-id="alerts-show-all"
          aria-pressed={showAll}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest rounded-full transition-colors',
            showAll
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
          )}
        >
          {showAll
            ? t('alerts.showActiveOnly', {}, { defaultValue: 'Active only' })
            : t('alerts.showAll', {}, { defaultValue: 'Include resolved' })}
        </button>
      </header>

      {error ? (
        <div className={cm.cn(cm.sp('py', 8), cm.textCenter)}>
          <p className={'text-error'}>{error}</p>
          <button
            type="button"
            onClick={() => setNonce((n) => n + 1)}
            className={cm.cn(
              cm.sp('mt', 3),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-lg text-primary hover:bg-primary/10 transition-colors',
            )}
          >
            {t('common.retry', {}, { defaultValue: 'Retry' })}
          </button>
        </div>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('alerts.loading', {}, { defaultValue: 'Loading alerts…' })}
        </p>
      ) : alerts.length === 0 ? (
        <p
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 12),
            cm.textCenter,
            'rounded-xl bg-surface-container-low text-on-surface-variant ring-1 ring-outline-variant/40',
          )}
        >
          {showAll
            ? t('alerts.noneAny', {}, { defaultValue: 'No alerts on record.' })
            : t(
                'alerts.noneActive',
                {},
                { defaultValue: 'No active alerts — service is running as scheduled.' },
              )}
        </p>
      ) : (
        <div className={cm.flex({ direction: 'col', gap: 'md' })}>
          {alerts.map((alert) => (
            <ServiceAlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}

      {/* Design's "Corridor Status Matrix" — every line with its worst
          active alert folded into one status. */}
      {lines.length > 0 ? (
        <section data-mol-id="alerts-corridor-matrix" className={cm.sp('mt', 10)}>
          <div
            className={cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' })}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {t('alerts.corridorHeading', {}, { defaultValue: 'Corridor status matrix' })}
            </h2>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant tabular-nums',
              )}
            >
              {t(
                'alerts.corridorCount',
                { active: lines.length, total: lines.length },
                { defaultValue: '{{active}} of {{total}} lines' },
              )}
            </span>
          </div>
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('mt', 3))}>
            {lines.map((line) => {
              const status = corridorStatus(line.code)
              const statusColor =
                status === 'severe'
                  ? 'var(--color-severe)'
                  : status === 'warning'
                    ? 'var(--color-warning)'
                    : 'var(--color-live)'
              return (
                <li
                  key={line.code}
                  data-mol-id={`alerts-corridor-${line.code}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'bg-surface rounded-xl ring-1 ring-outline-variant/40',
                  )}
                >
                  <LineBadge line={line} size="sm" />
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {line.name}
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'ml-auto inline-flex items-center gap-1.5 uppercase tracking-widest',
                    )}
                    style={{ color: statusColor }}
                  >
                    <span
                      className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull)}
                      style={{ backgroundColor: statusColor }}
                      aria-hidden="true"
                    />
                    {status === 'normal'
                      ? t('alerts.corridorNormal', {}, { defaultValue: 'Normal service' })
                      : status === 'warning'
                        ? t('alerts.corridorWarning', {}, { defaultValue: 'Delay buffer' })
                        : t('alerts.corridorSevere', {}, { defaultValue: 'Disruption' })}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {/* Design's "Commuter Alert Dispatch" — how the alerts above reach the
          rider. Delivery toggles live in Settings → Preferences. */}
      <section
        data-mol-id="alerts-dispatch"
        className={cm.cn(
          cm.sp('p', 5),
          cm.sp('mt', 10),
          'bg-surface-container-low rounded-2xl ring-1 ring-outline-variant/40',
        )}
      >
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              'shrink-0 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20',
            )}
            aria-hidden="true"
          >
            <span className="material-symbols-outlined text-xl">tune</span>
          </span>
          <div className="min-w-0">
            <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
              {t('alerts.dispatchHeading', {}, { defaultValue: 'Commuter alert dispatch' })}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mt', 1),
                'text-on-surface-variant leading-relaxed',
              )}
            >
              {t(
                'alerts.dispatchBody',
                {},
                {
                  defaultValue:
                    'Delay alerts ride the same channel as the board clock: disruption and departure reminders are dispatched the moment a corridor status changes. Choose which alerts reach you in Preferences.',
                },
              )}
            </p>
          </div>
        </div>
        <Link
          to="/settings"
          data-mol-id="alerts-dispatch-settings"
          className={cm.cn(
            'inline-block',
            cm.sp('mt', 4),
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-full bg-primary text-on-primary hover:bg-primary-dark transition-colors',
          )}
        >
          {t('alerts.dispatchSettingsCta', {}, { defaultValue: 'Alert preferences' })}
        </Link>
      </section>

      {/* Design's "AMTA Operations Dispatch Log" — the active alerts rendered
          as the operations timeline they are. */}
      {dispatchLog.length > 0 ? (
        <section data-mol-id="alerts-dispatch-log" className={cm.sp('mt', 10)}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('alerts.logHeading', {}, { defaultValue: 'AMTA operations dispatch log' })}
          </h2>
          <ol className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.sp('mt', 3))}>
            {dispatchLog.map((alert) => (
              <li
                key={alert.id}
                data-mol-id={`alerts-log-${alert.id}`}
                className={cm.cn(
                  cm.flex({ align: 'start', gap: 'sm' }),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'bg-surface rounded-xl ring-1 ring-outline-variant/40',
                )}
              >
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'shrink-0 tabular-nums uppercase tracking-widest text-on-surface-variant',
                    cm.sp('mt', 0.5),
                  )}
                >
                  {new Date(alert.starts_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span
                  className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'shrink-0', cm.sp('mt', 1.5))}
                  style={{
                    backgroundColor:
                      alert.severity === 'severe'
                        ? 'var(--color-severe)'
                        : alert.severity === 'warning'
                          ? 'var(--color-warning)'
                          : 'var(--color-secondary)',
                  }}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {alert.line ? `${alert.line.code} · ` : ''}
                    {alert.title}
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'block text-on-surface-variant leading-relaxed',
                    )}
                  >
                    {t(
                      'alerts.logEntry',
                      { severity: alert.severity },
                      { defaultValue: '{{severity}} · dispatched to corridor boards' },
                    )}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 8), 'text-on-surface-variant')}>
        {t(
          'alerts.plannerNote',
          {},
          { defaultValue: 'The trip planner already accounts for scheduled changes.' },
        )}{' '}
        <Link to="/plan" className={'text-primary font-semibold hover:underline'}>
          {t('nav.plan', {}, { defaultValue: 'Plan a trip' })}
        </Link>
      </p>
    </div>
  )
}
