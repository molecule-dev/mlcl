import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  type VendryOrder,
  VendryOrderCard,
  type VendryOrderStatus,
  type VendryOrderVendorGroup,
} from '../components/VendryOrderCard.js'

interface ApiOrderItem {
  product_id: string
  name: string
  variant?: string | null
  qty?: number
  quantity?: number
  price?: number
  price_cents?: number
  image?: string
  image_url?: string
}

interface ApiOrderVendor {
  vendor_id: string
  vendor_name: string
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
  placed_at: string
  vendors?: ApiOrderVendor[]
  vendor_groups?: VendryOrderVendorGroup[]
}

function coerceOrder(api: ApiOrder): VendryOrder {
  if (api.vendor_groups) return api as unknown as VendryOrder
  const vendor_groups: VendryOrderVendorGroup[] = (api.vendors ?? []).map((v) => ({
    vendor_id: v.vendor_id,
    vendor_name: v.vendor_name,
    vendor_slug: v.vendor_slug,
    vendor_verified: v.vendor_verified,
    status: v.status,
    subtotal_cents:
      v.subtotal_cents ??
      v.subtotal ??
      v.items.reduce((s, i) => s + (i.price_cents ?? i.price ?? 0) * (i.qty ?? i.quantity ?? 1), 0),
    items: v.items.map((i) => ({
      id: `${api.id}-${i.product_id}`,
      name: i.name,
      vendor_name: v.vendor_name,
      vendor_slug: v.vendor_slug,
      quantity: i.qty ?? i.quantity ?? 1,
      price_cents: i.price_cents ?? i.price ?? 0,
      image_url: i.image_url ?? i.image,
    })),
    tracking_number: v.tracking_number ?? undefined,
    carrier: v.carrier ?? undefined,
  }))
  return {
    id: api.id,
    display_id: api.display_id ?? api.id.toUpperCase(),
    placed_at: api.placed_at,
    status: api.status,
    total_cents: api.total_cents ?? api.total ?? 0,
    vendor_groups,
  }
}

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

export function Orders() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [orders, setOrders] = useState<VendryOrder[] | null>(null)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('all')

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/orders')
      .then((res) => {
        const data = (res as { data?: { data?: ApiOrder[] } | ApiOrder[] }).data
        const list = Array.isArray(data) ? data : data?.data
        if (!cancelled) setOrders((list ?? []).map(coerceOrder))
      })
      .catch(() => {
        if (!cancelled) setOrders([])
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const loaded = useMemo(() => orders ?? [], [orders])
  const visible = useMemo(
    () => (filter === 'all' ? loaded : loaded.filter((o) => o.status === filter)),
    [loaded, filter],
  )

  return (
    <div className={cm.cn(cm.maxW('full'), cm.mxAuto, cm.sp('p', 8), 'max-w-[1280px] space-y-8')}>
      <div className={cm.cn(cm.stack(2))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-orange-700 dark:text-primary',
          )}
        >
          {t('orders.eyebrow', {}, { defaultValue: 'Your purchases' })}
        </p>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-4xl md:text-5xl tracking-tight font-extrabold text-on-surface',
          )}
        >
          {t('orders.title', {}, { defaultValue: 'Orders, grouped by vendor' })}
        </h1>
        <p className={cm.cn(cm.maxW('xl'), 'text-on-surface-variant text-lg leading-relaxed')}>
          {t(
            'orders.subtitle',
            {},
            {
              defaultValue:
                'See who shipped what, follow tracking per vendor, and never lose a parcel again.',
            },
          )}
        </p>
      </div>

      {/* Filter chips scroll horizontally on narrow screens instead of
          overflowing the page (the only overflow-x>viewport offender). */}
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          '-mx-2 overflow-x-auto px-2 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              'shrink-0 whitespace-nowrap transition-colors',
              filter === value
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
            )}
          >
            {t(`status.${value}`, {}, { defaultValue: label })}
          </button>
        ))}
      </div>

      <div className={cm.cn(cm.stack(4))}>
        {orders === null ? (
          [0, 1].map((i) => (
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
        ) : visible.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('p', 8),
              cm.stack(2),
              'items-center text-center rounded-2xl border border-dashed border-outline-variant bg-surface-container-low',
            )}
          >
            <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
              {t('orders.emptyTitle', {}, { defaultValue: 'No orders here yet' })}
            </p>
            <p className={'text-on-surface-variant text-sm'}>
              {t(
                'orders.emptyBody',
                {},
                {
                  defaultValue:
                    filter === 'all'
                      ? 'Your purchases will appear here after your first checkout.'
                      : 'No orders match this filter yet.',
                },
              )}
            </p>
          </div>
        ) : (
          visible.map((order) => <VendryOrderCard key={order.id} order={order} />)
        )}
      </div>
    </div>
  )
}

export default Orders
