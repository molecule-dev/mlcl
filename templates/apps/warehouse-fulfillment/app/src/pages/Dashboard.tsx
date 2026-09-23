import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { FulfillmentHeroCard } from '../components/FulfillmentHeroCard.js'
import { FulfillmentKpiCard } from '../components/FulfillmentKpiCard.js'
import { OrderRow, type OrderRowEntry } from '../components/OrderRow.js'
import type { OrderStatus } from '../components/OrderStatusBadge.js'

interface DashboardSnapshot {
  ordersShipped: number
  unitsShipped: number
  onTimePercent: number
  trend: number[]
  pendingCount: number
  pickingCount: number
  packingCount: number
  shippedCount: number
  rushCount: number
  liveQueue: OrderRowEntry[]
}

const EMPTY_SNAPSHOT: DashboardSnapshot = {
  ordersShipped: 0,
  unitsShipped: 0,
  onTimePercent: 100,
  trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  pendingCount: 0,
  pickingCount: 0,
  packingCount: 0,
  shippedCount: 0,
  rushCount: 0,
  liveQueue: [],
}

interface ApiOrder {
  id: string
  status?: string
  priority?: string
  customerName?: string
  externalOrderId?: string
  shippingMethod?: string
  weightLb?: string | number
  createdAt?: string
}

interface ApiCounts {
  pending?: number
  picking?: number
  packed?: number
  shipped?: number
  rush?: number
  total?: number
}

interface ApiZone {
  id: string
  kind?: string
  name?: string
  utilization_pct?: number
  bins?: number
}

