import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'

import { type KitchenStat, KitchenStatTriad } from '../components/KitchenStatTriad.js'
import {
  type OrderStatus,
  type OrderTicket,
  OrderTicketCard,
} from '../components/OrderTicketCard.js'
import { RevenueHeroCard } from '../components/RevenueHeroCard.js'
import { type ApiOrder, mapApiOrderToTicket } from '../lib/api-orders.js'
import { getRealtimeConnection } from '../lib/realtime.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface AnalyticsSnapshot {
  todayRevenueCents: number
  coversCount: number
  avgCheckCents: number
  busiestHour: { hour: number; cents: number } | null
  hourly: ReadonlyArray<{ hour: number; cents: number }>
}

const formatHour = (hour: number) => `${hour.toString().padStart(2, '0')}:00`

const COLUMNS: ReadonlyArray<{ status: OrderStatus; defaultLabel: string }> = [
  { status: 'new', defaultLabel: 'New' },
  { status: 'preparing', defaultLabel: 'Preparing' },
  { status: 'ready', defaultLabel: 'Ready' },
  { status: 'served', defaultLabel: 'Served' },
]

const COLUMN_TONE: Record<OrderStatus, string> = {
  pending: 'border-t-info',
  new: 'border-t-info',
  preparing: 'border-t-warning',
  ready: 'border-t-success',
  served: 'border-t-on-surface-variant',
  paid: 'border-t-success',
  cancelled: 'border-t-error',
}

