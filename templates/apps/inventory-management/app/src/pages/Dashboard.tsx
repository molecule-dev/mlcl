import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { InventoryHeroCard } from '../components/InventoryHeroCard.js'
import { InventoryKpiCard } from '../components/InventoryKpiCard.js'
import { LowStockAlertCard, type LowStockAlertItem } from '../components/LowStockAlertCard.js'
import { type MovementEntry, MovementRow } from '../components/MovementRow.js'

interface DashboardSnapshot {
  totalUnits: number
  uniqueSkus: number
  warehouses: number
  lowStockCount: number
  outOfStockCount: number
  inventoryValueCents: number
  changePercent: number
  trend: number[]
  alerts: LowStockAlertItem[]
  movements: MovementEntry[]
}

const FALLBACK: DashboardSnapshot = {
  totalUnits: 42318,
  uniqueSkus: 1284,
  warehouses: 6,
  lowStockCount: 18,
  outOfStockCount: 3,
  inventoryValueCents: 1284600000,
  changePercent: 3.2,
  trend: [820, 860, 905, 880, 940, 990, 1020, 1080, 1110, 1095, 1140, 1180],
  alerts: [
    {
      id: 'sku-azr-104',
      productName: 'Azimuth coil-tubing 1/2"',
      sku: 'AZR-104',
      warehouse: 'Reno · A-12',
      quantity: 4,
      threshold: 24,
    },
    {
      id: 'sku-bkn-220',
      productName: 'Beacon LED driver 60W',
      sku: 'BKN-220',
      warehouse: 'Memphis · D-04',
      quantity: 0,
      threshold: 12,
    },
    {
      id: 'sku-cdr-018',
      productName: 'Cedar pallet shrink wrap',
      sku: 'CDR-018',
      warehouse: 'Reno · B-02',
      quantity: 9,
      threshold: 30,
    },
    {
      id: 'sku-dlt-007',
      productName: 'Delta nitrile gloves M',
      sku: 'DLT-007',
      warehouse: 'Newark · F-08',
      quantity: 22,
      threshold: 60,
    },
  ],
  movements: [
    {
      id: 'mv-1',
      kind: 'inbound',
      productName: 'Azimuth coil-tubing 1/2"',
      sku: 'AZR-104',
      quantity: 240,
      warehouse: 'Reno · A-12',
      reason: 'PO #4419 received',
      occurredAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    },
    {
      id: 'mv-2',
      kind: 'outbound',
      productName: 'Beacon LED driver 60W',
      sku: 'BKN-220',
      quantity: -12,
      warehouse: 'Memphis · D-04',
      reason: 'SO #882 shipped',
      occurredAt: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    },
    {
      id: 'mv-3',
      kind: 'transfer',
      productName: 'Cedar pallet shrink wrap',
      sku: 'CDR-018',
      quantity: 60,
      warehouse: 'Reno → Newark',
      reason: 'Rebalance to demand',
      occurredAt: new Date(Date.now() - 1000 * 60 * 47).toISOString(),
    },
    {
      id: 'mv-4',
      kind: 'adjustment',
      productName: 'Delta nitrile gloves M',
      sku: 'DLT-007',
      quantity: -3,
      warehouse: 'Newark · F-08',
      reason: 'Cycle count variance',
      occurredAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    },
    {
      id: 'mv-5',
      kind: 'inbound',
      productName: 'Echo packing tape 48mm',
      sku: 'EHO-330',
      quantity: 480,
      warehouse: 'Memphis · D-04',
      reason: 'PO #4421 received',
      occurredAt: new Date(Date.now() - 1000 * 60 * 130).toISOString(),
    },
  ],
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(FALLBACK)
  const [loading, setLoading] = useState(false)
  const [errored, setErrored] = useState(false)
  // Gate the primary dashboard chrome (incl. the title) on the first snapshot
  // settling so we render real data — not a stale-fallback flash — on mount.
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setErrored(false)
      try {
        const res = (await http.get('/dashboard/snapshot')) as
          { data?: Partial<DashboardSnapshot> } | Partial<DashboardSnapshot> | null
        if (cancelled) return
        const body = (res as { data?: Partial<DashboardSnapshot> } | null)?.data ?? res
        const data = (body ?? {}) as Partial<DashboardSnapshot>
        const next: DashboardSnapshot = {
          totalUnits: Number(data.totalUnits ?? 0),
          uniqueSkus: Number(data.uniqueSkus ?? 0),
          warehouses: Number(data.warehouses ?? 0),
          lowStockCount: Number(data.lowStockCount ?? 0),
          outOfStockCount: Number(data.outOfStockCount ?? 0),
          inventoryValueCents: Number(data.inventoryValueCents ?? 0),
          changePercent: Number(data.changePercent ?? 0),
          trend: Array.isArray(data.trend) ? data.trend.map((n) => Number(n)) : FALLBACK.trend,
          alerts: Array.isArray(data.alerts) ? (data.alerts as LowStockAlertItem[]) : [],
          movements: Array.isArray(data.movements) ? (data.movements as MovementEntry[]) : [],
        }
        setSnapshot(next)
      } catch (_error) {
        // error state shown to user via setErrored; no further action needed
        if (!cancelled) setErrored(true)
      } finally {
        if (!cancelled) {
          setLoading(false)
          setLoaded(true)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http])

  const valueDisplay = useMemo(() => {
    const dollars = snapshot.inventoryValueCents / 100
    if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(2)}M`
    if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}k`
    return `$${dollars.toFixed(0)}`
  }, [snapshot.inventoryValueCents])

  if (!loaded) {
    return (
      <div
        className={cm.cn(
          cm.stack(4),
          cm.sp('py', 16),
          cm.flex({ align: 'center', justify: 'center' }),
        )}
        data-mol-id="dashboard-loading"
      >
        <span
          className={cm.cn('material-symbols-outlined animate-spin text-primary')}
          aria-hidden="true"
        >
          progress_activity
        </span>
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t('dashboard.loading', {}, { defaultValue: 'Refreshing alerts…' })}
        </p>
      </div>
    )
  }

  return (
    <div className={cm.stack(8)}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.stack(1)}>
          <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-primary')}>
            {t('dashboard.eyebrow', {}, { defaultValue: 'Operations control room' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('dashboard.title', {}, { defaultValue: 'Today across the fleet' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'dashboard.subtitle',
              { warehouses: snapshot.warehouses },
              { defaultValue: 'Across {{warehouses}} warehouses · live ledger' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
          <Link
            to="/transfers"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-lg border border-outline-variant text-on-surface hover:bg-background-secondary transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')} data-icon="sync_alt">
              sync_alt
            </span>
            {t('dashboard.actions.transfer', {}, { defaultValue: 'New transfer' })}
          </Link>
          <Link
            to="/inventory"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-lg bg-gradient-to-br from-primary to-primary-dark text-white shadow shadow-primary/30 hover:opacity-95 transition-all',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[18px]')}
              data-icon="qr_code_scanner"
            >
              qr_code_scanner
            </span>
            {t('dashboard.actions.scan', {}, { defaultValue: 'Scan an SKU' })}
          </Link>
        </div>
      </header>

      <InventoryHeroCard
        totalUnits={snapshot.totalUnits}
        uniqueSkus={snapshot.uniqueSkus}
        changePercent={snapshot.changePercent}
        trend={snapshot.trend}
        periodLabel={t('dashboard.heroPeriod', {}, { defaultValue: 'Last 12 weeks' })}
      />

      <section className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4')}>
        <InventoryKpiCard
          label={t('dashboard.kpis.skus', {}, { defaultValue: 'Active SKUs' })}
          value={snapshot.uniqueSkus.toLocaleString()}
          tone="primary"
          icon="qr_code_2"
          hint={t('dashboard.kpis.skusHint', {}, { defaultValue: 'Tracked across warehouses' })}
          trend={{ value: '+24', positive: true }}
        />
        <InventoryKpiCard
          label={t('dashboard.kpis.lowStock', {}, { defaultValue: 'Low-stock SKUs' })}
          value={String(snapshot.lowStockCount)}
          tone="warning"
          icon="warning"
          hint={t('dashboard.kpis.lowStockHint', {}, { defaultValue: 'Below reorder point' })}
        />
        <InventoryKpiCard
          label={t('dashboard.kpis.out', {}, { defaultValue: 'Out of stock' })}
          value={String(snapshot.outOfStockCount)}
          tone="error"
          icon="block"
          hint={t('dashboard.kpis.outHint', {}, { defaultValue: 'Need reorder today' })}
        />
        <InventoryKpiCard
          label={t('dashboard.kpis.value', {}, { defaultValue: 'Inventory value' })}
          value={valueDisplay}
          tone="success"
          icon="payments"
          hint={t('dashboard.kpis.valueHint', {}, { defaultValue: 'Cost basis (current)' })}
          trend={{ value: '+1.4%', positive: true }}
        />
      </section>

      <div className={cm.cn('grid lg:grid-cols-5 gap-6')}>
        <article
          className={cm.cn(
            cm.stack(4),
            cm.sp('p', 6),
            // min-w-0: without it the grid item's automatic minimum propagates
            // the truncated rows' min-content and blows the track past 390px.
            'min-w-0 lg:col-span-2 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
          )}
        >
          <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <div className={cm.stack(1)}>
              <p
                className={cm.cn(
                  'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
                )}
              >
                {t('dashboard.alerts.eyebrow', {}, { defaultValue: 'Reorder queue' })}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('lg'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {t('dashboard.alerts.title', {}, { defaultValue: 'Low-stock alerts' })}
              </h2>
            </div>
            <Link
              to="/notifications"
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-[0.2em] text-primary hover:underline',
              )}
            >
              {t('common.viewAll', {}, { defaultValue: 'View all' })}
            </Link>
          </header>
          {loading ? (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t('dashboard.loading', {}, { defaultValue: 'Refreshing alerts…' })}
            </p>
          ) : snapshot.alerts.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t(
                'dashboard.alerts.empty',
                {},
                { defaultValue: 'Every SKU is above its reorder point. Nice work.' },
              )}
            </p>
          ) : (
            <div className={cm.stack(3)}>
              {snapshot.alerts.map((alert) => (
                <LowStockAlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          )}
          {errored && (
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant italic')}>
              {t(
                'dashboard.errorFallback',
                {},
                { defaultValue: 'Live data temporarily unavailable — showing recent snapshot.' },
              )}
            </p>
          )}
        </article>

        <article
          className={cm.cn(
            cm.stack(4),
            'min-w-0 lg:col-span-3 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest overflow-hidden',
          )}
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
                {t('dashboard.movements.eyebrow', {}, { defaultValue: 'Live ledger' })}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('lg'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {t('dashboard.movements.title', {}, { defaultValue: 'Recent stock movements' })}
              </h2>
            </div>
            <Link
              to="/inventory"
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-[0.2em] text-primary hover:underline',
              )}
            >
              {t('dashboard.movements.viewAll', {}, { defaultValue: 'Open ledger' })}
            </Link>
          </header>
          <div className={cm.cn('divide-y divide-outline-variant/50')}>
            {snapshot.movements.map((entry) => (
              <MovementRow key={entry.id} entry={entry} />
            ))}
          </div>
        </article>
      </div>
    </div>
  )
}

export default Dashboard
