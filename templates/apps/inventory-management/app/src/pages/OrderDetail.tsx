import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ApiOrderItem {
  id: string
  sku: string
  name: string
  expected_quantity: number
  received_quantity: number
  unit_cost_cents: number
  product_id?: string | null
}

interface ApiOrder {
  id: string
  reference: string
  type: 'inbound' | 'outbound'
  status: 'inbound' | 'outbound' | 'received' | 'shipped' | 'cancelled'
  partner: string
  warehouse?: { id: string; name: string; code: string } | null
  warehouse_id?: string | null
  expected_at?: string | null
  received_at?: string | null
  created_at?: string | null
  total_units?: number | null
  total_value_cents?: number | null
  notes?: string | null
  items: ApiOrderItem[]
}

interface ApiMovement {
  id: string
  reason: string
  quantity_change: number
  reference?: string | null
  created_at?: string | null
}

// Same i18n keys + defaults as the Orders list so the two pages never disagree.
const STATUS_LABEL: Record<ApiOrder['status'], { labelKey: string; labelDefault: string }> = {
  inbound: { labelKey: 'orders.status.inbound', labelDefault: 'Inbound' },
  outbound: { labelKey: 'orders.status.outbound', labelDefault: 'Picking' },
  received: { labelKey: 'orders.status.received', labelDefault: 'Received' },
  shipped: { labelKey: 'orders.status.shipped', labelDefault: 'Shipped' },
  cancelled: { labelKey: 'orders.status.cancelled', labelDefault: 'Cancelled' },
}

const TERMINAL = new Set(['received', 'shipped', 'cancelled'])

