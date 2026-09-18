import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DriverStatusCard, MiniSparkline } from '../components/DriverStatusCard.js'
import { EtaCountdown } from '../components/EtaCountdown.js'
import { OrdersFeed } from '../components/OrdersFeed.js'
import { OrderTrackingHero } from '../components/OrderTrackingHero.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface DashboardStats {
  in_transit: number
  in_transit_change_pct: number
  delivered_today: number
  delivered_today_change_pct: number
  exception_rate: number
  on_time_rate: number
  active_carriers: number
}

interface Shipment {
  id: string
  tracking_number: string
  carrier: string
  status: 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception'
  origin_city: string
  origin_state: string
  destination_city: string
  destination_state: string
  customer: string
  service_level: string
  eta: string
  shipped_at: string
}

interface Alert {
  id: string
  shipment_id: string
  tracking_number: string
  customer: string
  type: string
  message: string
  severity: 'low' | 'medium' | 'high'
  created_at: string
  resolved: boolean
  assigned_to?: string | null
}

interface Analytics {
  daily_volume?: Array<{ date: string; volume: number; on_time_volume: number }>
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [dailyVolume, setDailyVolume] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/reports/dashboard').catch(() => null),
      http.get('/api/shipments').catch(() => null),
      http.get('/api/alerts').catch(() => null),
      http.get('/api/reports/analytics').catch(() => null),
    ])
      .then(([s, sh, a, an]) => {
        if (cancelled) return
        setStats(unwrapSingle<DashboardStats>(s))
        const allShipments = unwrapList<Shipment>(sh)
        setShipments(
          allShipments
            .filter(
              (s) =>
                s.status === 'in_transit' ||
                s.status === 'out_for_delivery' ||
                s.status === 'exception',
            )
            .slice(0, 8),
        )
        setAlerts(
          unwrapList<Alert>(a)
            .filter((al) => !al.resolved)
            .slice(0, 5),
        )
        const analytics = unwrapSingle<Analytics>(an)
        if (analytics?.daily_volume) {
          setDailyVolume(analytics.daily_volume.slice(-7).map((d) => d.volume))
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
            {t('dashboard.heading', {}, { defaultValue: 'Operations dashboard' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'dashboard.subheading',
              {},
              { defaultValue: 'Live shipment status, exception alerts, and on-time performance.' },
            )}
          </p>
        </div>
      </header>

      <OrderTrackingHero
        inTransit={stats?.in_transit ?? 0}
        inTransitChangePct={stats?.in_transit_change_pct ?? 0}
        deliveredToday={stats?.delivered_today ?? 0}
        deliveredTodayChangePct={stats?.delivered_today_change_pct ?? 0}
        exceptionRate={stats?.exception_rate ?? 0}
        onTimeRate={stats?.on_time_rate ?? 0}
        activeCarriers={stats?.active_carriers ?? 0}
      />

      <section className={cm.grid({ cols: 4, gap: 'md' })}>
        <DriverStatusCard
          label={t('dashboard.kpi.inTransit', {}, { defaultValue: 'In transit' })}
          value={(stats?.in_transit ?? 0).toLocaleString()}
          accentColor="border-primary"
          decoration={<MiniSparkline color="var(--mol-color-info)" values={dailyVolume} />}
          meta={t(
            'dashboard.kpi.inTransitMeta',
            { pct: (stats?.in_transit_change_pct ?? 0).toFixed(1) },
            { defaultValue: '+{{pct}}% vs 7d' },
          )}
        />
        <DriverStatusCard
          label={t('dashboard.kpi.deliveredToday', {}, { defaultValue: 'Delivered today' })}
          value={(stats?.delivered_today ?? 0).toLocaleString()}
          accentColor="border-success"
          decoration={<MiniSparkline color="var(--mol-color-success)" values={dailyVolume} />}
          meta={t(
            'dashboard.kpi.deliveredMeta',
            { pct: (stats?.delivered_today_change_pct ?? 0).toFixed(1) },
            { defaultValue: '+{{pct}}% vs avg' },
          )}
        />
        <DriverStatusCard
          label={t('dashboard.kpi.onTime', {}, { defaultValue: 'On-time rate' })}
          value={`${Math.round((stats?.on_time_rate ?? 0) * 100)}%`}
          accentColor="border-info"
          meta={t('dashboard.kpi.onTimeMeta', {}, { defaultValue: 'last 30 days' })}
        />
        <DriverStatusCard
          label={t('dashboard.kpi.exceptions', {}, { defaultValue: 'Exception rate' })}
          value={`${(stats?.exception_rate ?? 0).toFixed(1)}%`}
          accentColor={(stats?.exception_rate ?? 0) > 2 ? 'border-error' : 'border-warning'}
          valueTone={(stats?.exception_rate ?? 0) > 2 ? 'text-error' : 'text-on-surface'}
          meta={t('dashboard.kpi.exceptionsMeta', {}, { defaultValue: 'needs attention' })}
        />
      </section>

      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
        <div className={'lg:col-span-2'}>
          <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
            <h2 className={'text-xl font-bold'}>
              {t('dashboard.activeShipmentsHeading', {}, { defaultValue: 'In transit + flagged' })}
            </h2>
            <Link to="/shipments" className={'text-sm font-bold text-primary hover:underline'}>
              {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
            </Link>
          </div>
          <p className={'text-sm text-on-surface-variant mt-1 mb-4'}>
            {t(
              'dashboard.activeShipmentsSubtitle',
              { count: shipments.length },
              { defaultValue: '{{count}} shipments need attention or are on the move' },
            )}
          </p>
          <OrdersFeed shipments={shipments} />
        </div>

        <aside>
          <h2 className={'text-xl font-bold mb-4'}>
            {t('form.priority', {}, { defaultValue: 'Priority' })}
          </h2>
          <EtaCountdown alerts={alerts} />
        </aside>
      </section>
    </div>
  )
}
