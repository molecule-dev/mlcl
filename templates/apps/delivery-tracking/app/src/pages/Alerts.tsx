import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { unwrapList } from '../lib/unwrap.js'

interface Alert {
  id: string
  shipment_id: string
  tracking_number: string
  customer: string
  type:
    | 'customs_hold'
    | 'delivery_attempt'
    | 'address_issue'
    | 'weather_delay'
    | 'damaged'
    | 'webhook_failure'
    | 'exception_alert'
    | 'system_message'
  message: string
  severity: 'low' | 'medium' | 'high'
  created_at: string
  resolved: boolean
  assigned_to: string | null
}

const FILTERS = ['unresolved', 'high', 'all', 'resolved'] as const
type Filter = (typeof FILTERS)[number]

const SEVERITY_COLOR: Record<Alert['severity'], string> = {
  low: 'bg-info-container text-on-info-container',
  medium: 'bg-warning-container text-on-warning-container',
  high: 'bg-error-container text-on-error-container',
}

// Keep in sync with the API's KNOWN_TYPES set (api/src/lib/decorate.ts) —
// unknown types are normalized to 'system_message' server-side.
const TYPE_ICON: Record<Alert['type'], string> = {
  customs_hold: 'gavel',
  delivery_attempt: 'doorbell',
  address_issue: 'wrong_location',
  weather_delay: 'storm',
  damaged: 'broken_image',
  webhook_failure: 'webhook',
  exception_alert: 'error',
  system_message: 'info',
}

export function Alerts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<Alert[]>([])
  const [filter, setFilter] = useState<Filter>('unresolved')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/alerts')
      .then((res) => {
        if (!cancelled) setList(unwrapList<Alert>(res))
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

  const visible = list.filter((a) => {
    if (filter === 'unresolved') return !a.resolved
    if (filter === 'resolved') return a.resolved
    if (filter === 'high') return a.severity === 'high'
    return true
  })

  const acknowledge = async (alert: Alert) => {
    setList((curr) => curr.map((a) => (a.id === alert.id ? { ...a, resolved: true } : a)))
    track({
      name: 'alert.acknowledged',
      properties: { alert_id: alert.id, shipment_id: alert.shipment_id, severity: alert.severity },
    })
    try {
      await http.patch(`/api/alerts/${alert.id}/read`, { read: true })
    } catch (error) {
      logError('alerts.acknowledge', error)
      setList((curr) => curr.map((a) => (a.id === alert.id ? { ...a, resolved: false } : a)))
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('nav.alerts', {}, { defaultValue: 'Alerts' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'alerts.subheading',
            { count: visible.length, total: list.length },
            { defaultValue: '{{count}} of {{total}} alerts' },
          )}
        </p>
      </header>

      <nav
        aria-label={t('alerts.filterLabel', {}, { defaultValue: 'Filter alerts' })}
        className={cm.flex({ gap: 'xs', align: 'center' })}
      >
        {FILTERS.map((f) => {
          const active = filter === f
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'rounded-full',
                // 40px hit target on touch; compact on pointer devices.
                'inline-flex items-center justify-center min-h-10 md:min-h-0',
                active
                  ? 'bg-primary text-on-primary'
                  : cm.cn('bg-surface border border-outline-variant', 'text-on-surface-variant'),
              )}
              aria-pressed={active}
            >
              {t(
                `alerts.filter.${f}`,
                {},
                { defaultValue: f.charAt(0).toUpperCase() + f.slice(1) },
              )}
            </button>
          )
        })}
      </nav>

      {error ? (
        <LoadErrorBanner
          message={error}
          retryLabel={t('common.retry', {}, { defaultValue: 'Retry' })}
          retryMolId="button-retry-alerts"
          onRetry={() => {
            setLoading(true)
            return http
              .get('/api/alerts')
              .then((res) => {
                setList(unwrapList<Alert>(res))
                setError(null)
              })
              .catch(() =>
                setError(t('alerts.loadError', {}, { defaultValue: 'Failed to load alerts.' })),
              )
              .finally(() => setLoading(false))
          }}
        />
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('alerts.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : visible.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('alerts.empty', {}, { defaultValue: 'No alerts. All clear.' })}
        </p>
      ) : (
        <ul className={'space-y-2'}>
          {visible.map((a) => (
            <li key={a.id}>
              <article
                className={cm.cn(
                  cm.card(),
                  cm.sp('p', 5),
                  'space-y-3',
                  a.resolved ? 'opacity-60' : '',
                )}
              >
                {/* Stack icon / content / action vertically below sm — the
                    one-row layout overlaps its own text at 390px. */}
                <div
                  className={cm.cn(cm.flex({ align: 'start', gap: 'md' }), 'flex-col sm:flex-row')}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.h(10),
                      cm.w(10),
                      'rounded shrink-0',
                      SEVERITY_COLOR[a.severity],
                    )}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {TYPE_ICON[a.type]}
                    </span>
                  </div>
                  <div className={cm.cn(cm.flex1, 'min-w-0')}>
                    {/* Wrap so the timestamp drops to its own line instead of
                        overlapping the acknowledge button on narrow screens. */}
                    <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }), 'flex-wrap')}>
                      <Link
                        to={`/shipments/${a.shipment_id}`}
                        className={cm.cn(cm.textSize('xs'), 'font-mono', 'text-on-surface-variant')}
                      >
                        {a.tracking_number || '—'}
                      </Link>
                      <span
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          'rounded',
                          SEVERITY_COLOR[a.severity],
                        )}
                      >
                        {t(`alerts.severity.${a.severity}`, {}, { defaultValue: a.severity })}
                      </span>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant',
                          'ml-auto',
                          'font-mono',
                        )}
                      >
                        {new Date(a.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        cm.sp('mt', 1),
                      )}
                    >
                      {a.message}
                    </p>
                    {/* System alerts have no customer — don't render a bare label. */}
                    {a.customer || a.assigned_to ? (
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant',
                          cm.sp('mt', 1),
                        )}
                      >
                        {a.customer
                          ? t(
                              'alerts.customerLabel',
                              { customer: a.customer },
                              { defaultValue: 'Customer: {{customer}}' },
                            )
                          : ''}
                        {a.customer && a.assigned_to ? ' · ' : ''}
                        {a.assigned_to
                          ? t(
                              'alerts.assignedLabel',
                              { who: a.assigned_to },
                              { defaultValue: 'assigned to {{who}}' },
                            )
                          : ''}
                      </p>
                    ) : null}
                  </div>
                  {!a.resolved && (
                    <button
                      type="button"
                      data-mol-id={`button-acknowledge-${a.id}`}
                      onClick={() => acknowledge(a)}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'border border-outline-variant rounded',
                        'self-start sm:shrink-0',
                        'inline-flex items-center justify-center min-h-10 md:min-h-0',
                      )}
                    >
                      {t('alerts.acknowledgeLabel', {}, { defaultValue: 'Acknowledge' })}
                    </button>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
