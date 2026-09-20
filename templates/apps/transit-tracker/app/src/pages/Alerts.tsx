import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type ServiceAlert, ServiceAlertCard } from '../components/ServiceAlertCard.js'

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
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/alerts${showAll ? '?all=1' : ''}`)
      .then((res) => {
        if (cancelled) return
        const data = (res as { data?: unknown }).data ?? res
        setAlerts(Array.isArray(data) ? (data as ServiceAlert[]) : [])
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
  }, [http, showAll, t])

  const severeCount = alerts.filter((a) => a.severity === 'severe').length

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
        <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-error')}>{error}</p>
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
