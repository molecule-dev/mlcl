import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { FleetAlert } from '../components/AlertHighlightCard.js'
import { AlertHighlightCard } from '../components/AlertHighlightCard.js'
import type { FleetDevice } from '../components/DeviceActivityFeed.js'
import { DeviceActivityFeed } from '../components/DeviceActivityFeed.js'
import { DeviceKpiCard, TelemetrySparkline } from '../components/DeviceKpiCard.js'
import { FleetTelemetryHero } from '../components/FleetTelemetryHero.js'
import type { FleetStats } from '../lib/types.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const EMPTY_STATS: FleetStats = {
  devices_total: 0,
  devices_online: 0,
  devices_warning: 0,
  devices_critical: 0,
  devices_offline: 0,
  active_alerts: 0,
  messages_per_min: 0,
  firmware_pending: 0,
}

function clampSignal(n: unknown): 0 | 1 | 2 | 3 | 4 | undefined {
  const num = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : undefined
  if (num === undefined) return undefined
  if (num <= 0) return 0
  if (num >= 4) return 4
  return num as 0 | 1 | 2 | 3 | 4
}

function normalizeDevice(raw: unknown): FleetDevice {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    id: String(r.id ?? ''),
    name: String(r.name ?? 'Unnamed device'),
    device_type: (r.device_type as FleetDevice['device_type']) ?? 'sensor',
    serial_number: r.serial_number ? String(r.serial_number) : undefined,
    firmware_version: r.firmware_version ? String(r.firmware_version) : undefined,
    status: (r.status as FleetDevice['status']) ?? 'offline',
    last_seen: r.last_seen ? String(r.last_seen) : undefined,
    signal: clampSignal(r.signal),
    metric_value: typeof r.metric_value === 'number' ? r.metric_value : undefined,
    metric_unit: r.metric_unit ? String(r.metric_unit) : undefined,
  }
}

