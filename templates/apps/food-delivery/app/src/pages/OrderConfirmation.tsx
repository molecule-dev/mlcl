import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface OrderSummary {
  id: string
  restaurant_name: string
  status: string
  total_cents: number
  estimated_delivery: string | null
  estimatedMinutes?: number
  items: Array<{ name: string; qty: number; price_cents: number }>
}

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function fmtEta(eta: string | null, fallbackMinutes?: number): string {
  if (eta) {
    try {
      return new Date(eta).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    } catch (_error) {
      // invalid date string — fall through to the minute-based fallback
    }
  }
  if (fallbackMinutes) {
    return new Date(Date.now() + fallbackMinutes * 60_000).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })
  }
  return '—'
}

export function OrderConfirmation() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [order, setOrder] = useState<OrderSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/orders/${id}`)
      .then((res) => {
        if (!cancelled) setOrder(unwrapSingle<OrderSummary>(res))
      })
      .catch(() => {
        /* leave order null */
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, http])

  return (
    <div
      className={cm.cn(cm.maxW('2xl'), cm.sp('px', 6), cm.sp('py', 16), cm.textCenter, cm.mxAuto)}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('mb', 6),
          'bg-success/10 rounded-full h-20 w-20 mx-auto',
        )}
      >
        <span className="material-symbols-outlined text-4xl text-success" aria-hidden="true">
          check_circle
        </span>
      </div>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
        {t('orderConfirmation.heading', {}, { defaultValue: 'Order placed!' })}
      </h1>
      {loading ? (
        <p className={cm.textMuted}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : order ? (
        <>
          <p
            data-testid="confirm-eta"
            className={cm.cn(cm.textSize('base'), cm.sp('mb', 4), cm.textMuted)}
          >
            {t(
              'orderConfirmation.subheading',
              { eta: fmtEta(order.estimated_delivery, order.estimatedMinutes) },
              { defaultValue: 'Estimated arrival around {{eta}}.' },
            )}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 2), cm.fontWeight('medium'))}>
            {order.restaurant_name}
          </p>
          <ul
            data-testid="confirm-items"
            className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mb', 4), 'space-y-1')}
          >
            {order.items.map((it, idx) => (
              <li key={idx}>
                {it.qty}× {it.name} — {fmt(it.qty * it.price_cents)}
              </li>
            ))}
          </ul>
          <p
            data-testid="confirm-total"
            className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 2))}
          >
            {t(
              'orderConfirmation.total',
              { total: fmt(order.total_cents) },
              { defaultValue: 'Total {{total}}' },
            )}
          </p>
        </>
      ) : null}
      <p
        data-testid="confirm-ref"
        className={cm.cn(cm.textSize('sm'), cm.sp('mb', 8), cm.textMuted)}
      >
        {t(
          'orderConfirmation.orderRef',
          { id: id ?? '' },
          { defaultValue: 'Order reference: {{id}}' },
        )}
      </p>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'sm' }))}>
        <Link
          to={`/order/${id}`}
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-full hover:bg-primary-hover',
          )}
        >
          {t('orderConfirmation.trackCta', {}, { defaultValue: 'Track order' })}
        </Link>
        <Link
          to="/restaurants"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            'border border-outline rounded-full hover:bg-surface-container',
          )}
        >
          {t('orderConfirmation.continueCta', {}, { defaultValue: 'Continue browsing' })}
        </Link>
      </div>
    </div>
  )
}
