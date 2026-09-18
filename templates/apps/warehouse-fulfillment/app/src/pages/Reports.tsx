import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { FulfillmentKpiCard } from '../components/FulfillmentKpiCard.js'

interface ApiCounts {
  pending?: number
  picking?: number
  packed?: number
  shipped?: number
  cancelled?: number
  rush?: number
  total?: number
}

interface ApiInventoryStats {
  total?: number
  units?: number
  lowStock?: number
  outOfStock?: number
}

export function Reports() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [counts, setCounts] = useState<ApiCounts>({})
  const [invStats, setInvStats] = useState<ApiInventoryStats>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [c, i] = await Promise.all([
          http
            .get<ApiCounts>('/orders/stats/counts')
            .then((r) => r.data)
            .catch(() => null),
          http
            .get<ApiInventoryStats>('/inventory/stats')
            .then((r) => r.data)
            .catch(() => null),
        ])
        if (cancelled) return
        setCounts(c ?? {})
        setInvStats(i ?? {})
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http])

  const total = Number(counts.total ?? 0)
  const shipped = Number(counts.shipped ?? 0)
  const pending = Number(counts.pending ?? 0)
  const picking = Number(counts.picking ?? 0)
  const packed = Number(counts.packed ?? 0)
  const cancelled = Number(counts.cancelled ?? 0)
  const completionPct = total > 0 ? Math.round((shipped / total) * 1000) / 10 : 0
  const cancelRate = total > 0 ? Math.round((cancelled / total) * 1000) / 10 : 0
  const totalUnits = Number(invStats.units ?? 0)
  const inventoryHealth = invStats.total
    ? Math.max(
        0,
        100 - Math.round((Number(invStats.outOfStock ?? 0) / Number(invStats.total)) * 100),
      )
    : 100

  const buckets = [
    { label: 'Pending', value: pending, color: 'var(--color-order-pending)' },
    { label: 'Picking', value: picking, color: 'var(--color-order-picking)' },
    { label: 'Packed', value: packed, color: 'var(--color-order-packed)' },
    { label: 'Shipped', value: shipped, color: 'var(--color-order-shipped)' },
    { label: 'Cancelled', value: cancelled, color: 'var(--color-stock-out)' },
  ]
  const maxBucket = Math.max(...buckets.map((b) => b.value), 1)

  return (
    <div className={cm.stack(8)} data-testid="reports-page">
      <header className={cm.stack(1)}>
        <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-primary')}>
          {t('reports.eyebrow', {}, { defaultValue: 'Performance analytics' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('reports.title', {}, { defaultValue: 'Throughput reports' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'reports.subtitle',
            {},
            { defaultValue: 'Live snapshot of orders, lifecycle, and inventory health' },
          )}
        </p>
      </header>

      <section className={cm.cn('grid grid-cols-2 md:grid-cols-4 gap-4')}>
        <FulfillmentKpiCard
          label={t('reports.kpis.completion', {}, { defaultValue: 'Completion rate' })}
          value={`${completionPct}%`}
          tone="success"
          icon="verified"
          hint={t('reports.kpis.completionHint', {}, { defaultValue: 'Shipped / total' })}
        />
        <FulfillmentKpiCard
          label={t('reports.kpis.units', {}, { defaultValue: 'Units on hand' })}
          value={totalUnits.toLocaleString()}
          tone="primary"
          icon="inventory_2"
          hint={t('reports.kpis.unitsHint', {}, { defaultValue: 'Across active SKUs' })}
        />
        <FulfillmentKpiCard
          label={t('reports.kpis.health', {}, { defaultValue: 'Inventory health' })}
          value={`${inventoryHealth}%`}
          tone="info"
          icon="favorite"
          hint={t('reports.kpis.healthHint', {}, { defaultValue: '100% means no OOS' })}
        />
        <FulfillmentKpiCard
          label={t('reports.kpis.cancel', {}, { defaultValue: 'Cancel rate' })}
          value={`${cancelRate}%`}
          tone="warning"
          icon="cancel"
          hint={t('reports.kpis.cancelHint', {}, { defaultValue: 'Last 100 orders' })}
        />
      </section>

      <article
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
          cm.stack(4),
        )}
        data-testid="reports-buckets"
      >
        <header className={cm.stack(1)}>
          <p
            className={cm.cn(
              'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
            )}
          >
            {t('reports.chart.eyebrow', {}, { defaultValue: 'Lifecycle breakdown' })}
          </p>
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
            {t('reports.chart.title', {}, { defaultValue: 'Orders by stage' })}
          </h2>
        </header>
        {loading ? (
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : (
          <div
            className={cm.cn(cm.flex({ align: 'end', gap: 'sm' }), 'h-48')}
            role="img"
            aria-label={t('reports.chart.aria', {}, { defaultValue: 'Order stages' })}
          >
            {buckets.map((b) => {
              const heightPct = (b.value / maxBucket) * 100
              return (
                <div
                  key={b.label}
                  className={cm.cn(
                    cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
                    'flex-1',
                  )}
                  data-testid="report-bucket"
                >
                  <div
                    className={cm.cn('w-full rounded-t-lg transition-all')}
                    style={{ height: `${Math.max(heightPct, 4)}%`, backgroundColor: b.color }}
                  />
                  <p
                    className={cm.cn(
                      'text-[10px] uppercase tracking-wider text-on-surface-variant',
                    )}
                  >
                    {b.label}
                  </p>
                  <p
                    className={cm.cn('font-mono text-sm font-bold')}
                    data-testid="report-bucket-value"
                  >
                    {b.value}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </article>
    </div>
  )
}

export default Reports
