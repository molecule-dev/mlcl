import { useCallback, useEffect, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'

interface AvailableOrder {
  id: string
  restaurant?: { name?: string; address?: string; latitude?: number; longitude?: number }
  delivery_address: string
  delivery_lat: number
  delivery_lng: number
  total: number
  delivery_fee: number
  currency: string
  items?: Array<{ name: string; quantity: number }>
  pickup_distance?: { km: number; duration?: string } | null
}

interface ActiveDelivery {
  id: string
  restaurant_id: string
  delivery_address: string
  delivery_lat: number
  delivery_lng: number
  total: number
  currency: string
  status: string
  customer_id: string
}

interface DeliveryStats {
  todayDeliveries: number
  todayEarnings: number
  rating: number
}

function unwrap<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[]
  if (
    res &&
    typeof res === 'object' &&
    'data' in res &&
    Array.isArray((res as { data: unknown }).data)
  ) {
    return (res as { data: T[] }).data
  }
  return []
}

export function DriverDashboardPage() {
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tab, setTab] = useState<'available' | 'active' | 'history'>('available')
  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([])
  const [activeDeliveries, setActiveDeliveries] = useState<ActiveDelivery[]>([])
  const [stats] = useState<DeliveryStats>({ todayDeliveries: 0, todayEarnings: 0, rating: 0 })
  const [loading, setLoading] = useState(true)

  const fetchAvailable = useCallback(async () => {
    try {
      const res = await http.get<AvailableOrder[] | { data: AvailableOrder[] }>(
        '/api/delivery/available',
      )
      setAvailableOrders(unwrap<AvailableOrder>(res.data))
    } catch (error) {
      logError('fetchAvailable', error)
      setAvailableOrders([])
    } finally {
      setLoading(false)
    }
  }, [http])

  const fetchActive = useCallback(async () => {
    try {
      const res = await http.get<ActiveDelivery[] | { data: ActiveDelivery[] }>(
        '/api/delivery/active',
      )
      setActiveDeliveries(unwrap<ActiveDelivery>(res.data))
    } catch (error) {
      logError('fetchActive', error)
      setActiveDeliveries([])
    }
  }, [http])

  useEffect(() => {
    fetchAvailable()
    fetchActive()
  }, [fetchAvailable, fetchActive])

  const acceptDelivery = async (orderId: string) => {
    await http.post(`/api/delivery/${orderId}/accept`, {})
    await fetchAvailable()
    await fetchActive()
    setTab('active')
  }

  const completeDelivery = async (orderId: string) => {
    await http.post(`/api/delivery/${orderId}/complete`, {})
    await fetchActive()
  }

  const formatPrice = (cents: number, currency: string) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100)

  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)}m`
    return `${km.toFixed(1)}km`
  }

  return (
    <div data-mol-id="page-driver-dashboard" className={'driver-dashboard'}>
      <header className={'driver-header'}>
        <h1>{t('driver.dashboard', {}, { defaultValue: 'Driver Dashboard' })}</h1>
        <div className={'driver-stats'}>
          <div className={'stat-card'}>
            <span className={'stat-value'}>{stats.todayDeliveries}</span>
            <span className={'stat-label'}>
              {t('driver.todayDeliveries', {}, { defaultValue: 'Deliveries Today' })}
            </span>
          </div>
          <div className={'stat-card'}>
            <span className={'stat-value'}>{formatPrice(stats.todayEarnings, 'USD')}</span>
            <span className={'stat-label'}>
              {t('driver.todayEarnings', {}, { defaultValue: 'Earnings Today' })}
            </span>
          </div>
          <div className={'stat-card'}>
            <span className={'stat-value'}>
              <span className={'star-icon'} aria-hidden="true">
                &#9733;
              </span>
              {stats.rating > 0 ? stats.rating.toFixed(1) : '--'}
            </span>
            <span className={'stat-label'}>{t('form.rating', {}, { defaultValue: 'Rating' })}</span>
          </div>
        </div>
      </header>

      <nav className={'driver-tabs'}>
        <button
          data-mol-id="button-available"
          className={`tab-btn ${tab === 'available' ? 'active' : ''}`}
          onClick={() => setTab('available')}
        >
          {t('driver.available', {}, { defaultValue: 'Available' })}
          {availableOrders.length > 0 && (
            <span className={'tab-badge'}>{availableOrders.length}</span>
          )}
        </button>
        <button
          data-mol-id="button-active"
          className={`tab-btn ${tab === 'active' ? 'active' : ''}`}
          onClick={() => setTab('active')}
        >
          {t('status.active', {}, { defaultValue: 'Active' })}
          {activeDeliveries.length > 0 && (
            <span className={'tab-badge'}>{activeDeliveries.length}</span>
          )}
        </button>
        <button
          data-mol-id="button-history"
          className={`tab-btn ${tab === 'history' ? 'active' : ''}`}
          onClick={() => setTab('history')}
        >
          {t('nav.history', {}, { defaultValue: 'History' })}
        </button>
      </nav>

      {tab === 'available' && (
        <div className={'order-list'}>
          {loading ? (
            <div className={'loading'}>
              {t('common.loading', {}, { defaultValue: 'Loading...' })}
            </div>
          ) : availableOrders.length === 0 ? (
            <div className={'empty-state'}>
              <p>{t('driver.noOrders', {}, { defaultValue: 'No available orders nearby' })}</p>
            </div>
          ) : (
            availableOrders.map((order) => (
              <div key={order.id} className={'delivery-card'}>
                <div className={'delivery-card-header'}>
                  <span className={'restaurant-name'}>{order.restaurant?.name}</span>
                  <span className={'delivery-fee'}>
                    {formatPrice(order.delivery_fee, order.currency)}
                  </span>
                </div>
                <div className={'delivery-card-body'}>
                  <div className={'delivery-route'}>
                    <div className={'route-point pickup'}>
                      <span className={'route-label'}>
                        {t('driver.pickup', {}, { defaultValue: 'Pickup' })}
                      </span>
                      <span className={'route-address'}>{order.restaurant?.address}</span>
                      {order.pickup_distance && (
                        <span className={'route-distance'}>
                          {formatDistance(order.pickup_distance.km)}
                        </span>
                      )}
                    </div>
                    <div className={'route-point dropoff'}>
                      <span className={'route-label'}>
                        {t('driver.dropoff', {}, { defaultValue: 'Drop-off' })}
                      </span>
                      <span className={'route-address'}>{order.delivery_address}</span>
                    </div>
                  </div>
                </div>
                <button
                  data-mol-id="button-accept-delivery"
                  className={'accept-btn'}
                  onClick={() => acceptDelivery(order.id)}
                >
                  {t('driver.acceptDelivery', {}, { defaultValue: 'Accept Delivery' })}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'active' && (
        <div className={'order-list'}>
          {activeDeliveries.length === 0 ? (
            <div className={'empty-state'}>
              <p>{t('driver.noActive', {}, { defaultValue: 'No active deliveries' })}</p>
            </div>
          ) : (
            activeDeliveries.map((delivery) => (
              <div key={delivery.id} className={'delivery-card active-delivery'}>
                <div className={'delivery-card-header'}>
                  <span className={'delivery-status'}>
                    {t('driver.enRoute', {}, { defaultValue: 'En Route' })}
                  </span>
                  <span className={'delivery-total'}>
                    {formatPrice(delivery.total, delivery.currency)}
                  </span>
                </div>
                <div className={'delivery-card-body'}>
                  <div className={'route-point dropoff'}>
                    <span className={'route-label'}>
                      {t('driver.dropoff', {}, { defaultValue: 'Drop-off' })}
                    </span>
                    <span className={'route-address'}>{delivery.delivery_address}</span>
                  </div>
                </div>
                <button
                  data-mol-id="button-complete-delivery"
                  className={'complete-btn'}
                  onClick={() => completeDelivery(delivery.id)}
                >
                  {t('driver.completeDelivery', {}, { defaultValue: 'Mark as Delivered' })}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className={'order-list'}>
          <div className={'empty-state'}>
            <p>{t('driver.loadingHistory', {}, { defaultValue: 'Loading delivery history...' })}</p>
          </div>
        </div>
      )}
    </div>
  )
}
