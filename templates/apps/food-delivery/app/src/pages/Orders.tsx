import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Order {
  id: string
  restaurant_id: string
  restaurant_name: string
  status: 'placed' | 'confirmed' | 'preparing' | 'ready' | 'on_the_way' | 'delivered' | 'cancelled'
  placed_at: string
  delivered_at: string | null
  total_cents: number
  items: Array<{ name: string; qty: number; price_cents: number }>
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

function summarize(items: Order['items']): string {
  return items.map((i) => `${i.qty}× ${i.name}`).join(', ')
}

export function Orders() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const activeCount = orders.filter(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled',
  ).length
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('orders.eyebrow', {}, { defaultValue: 'Order history' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('orders.heading', {}, { defaultValue: 'Your orders' })}
        </h1>
        {!loading && !error && orders.length > 0 ? (
          <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }), cm.sp('mt', 4))}>
            {activeCount > 0 ? (
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'bg-primary-container text-on-primary-container uppercase tracking-wider',
                )}
              >
                {t(
                  'orders.activeCount',
                  { count: activeCount },
                  { defaultValue: '{{count}} in progress' },
                )}
              </span>
            ) : null}
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'bg-success-light text-success uppercase tracking-wider',
              )}
            >
              {t(
                'orders.deliveredCount',
                { count: deliveredCount },
                { defaultValue: '{{count}} delivered' },
              )}
            </span>
          </div>
        ) : null}
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : orders.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 20), cm.textCenter, cm.textMuted)}>
          <p className={cm.cn(cm.textSize('lg'))}>
            {t('orders.empty', {}, { defaultValue: 'You have no orders yet.' })}
          </p>
          <Link
            to="/restaurants"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.sp('mt', 4),
              cm.fontWeight('semibold'),
              'inline-block bg-primary text-on-primary rounded-full hover:bg-primary-hover',
            )}
          >
            {t('orders.browseCta', {}, { defaultValue: 'Browse restaurants' })}
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
                      {order.restaurant_name}
                    </h2>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.textSize('xs'),
                        cm.fontWeight('medium'),
                        'rounded-full',
                        order.status === 'delivered'
                          ? 'bg-success/10 text-success'
                          : order.status === 'cancelled'
                            ? 'bg-error/10 text-error'
                            : 'bg-primary/10 text-primary',
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
                    {summarize(order.items)}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), cm.textMuted)}>
                    {fmtDate(order.placed_at)} · {fmt(order.total_cents)}
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
                    <Link
                      to={`/orders/${order.id}`}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                        'border border-outline rounded-full hover:bg-surface-container',
                      )}
                    >
                      {t('nav.details', {}, { defaultValue: 'Details' })}
                    </Link>
                  )}
                  {order.status === 'delivered' ? (
                    <Link
                      to={`/restaurant/${order.restaurant_id}`}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'bg-primary text-on-primary rounded-full hover:bg-primary-hover',
                      )}
                    >
                      {t('orders.reorderCta', {}, { defaultValue: 'Reorder' })}
                    </Link>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
