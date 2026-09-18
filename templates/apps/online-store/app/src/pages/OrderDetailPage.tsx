// Phase 1 baseline — verbatim JSX of design-online-store-order-detail.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import OrderDetailActionBar from '../components/OrderDetailActionBar.js'
import OrderDetailBreadcrumb from '../components/OrderDetailBreadcrumb.js'
import OrderDetailHeader from '../components/OrderDetailHeader.js'
import OrderItemsCard from '../components/OrderItemsCard.js'
import OrderPaymentMethodCard from '../components/OrderPaymentMethodCard.js'
import OrderSummaryCard from '../components/OrderSummaryCard.js'
import OrderTimelineCard from '../components/OrderTimelineCard.js'
import ShippingInfoCard from '../components/ShippingInfoCard.js'
import StoreFooter from '../components/StoreFooter.js'
import TopNavBar from '../components/TopNavBar.js'
interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  thumbnail?: string
  variant?: string
}
interface ShippingInfo {
  name?: string
  line1?: string
  line2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  carrier?: string
}
interface TimelineEvent {
  status: string
  label: string
  date: string
  completed: boolean
}
interface OrderDetail {
  id: string
  status: string
  created_at: string
  items: OrderItem[]
  subtotal: number
  shipping: number
  tax: number
  total: number
  shippingInfo: ShippingInfo
  timeline: TimelineEvent[]
}
/** Raw order line item as returned by the orders API (both snake_case and camelCase variants). */
interface ApiOrderItem {
  id?: string | number
  product_id?: string | number
  name?: string
  product?: { name?: string; thumbnails?: string[] }
  quantity?: number | string
  unit_price?: number | string
  price?: number | string
  variant_id?: string
}
/** Raw order payload as returned by the orders API. */
interface ApiOrderPayload {
  id?: string | number
  status?: string
  created_at?: string
  createdAt?: string
  items?: ApiOrderItem[]
  subtotal?: number | string
  shipping?: number | string
  tax?: number | string
  total?: number | string
  shipping_address?: ShippingInfo
  shippingAddress?: ShippingInfo
}

function OrderDetailPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setError(t('orderDetail.noOrderId', {}, { defaultValue: 'No order ID provided' }))
      setLoading(false)
      return
    }
    http
      .get(`/api/orders/${id}`)
      .then((res: unknown) => {
        const data = ((res as { data?: unknown } | null)?.data ?? res) as ApiOrderPayload | null
        if (!data?.id) {
          setError(t('orderDetail.notFound', {}, { defaultValue: 'Order not found' }))
          return
        }
        const toCents = (value: unknown): number => {
          if (typeof value === 'number') return Number.isNaN(value) ? 0 : value
          if (typeof value === 'string') {
            const num = parseFloat(value)
            return Number.isNaN(num) ? 0 : num
          }
          return 0
        }
        const shippingAddress = (data.shipping_address ??
          data.shippingAddress ??
          {}) as ShippingInfo
        const apiItems = Array.isArray(data.items) ? data.items : []
        const items: OrderItem[] = apiItems.map((it) => ({
          id: String(it.id ?? it.product_id ?? ''),
          name: String(it.name ?? it.product?.name ?? ''),
          quantity: Number(it.quantity ?? 0),
          price: toCents(it.unit_price ?? it.price),
          thumbnail: Array.isArray(it.product?.thumbnails) ? it.product.thumbnails[0] : undefined,
          variant: it.variant_id ?? undefined,
        }))
        const status = String(data.status ?? 'confirmed').toLowerCase()
        const stages: { key: string; label: string }[] = [
          {
            key: 'confirmed',
            label: t('orderStatus.confirmed', {}, { defaultValue: 'Confirmed' }),
          },
          {
            key: 'processing',
            label: t('orderStatus.processing', {}, { defaultValue: 'Processing' }),
          },
          { key: 'shipped', label: t('orderStatus.shipped', {}, { defaultValue: 'Shipped' }) },
          {
            key: 'delivered',
            label: t('orderStatus.delivered', {}, { defaultValue: 'Delivered' }),
          },
        ]
        const idxOfStatus = stages.findIndex((s) => s.key === status)
        const completedThrough = idxOfStatus < 0 ? 0 : idxOfStatus
        const createdAt = String(data.created_at ?? data.createdAt ?? new Date().toISOString())
        const timeline: TimelineEvent[] = stages.map((s, i) => ({
          status: s.key,
          label: s.label,
          date: i === 0 ? createdAt : '',
          completed: i <= completedThrough,
        }))
        const normalised: OrderDetail = {
          id: String(data.id),
          status,
          created_at: createdAt,
          items,
          subtotal: toCents(data.subtotal),
          shipping: toCents(data.shipping ?? 0),
          tax: toCents(data.tax),
          total: toCents(data.total),
          shippingInfo: shippingAddress,
          timeline,
        }
        setOrder(normalised)
      })
      .catch((err: unknown) =>
        setError(
          (err instanceof Error && err.message) ||
            t('orderDetail.loadError', {}, { defaultValue: 'Failed to load order' }),
        ),
      )
      .finally(() => setLoading(false))
  }, [id, http, t])

  if (loading) {
    return (
      <div className={cm.cn('bg-surface text-foreground antialiased')}>
        <TopNavBar />
        <main
          className={cm.cn(
            cm.mxAuto,
            cm.sp('px', 6),
            cm.flex({ align: 'center', justify: 'center' }),
            'pt-32 pb-24 max-w-[1280px] min-h-[60vh]',
          )}
        >
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {t('orderDetail.loading', {}, { defaultValue: 'Loading order...' })}
          </p>
        </main>
        <StoreFooter />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className={cm.cn('bg-surface text-foreground antialiased')}>
        <TopNavBar />
        <main
          className={cm.cn(
            cm.mxAuto,
            cm.sp('px', 6),
            cm.flex({ align: 'center', justify: 'center' }),
            'pt-32 pb-24 max-w-[1280px] min-h-[60vh]',
          )}
        >
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-error')}>
            {error ?? t('orderDetail.notFound', {}, { defaultValue: 'Order not found' })}
          </p>
        </main>
        <StoreFooter />
      </div>
    )
  }

  return (
    <div className={cm.cn('bg-surface text-foreground antialiased')}>
      <TopNavBar />
      <main className={cm.cn(cm.mxAuto, cm.sp('px', 6), 'pt-32 pb-24 max-w-[1280px]')}>
        {/* Breadcrumbs */}
        <OrderDetailBreadcrumb orderId={order.id} />
        {/* Order Header */}
        <OrderDetailHeader order={order} />
        {/* Main Content Grid */}
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'xl' }), 'lg:grid-cols-3 items-start')}>
          {/* Left Column: Items & Summary */}
          <div className={cm.cn(cm.stack(8), 'lg:col-span-2')}>
            {/* Order Items Card */}
            <OrderItemsCard items={order.items ?? []} />
            {/* Order Summary */}
            <OrderSummaryCard
              subtotal={order.subtotal}
              shipping={order.shipping}
              tax={order.tax}
              total={order.total}
            />
            {/* Action Buttons */}
            <OrderDetailActionBar orderId={order.id} />
          </div>
          {/* Right Column: Shipping, Payment, Timeline */}
          <div className={cm.stack(6)}>
            {/* Shipping Info Card */}
            <ShippingInfoCard shippingInfo={order.shippingInfo ?? {}} />
            {/* Payment Method Card */}
            <OrderPaymentMethodCard />
            {/* Order Timeline Card */}
            <OrderTimelineCard timeline={order.timeline ?? []} />
          </div>
        </div>
      </main>

      <StoreFooter />
    </div>
  )
}

export default OrderDetailPage
export { OrderDetailPage, OrderDetailPage as OrderDetailPagePage }
