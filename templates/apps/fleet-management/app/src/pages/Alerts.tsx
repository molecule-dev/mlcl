import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Alert {
  id: string
  vehicle_id: string
  vehicle_plate: string
  driver: string
  type:
    | 'speeding'
    | 'hard_brake'
    | 'idle_threshold'
    | 'geofence_breach'
    | 'low_fuel'
    | 'maintenance_due'
  message: string
  severity: 'low' | 'medium' | 'high'
  created_at: string
  resolved: boolean
}

const FILTERS = ['unresolved', 'high', 'all', 'resolved'] as const
type Filter = (typeof FILTERS)[number]

const SEVERITY_COLOR: Record<Alert['severity'], string> = {
  low: 'bg-info-container text-on-info-container',
  medium: 'bg-warning-container text-on-warning-container',
  high: 'bg-error-container text-on-error-container',
}

const TYPE_ICON: Record<Alert['type'], string> = {
  speeding: 'speed',
  hard_brake: 'warning',
  idle_threshold: 'schedule',
  geofence_breach: 'fence',
  low_fuel: 'local_gas_station',
  maintenance_due: 'build',
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
      .get('/alerts')
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

  const [pending, setPending] = useState<Set<string>>(new Set())

  const acknowledge = async (alert: Alert) => {
    setPending((p) => new Set(p).add(alert.id))
    setList((curr) => curr.map((a) => (a.id === alert.id ? { ...a, resolved: true } : a)))
    try {
      await http.post(`/alerts/${alert.id}/acknowledge`, {})
      void track({
        name: 'alert.acknowledged',
        properties: { alert_id: alert.id, severity: alert.severity },
      })
    } catch (err) {
      setList((curr) => curr.map((a) => (a.id === alert.id ? { ...a, resolved: false } : a)))
      setError(
        err instanceof Error
          ? err.message
          : t('alerts.acknowledgeError', {}, { defaultValue: 'Failed to acknowledge.' }),
      )
    } finally {
      setPending((p) => {
        const next = new Set(p)
        next.delete(alert.id)
        return next
      })
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
        className={cm.cn(cm.flex({ gap: 'xs', align: 'center' }), 'flex-wrap')}
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
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('alerts.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : visible.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('alerts.empty', {}, { defaultValue: 'No alerts. Fleet running smooth.' })}
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
                <div className={cm.flex({ align: 'start', gap: 'md' })}>
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
                    <div className={cm.flex({ align: 'baseline', gap: 'sm' })}>
                      <Link
                        to={`/vehicles/${a.vehicle_id}`}
                        className={cm.cn(cm.textSize('xs'), 'font-mono', 'text-on-surface-variant')}
                      >
                        {a.vehicle_plate}
                      </Link>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>·</span>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {a.driver}
                      </span>
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
                  </div>
                  {!a.resolved && (
                    <button
                      type="button"
                      onClick={() => acknowledge(a)}
                      disabled={pending.has(a.id)}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'border border-outline-variant rounded shrink-0 disabled:opacity-50',
                      )}
                    >
                      {pending.has(a.id)
                        ? t('alerts.acknowledging', {}, { defaultValue: 'Acknowledging…' })
                        : t('alerts.acknowledgeLabel', {}, { defaultValue: 'Acknowledge' })}
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
