import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AlertsHighlightCard } from '../components/AlertsHighlightCard.js'
import { BearingKpiCard, MiniSparkline } from '../components/BearingKpiCard.js'
import { FleetCommandHero } from '../components/FleetCommandHero.js'
import { VehicleActivityFeed } from '../components/VehicleActivityFeed.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface FleetStats {
  vehicles_total: number
  vehicles_in_transit: number
  vehicles_idle: number
  vehicles_alert: number
  vehicles_offline: number
  drivers_active: number
  miles_today: number
  fuel_used_today: number
  active_alerts: number
}

interface Vehicle {
  id: string
  plate: string
  driver: string | null
  status: 'operational' | 'in_transit' | 'idle' | 'alert' | 'offline'
  location: string
  speed_mph: number
  fuel_pct?: number
}

interface Alert {
  id: string
  vehicle_id: string
  vehicle_plate: string
  driver?: string
  type: string
  message: string
  severity: 'low' | 'medium' | 'high'
  created_at: string
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [stats, setStats] = useState<FleetStats | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [dailyMiles, setDailyMiles] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/reports/fleet').catch(() => null),
      http.get('/vehicles').catch(() => null),
      http.get('/alerts').catch(() => null),
      http.get('/reports/analytics').catch(() => null),
    ])
      .then(([s, v, a, an]) => {
        if (cancelled) return
        setStats(unwrapSingle<FleetStats>(s))
        setVehicles(
          unwrapList<Vehicle>(v)
            .filter((v) => v.status === 'in_transit' || v.status === 'alert' || v.status === 'idle')
            .slice(0, 8),
        )
        setAlerts(
          unwrapList<Alert>(a)
            .filter((a) => !(a as unknown as { resolved?: boolean }).resolved)
            .slice(0, 5),
        )
        const analytics = unwrapSingle<{ daily_miles?: Array<{ miles: number }> }>(an)
        if (analytics?.daily_miles) {
          setDailyMiles(analytics.daily_miles.slice(-7).map((d) => d.miles))
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
              { defaultValue: 'Real-time fleet status, alerts, and on-the-road performance.' },
            )}
          </p>
        </div>
      </header>

      {/* Command-bar hero */}
      <FleetCommandHero
        inTransit={stats?.vehicles_in_transit ?? 0}
        idle={stats?.vehicles_idle ?? 0}
        alerts={stats?.active_alerts ?? 0}
        milesToday={stats?.miles_today ?? 0}
      />

      {/* KPI row — CRM-pattern accent-bar cards */}
      <section className={cm.grid({ cols: 4, gap: 'md' })}>
        <BearingKpiCard
          label={t('dashboard.kpi.fleet', {}, { defaultValue: 'Active fleet' })}
          value={`${stats?.vehicles_total ?? 0}`}
          accentColor="border-primary"
          decoration={<MiniSparkline color="#0891b2" values={dailyMiles} />}
          meta={t(
            'dashboard.kpi.fleetMeta',
            { active: stats?.vehicles_total ?? 0 },
            { defaultValue: '{{active}} active' },
          )}
        />
        <BearingKpiCard
          label={t('dashboard.kpi.miles', {}, { defaultValue: 'Miles today' })}
          value={(stats?.miles_today ?? 0).toLocaleString()}
          accentColor="border-success"
          decoration={<MiniSparkline color="#10b981" values={dailyMiles} />}
          meta={t('dashboard.kpi.milesMeta', {}, { defaultValue: 'vs 7d avg' })}
        />
        <BearingKpiCard
          label={t('dashboard.kpi.drivers', {}, { defaultValue: 'Drivers on duty' })}
          value={`${stats?.drivers_active ?? 0}`}
          accentColor="border-info"
          meta={t('dashboard.kpi.driversMeta', {}, { defaultValue: 'currently logged' })}
        />
        <BearingKpiCard
          label={t('dashboard.kpi.alerts', {}, { defaultValue: 'Active alerts' })}
          value={`${stats?.active_alerts ?? 0}`}
          accentColor={
            (stats?.active_alerts ?? 0) > 0 ? 'border-error' : 'border-on-surface-variant'
          }
          valueTone={(stats?.active_alerts ?? 0) > 0 ? 'text-error' : 'text-on-surface'}
          meta={
            (stats?.active_alerts ?? 0) > 0
              ? t('dashboard.kpi.alertsMeta', {}, { defaultValue: 'needs attention' })
              : t('dashboard.kpi.allClear', {}, { defaultValue: 'all clear' })
          }
        />
      </section>

      {/* 2/3 + 1/3 row: vehicle feed + alerts highlight */}
      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
        <div className={'lg:col-span-2'}>
          <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
            <h2 className={'text-xl font-bold'}>
              {t('dashboard.activeVehiclesHeading', {}, { defaultValue: 'In transit + flagged' })}
            </h2>
            <Link
              to="/vehicles"
              className={cm.cn(
                'text-sm font-bold text-primary hover:underline',
                'inline-flex items-center min-h-[32px]',
              )}
            >
              {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
            </Link>
          </div>
          <p className={'text-sm text-on-surface-variant mt-1 mb-4'}>
            {t(
              'dashboard.activeVehiclesSubtitle',
              { count: vehicles.length },
              { defaultValue: '{{count}} vehicles need attention or are en route' },
            )}
          </p>
          <VehicleActivityFeed vehicles={vehicles} />
        </div>

        <aside>
          <h2 className={'text-xl font-bold mb-4'}>
            {t('form.priority', {}, { defaultValue: 'Priority' })}
          </h2>
          <AlertsHighlightCard alerts={alerts} />
        </aside>
      </section>
    </div>
  )
}
