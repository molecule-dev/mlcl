import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import {
  type VendryOrder,
  VendryOrderCard,
  type VendryOrderStatus,
  type VendryOrderVendorGroup,
} from '../components/VendryOrderCard.js'

interface ApiOrderItem {
  product_id?: string
  name?: string
  quantity?: number
  qty?: number
  price?: number
  price_cents?: number
}

interface ApiOrderVendor {
  vendor_id?: string
  vendor_name?: string
  vendor_slug?: string
  vendor_verified?: boolean
  status: VendryOrderStatus
  subtotal?: number
  subtotal_cents?: number
  tracking_number?: string | null
  carrier?: string | null
  items: ApiOrderItem[]
}

interface ApiOrder {
  id: string
  display_id?: string
  status: VendryOrderStatus
  total?: number
  total_cents?: number
  placed_at?: string
  created_at?: string
  vendors?: ApiOrderVendor[]
}

function coerceOrder(api: ApiOrder): VendryOrder {
  const vendor_groups: VendryOrderVendorGroup[] = (api.vendors ?? []).map((v) => ({
    vendor_id: v.vendor_id || 'self',
    vendor_name: v.vendor_name || 'Vendor',
    vendor_slug: v.vendor_slug,
    vendor_verified: v.vendor_verified,
    status: v.status,
    subtotal_cents: v.subtotal_cents ?? Math.round((v.subtotal ?? 0) * 100),
    items: v.items.map((i, idx) => ({
      id: `${api.id}-${i.product_id ?? idx}`,
      name: i.name || 'Item',
      vendor_name: v.vendor_name || 'Vendor',
      vendor_slug: v.vendor_slug,
      quantity: i.qty ?? i.quantity ?? 1,
      price_cents: i.price_cents ?? Math.round((i.price ?? 0) * 100),
    })),
    tracking_number: v.tracking_number ?? undefined,
    carrier: v.carrier ?? undefined,
  }))
  return {
    id: api.id,
    display_id: api.display_id ?? `VND-${api.id.slice(0, 6).toUpperCase()}`,
    placed_at: api.placed_at ?? api.created_at ?? new Date().toISOString(),
    status: api.status,
    total_cents: api.total_cents ?? Math.round((api.total ?? 0) * 100),
    vendor_groups,
  }
}

export function VendorOrders() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  // null = still loading; [] = loaded with no orders yet.
  const [orders, setOrders] = useState<VendryOrder[] | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<{ data?: ApiOrder[] } | ApiOrder[]>('/api/vendors/me/orders')
      .then((res) => {
        const raw = (res as { data?: unknown }).data ?? res
        const list = Array.isArray(raw)
          ? (raw as ApiOrder[])
          : ((raw as { data?: ApiOrder[] }).data ?? [])
        if (cancelled) return
        setOrders(list.map(coerceOrder))
      })
      .catch(() => {
        if (!cancelled) setOrders([])
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const loaded = useMemo(() => orders ?? [], [orders])

  const kpis = useMemo(() => {
    const awaiting = loaded.filter((o) =>
      ['pending', 'paid', 'processing', 'confirmed'].includes(o.status as string),
    ).length
    const inTransit = loaded.filter((o) => o.status === 'shipped').length
    const delivered = loaded.filter((o) => o.status === 'delivered').length
    const refunded = loaded.filter(
      (o) => o.status === 'refunded' || o.status === 'cancelled',
    ).length
    return { awaiting, inTransit, delivered, refunded }
  }, [loaded])

  return (
    <div className={cm.cn(cm.maxW('full'), cm.mxAuto, cm.sp('p', 8), 'max-w-[1280px] space-y-8')}>
      <header className={cm.cn(cm.stack(2))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-sky-700 dark:text-info',
          )}
        >
          {t('vendorOrders.eyebrow', {}, { defaultValue: 'Vendor admin' })}
        </p>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-4xl tracking-tight font-extrabold text-on-surface',
          )}
        >
          {t('vendorOrders.title', {}, { defaultValue: 'Incoming orders' })}
        </h1>
        <p className={'text-on-surface-variant text-lg'}>
          {t(
            'vendorOrders.subtitle',
            { appName: APP_NAME },
            {
              defaultValue:
                'Print labels, mark fulfilled, and respond to questions — all without leaving {{appName}}.',
            },
          )}
        </p>
      </header>

      <div className={cm.cn(cm.grid({ cols: 2, gap: 'sm' }), 'md:grid-cols-4')}>
        {[
          {
            key: 'awaiting',
            label: t('vendorOrders.kpi.awaiting', {}, { defaultValue: 'Awaiting fulfillment' }),
            value: kpis.awaiting,
            // Tailwind's scanner can't see interpolated class names — keep
            // each accent class a full literal string.
            accent: 'bg-warning',
          },
          {
            key: 'inTransit',
            label: t('vendorOrders.kpi.inTransit', {}, { defaultValue: 'In transit' }),
            value: kpis.inTransit,
            accent: 'bg-primary',
          },
          {
            key: 'delivered',
            label: t('status.delivered', {}, { defaultValue: 'Delivered' }),
            value: kpis.delivered,
            accent: 'bg-success',
          },
          {
            key: 'refunded',
            label: t('status.refunded', {}, { defaultValue: 'Refunded' }),
            value: kpis.refunded,
            accent: 'bg-error',
          },
        ].map((kpi) => (
          <div
            key={kpi.key}
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-2xl border border-outline-variant bg-surface relative overflow-hidden',
            )}
          >
            <div className={cm.cn('absolute left-0 top-0 bottom-0 w-1', kpi.accent)} aria-hidden />
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest text-on-surface-variant font-semibold',
              )}
            >
              {kpi.label}
            </p>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-2xl text-on-surface tabular-nums font-extrabold',
              )}
            >
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      <section className={cm.cn(cm.stack(4))}>
        {orders === null ? (
          [0, 1, 2].map((i) => (
            <div
              key={i}
              className={cm.cn(
                cm.sp('p', 6),
                'animate-pulse rounded-2xl border border-outline-variant bg-surface-container-low',
              )}
              aria-hidden
            >
              <div className="h-4 w-40 rounded bg-outline-variant" />
              <div className="mt-3 h-3 w-64 rounded bg-outline-variant" />
            </div>
          ))
        ) : loaded.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('p', 8),
              cm.stack(2),
              'items-center text-center rounded-2xl border border-dashed border-outline-variant bg-surface-container-low',
            )}
          >
            <span className="material-symbols-outlined text-on-surface-variant" aria-hidden>
              inbox
            </span>
            <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
              {t('vendorOrders.emptyTitle', {}, { defaultValue: 'No orders to fulfill yet' })}
            </p>
            <p className={'text-on-surface-variant text-sm'}>
              {t(
                'vendorOrders.emptyBody',
                {},
                {
                  defaultValue: 'When customers buy your products, their orders will show up here.',
                },
              )}
            </p>
          </div>
        ) : (
          loaded.map((order) => <VendryOrderCard key={order.id} order={order} />)
        )}
      </section>
    </div>
  )
}

export default VendorOrders
