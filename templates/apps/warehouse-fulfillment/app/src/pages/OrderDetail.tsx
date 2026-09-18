import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type OrderStatus, OrderStatusBadge } from '../components/OrderStatusBadge.js'

interface ApiOrderItem {
  id: string
  productId?: string
  name: string
  price?: string | number
  quantity?: number
}

interface ApiOrderEvent {
  id: string
  status?: string
  createdAt?: string
}

interface ApiOrderDetail {
  id: string
  status?: string
  priority?: string
  customerName?: string
  customerEmail?: string
  externalOrderId?: string
  shippingMethod?: string
  shippingAddress?: Record<string, unknown> | null
  weightLb?: string | number
  total?: string | number
  promisedAt?: string | null
  createdAt?: string
  items?: ApiOrderItem[]
  events?: ApiOrderEvent[]
}

const LIFECYCLE: { status: OrderStatus; labelKey: string; labelDefault: string; icon: string }[] = [
  {
    status: 'pending',
    labelKey: 'orderDetail.lifecycle.pending',
    labelDefault: 'Pending',
    icon: 'schedule',
  },
  {
    status: 'picking',
    labelKey: 'orderDetail.lifecycle.picking',
    labelDefault: 'Picking',
    icon: 'inventory_2',
  },
  {
    status: 'packed',
    labelKey: 'orderDetail.lifecycle.packed',
    labelDefault: 'Packed',
    icon: 'check_box',
  },
  {
    status: 'shipped',
    labelKey: 'orderDetail.lifecycle.shipped',
    labelDefault: 'Shipped',
    icon: 'local_shipping',
  },
]

const NEXT_STATUS: Record<string, OrderStatus> = {
  pending: 'picking',
  picking: 'packed',
  packed: 'shipped',
}

function formatAddress(addr: Record<string, unknown> | null | undefined): string {
  if (!addr) return ''
  const parts = [addr.line1, addr.line2, addr.city, addr.region, addr.postal, addr.country].filter(
    Boolean,
  )
  return parts.join(' · ')
}

