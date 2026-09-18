import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { ApiOrder } from '../lib/api-orders.js'
import { unwrapSingle } from '../lib/unwrap.js'

const NEXT_STATUS: Record<string, { next: string; label: string; defaultLabel: string }> = {
  pending: { next: 'preparing', label: 'orderDetail.start', defaultLabel: 'Start preparing' },
  preparing: { next: 'ready', label: 'orderDetail.markReady', defaultLabel: 'Mark ready' },
  ready: { next: 'served', label: 'orderDetail.markServed', defaultLabel: 'Mark served' },
  served: { next: 'paid', label: 'orderDetail.markPaid', defaultLabel: 'Charge & close' },
}

function fmtUsd(amount: number) {
  return `$${Math.abs(Number(amount) || 0).toFixed(2)}`
}

export function OrderDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()

  const [order, setOrder] = useState<ApiOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = unwrapSingle<ApiOrder>(await http.get(`/api/orders/${id}`))
      if (data?.id) setOrder(data)
      else setError(t('orderDetail.notFound', {}, { defaultValue: 'Order not found.' }))
    } catch (error) {
      logError('orderDetail.load', error)
      setError(t('orderDetail.loadError', {}, { defaultValue: 'Could not load order.' }))
    } finally {
      setLoading(false)
    }
  }, [http, id, t])

  useEffect(() => {
    void reload()
  }, [reload])

  const advance = useCallback(async () => {
    if (!order || !id) return
    const next = NEXT_STATUS[order.status]
    if (!next) return
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      if (next.next === 'paid') {
        await http.post(`/api/orders/${id}/pay`, { paymentMethodId: 'pm_card_test' })
      } else {
        await http.put(`/api/orders/${id}/status`, { status: next.next })
      }
      setStatus(t('orderDetail.statusUpdated', {}, { defaultValue: 'Status updated.' }))
      await reload()
    } catch (error) {
      logError('orderDetail.advance', error)
      setError(t('orderDetail.statusError', {}, { defaultValue: 'Could not update status.' }))
    } finally {
      setBusy(false)
    }
  }, [http, id, order, reload, t])

  const cancel = useCallback(async () => {
    if (!order || !id) return
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      await http.put(`/api/orders/${id}/status`, { status: 'cancelled' })
      setStatus(t('orderDetail.cancelled', {}, { defaultValue: 'Order cancelled.' }))
      await reload()
    } catch (error) {
      logError('orderDetail.cancel', error)
      setError(t('orderDetail.statusError', {}, { defaultValue: 'Could not update status.' }))
    } finally {
      setBusy(false)
    }
  }, [http, id, order, reload, t])

  if (loading) {
    return (
      <div
        className={cm.cn(
          cm.sp('px', 8),
          cm.sp('py', 16),
          cm.maxW('5xl'),
          cm.mxAuto,
          cm.textCenter,
          'text-on-surface-variant',
        )}
      >
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }

  if (error && !order) {
    return (
      <div
        className={cm.cn(
          cm.sp('px', 8),
          cm.sp('py', 16),
          cm.maxW('5xl'),
          cm.mxAuto,
          cm.textCenter,
          cm.stack(4),
        )}
      >
        <p
          data-testid="orderdetail-error"
          className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-error')}
        >
          {error}
        </p>
        <Link to="/dashboard" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          {t('orderDetail.backToBoard', {}, { defaultValue: 'Order board' })}
        </Link>
      </div>
    )
  }

  if (!order) return null

  const next = NEXT_STATUS[order.status]
  const subtotal = Number(order.subtotal ?? 0)
  const tax = Number(order.tax ?? 0)
  const total = Number(order.total ?? 0)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.stack(2)}>
        <Link
          to="/dashboard"
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary hover:underline inline-flex items-center gap-1',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-base align-middle')}
            aria-hidden="true"
          >
            arrow_back
          </span>
          {t('orderDetail.backToBoard', {}, { defaultValue: 'Order board' })}
        </Link>
        <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
          <div>
            <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight font-display')}>
              {t(
                'orderDetail.heading',
                { number: order.id.slice(0, 8) },
                { defaultValue: 'Order #{{number}}' },
              )}
            </h1>
            <p
              data-testid="orderdetail-status"
              className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}
            >
              {t(
                'orderDetail.statusLine',
                { status: order.status, table: order.table_number ?? '—' },
                { defaultValue: 'Table {{table}} · status {{status}}' },
              )}
            </p>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            {order.status !== 'paid' && order.status !== 'cancelled' ? (
              <button
                type="button"
                onClick={cancel}
                disabled={busy}
                data-testid="orderdetail-cancel"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-full border border-error text-error hover:bg-error-container hover:text-on-error-container transition-colors disabled:opacity-50',
                )}
              >
                {t('orderDetail.cancel', {}, { defaultValue: 'Cancel order' })}
              </button>
            ) : null}
            {next ? (
              <button
                type="button"
                onClick={advance}
                disabled={busy}
                data-testid="orderdetail-advance"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50',
                )}
              >
                {t(next.label, {}, { defaultValue: next.defaultLabel })}
              </button>
            ) : null}
          </div>
        </div>
        {error ? (
          <p data-testid="orderdetail-error" className={cm.cn(cm.textSize('sm'), 'text-error')}>
            {error}
          </p>
        ) : null}
        {status ? (
          <p data-testid="orderdetail-success" className={cm.cn(cm.textSize('sm'), 'text-primary')}>
            {status}
          </p>
        ) : null}
      </header>

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
        <section className={cm.cn('lg:col-span-2', cm.stack(6))}>
          <div
            className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
          >
            <h2
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                'font-display',
              )}
            >
              {t('orderDetail.itemsHeading', {}, { defaultValue: 'Line items' })}
            </h2>
            {(order.items ?? []).length === 0 ? (
              <p
                data-testid="orderdetail-no-items"
                className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
              >
                {t(
                  'orderDetail.noItems',
                  {},
                  { defaultValue: 'No items recorded for this order.' },
                )}
              </p>
            ) : (
              <ul className={cm.stack(3)}>
                {(order.items ?? []).map((item, i) => (
                  <li
                    key={item.id ?? i}
                    className={cm.cn(
                      cm.flex({ align: 'start', gap: 'md' }),
                      cm.sp('py', 3),
                      'border-b border-outline-variant/40 last:border-0',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.w(8),
                        cm.h(8),
                        cm.roundedFull,
                        'bg-primary/10 text-primary font-extrabold tabular-nums',
                      )}
                    >
                      {Number(item.quantity ?? 1)}
                    </span>
                    <div className={cm.flex1}>
                      <p
                        className={cm.cn(
                          cm.textSize('base'),
                          cm.fontWeight('semibold'),
                          'font-display',
                        )}
                      >
                        {item.name}
                      </p>
                      {item.special_instructions ? (
                        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant italic')}>
                          {item.special_instructions}
                        </p>
                      ) : null}
                    </div>
                    <span className={cm.cn(cm.textSize('base'), 'font-extrabold tabular-nums')}>
                      {fmtUsd(Number(item.quantity ?? 1) * Number(item.unit_price ?? 0))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className={cm.stack(6)}>
          <div
            className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
          >
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('orderDetail.summary', {}, { defaultValue: 'Bill summary' })}
            </h3>
            <dl className={cm.stack(3)}>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <dt className={cm.textSize('sm')}>
                  {t('nav.subtotal', {}, { defaultValue: 'Subtotal' })}
                </dt>
                <dd className={cm.cn(cm.textSize('sm'), 'tabular-nums')}>{fmtUsd(subtotal)}</dd>
              </div>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <dt className={cm.textSize('sm')}>{t('form.tax', {}, { defaultValue: 'Tax' })}</dt>
                <dd className={cm.cn(cm.textSize('sm'), 'tabular-nums')}>{fmtUsd(tax)}</dd>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('pt', 3),
                  'border-t border-outline-variant',
                )}
              >
                <dt className={cm.cn(cm.textSize('lg'), 'font-extrabold font-display')}>
                  {t('nav.total', {}, { defaultValue: 'Total' })}
                </dt>
                <dd
                  data-testid="orderdetail-total"
                  className={cm.cn(cm.textSize('2xl'), 'font-extrabold tabular-nums font-display')}
                >
                  {fmtUsd(total)}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  )
}