export function OrderDashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [orders, setOrders] = useState<ReadonlyArray<OrderTicket>>([])
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Bumped by the live kitchen feed below to re-run the loader. The spinner
  // shows only on the FIRST load (hasLoadedRef) so a live refresh updates the
  // board silently instead of flashing "loading" on every incoming order.
  const [refreshKey, setRefreshKey] = useState(0)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    if (!hasLoadedRef.current) setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/orders').then(async (res) => {
        const list = unwrapList<ApiOrder>(res)
        const detailed = await Promise.all(
          list.map(async (order) => {
            try {
              const detail = unwrapSingle<ApiOrder>(await http.get(`/api/orders/${order.id}`))
              return mapApiOrderToTicket(detail?.id ? detail : order)
            } catch (_error) {
              // detail fetch failed — fall back to the summary row from the list
              return mapApiOrderToTicket(order)
            }
          }),
        )
        if (!cancelled) setOrders(detailed)
      }),
      http
        .get('/api/analytics/snapshot')
        .then((res) => {
          const snap = unwrapSingle<AnalyticsSnapshot>(res)
          if (!cancelled && snap) setSnapshot(snap)
        })
        .catch(() => {
          /* analytics is best-effort */
        }),
    ])
      .catch(() => {
        if (!cancelled)
          setError(t('orderDashboard.loadError', {}, { defaultValue: 'Could not load orders.' }))
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
          hasLoadedRef.current = true
        }
      })
    return () => {
      cancelled = true
    }
  }, [http, t, refreshKey])

  // Live kitchen feed — the API broadcasts new orders + status changes to the
  // shared `kitchen` room (api/src/handlers/{orders,kitchen,guest}.ts). Join it
  // and re-fetch on each event so tickets appear and advance columns without a
  // manual reload. Event names MUST match the server's broadcast() exactly — a
  // mismatch is a silent no-op. `kitchen` is operator-guarded, so the socket
  // carries the auth token (see lib/realtime.ts). Realtime is an enhancement:
  // if the socket can't connect, the initial fetch already populated the board.
  useEffect(() => {
    let active = true
    let connection: RealtimeConnection | null = null
    const onKitchenEvent = () => setRefreshKey((k) => k + 1)
    getRealtimeConnection()
      .then((conn) => {
        if (!active) return
        connection = conn
        conn.on('new_order', onKitchenEvent)
        conn.on('order_status', onKitchenEvent)
        conn.on('item_status', onKitchenEvent)
        return conn.joinRoom('kitchen')
      })
      .catch(() => {
        // Socket unavailable — the board still works from the initial fetch.
      })
    return () => {
      active = false
      if (connection) {
        connection.off('new_order', onKitchenEvent)
        connection.off('order_status', onKitchenEvent)
        connection.off('item_status', onKitchenEvent)
        connection.leaveRoom('kitchen').catch(() => {})
      }
    }
  }, [])

  const ordersByStatus = COLUMNS.map((col) => ({
    ...col,
    orders: orders.filter((o) => o.status === col.status),
  }))

  const activeOrders = orders.filter(
    (o) => o.status === 'new' || o.status === 'pending' || o.status === 'preparing',
  ).length
  const readyCount = orders.filter((o) => o.status === 'ready').length
  const avgTicketCents =
    snapshot?.avgCheckCents ??
    (orders.length
      ? Math.round(orders.reduce((s, o) => s + (o.totalCents ?? 0), 0) / orders.length)
      : 0)
  const revenueCents =
    snapshot?.todayRevenueCents ?? orders.reduce((s, o) => s + (o.totalCents ?? 0), 0)
  const changeCents = 0
  const hourly = useMemo(
    () => (snapshot?.hourly ?? []).map((h) => ({ hour: formatHour(h.hour), cents: h.cents })),
    [snapshot],
  )
  const coversToday = snapshot?.coversCount ?? 0

  const stats: KitchenStat[] = [
    {
      key: 'activeOrders',
      label: 'Active orders',
      value: String(activeOrders),
      delta: t('orderDashboard.activeDelta', {}, { defaultValue: 'Live now' }),
      deltaDirection: 'neutral',
      icon: 'soup_kitchen',
      tint: 'text-warning',
    },
    {
      key: 'readyForPickup',
      label: 'Ready to serve',
      value: String(readyCount),
      delta: t('orderDashboard.readyDelta', {}, { defaultValue: 'Ring the bell' }),
      deltaDirection: 'up',
      icon: 'restaurant_menu',
      tint: 'text-success',
    },
    {
      key: 'avgTicket',
      label: 'Avg ticket',
      value: `$${(avgTicketCents / 100).toFixed(2)}`,
      delta: t(
        'orderDashboard.avgTicketDelta',
        { value: '$2.40' },
        { defaultValue: '+{{value}} vs Mon' },
      ),
      deltaDirection: 'up',
      icon: 'paid',
      tint: 'text-primary',
    },
    {
      key: 'covers',
      label: 'Covers today',
      value: String(coversToday),
      delta: t('status.today', {}, { defaultValue: 'Today' }),
      deltaDirection: 'neutral',
      icon: 'group',
      tint: 'text-tertiary',
    },
  ]

  if (error) {
    return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ align: 'baseline', justify: 'between' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('orderDashboard.eyebrow', {}, { defaultValue: 'Service in progress' })}
          </p>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight font-display')}>
            {t('orderDashboard.heading', {}, { defaultValue: 'Tonight on the floor' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'orderDashboard.subheading',
              {},
              { defaultValue: 'Every table, served — drag tickets between columns to update.' },
            )}
          </p>
        </div>
        <Link
          to="/orders/history"
          className={cm.cn(cm.textSize('sm'), 'font-bold text-primary hover:underline')}
        >
          {t('orderDashboard.history', {}, { defaultValue: 'View history →' })}
        </Link>
      </header>

      <section
        className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12 items-stretch')}
      >
        <RevenueHeroCard
          revenueCents={revenueCents}
          changeCents={changeCents}
          history={hourly}
          activeOrders={activeOrders}
        />
        <aside
          className={cm.cn(
            cm.flex({ direction: 'col', justify: 'between' }),
            cm.sp('p', 6),
            'lg:col-span-4 bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all',
          )}
        >
          <div>
            <h3
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('lg'),
                cm.sp('mb', 6),
                'font-display',
              )}
            >
              {t('orderDashboard.snapshot', {}, { defaultValue: 'Today at a glance' })}
            </h3>
            <dl className={cm.stack(5)}>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <dt
                  className={cm.cn(
                    'text-[11px] uppercase tracking-widest font-bold text-on-surface-variant',
                  )}
                >
                  {t('orderDashboard.coversLabel', {}, { defaultValue: 'Covers today' })}
                </dt>
                <dd
                  data-testid="dashboard-covers"
                  className={cm.cn(cm.textSize('xl'), 'font-extrabold tabular-nums font-display')}
                >
                  {coversToday}
                </dd>
              </div>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <dt
                  className={cm.cn(
                    'text-[11px] uppercase tracking-widest font-bold text-on-surface-variant',
                  )}
                >
                  {t('orderDashboard.activeLabel', {}, { defaultValue: 'Active orders' })}
                </dt>
                <dd
                  data-testid="dashboard-active"
                  className={cm.cn(cm.textSize('xl'), 'font-extrabold tabular-nums font-display')}
                >
                  {activeOrders}
                </dd>
              </div>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <dt
                  className={cm.cn(
                    'text-[11px] uppercase tracking-widest font-bold text-on-surface-variant',
                  )}
                >
                  {t('orderDashboard.readyLabel', {}, { defaultValue: 'Ready' })}
                </dt>
                <dd
                  data-testid="dashboard-ready"
                  className={cm.cn(cm.textSize('xl'), 'font-extrabold tabular-nums font-display')}
                >
                  {readyCount}
                </dd>
              </div>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <dt
                  className={cm.cn(
                    'text-[11px] uppercase tracking-widest font-bold text-on-surface-variant',
                  )}
                >
                  {t('orderDashboard.avgCheckLabel', {}, { defaultValue: 'Avg check' })}
                </dt>
                <dd
                  className={cm.cn(
                    cm.textSize('xl'),
                    'font-extrabold tabular-nums font-display text-primary',
                  )}
                >
                  ${(avgTicketCents / 100).toFixed(2)}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </section>

      <KitchenStatTriad stats={stats} />

      <section className={cm.stack(4)}>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight font-display')}>
            {t('orderDashboard.boardHeading', {}, { defaultValue: 'Order board' })}
          </h2>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {loading
              ? t('orderDashboard.loadingHint', {}, { defaultValue: 'Refreshing tickets…' })
              : t(
                  'orderDashboard.liveHint',
                  { count: orders.length },
                  { defaultValue: '{{count}} tickets · live' },
                )}
          </p>
        </div>

        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4')}>
          {ordersByStatus.map((col) => (
            <div
              key={col.status}
              className={cm.cn(
                cm.sp('p', 4),
                cm.stack(3),
                'bg-surface-container-low rounded-2xl border-t-4',
                COLUMN_TONE[col.status],
              )}
            >
              <header className={cm.flex({ align: 'center', justify: 'between' })}>
                <h3
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(`orderDashboard.column.${col.status}`, {}, { defaultValue: col.defaultLabel })}
                </h3>
                <span
                  className={cm.cn(cm.textSize('sm'), 'font-extrabold tabular-nums font-display')}
                >
                  {col.orders.length}
                </span>
              </header>
              <div className={cm.stack(3)}>
                {col.orders.length === 0 ? (
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.sp('py', 4),
                      cm.textCenter,
                      'text-on-surface-variant italic',
                    )}
                  >
                    {t('orderDashboard.columnEmpty', {}, { defaultValue: 'Quiet for now.' })}
                  </p>
                ) : (
                  col.orders.map((o) => <OrderTicketCard key={o.id} order={o} />)
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
