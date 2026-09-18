import { useEffect, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { OrderRow, type OrderRowEntry } from '../components/OrderRow.js'
import type { OrderStatus } from '../components/OrderStatusBadge.js'

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

type StatusFilter = 'all' | OrderStatus

const FILTERS: { value: StatusFilter; labelKey: string; labelDefault: string }[] = [
  { value: 'all', labelKey: 'orders.filters.all', labelDefault: 'All' },
  { value: 'pending', labelKey: 'orders.filters.pending', labelDefault: 'Pending' },
  { value: 'picking', labelKey: 'orders.filters.picking', labelDefault: 'Picking' },
  { value: 'packed', labelKey: 'orders.filters.packed', labelDefault: 'Packed' },
  { value: 'shipped', labelKey: 'orders.filters.shipped', labelDefault: 'Shipped' },
  { value: 'cancelled', labelKey: 'orders.filters.cancelled', labelDefault: 'Cancelled' },
]

export function Orders() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [orders, setOrders] = useState<OrderRowEntry[]>([])
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [errored, setErrored] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const params = new URLSearchParams({ limit: '50' })
        if (filter !== 'all') params.set('status', filter)
        const res = await http.get<ApiOrder[]>(`/orders?${params}`)
        const data = res.data
        if (cancelled) return
        const mapped: OrderRowEntry[] = (Array.isArray(data) ? data : []).map((row, idx) => ({
          id: String(row.id ?? `row-${idx}`),
          orderNumber: String(row.externalOrderId ?? row.id ?? `SO-${idx}`).slice(0, 16),
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
        setOrders(mapped)
        setErrored(false)
      } catch (error) {
        logError('orders.load', error)
        if (!cancelled) {
          setErrored(true)
          setOrders([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http, filter])

  const filtered = orders

  return (
    <div className={cm.stack(6)}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.stack(1)}>
          <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-primary')}>
            {t('orders.eyebrow', {}, { defaultValue: 'Order queue' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('orders.title', {}, { defaultValue: 'All orders' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'orders.subtitle',
              { count: filtered.length },
              { defaultValue: '{{count}} orders in this lane' },
            )}
          </p>
        </div>
      </header>

      <div className={cm.cn(cm.flex({ gap: 'xs' }), 'flex-wrap')}>
        {FILTERS.map((f) => {
          const active = filter === f.value
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'rounded-full transition-colors uppercase tracking-wider',
                active
                  ? 'bg-primary text-on-primary shadow shadow-primary/30'
                  : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:bg-background-secondary',
              )}
            >
              {t(f.labelKey, {}, { defaultValue: f.labelDefault })}
            </button>
          )
        })}
      </div>

      <article
        className={cm.cn(
          'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest overflow-hidden',
        )}
        data-testid="orders-list"
      >
        <div className={cm.cn('divide-y divide-outline-variant/50')}>
          {loading ? (
            <p className={cm.cn(cm.sp('p', 6), cm.textSize('sm'), cm.textMuted)}>
              {t('orders.loading', {}, { defaultValue: 'Loading orders…' })}
            </p>
          ) : filtered.length === 0 ? (
            <p
              className={cm.cn(cm.sp('p', 6), cm.textSize('sm'), cm.textMuted)}
              data-testid="orders-empty"
            >
              {t('orders.empty', {}, { defaultValue: 'No orders in this lane right now.' })}
            </p>
          ) : (
            filtered.map((order) => <OrderRow key={order.id} order={order} />)
          )}
        </div>
        {errored && (
          <p
            className={cm.cn(cm.sp('p', 4), cm.textSize('xs'), 'text-error italic')}
            data-testid="orders-error"
          >
            {t('orders.errorFallback', {}, { defaultValue: 'Live data temporarily unavailable.' })}
          </p>
        )}
      </article>
    </div>
  )
}

export default Orders