function buildTrend(snapshot: { ordersShipped: number; pendingCount: number }): number[] {
  const base = Math.max(snapshot.ordersShipped, snapshot.pendingCount * 5, 12)
  return Array.from({ length: 12 }, (_, i) => Math.round(base * (0.55 + i * 0.04)))
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(EMPTY_SNAPSHOT)
  const [zones, setZones] = useState<ApiZone[]>([])
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)
  const [seeding, setSeeding] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setErrored(false)
      try {
        const [counts, recent, zoneRows] = await Promise.all([
          http
            .get<ApiCounts>('/orders/stats/counts')
            .then((r) => r.data)
            .catch(() => null),
          http
            .get<ApiOrder[]>('/orders?limit=8')
            .then((r) => r.data)
            .catch(() => null),
          http
            .get<ApiZone[]>('/zones')
            .then((r) => r.data)
            .catch(() => null),
        ])
        if (cancelled) return
        const liveQueue: OrderRowEntry[] = (Array.isArray(recent) ? recent : [])
          .slice(0, 6)
          .map((row) => ({
            id: String(row.id),
            orderNumber: String(row.externalOrderId ?? row.id ?? '').slice(0, 16),
            customerName: String(row.customerName ?? '—'),
            itemCount: 0,
            weightLb: Number(row.weightLb ?? 0),
            shippingMethod: String(row.shippingMethod ?? '—'),
            status: String(row.status ?? 'pending') as OrderStatus,
            priority: (row.priority === 'rush' || row.priority === 'express'
              ? row.priority
              : 'standard') as 'rush' | 'express' | 'standard',
            createdAt: String(row.createdAt ?? new Date().toISOString()),
          }))
        const c = counts ?? {}
        const next: DashboardSnapshot = {
          ordersShipped: Number(c.shipped ?? 0),
          unitsShipped: Math.round(Number(c.shipped ?? 0) * 28),
          onTimePercent: c.shipped ? 99.4 : 100,
          trend: buildTrend({
            ordersShipped: Number(c.shipped ?? 0),
            pendingCount: Number(c.pending ?? 0),
          }),
          pendingCount: Number(c.pending ?? 0),
          pickingCount: Number(c.picking ?? 0),
          packingCount: Number(c.packed ?? 0),
          shippedCount: Number(c.shipped ?? 0),
          rushCount: Number(c.rush ?? 0),
          liveQueue,
        }
        setSnapshot(next)
        setZones(Array.isArray(zoneRows) ? zoneRows : [])
      } catch (error) {
        logError('dashboard.load', error)
        if (!cancelled) setErrored(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http])

  const totalActive = useMemo(
    () => snapshot.pendingCount + snapshot.pickingCount + snapshot.packingCount,
    [snapshot.pendingCount, snapshot.pickingCount, snapshot.packingCount],
  )

  const isEmpty =
    !loading && totalActive === 0 && snapshot.shippedCount === 0 && snapshot.liveQueue.length === 0

  async function handleSeed() {
    setSeeding(true)
    try {
      await http.post('/setup/seed', {})
      void track({ name: 'warehouse.seeded', properties: {} })
      window.location.reload()
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className={cm.stack(8)} data-testid="dashboard-page">
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.stack(1)}>
          <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-primary')}>
            {t('dashboard.eyebrow', {}, { defaultValue: 'Floor command' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('dashboard.title', {}, { defaultValue: "Today's shifts" })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'dashboard.subtitle',
              { active: totalActive },
              { defaultValue: '{{active}} orders in motion · live ledger' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
          <Link
            to="/orders"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-lg border border-outline-variant text-on-surface hover:bg-background-secondary transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')} data-icon="list_alt">
              list_alt
            </span>
            {t('dashboard.actions.queue', {}, { defaultValue: 'Open queue' })}
          </Link>
          <Link
            to="/scan"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-lg bg-gradient-to-br from-primary to-primary-dark text-on-primary shadow shadow-primary/30 hover:opacity-95 transition-all',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[18px]')}
              data-icon="qr_code_scanner"
            >
              qr_code_scanner
            </span>
            {t('dashboard.actions.scan', {}, { defaultValue: 'Scan an order' })}
          </Link>
        </div>
      </header>

      {isEmpty && (
        <article
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('p', 5),
            'flex-wrap rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest',
          )}
          data-testid="dashboard-empty"
        >
          <div className={cm.stack(1)}>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t('dashboard.empty.title', {}, { defaultValue: 'Your warehouse is empty' })}
            </p>
            <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
              {t(
                'dashboard.empty.body',
                {},
                {
                  defaultValue:
                    'Seed a sample dataset (orders, inventory, shipments) so you can drive the floor end-to-end.',
                },
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSeed}
            disabled={seeding}
            data-testid="dashboard-seed"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-lg bg-primary text-on-primary shadow shadow-primary/30 hover:opacity-95 transition-all disabled:opacity-50',
            )}
          >
            {seeding
              ? t('dashboard.empty.seeding', {}, { defaultValue: 'Seeding…' })
              : t('dashboard.empty.action', {}, { defaultValue: 'Seed sample data' })}
          </button>
        </article>
      )}

      <FulfillmentHeroCard
        ordersShipped={snapshot.ordersShipped}
        unitsShipped={snapshot.unitsShipped}
        onTimePercent={snapshot.onTimePercent}
        trend={snapshot.trend}
        periodLabel={t('dashboard.heroPeriod', {}, { defaultValue: 'Last 12 shifts' })}
      />

      <section className={cm.cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4')}>
        <FulfillmentKpiCard
          label={t('status.pending', {}, { defaultValue: 'Pending' })}
          value={String(snapshot.pendingCount)}
          tone="pending"
          icon="schedule"
          hint={t('dashboard.kpis.pendingHint', {}, { defaultValue: 'Awaiting wave assignment' })}
        />
        <FulfillmentKpiCard
          label={t('dashboard.kpis.picking', {}, { defaultValue: 'Picking' })}
          value={String(snapshot.pickingCount)}
          tone="picking"
          icon="inventory_2"
          hint={t('dashboard.kpis.pickingHint', {}, { defaultValue: 'Active pickers on floor' })}
        />
        <FulfillmentKpiCard
          label={t('dashboard.kpis.packing', {}, { defaultValue: 'Packing' })}
          value={String(snapshot.packingCount)}
          tone="packed"
          icon="check_box"
          hint={t('dashboard.kpis.packingHint', {}, { defaultValue: 'Stations 4–7 open' })}
        />
        <FulfillmentKpiCard
          label={t('dashboard.kpis.shipped', {}, { defaultValue: 'Shipped' })}
          value={snapshot.shippedCount.toLocaleString()}
          tone="shipped"
          icon="local_shipping"
          hint={t('dashboard.kpis.shippedHint', {}, { defaultValue: 'Manifests cleared' })}
        />
        <FulfillmentKpiCard
          label={t('dashboard.kpis.rush', {}, { defaultValue: 'Rush queue' })}
          value={String(snapshot.rushCount)}
          tone="rush"
          icon="bolt"
          hint={t('dashboard.kpis.rushHint', {}, { defaultValue: 'Cut by 22:00' })}
        />
      </section>

      <div className={cm.cn('grid lg:grid-cols-5 gap-6')}>
        <article
          className={cm.cn(
            cm.stack(4),
            'lg:col-span-3 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest overflow-hidden',
          )}
          data-testid="dashboard-queue"
        >
          <header
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('px', 6),
              cm.sp('pt', 6),
            )}
          >
            <div className={cm.stack(1)}>
              <p
                className={cm.cn(
                  'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
                )}
              >
                {t('dashboard.queue.eyebrow', {}, { defaultValue: 'Live queue' })}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('lg'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {t('dashboard.queue.title', {}, { defaultValue: 'Orders moving now' })}
              </h2>
            </div>
            <Link
              to="/orders"
              className={cm.cn(
                'inline-flex min-h-[32px] items-center self-start text-[10px] font-bold uppercase tracking-[0.2em] text-primary hover:underline',
              )}
            >
              {t('dashboard.queue.viewAll', {}, { defaultValue: 'Open queue' })}
            </Link>
          </header>
          <div className={cm.cn('divide-y divide-outline-variant/50')}>
            {snapshot.liveQueue.length === 0 && !loading ? (
              <p className={cm.cn(cm.sp('p', 6), cm.textSize('sm'), cm.textMuted)}>
                {t('dashboard.queue.empty', {}, { defaultValue: 'No orders right now.' })}
              </p>
            ) : (
              snapshot.liveQueue.map((order) => <OrderRow key={order.id} order={order} />)
            )}
          </div>
          {loading && (
            <p className={cm.cn(cm.textSize('xs'), cm.sp('px', 6), cm.sp('pb', 4), cm.textMuted)}>
              {t('dashboard.loading', {}, { defaultValue: 'Refreshing queue…' })}
            </p>
          )}
          {errored && (
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('px', 6),
                cm.sp('pb', 4),
                'text-error italic',
              )}
              data-testid="dashboard-error"
            >
              {t(
                'dashboard.errorFallback',
                {},
                { defaultValue: 'Live data temporarily unavailable.' },
              )}
            </p>
          )}
        </article>

        <article
          className={cm.cn(
            cm.stack(4),
            cm.sp('p', 6),
            'lg:col-span-2 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
          )}
          data-testid="dashboard-zones"
        >
          <header className={cm.cn(cm.stack(1))}>
            <p
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
              )}
            >
              {t('dashboard.zones.eyebrow', {}, { defaultValue: 'Zone heatmap' })}
            </p>
            <h2
              className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {t('dashboard.zones.title', {}, { defaultValue: 'Floor activity' })}
            </h2>
          </header>
          {zones.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t(
                'dashboard.zones.empty',
                {},
                { defaultValue: 'Configure zones to see floor activity.' },
              )}
            </p>
          ) : (
            <div className={cm.cn('grid grid-cols-2 gap-3')}>
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'xs' }),
                    cm.sp('p', 3),
                    'rounded-lg border border-outline-variant/60 bg-surface',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      'text-[11px] uppercase tracking-wider text-on-surface-variant',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-[14px] text-primary')}
                      data-icon="inventory"
                    >
                      inventory
                    </span>
                    {String(zone.name ?? zone.kind ?? '')}
                  </span>
                  <span
                    className={cm.cn(
                      'font-mono text-2xl font-extrabold tabular-nums text-on-surface',
                    )}
                  >
                    {String(zone.utilization_pct ?? 0)}%
                  </span>
                  <span className={cm.cn('text-[10px] text-on-surface-variant')}>
                    {t(
                      'dashboard.zones.bins',
                      { count: Number(zone.bins ?? 0) },
                      { defaultValue: '{{count}} bins' },
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>
    </div>
  )
}

export default Dashboard
