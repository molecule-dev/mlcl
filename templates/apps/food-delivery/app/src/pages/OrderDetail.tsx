import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface Order {
  id: string
  restaurant_id: string
  restaurant_name: string
  status: string
  placed_at: string
  delivered_at: string | null
  driver_name: string | null
  address: string
  items: Array<{ name: string; qty: number; price_cents: number }>
  subtotal_cents: number
  delivery_fee_cents: number
  tax_cents: number
  total_cents: number
}

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function OrderDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cancel state.
  const [cancelBusy, setCancelBusy] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  // Rate state.
  const [rating, setRating] = useState<number>(0)
  const [comment, setComment] = useState('')
  const [rateBusy, setRateBusy] = useState(false)
  const [ratedAt, setRatedAt] = useState<number | null>(null)
  const [rateError, setRateError] = useState<string | null>(null)

  const reload = useCallback((): void => {
    if (!id) return
    setLoading(true)
    setError(null)
    http
      .get(`/api/orders/${id}`)
      .then((res) => setOrder(unwrapSingle<Order>(res)))
      .catch(() =>
        setError(t('orderDetail.loadError', {}, { defaultValue: 'Failed to load order.' })),
      )
      .finally(() => setLoading(false))
  }, [id, http, t])

  useEffect(() => {
    reload()
  }, [reload])

  async function handleCancel(): Promise<void> {
    if (!id || cancelBusy) return
    setCancelBusy(true)
    setCancelError(null)
    try {
      await http.post(`/api/orders/${id}/cancel`, {})
      track({ name: 'order.cancelled', properties: { order_id: id } })
      reload()
    } catch (err) {
      setCancelError(
        (err as Error).message ??
          t('orderDetail.cancelError', {}, { defaultValue: 'Could not cancel order.' }),
      )
    } finally {
      setCancelBusy(false)
    }
  }

  async function handleRate(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!id || rateBusy || rating < 1) return
    setRateBusy(true)
    setRateError(null)
    try {
      await http.post(`/api/orders/${id}/rate`, {
        food_rating: rating,
        comment: comment || undefined,
      })
      track({
        name: 'order.rated',
        properties: { order_id: id, food_rating: rating },
      })
      setRatedAt(Date.now())
      setComment('')
      reload()
    } catch (err) {
      setRateError(
        (err as Error).message ??
          t('orderDetail.rateError', {}, { defaultValue: 'Could not save rating.' }),
      )
    } finally {
      setRateBusy(false)
    }
  }

  // A buyer may self-service a cancellation only while the order is still
  // `placed` (pending). Once the restaurant confirms it, lifecycle control —
  // including cancellation — passes to the merchant, so the API rejects a
  // buyer cancel past `placed`; don't offer a button that would 403.
  const canCancel = !!order && order.status === 'placed'
  const canRate = !!order && order.status === 'delivered'

  return (
    <div className={cm.cn(cm.maxW('2xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <Link
        to="/orders"
        className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant hover:underline')}
      >
        ← {t('orderDetail.backLink', {}, { defaultValue: 'Back to orders' })}
      </Link>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : !order ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textMuted)}>
          {t('orderDetail.notFound', {}, { defaultValue: 'Order not found.' })}
        </p>
      ) : (
        <>
          <header className={cm.cn(cm.sp('mt', 2), cm.sp('mb', 6))}>
            <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
              {t('orderDetail.heading', { id: id ?? '' }, { defaultValue: 'Order {{id}}' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), cm.textMuted)}>
              {t(
                'orderDetail.fromAt',
                { restaurant: order.restaurant_name, when: fmtDateTime(order.placed_at) },
                { defaultValue: '{{restaurant}} · {{when}}' },
              )}
            </p>
          </header>

          <section
            className={cm.cn(cm.sp('p', 5), cm.sp('mb', 4), 'bg-surface rounded-xl shadow-sm')}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
              {t('orderDetail.itemsHeading', {}, { defaultValue: 'Items' })}
            </h2>
            <ul className="divide-y divide-outline-variant">
              {order.items.map((i) => (
                <li
                  key={i.name}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('py', 2),
                  )}
                >
                  <span>
                    {i.qty}× {i.name}
                  </span>
                  <span>{fmt(i.price_cents * i.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className={cm.cn(cm.textSize('sm'), 'space-y-1', cm.sp('mt', 4))}>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <dt>{t('nav.subtotal', {}, { defaultValue: 'Subtotal' })}</dt>
                <dd>{fmt(order.subtotal_cents)}</dd>
              </div>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <dt>{t('orderDetail.deliveryFee', {}, { defaultValue: 'Delivery fee' })}</dt>
                <dd>{fmt(order.delivery_fee_cents)}</dd>
              </div>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <dt>{t('form.tax', {}, { defaultValue: 'Tax' })}</dt>
                <dd>{fmt(order.tax_cents)}</dd>
              </div>
            </dl>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('pt', 3),
                cm.sp('mt', 2),
                cm.fontWeight('semibold'),
                cm.textSize('lg'),
                'border-t border-outline-variant',
              )}
            >
              <span>{t('nav.total', {}, { defaultValue: 'Total' })}</span>
              <span>{fmt(order.total_cents)}</span>
            </div>
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 5),
              cm.sp('mb', 4),
              'bg-surface rounded-xl shadow-sm space-y-2 text-sm',
            )}
          >
            <p>
              <span className={cm.cn(cm.fontWeight('medium'))}>
                {t('orderDetail.deliveredAt', {}, { defaultValue: 'Delivered at' })}:{' '}
              </span>
              {fmtDateTime(order.delivered_at)}
            </p>
            <p>
              <span className={cm.cn(cm.fontWeight('medium'))}>
                {t('form.address', {}, { defaultValue: 'Address' })}:{' '}
              </span>
              {order.address}
            </p>
            {order.driver_name ? (
              <p>
                <span className={cm.cn(cm.fontWeight('medium'))}>
                  {t('orderDetail.driver', {}, { defaultValue: 'Driver' })}:{' '}
                </span>
                {order.driver_name}
              </p>
            ) : null}
          </section>

          <Link
            to={`/restaurant/${order.restaurant_id}`}
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'inline-block bg-primary text-on-primary rounded-full hover:bg-primary-hover',
            )}
          >
            {t('orderDetail.reorderCta', {}, { defaultValue: 'Reorder these items' })}
          </Link>

          {canCancel && (
            <section
              data-testid="cancel-section"
              className={cm.cn(
                cm.sp('p', 5),
                cm.sp('mt', 4),
                'bg-surface rounded-xl shadow-sm space-y-3',
              )}
            >
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('orderDetail.cancelHeading', {}, { defaultValue: 'Need to cancel?' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                {t(
                  'orderDetail.cancelBlurb',
                  {},
                  { defaultValue: 'You can still cancel before the restaurant starts preparing.' },
                )}
              </p>
              {cancelError ? (
                <p data-testid="cancel-error" className="text-sm text-error">
                  {cancelError}
                </p>
              ) : null}
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelBusy}
                data-testid="cancel-order"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'bg-error text-on-error rounded-full hover:opacity-90 disabled:opacity-50',
                )}
              >
                {cancelBusy
                  ? t('common.cancellingEllipsis', {}, { defaultValue: 'Cancelling…' })
                  : t('orderDetail.cancelCta', {}, { defaultValue: 'Cancel order' })}
              </button>
            </section>
          )}

          {canRate && (
            <section
              data-testid="rate-section"
              className={cm.cn(
                cm.sp('p', 5),
                cm.sp('mt', 4),
                'bg-surface rounded-xl shadow-sm space-y-3',
              )}
            >
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('orderDetail.rateHeading', {}, { defaultValue: 'Rate this order' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                {t(
                  'orderDetail.rateBlurb',
                  {},
                  { defaultValue: 'How was the food? Tap to rate from 1 to 5.' },
                )}
              </p>
              <form onSubmit={handleRate} className="space-y-3">
                <div
                  className={cm.flex({ align: 'center', gap: 'sm' })}
                  role="group"
                  aria-label={t('form.rating', {}, { defaultValue: 'Rating' })}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      data-testid={`rate-star-${n}`}
                      aria-pressed={rating >= n}
                      aria-label={t('orderDetail.starN', { n }, { defaultValue: `${n} stars` })}
                      className={cm.cn(
                        'text-2xl',
                        rating >= n ? 'text-warning' : 'text-on-surface-variant',
                      )}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  name="comment"
                  rows={2}
                  placeholder={t(
                    'orderDetail.commentPlaceholder',
                    {},
                    { defaultValue: 'Optional comment…' },
                  )}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'block w-full border border-outline-variant rounded-md',
                  )}
                />
                {rateError ? (
                  <p data-testid="rate-error" className="text-sm text-error">
                    {rateError}
                  </p>
                ) : null}
                {ratedAt ? (
                  <p data-testid="rate-saved" className="text-sm text-success">
                    {t('orderDetail.rateSaved', {}, { defaultValue: 'Thanks for your rating.' })}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={rateBusy || rating < 1}
                  data-testid="rate-submit"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'bg-primary text-on-primary rounded-full hover:bg-primary-hover disabled:opacity-50',
                  )}
                >
                  {rateBusy
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('orderDetail.rateCta', {}, { defaultValue: 'Submit rating' })}
                </button>
              </form>
            </section>
          )}
        </>
      )}
    </div>
  )
}
