import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { StatusTimeline } from '@molecule/app-status-timeline-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

type Status =
  'placed' | 'confirmed' | 'preparing' | 'ready' | 'on_the_way' | 'delivered' | 'cancelled'

const STATUS_ORDER: Status[] = [
  'placed',
  'confirmed',
  'preparing',
  'ready',
  'on_the_way',
  'delivered',
]

interface Order {
  id: string
  restaurant_id: string
  restaurant_name: string
  status: Status
  eta_minutes: number
  driver_name: string | null
  driver_vehicle: string | null
  items: Array<{ name: string; qty: number }>
}

const STATUS_DEFAULTS: Record<Status, string> = {
  placed: 'Order placed',
  confirmed: 'Restaurant confirmed',
  preparing: 'Preparing',
  ready: 'Ready for pickup',
  on_the_way: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export function OrderTracking() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/orders/${id}`)
      .then((res) => {
        if (!cancelled) setOrder(unwrapSingle<Order>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('orderTracking.loadError', {}, { defaultValue: 'Failed to load order.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, http, t])

  return (
    <div
      className={cm.cn(
        cm.maxW('7xl'),
        cm.sp('px', 6),
        cm.sp('py', 8),
        cm.mxAuto,
        cm.grid({ cols: 12, gap: 'lg' }),
      )}
    >
      {error ? (
        <p className={cm.cn('col-span-12', cm.sp('py', 16), cm.textCenter, 'text-error')}>
          {error}
        </p>
      ) : loading ? (
        <p className={cm.cn('col-span-12', cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : !order ? (
        <p className={cm.cn('col-span-12', cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('orderTracking.notFound', {}, { defaultValue: 'Order not found.' })}
        </p>
      ) : (
        <>
          <div className={'col-span-12 lg:col-span-8'}>
            <div
              className={cm.cn(
                'bg-surface-variant rounded-xl aspect-video flex items-center justify-center',
              )}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-5xl text-on-surface-variant">
                map
              </span>
            </div>
            <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), cm.textMuted)}>
              {t(
                'orderTracking.mapPlaceholder',
                {},
                { defaultValue: 'Live map (driver position updates every few seconds)' },
              )}
            </p>
          </div>

          <aside className={'col-span-12 lg:col-span-4'}>
            <div className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm space-y-4')}>
              <div>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('medium'),
                    'text-on-surface-variant uppercase tracking-wide',
                  )}
                >
                  {t('orderTracking.etaLabel', {}, { defaultValue: 'Arriving in' })}
                </p>
                <p className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
                  {t(
                    'orderTracking.etaMinutes',
                    { mins: order.eta_minutes },
                    { defaultValue: '{{mins}} min' },
                  )}
                </p>
              </div>

              <StatusTimeline
                currentKey={order.status}
                steps={STATUS_ORDER.map((s) => ({
                  key: s,
                  label: t(`orderTracking.status.${s}`, {}, { defaultValue: STATUS_DEFAULTS[s] }),
                }))}
              />

              {order.driver_name ? (
                <div className={cm.cn(cm.sp('pt', 4), 'border-t border-outline-variant')}>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('medium'),
                      'text-on-surface-variant uppercase tracking-wide',
                    )}
                  >
                    {t('orderTracking.driverLabel', {}, { defaultValue: 'Your driver' })}
                  </p>
                  <p className={cm.fontWeight('semibold')}>{order.driver_name}</p>
                  {order.driver_vehicle ? (
                    <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>{order.driver_vehicle}</p>
                  ) : null}
                </div>
              ) : null}

              <div className={cm.cn(cm.sp('pt', 4), 'border-t border-outline-variant')}>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('medium'),
                    'text-on-surface-variant uppercase tracking-wide',
                  )}
                >
                  {t('orderTracking.fromLabel', {}, { defaultValue: 'From' })}
                </p>
                <Link
                  to={`/restaurant/${order.restaurant_id}`}
                  className={cm.cn(cm.fontWeight('semibold'), 'hover:underline')}
                >
                  {order.restaurant_name}
                </Link>
                <ul
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mt', 2),
                    'space-y-1 text-on-surface-variant',
                  )}
                >
                  {order.items.map((i) => (
                    <li key={i.name}>
                      {i.qty}× {i.name}
                    </li>
                  ))}
                </ul>
              </div>

              <div className={cm.cn(cm.sp('pt', 4), 'border-t border-outline-variant')}>
                <Link
                  to={`/orders/${order.id}`}
                  data-testid="tracking-manage-link"
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'inline-flex items-center gap-1 text-primary hover:underline',
                  )}
                >
                  {t('orderTracking.manageCta', {}, { defaultValue: 'Manage order' })}
                  <span className="material-symbols-outlined text-base" aria-hidden="true">
                    chevron_right
                  </span>
                </Link>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