export function OrderDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const params = useParams<{ id: string }>()
  const id = params.id ?? ''
  const [order, setOrder] = useState<ApiOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  async function refresh() {
    const res = await http.get<ApiOrderDetail>(`/orders/${id}`)
    setOrder(res.data ?? null)
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await http.get<ApiOrderDetail>(`/orders/${id}`)
        if (cancelled) return
        setOrder(res.data ?? null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http, id])

  async function advance() {
    const current = order?.status ?? 'pending'
    const next = NEXT_STATUS[current]
    if (!next) return
    setUpdating(true)
    try {
      await http.patch(`/orders/${id}`, { status: next })
      await refresh()
    } finally {
      setUpdating(false)
    }
  }

  async function cancel() {
    setUpdating(true)
    try {
      await http.post(`/orders/${id}/cancel`, {})
      await refresh()
    } finally {
      setUpdating(false)
    }
  }

  if (loading && !order) {
    return (
      <div className={cm.cn(cm.sp('p', 6), cm.textMuted)} data-testid="order-detail-loading">
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }

  if (!order) {
    return (
      <div className={cm.stack(4)} data-testid="order-detail-empty">
        <Link to="/orders" className="text-primary hover:underline">
          ← {t('orderDetail.back', {}, { defaultValue: 'Back to orders' })}
        </Link>
        <p className={cm.textMuted}>
          {t('orderDetail.notFound', {}, { defaultValue: 'Order not found.' })}
        </p>
      </div>
    )
  }

  const items = Array.isArray(order.items) ? order.items : []
  const events = Array.isArray(order.events) ? order.events : []
  const status = (order.status ?? 'pending') as OrderStatus
  const currentStep = LIFECYCLE.findIndex((s) => s.status === status)
  const nextLabel: Record<string, string> = {
    pending: 'Start picking',
    picking: 'Mark packed',
    packed: 'Mark shipped',
  }

  return (
    <div className={cm.stack(8)} data-testid="order-detail-page">
      <header
        className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.stack(1)}>
          <Link
            to="/orders"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'text-[11px] font-bold uppercase tracking-[0.22em] text-on-surface-variant hover:text-on-surface',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[14px]')} data-icon="arrow_back">
              arrow_back
            </span>
            {t('orderDetail.back', {}, { defaultValue: 'Back to orders' })}
          </Link>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
            <h1
              className={cm.cn('font-mono text-3xl font-extrabold tracking-wider text-on-surface')}
            >
              {order.externalOrderId ?? order.id.slice(0, 8)}
            </h1>
            <OrderStatusBadge status={status} />
          </div>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {order.customerName ?? '—'} · {Number(order.weightLb ?? 0).toFixed(1)} lb ·{' '}
            {order.shippingMethod ?? '—'}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
          {NEXT_STATUS[status] && (
            <button
              type="button"
              onClick={advance}
              disabled={updating}
              data-testid="order-advance"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 5),
                cm.h(11),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-lg bg-gradient-to-br from-primary to-primary-dark text-on-primary shadow shadow-primary/30 hover:opacity-95 transition-all uppercase tracking-wider disabled:opacity-50',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[18px]')}
                data-icon="chevron_right"
              >
                chevron_right
              </span>
              {nextLabel[status] ?? 'Advance'}
            </button>
          )}
          {status !== 'shipped' && status !== 'cancelled' && (
            <button
              type="button"
              onClick={cancel}
              disabled={updating}
              data-testid="order-cancel"
              className={cm.cn(
                cm.sp('px', 5),
                cm.h(11),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-lg border border-outline-variant text-on-surface hover:bg-background-secondary disabled:opacity-50',
              )}
            >
              {t('orderDetail.cancel', {}, { defaultValue: 'Cancel order' })}
            </button>
          )}
        </div>
      </header>

      <article
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
        )}
        data-testid="order-lifecycle"
      >
        <p
          className={cm.cn(
            'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
            cm.sp('mb', 4),
          )}
        >
          {t('orderDetail.lifecycle.eyebrow', {}, { defaultValue: 'Lifecycle' })}
        </p>
        <div
          className={cm.cn(
            cm.flex({ align: 'start', justify: 'between', gap: 'sm' }),
            'overflow-x-auto',
          )}
        >
          {LIFECYCLE.map((step, idx) => {
            const completed = idx < currentStep
            const active = idx === currentStep
            const accent = completed
              ? 'var(--color-stock-in)'
              : active
                ? 'var(--color-primary)'
                : 'var(--color-border)'
            return (
              <div
                key={step.status}
                className={cm.cn(
                  cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
                  'flex-1 min-w-[80px]',
                )}
              >
                <div
                  className={cm.cn(
                    'h-8 w-8 rounded-full',
                    cm.flex({ align: 'center', justify: 'center' }),
                    'border-2',
                  )}
                  style={{
                    borderColor: accent,
                    backgroundColor: completed || active ? accent : 'transparent',
                    color: completed || active ? 'white' : accent,
                  }}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[18px]')}
                    data-icon={step.icon}
                  >
                    {step.icon}
                  </span>
                </div>
                <p
                  className={cm.cn(
                    'text-[10px] font-bold uppercase tracking-[0.2em] text-center',
                    active ? 'text-on-surface' : 'text-on-surface-variant',
                  )}
                >
                  {t(step.labelKey, {}, { defaultValue: step.labelDefault })}
                </p>
              </div>
            )
          })}
        </div>
      </article>

      <div className={cm.cn('grid lg:grid-cols-3 gap-6')}>
        <article
          className={cm.cn(
            cm.stack(4),
            cm.sp('p', 6),
            'lg:col-span-2 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
          )}
          data-testid="order-items"
        >
          <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <div className={cm.stack(1)}>
              <p
                className={cm.cn(
                  'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
                )}
              >
                {t('orderDetail.items.eyebrow', {}, { defaultValue: 'Pick list' })}
              </p>
              <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
                {t(
                  'orderDetail.items.title',
                  { count: items.length },
                  { defaultValue: '{{count}} line items' },
                )}
              </h2>
            </div>
          </header>
          {items.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)} data-testid="order-items-empty">
              {t('orderDetail.items.empty', {}, { defaultValue: 'No items.' })}
            </p>
          ) : (
            <table className={cm.cn('w-full text-sm')}>
              <thead>
                <tr
                  className={cm.cn(
                    'text-left text-[10px] uppercase tracking-[0.2em] text-on-surface-variant border-b border-outline-variant/50',
                  )}
                >
                  <th className={cm.cn(cm.sp('px', 3), cm.sp('py', 2), 'font-bold')}>
                    {t('nav.product', {}, { defaultValue: 'Product' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 3), cm.sp('py', 2), 'font-bold text-right')}>
                    {t('orderDetail.items.qty', {}, { defaultValue: 'Qty' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 3), cm.sp('py', 2), 'font-bold text-right')}>
                    {t('orderDetail.items.line', {}, { defaultValue: 'Line' })}
                  </th>
                </tr>
              </thead>
              <tbody className={cm.cn('divide-y divide-outline-variant/40')}>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={cm.cn('hover:bg-background-secondary transition-colors')}
                    data-testid="order-item-row"
                  >
                    <td className={cm.cn(cm.sp('px', 3), cm.sp('py', 3), 'text-on-surface')}>
                      {item.name}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 3),
                        'font-mono text-right tabular-nums font-bold',
                      )}
                    >
                      {item.quantity ?? 1}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 3),
                        'font-mono text-right tabular-nums',
                      )}
                    >
                      ${((Number(item.price ?? 0) * Number(item.quantity ?? 1)) / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={cm.cn('border-t-2 border-outline-variant')}>
                  <td
                    colSpan={2}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 3),
                      'text-right text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
                    )}
                  >
                    {t('orderDetail.items.total', {}, { defaultValue: 'Order total' })}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 3),
                      'font-mono text-right tabular-nums text-lg font-extrabold',
                    )}
                    data-testid="order-total"
                  >
                    ${(Number(order.total ?? 0) / 100).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </article>

        <aside className={cm.cn(cm.stack(4))}>
          <article
            className={cm.cn(
              cm.stack(3),
              cm.sp('p', 5),
              'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
            )}
            data-testid="order-shipping"
          >
            <p
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
              )}
            >
              {t('orderDetail.shipping.eyebrow', {}, { defaultValue: 'Shipping' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
              {order.customerName ?? '—'}
            </p>
            {order.customerEmail && (
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {order.customerEmail}
              </p>
            )}
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant whitespace-pre-line')}>
              {formatAddress(order.shippingAddress)}
            </p>
            <p
              className={cm.cn(
                'text-[10px] uppercase tracking-wider text-on-surface-variant',
                cm.sp('mt', 2),
              )}
            >
              {t('orderDetail.shipping.method', {}, { defaultValue: 'Service' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
              {order.shippingMethod ?? '—'}
            </p>
          </article>
          {events.length > 0 && (
            <article
              className={cm.cn(
                cm.stack(2),
                cm.sp('p', 5),
                'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
              )}
              data-testid="order-events"
            >
              <p
                className={cm.cn(
                  'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
                )}
              >
                {t('nav.auditLog', {}, { defaultValue: 'Audit log' })}
              </p>
              <ol className={cm.stack(1)}>
                {events.map((evt) => (
                  <li
                    key={evt.id}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', gap: 'xs' }),
                      cm.sp('py', 1),
                    )}
                  >
                    <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                      {evt.status}
                    </span>
                    <span className={cm.cn('text-[10px] text-on-surface-variant')}>
                      {evt.createdAt ? new Date(evt.createdAt).toLocaleString() : ''}
                    </span>
                  </li>
                ))}
              </ol>
            </article>
          )}
        </aside>
      </div>
    </div>
  )
}

export default OrderDetail