function normalizeAlert(raw: unknown): FleetAlert {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    id: String(r.id ?? ''),
    device_id: r.device_id ? String(r.device_id) : '',
    device_name: r.device_name ? String(r.device_name) : '',
    type: r.type ? String(r.type) : '',
    message: String(r.message ?? ''),
    severity: (r.severity as FleetAlert['severity']) ?? 'info',
    created_at: r.created_at ? String(r.created_at) : new Date().toISOString(),
  }
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [stats, setStats] = useState<FleetStats>(EMPTY_STATS)
  const [devices, setDevices] = useState<FleetDevice[]>([])
  const [alerts, setAlerts] = useState<FleetAlert[]>([])
  const [throughput, setThroughput] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/reports/fleet').catch(() => null),
      http.get('/api/devices').catch(() => null),
      http.get('/api/alerts').catch(() => null),
      http.get('/api/reports/throughput').catch(() => null),
    ])
      .then(([s, d, a, tp]) => {
        if (cancelled) return
        const fleetStats = unwrapSingle<FleetStats>(s)
        setStats(fleetStats ?? EMPTY_STATS)
        const fetchedDevices = unwrapList<unknown>(d).map(normalizeDevice)
        setDevices(
          fetchedDevices
            .filter(
              (x) => x.status === 'warning' || x.status === 'critical' || x.status === 'online',
            )
            .slice(0, 8),
        )
        const fetchedAlerts = unwrapList<unknown>(a).map(normalizeAlert)
        setAlerts(fetchedAlerts.slice(0, 5))
        const tput = unwrapSingle<{ minutes?: Array<{ count: number }> }>(tp)
        if (tput?.minutes) {
          setThroughput(tput.minutes.slice(-7).map((m) => m.count))
        } else {
          setThroughput([])
        }
      })
      .catch(() => {
        if (!cancelled) setError(t('nav.failedToLoad', {}, { defaultValue: 'Failed to load.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )

  const s = stats

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header
        className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
      >
        <div>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
            {t('dashboard.heading', {}, { defaultValue: 'Fleet command' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'dashboard.subheading',
              {},
              { defaultValue: 'Real-time device telemetry, alerts, and command throughput.' },
            )}
          </p>
        </div>
      </header>

      <FleetTelemetryHero
        online={s.devices_online}
        warning={s.devices_warning}
        critical={s.devices_critical}
        messagesPerMin={s.messages_per_min}
      />

      <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 lg:grid-cols-4')}>
        <DeviceKpiCard
          label={t('dashboard.kpi.fleet', {}, { defaultValue: 'Devices in fleet' })}
          value={s.devices_total.toLocaleString()}
          accentColor="border-primary"
          decoration={<TelemetrySparkline color="#0891b2" values={throughput} />}
          meta={t(
            'dashboard.kpi.fleetMeta',
            { online: s.devices_online },
            { defaultValue: '{{online}} online' },
          )}
        />
        <DeviceKpiCard
          label={t('dashboard.kpi.throughput', {}, { defaultValue: 'Msgs / min' })}
          value={s.messages_per_min.toLocaleString()}
          accentColor="border-success"
          decoration={<TelemetrySparkline color="#10b981" values={throughput} />}
          meta={t('dashboard.kpi.throughputMeta', {}, { defaultValue: 'rolling 5 min' })}
        />
        <DeviceKpiCard
          label={t('dashboard.kpi.firmware', {}, { defaultValue: 'Firmware pending' })}
          value={`${s.firmware_pending}`}
          accentColor="border-secondary"
          meta={t('dashboard.kpi.firmwareMeta', {}, { defaultValue: 'rollouts in flight' })}
        />
        <DeviceKpiCard
          label={t('dashboard.kpi.alerts', {}, { defaultValue: 'Active alerts' })}
          value={`${s.active_alerts}`}
          accentColor={s.active_alerts > 0 ? 'border-error' : 'border-on-surface-variant'}
          valueTone={s.active_alerts > 0 ? 'text-error' : 'text-on-surface'}
          meta={
            s.active_alerts > 0
              ? t('dashboard.kpi.alertsMeta', {}, { defaultValue: 'needs attention' })
              : t('dashboard.kpi.allClear', {}, { defaultValue: 'all clear' })
          }
        />
      </section>

      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
        <div className={cm.cn('lg:col-span-2')}>
          <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
            <h2 className={cm.cn('text-xl font-bold')}>
              {t(
                'dashboard.activeDevicesHeading',
                {},
                { defaultValue: 'Active + flagged devices' },
              )}
            </h2>
            <Link to="/devices" className={cm.cn('text-sm font-bold text-primary hover:underline')}>
              {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
            </Link>
          </div>
          <p className={cm.cn('text-sm text-on-surface-variant mt-1 mb-4')}>
            {t(
              'dashboard.activeDevicesSubtitle',
              { count: devices.length },
              { defaultValue: '{{count}} devices reporting now' },
            )}
          </p>
          {devices.length > 0 ? (
            <DeviceActivityFeed devices={devices} />
          ) : (
            <div
              className={cm.cn(
                cm.sp('py', 12),
                cm.sp('px', 6),
                cm.textCenter,
                'rounded-2xl border border-dashed border-outline-variant text-on-surface-variant',
              )}
            >
              <p className={cm.cn('text-sm font-medium')}>
                {t('dashboard.noDevices', {}, { defaultValue: 'No devices yet.' })}
              </p>
              <p className={cm.cn('text-xs mt-1')}>
                {t(
                  'dashboard.noDevicesHint',
                  {},
                  { defaultValue: 'Register your first device to start streaming telemetry.' },
                )}
              </p>
              <Link
                to="/devices"
                className={cm.cn(
                  'inline-block mt-4 text-sm font-bold text-primary hover:underline',
                )}
              >
                {t('dashboard.registerCta', {}, { defaultValue: 'Register a device →' })}
              </Link>
            </div>
          )}
        </div>

        <aside>
          <h2 className={cm.cn('text-xl font-bold mb-4')}>
            {t('form.priority', {}, { defaultValue: 'Priority' })}
          </h2>
          {alerts.length > 0 ? (
            <AlertHighlightCard alerts={alerts} />
          ) : (
            <div
              className={cm.cn(
                cm.sp('py', 8),
                cm.sp('px', 4),
                cm.textCenter,
                'rounded-2xl border border-dashed border-outline-variant text-on-surface-variant',
              )}
            >
              <p className={cm.cn('text-sm font-medium')}>
                {t('dashboard.noAlerts', {}, { defaultValue: 'All clear.' })}
              </p>
              <p className={cm.cn('text-xs mt-1')}>
                {t(
                  'dashboard.noAlertsHint',
                  {},
                  { defaultValue: 'No active alerts. Thresholds will surface here.' },
                )}
              </p>
            </div>
          )}
        </aside>
      </section>
    </div>
  )
}
