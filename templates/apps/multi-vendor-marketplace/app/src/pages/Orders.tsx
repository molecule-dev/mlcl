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

const FALLBACK_ORDERS: VendryOrder[] = [
  {
    id: 'ord-1',
    display_id: 'VND-3401',
    placed_at: '2026-04-25T12:14:00Z',
    status: 'shipped',
    total_cents: 24000,
    vendor_groups: [
      {
        vendor_id: 'mira',
        vendor_name: 'Mira & Co. Ceramics',
        vendor_slug: 'mira-co-ceramics',
        vendor_verified: true,
        status: 'shipped',
        subtotal_cents: 14400,
        tracking_number: '1Z 9871 4422 0019',
        carrier: 'UPS',
        items: [
          {
            id: 'ord-1-i-1',
            name: 'Sienna Stoneware Mug',
            vendor_name: 'Mira & Co.',
            quantity: 1,
            price_cents: 4800,
          },
          {
            id: 'ord-1-i-2',
            name: 'Speckled Espresso Cup',
            vendor_name: 'Mira & Co.',
            quantity: 2,
            price_cents: 2200,
          },
        ],
      },
      {
        vendor_id: 'oak',
        vendor_name: 'Oak & Saint',
        vendor_slug: 'oak-and-saint',
        vendor_verified: true,
        status: 'paid',
        subtotal_cents: 9600,
        items: [
          {
            id: 'ord-1-i-3',
            name: 'Walnut Cutting Board',
            vendor_name: 'Oak & Saint',
            quantity: 1,
            price_cents: 9200,
          },
        ],
      },
    ],
  },
  {
    id: 'ord-2',
    display_id: 'VND-3370',
    placed_at: '2026-04-12T08:42:00Z',
    status: 'delivered',
    total_cents: 14000,
    vendor_groups: [
      {
        vendor_id: 'noor',
        vendor_name: 'Noor Textiles',
        vendor_slug: 'noor-textiles',
        vendor_verified: true,
        status: 'delivered',
        subtotal_cents: 14000,
        items: [
          {
            id: 'ord-2-i-1',
            name: 'Block-Print Cotton Throw',
            vendor_name: 'Noor Textiles',
            quantity: 1,
            price_cents: 14000,
          },
        ],
      },
    ],
  },
  {
    id: 'ord-3',
    display_id: 'VND-3296',
    placed_at: '2026-03-30T16:00:00Z',
    status: 'cancelled',
    total_cents: 4800,
    vendor_groups: [
      {
        vendor_id: 'foundry',
        vendor_name: 'Foundry & Fern',
        vendor_slug: 'foundry-and-fern',
        status: 'cancelled',
        subtotal_cents: 4800,
        items: [
          {
            id: 'ord-3-i-1',
            name: 'Brass Stem Vase Trio',
            vendor_name: 'Foundry & Fern',
            quantity: 1,
            price_cents: 4800,
          },
        ],
      },
    ],
  },
]

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
  const [orders, setOrders] = useState<VendryOrder[]>(FALLBACK_ORDERS)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('all')

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/orders')
      .then((res) => {
        const data = (res as { data?: { data?: ApiOrder[] } | ApiOrder[] }).data
        const list = Array.isArray(data) ? data : data?.data
        if (!cancelled && list?.length) setOrders(list.map(coerceOrder))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http])

  const visible = useMemo(
    () => (filter === 'all' ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter],
  )

  return (
    <div className={cm.cn(cm.maxW('full'), cm.mxAuto, cm.sp('p', 8), 'max-w-[1280px] space-y-8')}>
      <header className={cm.cn(cm.stack(2))}>
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
      </header>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
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
              'transition-colors',
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
        {visible.length === 0 ? (
          <p className="text-on-surface-variant">
            {t('orders.empty', {}, { defaultValue: 'No orders match this filter yet.' })}
          </p>
        ) : (
          visible.map((order) => <VendryOrderCard key={order.id} order={order} />)
        )}
      </div>
    </div>
  )
}

export default Orders
