import * as React from 'react'
import { type ReactNode, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import OrdersNavBar from '../components/OrdersNavBar.js'
import StoreFooter from '../components/StoreFooter.js'

function OrdersChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <OrdersNavBar />
      {children}
      <StoreFooter />
    </>
  )
}

interface OrderItem {
  name: string
  description: string
  price: number
  image: string
}

export interface Order {
  id: string
  status: 'delivered' | 'shipped' | 'processing' | 'cancelled'
  total: number
  currency: string
  created_at: string
  order_number: string
  items?: OrderItem[]
  delivered_date?: string
  estimated_arrival?: string
  progress?: number
}

export function OrdersPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const cm = getClassMap()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = statusFilter ? `?status=${statusFilter}` : ''
    http
      .get<{ data: Order[] }>(`/api/orders${params}`)
      .then((res) => {
        const fetched = res.data?.data
        const sanitized = Array.isArray(fetched)
          ? fetched.map((order) => ({
              ...order,
              items: Array.isArray(order.items) ? order.items : [],
            }))
          : []
        setOrders(sanitized)
        setLoading(false)
      })
      .catch((_err) => {
        setError(t('orders.fetchError', {}, { defaultValue: 'Failed to load orders.' }))
        setOrders([])
        setLoading(false)
      })
  }, [http, statusFilter, t])

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).format(cents / 100)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()

    if (isToday) {
      return t(
        'orders.todayAt',
        { time: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) },
        { defaultValue: 'Today, {{time}}' },
      )
    }
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const statusBadgeStyle = (status: string) => {
    switch (status) {
      case 'delivered':
        return {
          backgroundColor: 'var(--color-order-delivered-bg)',
          color: 'var(--color-order-delivered-text)',
        }
      case 'shipped':
        return {
          backgroundColor: 'var(--color-order-shipped-bg)',
          color: 'var(--color-order-shipped-text)',
        }
      case 'processing':
        return {
          backgroundColor: 'var(--color-order-processing-bg)',
          color: 'var(--color-order-processing-text)',
        }
      case 'cancelled':
        return {
          backgroundColor: 'var(--color-order-cancelled-bg)',
          color: 'var(--color-order-cancelled-text)',
        }
      default:
        return {
          backgroundColor: 'var(--color-order-default-bg)',
          color: 'var(--color-order-default-text)',
        }
    }
  }

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      delivered: t('order.statusDelivered', {}, { defaultValue: 'Delivered' }),
      shipped: t('order.statusShipped', {}, { defaultValue: 'Shipped' }),
      processing: t('order.statusProcessing', {}, { defaultValue: 'Processing' }),
      cancelled: t('order.statusCancelled', {}, { defaultValue: 'Cancelled' }),
    }
    return labels[status] || status
  }

  const filteredOrders = searchQuery
    ? orders.filter(
        (o) =>
          o.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (Array.isArray(o.items) &&
            o.items.some((item) => item.name?.toLowerCase().includes(searchQuery.toLowerCase()))),
      )
    : orders

  const ordersArray = Array.isArray(orders) ? orders : []
  const totalOrders = ordersArray.length
  const inTransit = ordersArray.filter((o) => o.status === 'shipped').length
  const delivered = ordersArray.filter((o) => o.status === 'delivered').length
  const returns = ordersArray.filter((o) => o.status === 'cancelled').length

  // Loading state - always visible
  if (loading) {
    return (
      <OrdersChrome>
        <div
          data-mol-id="page-orders"
          data-section="page"
          style={{
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            backgroundColor: 'var(--color-surface-secondary)',
            minHeight: '100%',
            padding: '32px 24px',
          }}
          className={cm.cn(cm.flex({ align: 'center', justify: 'center', direction: 'col' }))}
        >
          <div className={cm.spinner({ size: 'lg' })} />
          <p style={{ marginTop: '16px', color: 'var(--color-out-of-stock)', fontSize: '14px' }}>
            {t('orders.loading', {}, { defaultValue: 'Loading your orders...' })}
          </p>
        </div>
      </OrdersChrome>
    )
  }

  return (
    <OrdersChrome>
      <main
        data-mol-id="page-orders"
        data-section="main-content"
        style={{
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: 'var(--color-surface-secondary)',
          width: '100%',
          margin: '0 auto',
          flexGrow: 1,
        }}
      >
        <div style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
          {/* Page Header */}
          <div
            data-mol-id="page-header"
            data-section="order-header"
            style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}
          >
            <div>
              <h1
                style={{
                  fontSize: '30px',
                  fontWeight: 700,
                  color: 'var(--mol-color-secondary)',
                  lineHeight: 1.2,
                  marginBottom: '4px',
                  marginTop: '0',
                }}
              >
                {t('orders.title', {}, { defaultValue: 'My Orders' })}
              </h1>
              <p
                style={{
                  color: 'var(--color-out-of-stock)',
                  fontSize: '14px',
                  marginTop: '4px',
                  marginBottom: '0',
                }}
              >
                {t(
                  'orders.subtitle',
                  {},
                  { defaultValue: 'Track and manage your recent purchases' },
                )}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <span
                  className="material-symbols-outlined"
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-price-original)',
                    fontSize: '18px',
                  }}
                >
                  search
                </span>
                <input
                  data-mol-id="input-search-orders"
                  type="text"
                  style={{
                    paddingLeft: '40px',
                    paddingRight: '16px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-star-empty)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    width: '256px',
                    outline: 'none',
                  }}
                  placeholder={t(
                    'orders.searchPlaceholder',
                    {},
                    { defaultValue: 'Search orders...' },
                  )}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label={t('orders.searchLabel', {}, { defaultValue: 'Search orders' })}
                />
              </div>
              <select
                data-mol-id="select-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-star-empty)',
                  borderRadius: '8px',
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  fontSize: '14px',
                  outline: 'none',
                }}
                aria-label={t('orders.filterByStatus', {}, { defaultValue: 'Filter by status' })}
              >
                <option value="">
                  {t('orders.allOrders', {}, { defaultValue: 'All Orders' })}
                </option>
                <option value="processing">
                  {t('order.statusProcessing', {}, { defaultValue: 'Processing' })}
                </option>
                <option value="shipped">
                  {t('order.statusShipped', {}, { defaultValue: 'Shipped' })}
                </option>
                <option value="delivered">
                  {t('order.statusDelivered', {}, { defaultValue: 'Delivered' })}
                </option>
                <option value="cancelled">
                  {t('order.statusCancelled', {}, { defaultValue: 'Cancelled' })}
                </option>
              </select>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className={cm.alert({ variant: 'warning' })} style={{ marginBottom: '24px' }}>
              <div className={cm.alertContent}>
                <div className={cm.alertTitle}>{error}</div>
              </div>
            </div>
          )}

          {/* Order Stats Grid */}
          <section
            data-mol-id="order-stats"
            data-section="stat-cards"
            className="stat-cards"
            style={{
              backgroundColor: 'var(--color-surface)',
              padding: '24px',
              borderRadius: '12px',
              marginBottom: '40px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '24px',
              }}
            >
              {/* Total Orders */}
              <div
                data-section="stat-card"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border-light)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ color: 'var(--color-status-confirmed)', fontSize: '24px' }}
                  >
                    shopping_bag
                  </span>
                </div>
                <div>
                  <p
                    style={{
                      fontSize: '14px',
                      color: 'var(--color-out-of-stock)',
                      fontWeight: 500,
                      marginBottom: '0',
                      lineHeight: 1.4,
                    }}
                  >
                    {t('orders.totalOrders', {}, { defaultValue: 'Total Orders' })}
                  </p>
                  <p
                    style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: 'var(--mol-color-secondary)',
                      lineHeight: 1.2,
                      marginTop: '2px',
                    }}
                  >
                    {totalOrders}
                  </p>
                </div>
              </div>
              {/* In Transit */}
              <div
                data-section="stat-card"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border-light)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-shipping-icon-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ color: 'var(--color-accent-dark)', fontSize: '24px' }}
                  >
                    local_shipping
                  </span>
                </div>
                <div>
                  <p
                    style={{
                      fontSize: '14px',
                      color: 'var(--color-out-of-stock)',
                      fontWeight: 500,
                      marginBottom: '0',
                      lineHeight: 1.4,
                    }}
                  >
                    {t('orders.inTransit', {}, { defaultValue: 'In Transit' })}
                  </p>
                  <p
                    style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: 'var(--mol-color-secondary)',
                      lineHeight: 1.2,
                      marginTop: '2px',
                    }}
                  >
                    {inTransit}
                  </p>
                </div>
              </div>
              {/* Delivered */}
              <div
                data-section="stat-card"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border-light)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ color: 'var(--color-in-stock)', fontSize: '24px' }}
                  >
                    check_circle
                  </span>
                </div>
                <div>
                  <p
                    style={{
                      fontSize: '14px',
                      color: 'var(--color-out-of-stock)',
                      fontWeight: 500,
                      marginBottom: '0',
                      lineHeight: 1.4,
                    }}
                  >
                    {t('orders.delivered', {}, { defaultValue: 'Delivered' })}
                  </p>
                  <p
                    style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: 'var(--mol-color-secondary)',
                      lineHeight: 1.2,
                      marginTop: '2px',
                    }}
                  >
                    {delivered}
                  </p>
                </div>
              </div>
              {/* Returns */}
              <div
                data-section="stat-card"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border-light)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-surface-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ color: 'var(--mol-color-text-secondary)', fontSize: '24px' }}
                  >
                    undo
                  </span>
                </div>
                <div>
                  <p
                    style={{
                      fontSize: '14px',
                      color: 'var(--color-out-of-stock)',
                      fontWeight: 500,
                      marginBottom: '0',
                      lineHeight: 1.4,
                    }}
                  >
                    {t('orders.returns', {}, { defaultValue: 'Returns' })}
                  </p>
                  <p
                    style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: 'var(--mol-color-secondary)',
                      lineHeight: 1.2,
                      marginTop: '2px',
                    }}
                  >
                    {returns}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Orders List */}
          <section
            data-mol-id="orders"
            data-section="orders-list"
            role="main"
            className="orders-list"
            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
          >
            <div
              className="order-cards"
              style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
            >
              {!Array.isArray(filteredOrders) || filteredOrders.length === 0 ? (
                <div
                  className={cm.emptyState}
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    padding: '48px',
                    borderRadius: '12px',
                    border: '1px solid var(--color-border-light)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    overflow: 'hidden',
                  }}
                >
                  <div className={cm.emptyStateIcon}>
                    <svg
                      width={18}
                      height={18}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
                      />
                    </svg>
                  </div>
                  <div className={cm.emptyStateTitle}>
                    {t('orders.empty', {}, { defaultValue: 'No orders found' })}
                  </div>
                  <div className={cm.emptyStateDescription}>
                    {searchQuery || statusFilter
                      ? t(
                          'orders.emptyFiltered',
                          {},
                          {
                            defaultValue:
                              'Try adjusting your search or filter criteria to find what you are looking for.',
                          },
                        )
                      : t(
                          'orders.emptyHint',
                          {},
                          {
                            defaultValue:
                              'When you place an order, it will appear here. Start shopping to see your order history.',
                          },
                        )}
                  </div>
                  {!searchQuery && !statusFilter && (
                    <div className={cm.emptyStateAction}>
                      <Link
                        to="/"
                        data-mol-id="link-start-shopping"
                        className={cm.button({ variant: 'solid', color: 'primary' })}
                      >
                        {t('orders.startShopping', {}, { defaultValue: 'Start Shopping' })}
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                filteredOrders.map((order) => {
                  // Safely get items array
                  const items = Array.isArray(order.items) ? order.items : []
                  const itemCount = items.length

                  return (
                    <article
                      key={order.id}
                      data-section="order-card"
                      className="order-card"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        borderRadius: '12px',
                        border: '1px solid var(--color-border-light)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        overflow: 'hidden',
                        opacity: order.status === 'cancelled' ? 0.8 : 1,
                      }}
                    >
                      {/* Order Header */}
                      <div
                        data-section="order-header"
                        style={{
                          padding: '16px 24px',
                          backgroundColor: 'rgba(249, 250, 251, 0.5)',
                          borderBottom: '1px solid var(--color-border-light)',
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '16px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                          <div>
                            <p
                              style={{
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: 'var(--color-out-of-stock)',
                                fontWeight: 600,
                                marginBottom: '4px',
                                marginTop: '0',
                              }}
                            >
                              {t('orders.orderPlaced', {}, { defaultValue: 'Order Placed' })}
                            </p>
                            <p
                              style={{
                                fontSize: '14px',
                                fontWeight: 500,
                                color: 'var(--mol-color-secondary)',
                                marginBottom: '0',
                                marginTop: '0',
                              }}
                            >
                              {formatDate(order.created_at)}
                            </p>
                          </div>
                          <div>
                            <p
                              style={{
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: 'var(--color-out-of-stock)',
                                fontWeight: 600,
                                marginBottom: '4px',
                                marginTop: '0',
                              }}
                            >
                              {t('nav.total', {}, { defaultValue: 'Total' })}
                            </p>
                            <p
                              style={{
                                fontSize: '14px',
                                fontWeight: 700,
                                color: 'var(--mol-color-secondary)',
                                fontVariantNumeric: 'tabular-nums',
                                marginBottom: '0',
                                marginTop: '0',
                              }}
                            >
                              {formatPrice(order.total || 0, order.currency || 'USD')}
                            </p>
                          </div>
                          <div>
                            <p
                              style={{
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: 'var(--color-out-of-stock)',
                                fontWeight: 600,
                                marginBottom: '4px',
                                marginTop: '0',
                              }}
                            >
                              {t('orders.orderNumber', {}, { defaultValue: 'Order #' })}
                            </p>
                            <p
                              style={{
                                fontSize: '14px',
                                fontWeight: 500,
                                color: 'var(--mol-color-secondary)',
                                marginBottom: '0',
                                marginTop: '0',
                              }}
                            >
                              {order.order_number || '-'}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              padding: '4px 12px',
                              borderRadius: '9999px',
                              fontSize: '12px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.025em',
                              ...statusBadgeStyle(order.status),
                            }}
                          >
                            {statusLabel(order.status)}
                          </span>
                        </div>
                      </div>

                      {/* Order Content */}
                      <div style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '16px',
                              flexGrow: 1,
                            }}
                          >
                            {/* Order Items */}
                            {itemCount === 0 ? (
                              <p style={{ color: 'var(--color-out-of-stock)', fontSize: '14px' }}>
                                {t(
                                  'orders.noItems',
                                  {},
                                  { defaultValue: 'No items in this order' },
                                )}
                              </p>
                            ) : itemCount <= 2 ? (
                              // Show individual items for orders with 1-2 items
                              items.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '16px' }}>
                                  <img
                                    src={
                                      item.image ||
                                      `https://picsum.photos/seed/order-${order.id}-${idx}/64/64`
                                    }
                                    alt={item.name || ''}
                                    style={{
                                      width: '64px',
                                      height: '64px',
                                      borderRadius: '8px',
                                      objectFit: 'cover',
                                      border: '1px solid var(--color-border-light)',
                                      filter:
                                        order.status === 'cancelled' ? 'grayscale(100%)' : 'none',
                                    }}
                                  />
                                  <div style={{ flexGrow: 1 }}>
                                    <h4
                                      style={{
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        color: 'var(--mol-color-secondary)',
                                      }}
                                    >
                                      {item.name || 'Unknown Item'}
                                    </h4>
                                    {item.description && (
                                      <p
                                        style={{
                                          fontSize: '12px',
                                          color: 'var(--color-out-of-stock)',
                                          marginTop: '4px',
                                          overflow: 'hidden',
                                          display: '-webkit-box',
                                          WebkitLineClamp: 1,
                                          WebkitBoxOrient: 'vertical' as const,
                                        }}
                                      >
                                        {item.description}
                                      </p>
                                    )}
                                    <p
                                      style={{
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        marginTop: '4px',
                                        fontVariantNumeric: 'tabular-nums',
                                      }}
                                    >
                                      {formatPrice(item.price || 0, order.currency || 'USD')}
                                    </p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              // Show stacked images for orders with 3+ items
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ display: 'flex' }}>
                                  {items.slice(0, 3).map((item, idx) => (
                                    <img
                                      key={idx}
                                      src={
                                        item.image ||
                                        `https://picsum.photos/seed/order-${order.id}-${idx}/48/48`
                                      }
                                      alt={item.name || ''}
                                      style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '8px',
                                        objectFit: 'cover',
                                        border: '2px solid var(--color-surface)',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                        outline: '1px solid var(--color-border-light)',
                                        marginLeft: idx === 0 ? 0 : '-12px',
                                        zIndex: items.length - idx,
                                        position: 'relative',
                                      }}
                                    />
                                  ))}
                                </div>
                                <div style={{ marginLeft: '16px' }}>
                                  <h4
                                    style={{
                                      fontSize: '14px',
                                      fontWeight: 600,
                                      color: 'var(--mol-color-secondary)',
                                    }}
                                  >
                                    {items[0]?.name || 'Unknown Item'}{' '}
                                    {t('orders.andOthers', {}, { defaultValue: 'and' })}{' '}
                                    {itemCount - 1}{' '}
                                    {t('orders.otherItems', {}, { defaultValue: 'other items' })}
                                  </h4>
                                  <p
                                    style={{
                                      fontSize: '12px',
                                      color: 'var(--color-out-of-stock)',
                                      marginTop: '4px',
                                    }}
                                  >
                                    {t(
                                      'orders.preparingShipment',
                                      {},
                                      { defaultValue: 'Preparing for shipment' },
                                    )}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Shipping Progress (for shipped orders) */}
                            {order.status === 'shipped' && order.progress && (
                              <div style={{ marginTop: '16px', maxWidth: '448px' }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '11px',
                                    marginBottom: '8px',
                                  }}
                                >
                                  <span style={{ color: 'var(--color-out-of-stock)' }}>
                                    {t(
                                      'order.statusProcessing',
                                      {},
                                      { defaultValue: 'Processing' },
                                    )}
                                  </span>
                                  <span style={{ color: 'var(--color-in-stock)', fontWeight: 500 }}>
                                    {t('orders.inTransit', {}, { defaultValue: 'In Transit' })}
                                  </span>
                                  <span style={{ color: 'var(--color-out-of-stock)' }}>
                                    {t('order.statusDelivered', {}, { defaultValue: 'Delivered' })}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    height: '8px',
                                    backgroundColor: 'var(--color-border-light)',
                                    borderRadius: '9999px',
                                    overflow: 'hidden',
                                  }}
                                >
                                  <div
                                    style={{
                                      height: '100%',
                                      backgroundColor: 'var(--color-in-stock)',
                                      width: `${order.progress}%`,
                                      borderRadius: '9999px',
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'flex-end',
                              gap: '12px',
                              minWidth: '140px',
                            }}
                          >
                            {order.status === 'delivered' && (
                              <button
                                type="button"
                                onClick={() => navigate(`/orders/${order.id}`)}
                                style={{
                                  padding: '8px 16px',
                                  backgroundColor: 'var(--color-in-stock)',
                                  color: 'var(--color-surface)',
                                  fontSize: '14px',
                                  fontWeight: 600,
                                  borderRadius: '6px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  textAlign: 'center',
                                }}
                              >
                                {t('orders.viewDetails', {}, { defaultValue: 'View Details' })}
                              </button>
                            )}
                            {(order.status === 'shipped' ||
                              order.status === 'processing' ||
                              order.status === 'cancelled') && (
                              <button
                                type="button"
                                onClick={() => navigate(`/orders/${order.id}`)}
                                style={{
                                  padding: '8px 16px',
                                  backgroundColor: 'var(--color-surface)',
                                  color: 'var(--color-label-text)',
                                  fontSize: '14px',
                                  fontWeight: 600,
                                  borderRadius: '6px',
                                  border: '1px solid var(--color-star-empty)',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  textAlign: 'center',
                                }}
                              >
                                {t('orders.viewDetails', {}, { defaultValue: 'View Details' })}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Footer info */}
                        {(order.delivered_date || order.estimated_arrival) && (
                          <div
                            style={{
                              marginTop: '24px',
                              paddingTop: '16px',
                              borderTop: '1px solid var(--color-border-light)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '14px',
                              color: 'var(--mol-color-text-secondary)',
                            }}
                          >
                            {order.status === 'delivered' ? (
                              <>
                                <span
                                  className="material-symbols-outlined"
                                  style={{ color: 'var(--color-in-stock)', fontSize: '20px' }}
                                >
                                  check_circle
                                </span>
                                <span>
                                  {t('orders.deliveredOn', {}, { defaultValue: 'Delivered on' })}{' '}
                                  {order.delivered_date}
                                </span>
                              </>
                            ) : order.status === 'shipped' ? (
                              <>
                                <span
                                  className="material-symbols-outlined"
                                  style={{
                                    color: 'var(--color-status-confirmed)',
                                    fontSize: '20px',
                                  }}
                                >
                                  local_shipping
                                </span>
                                <span>
                                  {t('orders.arrivingBy', {}, { defaultValue: 'Arriving by' })}{' '}
                                  {order.estimated_arrival}
                                </span>
                              </>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          </section>

          {Array.isArray(filteredOrders) && filteredOrders.length > 0 && (
            <p
              data-mol-id="orders-summary"
              style={{
                marginTop: '48px',
                fontSize: '14px',
                color: 'var(--color-out-of-stock)',
                fontWeight: 500,
                textAlign: 'center',
                borderTop: '1px solid var(--color-border-light)',
                paddingTop: '32px',
              }}
            >
              {t(
                'orders.showingResults',
                { count: filteredOrders.length, total: totalOrders },
                { defaultValue: `Showing ${filteredOrders.length} of ${totalOrders} orders` },
              )}
            </p>
          )}
        </div>
      </main>
    </OrdersChrome>
  )
}
