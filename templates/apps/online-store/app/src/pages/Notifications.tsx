import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StoreFooter } from '../components/StoreFooter.js'
import { StorefrontTopNavBar } from '../components/StorefrontTopNavBar.js'
import { unpackListPayload } from '../utils/httpUnpack.js'

interface OrderRow {
  id: string
  status: string
  total: number | string
  currency?: string
  created_at: string
  updated_at?: string
}

const fmtRelative = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const diffMs = d.getTime() - Date.now()
  const mins = Math.round(diffMs / 60_000)
  if (Math.abs(mins) < 60) return rtf.format(mins, 'minute')
  const hrs = Math.round(mins / 60)
  if (Math.abs(hrs) < 24) return rtf.format(hrs, 'hour')
  const days = Math.round(hrs / 24)
  if (Math.abs(days) < 7) return rtf.format(days, 'day')
  return d.toLocaleDateString()
}

const fmtMoney = (v: number | string, currency = 'USD'): string => {
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (!Number.isFinite(n)) return '—'
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n)
  } catch (_error) {
    // Unknown currency code or Intl unavailable — fall back to plain dollar format
    return `$${n.toFixed(2)}`
  }
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/orders?limit=20')
      .then((res) => {
        if (cancelled) return
        const list = unpackListPayload(res) as OrderRow[]
        setOrders(list)
        setErr(null)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        const status = (e as { response?: { status?: number } })?.response?.status
        if (status === 401) {
          setErr('signin')
        } else {
          setErr('error')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const statusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      confirmed: t('orderStatus.confirmed', {}, { defaultValue: 'Confirmed' }),
      processing: t('orderStatus.processing', {}, { defaultValue: 'Processing' }),
      shipped: t('orderStatus.shipped', {}, { defaultValue: 'Shipped' }),
      delivered: t('orderStatus.delivered', {}, { defaultValue: 'Delivered' }),
      cancelled: t('orderStatus.cancelled', {}, { defaultValue: 'Cancelled' }),
      refunded: t('orderStatus.refunded', {}, { defaultValue: 'Refunded' }),
    }
    return labels[status] || status
  }

  return (
    <div className={cm.cn(cm.surface, 'antialiased')}>
      <StorefrontTopNavBar />
      <main
        data-mol-id="page-notifications"
        className={cm.cn(cm.mxAuto, 'max-w-3xl min-h-[60vh]', cm.sp('px', 6), cm.sp('py', 8))}
      >
        <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h1>
        {loading && (
          <p className={cm.cn('text-foreground-secondary')} data-mol-id="notifications-loading">
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        )}
        {!loading && err === 'signin' && (
          <p className={cm.cn('text-foreground-secondary')} data-mol-id="notifications-signin">
            <Link to="/login">{t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}</Link>{' '}
            {t(
              'notifications.signInToView',
              {},
              { defaultValue: 'to see order updates and account notifications.' },
            )}
          </p>
        )}
        {!loading && err === 'error' && (
          <p className={cm.cn('text-foreground-secondary')} data-mol-id="notifications-error">
            {t(
              'nav.couldNotLoadNotifications',
              {},
              { defaultValue: 'Could not load notifications.' },
            )}
          </p>
        )}
        {!loading && !err && orders.length === 0 && (
          <p className={cm.cn('text-foreground-secondary')} data-mol-id="notifications-empty">
            {t('notifications.empty', {}, { defaultValue: "You're all caught up." })}
          </p>
        )}
        {!loading && !err && orders.length > 0 && (
          <ul data-mol-id="notifications-list" className={cm.cn(cm.stack(3), 'list-none p-0 m-0')}>
            {orders.map((o) => {
              const label = t(
                'notifications.orderStatusLabel',
                { status: statusLabel(o.status) },
                { defaultValue: 'Order {{status}}' },
              )
              const idShort = String(o.id).slice(0, 8)
              const when = fmtRelative(o.updated_at || o.created_at)
              return (
                <li
                  key={o.id}
                  data-mol-id={`notification-${o.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('p', 4),
                    'gap-4 bg-surface border rounded-lg shadow-sm',
                  )}
                >
                  <div className={cm.cn(cm.stack(1))}>
                    <Link
                      to={`/orders/${o.id}`}
                      className={cm.cn(cm.fontWeight('semibold'))}
                      data-mol-id={`notification-link-${o.id}`}
                    >
                      {label} · #{idShort}
                    </Link>
                    <span className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
                      {fmtMoney(o.total, o.currency || 'USD')} · {when}
                    </span>
                  </div>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('medium'),
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      'rounded-full border bg-surface-secondary text-foreground',
                    )}
                    data-mol-id={`notification-status-${o.id}`}
                  >
                    {statusLabel(o.status)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </main>
      <StoreFooter />
    </div>
  )
}

export default Notifications
