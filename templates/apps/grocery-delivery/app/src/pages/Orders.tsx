import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface OrderItem {
  id: string
  product_id: string
  quantity: number
  qty?: number
  substitution_preference?: string | null
  substitution_pref?: string | null
}

interface Order {
  id: string
  status: 'placed' | 'shopping' | 'packed' | 'on_the_way' | 'delivered' | 'cancelled'
  placed_at: string
  delivered_at: string | null
  total_cents: number
  item_count: number
  delivery_slot: string
  preview_items: string[]
  items?: OrderItem[]
}

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const STATUS_BADGE: Record<Order['status'], string> = {
  placed: 'bg-info/10 text-info',
  shopping: 'bg-warning/10 text-warning',
  packed: 'bg-warning/10 text-warning',
  on_the_way: 'bg-primary/10 text-primary-dark',
  delivered: 'bg-success/10 text-success',
  cancelled: 'bg-error/10 text-error',
}

export function Orders() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reordering, setReordering] = useState<string | null>(null)

  async function handleReorder(order: Order): Promise<void> {
    if (!order.items || order.items.length === 0) {
      navigate('/shop')
      return
    }
    setReordering(order.id)
    try {
      for (const item of order.items) {
        await http
          .post('/api/cart/items', {
            productId: item.product_id,
            quantity: item.qty ?? item.quantity,
            substitutionPreference:
              item.substitution_pref ?? item.substitution_preference ?? 'best_match',
          })
          .catch(() => null)
      }
      navigate('/cart')
    } finally {
      setReordering(null)
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/orders')
      .then((res) => {
        if (!cancelled) setOrders(unwrapList<Order>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('orders.loadError', {}, { defaultValue: 'Failed to load orders.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
        {t('orders.heading', {}, { defaultValue: 'Your orders' })}
      </h1>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : orders.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 20), cm.textCenter, cm.textMuted)}>
          <p className={cm.cn(cm.textSize('lg'))}>
            {t('orders.empty', {}, { defaultValue: 'No orders yet.' })}
          </p>
          <Link
            to="/shop"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.sp('mt', 4),
              cm.fontWeight('semibold'),
              'inline-block bg-primary text-on-primary rounded-full hover:bg-primary-hover',
            )}
          >
            {t('orders.shopCta', {}, { defaultValue: 'Start shopping' })}
          </Link>
        </div>
      ) : (
        <ul className={'space-y-3'}>
          {orders.map((order) => {
            const isActive = order.status !== 'delivered' && order.status !== 'cancelled'
            return (
              <li
                key={order.id}
                className={cm.cn(
                  cm.sp('p', 5),
                  cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                  'bg-surface rounded-xl shadow-sm',
                )}
              >
                <div className={'flex-1 min-w-0'}>
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                      {t(
                        'orders.itemCount',
                        { count: order.item_count },
                        { defaultValue: '{{count}} items' },
                      )}
                    </h2>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.textSize('xs'),
                        cm.fontWeight('medium'),
                        'rounded-full',
                        STATUS_BADGE[order.status],
                      )}
                    >
                      {t(
                        `orders.status.${order.status}`,
                        {},
                        { defaultValue: order.status.replace('_', ' ') },
                      )}
                    </span>
                  </div>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant truncate')}>
                    {order.preview_items.join(', ')}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), cm.textMuted)}>
                    {fmtDate(order.placed_at)} · {order.delivery_slot} · {fmt(order.total_cents)}
                  </p>
                </div>
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  {isActive ? (
                    <Link
                      to={`/order/${order.id}`}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'bg-primary text-on-primary rounded-full hover:bg-primary-hover',
                      )}
                    >
                      {t('orders.trackCta', {}, { defaultValue: 'Track' })}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleReorder(order)}
                      disabled={reordering === order.id}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'bg-primary text-on-primary rounded-full hover:bg-primary-hover disabled:opacity-50',
                      )}
                    >
                      {reordering === order.id
                        ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                        : t('orders.reorderCta', {}, { defaultValue: 'Reorder' })}
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
