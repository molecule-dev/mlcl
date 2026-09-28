import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapSingle } from '../lib/unwrap.js'

type ServiceStatus = 'operational' | 'degraded' | 'partial_outage' | 'major_outage'

interface Service {
  name: string
  status: ServiceStatus
  uptime_pct_90d: number
  uptime_history: number[] // 90 daily values, 0-1
}

interface Incident {
  id: string
  title: string
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved'
  started_at: string
  updates: { ts: string; status: string; body: string }[]
}

interface MaintenanceWindow {
  id: string
  title: string
  scheduled_for: string
  duration_minutes: number
  affected: string[]
}

interface StatusResponse {
  overall?: ServiceStatus | null
  services?: Service[] | null
  current_incident?: Incident | null
  scheduled_maintenance?: MaintenanceWindow[] | null
}

const STATUS_COLOR: Record<ServiceStatus, string> = {
  operational: 'bg-success/15 text-success',
  degraded: 'bg-warning/15 text-warning',
  partial_outage: 'bg-error/15 text-error',
  major_outage: 'bg-error text-on-primary',
}

const STATUS_LABEL_DEFAULT: Record<ServiceStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded performance',
  partial_outage: 'Partial outage',
  major_outage: 'Major outage',
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function Status() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [data, setData] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/reports/status')
      .then((res) => {
        if (!cancelled) setData(unwrapSingle<StatusResponse>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('status.loadError', {}, { defaultValue: 'Failed to load status.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  if (loading)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  if (error) return <div className={cm.cn(cm.sp('p', 8), 'text-error')}>{error}</div>
  const services = data?.services ?? []
  const overall: ServiceStatus = data?.overall ?? 'operational'
  const incident = data?.current_incident ?? null
  const maintenance = data?.scheduled_maintenance ?? []
  const statusLabel = (s: ServiceStatus): string =>
    t(`status.label.${s}`, {}, { defaultValue: STATUS_LABEL_DEFAULT[s] })

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.cn(cm.card(), cm.sp('p', 6), 'flex items-center justify-between')}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('status.heading', {}, { defaultValue: 'API status' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'status.subheading',
              { appName: APP_NAME },
              { defaultValue: 'Real-time status of every {{appName}} service.' },
            )}
          </p>
        </div>
        <span
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            cm.roundedFull,
            STATUS_COLOR[overall],
          )}
        >
          {statusLabel(overall)}
        </span>
      </header>

      {incident ? (
        <section
          className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-3', cm.accentCard({ tone: 'error' }))}
        >
          <header className={cm.flex({ align: 'center', justify: 'between' })}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-error')}>
              {incident.title}
            </h2>
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                cm.roundedFull,
                'bg-error/15 text-error uppercase',
              )}
            >
              {incident.status}
            </span>
          </header>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'status.incidentStarted',
              { when: fmtDate(incident.started_at) },
              { defaultValue: 'Started {{when}}' },
            )}
          </p>
          <ol className={cm.cn('space-y-2')}>
            {incident.updates.map((u, i) => (
              <li
                key={i}
                className={cm.cn(cm.textSize('sm'), 'border-l-2 border-outline-variant pl-3')}
              >
                <p>
                  <span className={cm.cn(cm.fontWeight('semibold'), 'uppercase')}>{u.status}</span>{' '}
                  · <span className={'text-on-surface-variant'}>{fmtDate(u.ts)}</span>
                </p>
                <p className={cm.sp('mt', 1)}>{u.body}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className={cm.cn(cm.card(), 'overflow-hidden')}>
        <header
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            'bg-surface-container border-b border-outline-variant',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wide',
            )}
          >
            {t('status.servicesHeading', {}, { defaultValue: 'Services' })}
          </h2>
        </header>
        {services.length === 0 ? (
          <p
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 4),
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            {t(
              'status.servicesEmpty',
              {},
              { defaultValue: 'All services nominal — no incident telemetry to report.' },
            )}
          </p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {services.map((s) => (
              <li key={s.name} className={cm.cn(cm.sp('px', 5), cm.sp('py', 4), 'space-y-2')}>
                <header className={cm.flex({ align: 'center', justify: 'between' })}>
                  <h3 className={cm.fontWeight('semibold')}>{s.name}</h3>
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                        'tabular-nums',
                      )}
                    >
                      {t(
                        'status.uptime90d',
                        { pct: s.uptime_pct_90d.toFixed(2) },
                        { defaultValue: '{{pct}}% 90d' },
                      )}
                    </span>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        cm.roundedFull,
                        STATUS_COLOR[s.status],
                      )}
                    >
                      {statusLabel(s.status)}
                    </span>
                  </div>
                </header>
                <div className={cm.cn('flex gap-px h-6')}>
                  {s.uptime_history.map((u, i) => {
                    const color =
                      u >= 0.999
                        ? 'var(--mol-color-success)'
                        : u >= 0.99
                          ? 'var(--mol-color-warning)'
                          : 'var(--mol-color-error)'
                    return (
                      <div
                        key={i}
                        className={cm.cn('flex-1 rounded-sm')}
                        style={{ backgroundColor: color }}
                        title={t(
                          'status.dayUptime',
                          { day: i + 1, pct: (u * 100).toFixed(2) },
                          { defaultValue: 'Day {{day}}: {{pct}}%' },
                        )}
                      />
                    )
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {maintenance.length > 0 ? (
        <section className={cm.cn(cm.card(), cm.sp('p', 6))}>
          <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
            {t('status.maintenanceHeading', {}, { defaultValue: 'Scheduled maintenance' })}
          </h2>
          <ul className={cm.cn('space-y-3')}>
            {maintenance.map((m) => (
              <li
                key={m.id}
                className={cm.cn(cm.sp('p', 4), 'border border-outline-variant rounded-md')}
              >
                <p className={cm.fontWeight('semibold')}>{m.title}</p>
                <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                  {fmtDate(m.scheduled_for)} · {m.duration_minutes}m · affects{' '}
                  {m.affected.join(', ')}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