function formatTimestamp(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function OrderDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [order, setOrder] = useState<ApiOrder | null>(null)
  const [movements, setMovements] = useState<ApiMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionPending, setActionPending] = useState<'receive' | 'cancel' | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const orderResp = await http.get<ApiOrder>(`/orders/${id}`)
      const data = (orderResp.data ?? null) as ApiOrder | null
      setOrder(data)

      // Pull stock movements that referenced this order so the audit trail is real.
      try {
        const movResp = await http.get<ApiMovement[]>(
          `/stock/movements?reference=order:${id}&limit=50`,
        )
        const list = Array.isArray(movResp.data) ? movResp.data : []
        setMovements(list)
      } catch (_error) {
        // movements are supplementary; fall back to empty list so the order detail still renders
        setMovements([])
      }
    } catch (err) {
      const apiError = (err as { response?: { data?: { error?: string }; status?: number } })
        ?.response
      if (apiError?.status === 404) {
        setError(t('orderDetail.notFound', {}, { defaultValue: 'Order not found' }))
      } else {
        setError(
          apiError?.data?.error ?? (err instanceof Error ? err.message : 'Failed to load order'),
        )
      }
    } finally {
      setLoading(false)
    }
  }, [http, id, t])

  useEffect(() => {
    void load()
  }, [load])

  const onReceive = async () => {
    if (!order) return
    setActionPending('receive')
    try {
      await http.post(`/orders/${order.id}/receive`)
      await load()
    } catch (err) {
      const apiError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(apiError ?? (err instanceof Error ? err.message : 'Failed to mark received'))
    } finally {
      setActionPending(null)
    }
  }

  const onCancel = async () => {
    if (!order) return
    if (!window.confirm(t('orderDetail.confirmCancel', {}, { defaultValue: 'Cancel this order?' })))
      return
    setActionPending('cancel')
    try {
      await http.post(`/orders/${order.id}/cancel`)
      await load()
    } catch (err) {
      const apiError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(apiError ?? (err instanceof Error ? err.message : 'Failed to cancel'))
    } finally {
      setActionPending(null)
    }
  }

  const subtotalCents = order
    ? (order.items ?? []).reduce(
        (sum, l) => sum + Number(l.expected_quantity) * Number(l.unit_cost_cents),
        0,
      )
    : 0

  return (
    <div className={cm.stack(8)}>
      <Link
        to="/orders"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          'text-xs font-bold uppercase tracking-wider text-primary hover:underline',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-[16px]')} data-icon="arrow_back">
          arrow_back
        </span>
        {t('orderDetail.back', {}, { defaultValue: 'All orders' })}
      </Link>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            'rounded-lg bg-error-container text-on-error-container px-4 py-3 text-sm',
          )}
        >
          {error}
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className={cm.cn(cm.sp('px', 3), cm.sp('py', 1), 'ml-3 rounded text-xs underline')}
          >
            {t('orderDetail.goBack', {}, { defaultValue: 'Back to orders' })}
          </button>
        </div>
      )}

      {loading && !order && (
        <p className={cm.cn('text-sm text-on-surface-variant')}>
          {t('orderDetail.loading', {}, { defaultValue: 'Loading order…' })}
        </p>
      )}

      {order && (
        <>
          <header
            className={cm.cn(
              cm.flex({ align: 'start', justify: 'between', gap: 'md' }),
              'flex-wrap',
            )}
          >
            <div className={cm.stack(2)}>
              <p
                className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-primary')}
              >
                {order.type === 'inbound'
                  ? t('orders.filter.inbound', {}, { defaultValue: 'Inbound' })
                  : t('orders.filter.outbound', {}, { defaultValue: 'Outbound' })}{' '}
                · {order.partner || '—'}
              </p>
              <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight font-mono')}>
                {order.reference}
              </h1>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  'flex-wrap text-sm text-on-surface-variant',
                )}
              >
                <span>{order.warehouse?.name ?? '—'}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {t('orderDetail.eta', {}, { defaultValue: 'ETA' })}:{' '}
                  {order.expected_at ? new Date(order.expected_at).toLocaleDateString() : '—'}
                </span>
                <span aria-hidden="true">·</span>
                <span
                  className={cm.cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em]',
                  )}
                  style={{
                    backgroundColor:
                      order.status === 'received' || order.status === 'shipped'
                        ? 'var(--color-stock-in-bg)'
                        : order.status === 'cancelled'
                          ? 'var(--color-stock-out-bg)'
                          : 'var(--color-stock-incoming-bg)',
                    color:
                      order.status === 'received' || order.status === 'shipped'
                        ? 'var(--color-stock-in)'
                        : order.status === 'cancelled'
                          ? 'var(--color-stock-out)'
                          : 'var(--color-stock-incoming)',
                  }}
                >
                  {STATUS_LABEL[order.status]
                    ? t(
                        STATUS_LABEL[order.status].labelKey,
                        {},
                        { defaultValue: STATUS_LABEL[order.status].labelDefault },
                      )
                    : order.status}
                </span>
              </div>
            </div>
            <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
              {!TERMINAL.has(order.status) && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={actionPending !== null}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'rounded-lg border border-outline-variant text-on-surface hover:bg-background-secondary disabled:opacity-60',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[18px]')}
                    data-icon="cancel"
                  >
                    cancel
                  </span>
                  {actionPending === 'cancel'
                    ? t('common.cancellingEllipsis', {}, { defaultValue: 'Cancelling…' })
                    : t('orderDetail.cancel', {}, { defaultValue: 'Cancel order' })}
                </button>
              )}
              {!TERMINAL.has(order.status) && (
                <button
                  type="button"
                  onClick={onReceive}
                  disabled={actionPending !== null}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'rounded-lg bg-gradient-to-br from-primary to-primary-dark text-white shadow shadow-primary/30 hover:opacity-95 disabled:opacity-60',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[18px]')}
                    data-icon="check_circle"
                  >
                    check_circle
                  </span>
                  {actionPending === 'receive'
                    ? t('orderDetail.receiving', {}, { defaultValue: 'Receiving…' })
                    : order.type === 'inbound'
                      ? t('orderDetail.markReceived', {}, { defaultValue: 'Mark received' })
                      : t('orderDetail.markShipped', {}, { defaultValue: 'Mark shipped' })}
                </button>
              )}
            </div>
          </header>

          <section className={cm.cn('grid lg:grid-cols-3 gap-6')}>
            <article
              className={cm.cn(
                cm.stack(4),
                cm.sp('p', 6),
                'lg:col-span-2 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
              )}
            >
              <header>
                <p
                  className={cm.cn(
                    'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
                  )}
                >
                  {t('orderDetail.lines.eyebrow', {}, { defaultValue: 'Line items' })}
                </p>
                <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
                  {t('orderDetail.lines.title', {}, { defaultValue: 'What is on this order' })}
                </h2>
              </header>
              <table className={cm.cn(cm.w('full'), 'text-left')}>
                <thead>
                  <tr
                    className={cm.cn(
                      'border-b border-outline-variant/40 text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant',
                    )}
                  >
                    <th className={cm.cn('py-2')}>
                      {t('orderDetail.col.sku', {}, { defaultValue: 'SKU' })}
                    </th>
                    <th className={cm.cn('py-2')}>
                      {t('nav.product', {}, { defaultValue: 'Product' })}
                    </th>
                    <th className={cm.cn('py-2 text-right')}>
                      {t('orderDetail.col.expected', {}, { defaultValue: 'Expected' })}
                    </th>
                    <th className={cm.cn('py-2 text-right')}>
                      {t('orderDetail.col.received', {}, { defaultValue: 'Received' })}
                    </th>
                    <th className={cm.cn('py-2 text-right')}>
                      {t('orderDetail.col.cost', {}, { defaultValue: 'Unit cost' })}
                    </th>
                    <th className={cm.cn('py-2 text-right')}>
                      {t('orderDetail.col.line', {}, { defaultValue: 'Line total' })}
                    </th>
                  </tr>
                </thead>
                <tbody className={cm.cn('divide-y divide-outline-variant/40')}>
                  {(order.items ?? []).map((line) => {
                    const variance = Number(line.received_quantity) - Number(line.expected_quantity)
                    return (
                      <tr key={line.id}>
                        <td
                          className={cm.cn('py-3 font-mono text-sm')}
                          style={{ color: 'var(--color-sku)' }}
                        >
                          {line.sku}
                        </td>
                        <td className={cm.cn('py-3 text-sm text-on-surface')}>{line.name}</td>
                        <td className={cm.cn('py-3 text-right font-mono text-sm tabular-nums')}>
                          {line.expected_quantity}
                        </td>
                        <td className={cm.cn('py-3 text-right font-mono text-sm tabular-nums')}>
                          <span
                            style={{
                              color:
                                variance < 0
                                  ? 'var(--color-stock-low)'
                                  : variance > 0
                                    ? 'var(--color-stock-overstock)'
                                    : 'var(--color-stock-in)',
                            }}
                          >
                            {line.received_quantity}
                          </span>
                        </td>
                        <td className={cm.cn('py-3 text-right font-mono text-sm tabular-nums')}>
                          ${(Number(line.unit_cost_cents) / 100).toFixed(2)}
                        </td>
                        <td className={cm.cn('py-3 text-right font-mono text-sm tabular-nums')}>
                          $
                          {(
                            (Number(line.expected_quantity) * Number(line.unit_cost_cents)) /
                            100
                          ).toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                  {(order.items ?? []).length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className={cm.cn('py-4 text-center text-sm text-on-surface-variant')}
                      >
                        {t(
                          'orderDetail.lines.empty',
                          {},
                          { defaultValue: 'No line items recorded.' },
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr
                    className={cm.cn('border-t border-outline-variant/40 text-sm font-extrabold')}
                  >
                    <td
                      colSpan={5}
                      className={cm.cn(
                        'py-3 text-right uppercase tracking-wider text-on-surface-variant',
                      )}
                    >
                      {t('nav.subtotal', {}, { defaultValue: 'Subtotal' })}
                    </td>
                    <td className={cm.cn('py-3 text-right font-mono tabular-nums text-on-surface')}>
                      $
                      {(subtotalCents / 100).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </article>

            <article
              className={cm.cn(
                cm.stack(4),
                cm.sp('p', 6),
                'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
              )}
            >
              <header>
                <p
                  className={cm.cn(
                    'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
                  )}
                >
                  {t('nav.details', {}, { defaultValue: 'Details' })}
                </p>
                <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
                  {t('orderDetail.shipping.title', {}, { defaultValue: 'Order details' })}
                </h2>
              </header>
              <dl className={cm.stack(3)}>
                {[
                  { key: 'partner', label: 'Partner', value: order.partner || '—' },
                  { key: 'warehouse', label: 'Warehouse', value: order.warehouse?.name ?? '—' },
                  { key: 'created', label: 'Created', value: formatTimestamp(order.created_at) },
                  {
                    key: 'eta',
                    label: 'ETA',
                    value: order.expected_at
                      ? new Date(order.expected_at).toLocaleDateString()
                      : '—',
                  },
                  {
                    key: 'received',
                    label: 'Closed at',
                    value: formatTimestamp(order.received_at),
                  },
                ].map((row) => (
                  <div
                    key={row.key}
                    className={cm.cn(cm.flex({ justify: 'between', align: 'center', gap: 'sm' }))}
                  >
                    <dt
                      className={cm.cn(
                        'text-[10px] font-bold uppercase tracking-wider text-on-surface-variant',
                      )}
                    >
                      {t(`orderDetail.details.${row.key}`, {}, { defaultValue: row.label })}
                    </dt>
                    <dd className={cm.cn('text-sm font-semibold text-on-surface text-right')}>
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
              {order.notes && (
                <p
                  className={cm.cn(
                    'text-sm text-on-surface-variant border-t border-outline-variant/30 pt-3 italic',
                  )}
                >
                  {order.notes}
                </p>
              )}
            </article>
          </section>

          <section
            className={cm.cn(
              cm.stack(4),
              cm.sp('p', 6),
              'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
            )}
          >
            <header>
              <p
                className={cm.cn(
                  'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
                )}
              >
                {t('orderDetail.timeline.eyebrow', {}, { defaultValue: 'Audit trail' })}
              </p>
              <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
                {t('orderDetail.timeline.title', {}, { defaultValue: 'Order events' })}
              </h2>
            </header>
            <ol className={cm.cn('relative border-l-2 border-outline-variant/60 pl-6 space-y-5')}>
              <li>
                <span
                  className={cm.cn(
                    'absolute -left-2 mt-1 h-4 w-4 rounded-full ring-4 ring-surface',
                  )}
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  aria-hidden="true"
                />
                <p className={cm.cn('text-sm font-bold text-on-surface')}>
                  {t('orderDetail.timeline.created', {}, { defaultValue: 'Order created' })}
                </p>
                <p className={cm.cn('text-[11px] text-on-surface-variant')}>
                  {formatTimestamp(order.created_at)}
                </p>
              </li>
              {movements.map((m) => (
                <li key={m.id}>
                  <span
                    className={cm.cn(
                      'absolute -left-2 mt-1 h-4 w-4 rounded-full ring-4 ring-surface',
                    )}
                    style={{ backgroundColor: 'var(--color-stock-in)' }}
                    aria-hidden="true"
                  />
                  <p className={cm.cn('text-sm font-bold text-on-surface capitalize')}>
                    {m.reason} ({m.quantity_change > 0 ? '+' : ''}
                    {m.quantity_change})
                  </p>
                  <p className={cm.cn('text-[11px] text-on-surface-variant')}>
                    {formatTimestamp(m.created_at)}
                  </p>
                </li>
              ))}
              {order.received_at && (
                <li>
                  <span
                    className={cm.cn(
                      'absolute -left-2 mt-1 h-4 w-4 rounded-full ring-4 ring-surface',
                    )}
                    style={{ backgroundColor: 'var(--color-stock-in)' }}
                    aria-hidden="true"
                  />
                  <p className={cm.cn('text-sm font-bold text-on-surface')}>
                    {order.type === 'inbound'
                      ? t('orderDetail.timeline.received', {}, { defaultValue: 'Marked received' })
                      : t('orderDetail.timeline.shipped', {}, { defaultValue: 'Marked shipped' })}
                  </p>
                  <p className={cm.cn('text-[11px] text-on-surface-variant')}>
                    {formatTimestamp(order.received_at)}
                  </p>
                </li>
              )}
              {movements.length === 0 && !order.received_at && (
                <li>
                  <span
                    className={cm.cn(
                      'absolute -left-2 mt-1 h-4 w-4 rounded-full ring-4 ring-surface',
                    )}
                    style={{ backgroundColor: 'var(--color-outline-variant)' }}
                    aria-hidden="true"
                  />
                  <p className={cm.cn('text-sm text-on-surface-variant')}>
                    {t(
                      'orderDetail.timeline.pending',
                      {},
                      { defaultValue: 'No further events yet.' },
                    )}
                  </p>
                </li>
              )}
            </ol>
          </section>
        </>
      )}
    </div>
  )
}

export default OrderDetail
