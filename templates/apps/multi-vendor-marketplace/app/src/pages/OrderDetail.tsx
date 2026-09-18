import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

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
  placed_at: string
  vendors?: ApiOrderVendor[]
}

function coerceOrder(api: ApiOrder): VendryOrder {
  const vendor_groups: VendryOrderVendorGroup[] = (api.vendors ?? []).map((v) => ({
    vendor_id: v.vendor_id || 'unknown',
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
    placed_at: api.placed_at,
    status: api.status,
    total_cents: api.total_cents ?? Math.round((api.total ?? 0) * 100),
    vendor_groups,
  }
}

const FALLBACK_ORDER: VendryOrder = {
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
          id: 'a',
          name: 'Sienna Stoneware Mug',
          vendor_name: 'Mira & Co.',
          quantity: 1,
          price_cents: 4800,
        },
        {
          id: 'b',
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
          id: 'c',
          name: 'Walnut Heirloom Cutting Board',
          vendor_name: 'Oak & Saint',
          quantity: 1,
          price_cents: 9200,
        },
      ],
    },
  ],
}

const TIMELINE_STEPS = [
  { id: 'placed', label: 'Order placed', icon: 'shopping_cart' },
  { id: 'paid', label: 'Payment captured', icon: 'paid' },
  { id: 'fulfilled', label: 'Vendors notified', icon: 'storefront' },
  { id: 'shipped', label: 'In transit', icon: 'local_shipping' },
  { id: 'delivered', label: 'Delivered', icon: 'home' },
] as const

/** How far along the timeline each order status reaches (index into TIMELINE_STEPS). */
const STATUS_PROGRESS: Record<VendryOrderStatus, number> = {
  pending: 0,
  paid: 2,
  processing: 2,
  shipped: 3,
  delivered: 4,
  cancelled: 1,
  refunded: 1,
}

export function OrderDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<VendryOrder>({
    ...FALLBACK_ORDER,
    id: id || FALLBACK_ORDER.id,
  })

  useEffect(() => {
    if (!id) return
    let cancelled = false
    http
      .get<ApiOrder | { data?: ApiOrder }>(`/api/orders/${encodeURIComponent(id)}`)
      .then((res) => {
        const raw = (res as { data?: unknown }).data ?? res
        const body =
          raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)
            ? ((raw as { data?: ApiOrder }).data as ApiOrder | undefined)
            : (raw as ApiOrder | undefined)
        if (!cancelled && body) setOrder(coerceOrder(body))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http, id])

  return (
    <div className={cm.cn(cm.maxW('full'), cm.mxAuto, cm.sp('p', 8), 'max-w-[1280px] space-y-8')}>
      <Link
        to="/orders"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('sm'),
          'text-on-surface-variant hover:text-primary',
        )}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden>
          arrow_back
        </span>
        {t('orderDetail.backToOrders', {}, { defaultValue: 'Back to all orders' })}
      </Link>

      <header className={cm.cn(cm.stack(2))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-orange-700 dark:text-primary',
          )}
        >
          {t('orderDetail.eyebrow', {}, { defaultValue: 'Order detail' })}
        </p>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-4xl tracking-tight font-extrabold text-on-surface',
          )}
        >
          <span className="font-mono">{order.display_id}</span>
        </h1>
        <p className={'text-on-surface-variant text-lg'}>
          {t(
            'orderDetail.summary',
            {
              date: new Date(order.placed_at).toLocaleDateString(),
              vendorCount: order.vendor_groups.length,
            },
            {
              defaultValue: 'Placed {{date}} · {{vendorCount}} vendor(s) · multi-vendor fulfilment',
            },
          )}
        </p>
      </header>

      {/* Timeline */}
      <section
        className={cm.cn(cm.sp('p', 6), 'rounded-3xl border border-outline-variant bg-surface')}
      >
        <h2 className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 4), 'text-xl text-on-surface')}>
          {t('orderDetail.timelineTitle', {}, { defaultValue: 'Order journey' })}
        </h2>
        <ol className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }), 'overflow-x-auto')}>
          {TIMELINE_STEPS.map((step, idx) => {
            const progress = STATUS_PROGRESS[order.status] ?? 0
            const complete = idx <= progress
            // The order record only carries the placed timestamp — show it on
            // the milestones that happen at checkout time; later milestones
            // are tracked per-vendor (see the tracking rows below).
            const date = complete && idx <= 2 ? new Date(order.placed_at).toLocaleDateString() : ''
            return (
              <li
                key={step.id}
                className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }), 'flex-1 min-w-[180px]')}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-10 w-10 shrink-0 rounded-full transition-colors',
                    complete
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-high text-on-surface-variant',
                  )}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: '20px',
                      fontVariationSettings: complete ? "'FILL' 1" : "'FILL' 0",
                    }}
                    aria-hidden
                  >
                    {step.icon}
                  </span>
                </span>
                <div className={cm.cn(cm.stack(1))}>
                  <p
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      complete ? 'text-on-surface' : 'text-on-surface-variant',
                    )}
                  >
                    {t(`orderDetail.timeline.${step.id}`, {}, { defaultValue: step.label })}
                  </p>
                  {date && (
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{date}</p>
                  )}
                </div>
                {idx < TIMELINE_STEPS.length - 1 && (
                  <span
                    className={cm.cn(
                      'mt-5 h-0.5 flex-1',
                      complete ? 'bg-primary' : 'bg-outline-variant',
                    )}
                    aria-hidden
                  />
                )}
              </li>
            )
          })}
        </ol>
      </section>

      <VendryOrderCard order={order} hideDetailLink />

      {/* Help footer */}
      <section
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center', wrap: 'wrap', gap: 'md' }),
          cm.sp('p', 6),
          'rounded-3xl border border-outline-variant bg-surface-container-low',
        )}
      >
        <div>
          <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
            {t('orderDetail.helpTitle', {}, { defaultValue: 'Something off with this order?' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'orderDetail.helpBody',
              { appName: APP_NAME },
              { defaultValue: '{{appName}} support replies within 4 hours, even on weekends.' },
            )}
          </p>
        </div>
        <a
          href={`mailto:support@vendry.test?subject=${encodeURIComponent('Order ' + order.display_id)}`}
          data-testid="order-detail-contact"
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.roundedFull,
            'border border-primary text-orange-700 dark:text-primary hover:bg-primary hover:text-on-primary transition-colors',
          )}
        >
          {t('orderDetail.helpCta', {}, { defaultValue: 'Contact support' })}
        </a>
      </section>
    </div>
  )
}

export default OrderDetail
