import { useCallback, useEffect, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useParams, useTranslation } from '@molecule/app-react'

interface OrderItem {
  name: string
  quantity: number
  unit_price: number
  modifiers?: Array<{ name: string; option: string; price: number }>
}

interface Order {
  id: string
  restaurant_id: string
  status: string
  subtotal: number
  delivery_fee: number
  service_fee: number
  total: number
  currency: string
  delivery_address: string
  delivery_lat: number
  delivery_lng: number
  estimated_delivery: string
  special_instructions: string
  created_at: string
  items: OrderItem[]
}

interface EtaResponse {
  etaMinutes?: number
  hasDriver?: boolean
  driverLat?: number
  driverLng?: number
}

const STATUS_STEPS = ['placed', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered']

export function OrderTrackingPage() {
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id: orderId } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchOrder = useCallback(async () => {
    if (!orderId) return
    try {
      const res = await http.get<Order>(`/api/orders/${orderId}`)
      setOrder(res.data ?? null)
      const etaRes = await http.get<EtaResponse>(`/api/delivery/${orderId}/eta`)
      setEtaMinutes(typeof etaRes.data?.etaMinutes === 'number' ? etaRes.data.etaMinutes : null)
    } catch (error) {
      logError('fetchOrder', error)
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }, [orderId, http])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  const formatPrice = (cents: number, currency: string) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100)

  const statusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      placed: t('order.statusPlaced', {}, { defaultValue: 'Order Placed' }),
      confirmed: t('order.statusConfirmed', {}, { defaultValue: 'Confirmed' }),
      preparing: t('order.statusPreparing', {}, { defaultValue: 'Preparing' }),
      ready: t('order.statusReady', {}, { defaultValue: 'Ready for Pickup' }),
      picked_up: t('order.statusPickedUp', {}, { defaultValue: 'On the Way' }),
      delivered: t('order.statusDelivered', {}, { defaultValue: 'Delivered' }),
      cancelled: t('order.statusCancelled', {}, { defaultValue: 'Cancelled' }),
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <div className={'loading'}>{t('common.loading', {}, { defaultValue: 'Loading...' })}</div>
    )
  }
  if (!order) {
    return (
      <div className={'error'}>{t('order.notFound', {}, { defaultValue: 'Order not found' })}</div>
    )
  }

  const currentStepIndex = STATUS_STEPS.indexOf(order.status)
  const isActive = !['delivered', 'cancelled'].includes(order.status)

  return (
    <div data-mol-id="page-order-tracking" className={'tracking-page'}>
      <div className={'tracking-header'}>
        <h1>{t('tracking.title', {}, { defaultValue: 'Order Tracking' })}</h1>
        <span className={'tracking-order-id'}>#{order.id.slice(0, 8)}</span>
      </div>

      {isActive && etaMinutes !== null && (
        <div className={'eta-display'}>
          <span className={'eta-label'}>
            {t('tracking.estimatedArrival', {}, { defaultValue: 'Estimated arrival' })}
          </span>
          <span className={'eta-time'}>
            {etaMinutes <= 0
              ? t('tracking.arrivingSoon', {}, { defaultValue: 'Arriving now' })
              : t(
                  'tracking.etaMinutes',
                  { min: etaMinutes },
                  { defaultValue: `${etaMinutes} min` },
                )}
          </span>
        </div>
      )}

      <div className={'tracking-progress'}>
        {STATUS_STEPS.map((step, index) => (
          <div
            key={step}
            className={`progress-step ${index <= currentStepIndex ? 'completed' : ''} ${index === currentStepIndex ? 'current' : ''}`}
          >
            <div className={'step-indicator'}>
              <div className={'step-dot'} />
              {index < STATUS_STEPS.length - 1 && <div className={'step-line'} />}
            </div>
            <span className={'step-label'}>{statusLabel(step)}</span>
          </div>
        ))}
      </div>

      <div className={'tracking-details'}>
        <section className={'order-items-section'}>
          <h2>{t('tracking.orderItems', {}, { defaultValue: 'Order Items' })}</h2>
          <ul className={'order-items-list'}>
            {order.items.map((item, index) => (
              <li key={index} className={'order-item-row'}>
                <span className={'item-quantity'}>{item.quantity}x</span>
                <div className={'item-details'}>
                  <span className={'item-name'}>{item.name}</span>
                </div>
                <span className={'item-price'}>
                  {formatPrice(item.unit_price * item.quantity, order.currency)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className={'order-summary-section'}>
          <h2>{t('form.summary', {}, { defaultValue: 'Summary' })}</h2>
          <div className={'summary-row total-row'}>
            <span>{t('nav.total', {}, { defaultValue: 'Total' })}</span>
            <span>{formatPrice(order.total, order.currency)}</span>
          </div>
        </section>

        <section className={'delivery-address-section'}>
          <h2>{t('tracking.deliveryAddress', {}, { defaultValue: 'Delivery Address' })}</h2>
          <p>{order.delivery_address}</p>
        </section>
      </div>

      <div className={'tracking-actions'}>
        <a href={'/orders'} className={'back-link'}>
          {t('tracking.backToOrders', {}, { defaultValue: 'Back to Orders' })}
        </a>
      </div>
    </div>
  )
}
