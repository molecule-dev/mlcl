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

const FALLBACK_ORDERS: VendryOrder[] = [
  {
    id: 'vo-1',
    display_id: 'VND-3401',
    placed_at: '2026-04-28T09:14:00Z',
    status: 'paid',
    total_cents: 14400,
    vendor_groups: [
      {
        vendor_id: 'self',
        vendor_name: 'Mira & Co. Ceramics',
        status: 'paid',
        subtotal_cents: 14400,
        items: [
          {
            id: 'a',
            name: 'Sienna Stoneware Mug',
            vendor_name: 'Mira & Co.',
            quantity: 3,
            price_cents: 4800,
          },
        ],
      },
    ],
  },
  {
    id: 'vo-2',
    display_id: 'VND-3402',
    placed_at: '2026-04-27T16:42:00Z',
    status: 'shipped',
    total_cents: 9200,
    vendor_groups: [
      {
        vendor_id: 'self',
        vendor_name: 'Mira & Co. Ceramics',
        status: 'shipped',
        subtotal_cents: 9200,
        tracking_number: '1Z 9871 4422 0019',
        carrier: 'UPS',
        items: [
          {
            id: 'a',
            name: 'Amber Glass Pendant',
            vendor_name: 'Mira & Co.',
            quantity: 1,
            price_cents: 7800,
          },
          {
            id: 'b',
            name: 'Indigo Tea Towel',
            vendor_name: 'Mira & Co.',
            quantity: 1,
            price_cents: 1400,
          },
        ],
      },
    ],
  },
  {
    id: 'vo-3',
    display_id: 'VND-3399',
    placed_at: '2026-04-26T07:08:00Z',
    status: 'pending',
    total_cents: 8400,
    vendor_groups: [
      {
        vendor_id: 'self',
        vendor_name: 'Mira & Co. Ceramics',
        status: 'pending',
        subtotal_cents: 8400,
        items: [
          {
            id: 'a',
            name: 'Olive Pour-Over Set',
            vendor_name: 'Mira & Co.',
            quantity: 1,
            price_cents: 8400,
          },
        ],
      },
    ],
  },
]

export function VendorOrders() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [orders, setOrders] = useState<VendryOrder[]>(FALLBACK_ORDERS)

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
        if (list.length === 0) return
        setOrders(list.map(coerceOrder))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http])

  const kpis = useMemo(() => {
    const awaiting = orders.filter((o) =>
      ['pending', 'paid', 'processing', 'confirmed'].includes(o.status as string),
    ).length
    const inTransit = orders.filter((o) => o.status === 'shipped').length
    const delivered = orders.filter((o) => o.status === 'delivered').length
    const refunded = orders.filter(
      (o) => o.status === 'refunded' || o.status === 'cancelled',
    ).length
    return { awaiting, inTransit, delivered, refunded }
  }, [orders])

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
        {orders.map((order) => (
          <VendryOrderCard key={order.id} order={order} />
        ))}
      </section>
    </div>
  )
}

export default VendorOrders
