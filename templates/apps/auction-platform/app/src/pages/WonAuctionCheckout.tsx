import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CountdownTimer } from '../components/CountdownTimer.js'

interface CheckoutData {
  auction_id: string
  title: string
  category: string
  lot: string
  final_price_cents: number
  seller_name: string
  seller_handle: string
  pay_by: string
  shipping_options: Array<{ id: string; label: string; cents: number; eta: string }>
  payment_options: Array<{ id: string; kind: string; last4: string; primary: boolean }>
  shipping_addresses: Array<{ id: string; label: string; lines: string[]; primary: boolean }>
  fee_cents: { platform: number; tax: number }
}

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function WonAuctionCheckout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<CheckoutData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shipping, setShipping] = useState<string>('')
  const [payment, setPayment] = useState<string>('')
  const [address, setAddress] = useState<string>('')
  const [payStatus, setPayStatus] = useState<{
    kind: 'idle' | 'pending' | 'success' | 'error'
    message?: string
  }>({ kind: 'idle' })

  useEffect(() => {
    let cancelled = false
    setData(null)
    setLoading(true)
    setError(null)
    http
      .get<CheckoutData>(`/api/checkout/${id ?? ''}`)
      .then((res) => {
        if (cancelled) return
        const body = res.data as CheckoutData | undefined
        if (!body || !body.auction_id) {
          setData(null)
        } else {
          setData(body)
          setShipping(body.shipping_options[0]?.id ?? '')
          setPayment(body.payment_options[0]?.id ?? '')
          setAddress(body.shipping_addresses[0]?.id ?? '')
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('wonAuctionCheckout.error', {}, { defaultValue: 'Could not load checkout.' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (loading) {
    return (
      <div id="top">
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('wonAuctionCheckout.loading', {}, { defaultValue: 'Loading checkout…' })}
        </p>
      </div>
    )
  }
  if (error || !data) {
    return (
      <div
        id="top"
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.maxW('5xl'), cm.mxAuto, cm.stack(4))}
      >
        <p className={cm.cn(cm.textCenter, 'text-error')}>
          {error ??
            t(
              'wonAuctionCheckout.unavailable',
              {},
              { defaultValue: 'This checkout is unavailable.' },
            )}
        </p>
        <Link
          to="/my-bids"
          className={cm.cn(cm.textCenter, 'text-sm font-semibold text-primary hover:underline')}
        >
          {t('wonAuctionCheckout.backToBids', {}, { defaultValue: 'Back to my bids →' })}
        </Link>
      </div>
    )
  }

  const shippingCents = data.shipping_options.find((o) => o.id === shipping)?.cents ?? 0
  const total =
    data.final_price_cents + data.fee_cents.platform + data.fee_cents.tax + shippingCents

  const handlePay = () => {
    if (payStatus.kind === 'pending') return
    setPayStatus({ kind: 'pending' })
    http
      .post<{ checkoutUrl?: string; status?: string; alreadyPaid?: boolean }>(
        `/api/checkout/${data.auction_id}/pay`,
        { shipping, payment, address },
      )
      .then((res) => {
        const body = res.data ?? {}
        if (body.alreadyPaid || body.status === 'paid') {
          setPayStatus({
            kind: 'success',
            message: t(
              'wonAuctionCheckout.alreadyPaid',
              {},
              { defaultValue: 'This order is already paid.' },
            ),
          })
          return
        }
        if (body.checkoutUrl) {
          setPayStatus({
            kind: 'success',
            message: t(
              'wonAuctionCheckout.redirecting',
              {},
              { defaultValue: 'Redirecting to secure checkout…' },
            ),
          })
          // Conversion analytics — the checkout handoff to Stripe; fire-and-forget.
          track({
            name: 'checkout.started',
            properties: { auctionId: data.auction_id, totalCents: total, shipping },
          })
          window.location.assign(body.checkoutUrl)
          return
        }
        setPayStatus({
          kind: 'error',
          message: t(
            'wonAuctionCheckout.payError',
            {},
            { defaultValue: 'Could not start checkout. Please try again.' },
          ),
        })
      })
      .catch((e: unknown) => {
        setPayStatus({
          kind: 'error',
          message:
            e instanceof Error
              ? e.message
              : t(
                  'wonAuctionCheckout.payError',
                  {},
                  { defaultValue: 'Could not complete payment.' },
                ),
        })
      })
  }

  return (
    <div
      id="top"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}
    >
      {/* Won banner */}
      <section
        className={cm.cn(
          cm.sp('p', 6),
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          'rounded-2xl text-white',
        )}
        style={{
          background: 'linear-gradient(135deg, var(--color-accent-dark), var(--color-accent))',
        }}
      >
        <div>
          <p className={cm.cn('text-xs font-black uppercase tracking-widest opacity-80')}>
            {t('wonAuctionCheckout.bannerEyebrow', {}, { defaultValue: 'Congratulations' })}
          </p>
          <h1 className={cm.cn('text-3xl font-extrabold tracking-tight')}>
            {t(
              'wonAuctionCheckout.bannerTitle',
              {},
              { defaultValue: 'You won this auction — pay to claim your lot.' },
            )}
          </h1>
          <p className={cm.cn('text-sm opacity-90 mt-2')}>
            {t(
              'wonAuctionCheckout.bannerSubtitle',
              {},
              {
                defaultValue: 'Complete payment within 72 hours to keep your buyer rating intact.',
              },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ direction: 'col', align: 'end', gap: 'xs' }))}>
          <p className={cm.cn('text-xs uppercase tracking-widest opacity-80')}>
            {t('wonAuctionCheckout.payBy', {}, { defaultValue: 'Pay by' })}
          </p>
          <CountdownTimer endsAtIso={data.pay_by} size="lg" showLabel={false} />
        </div>
      </section>

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-6')}>
        <div className={cm.cn('lg:col-span-8 space-y-6')}>
          {/* Item summary */}
          <article
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-xl bg-surface border border-outline-variant/40 flex gap-4',
            )}
          >
            <div
              className={cm.cn('w-24 h-24 rounded-xl shrink-0 flex items-center justify-center')}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-bid-panel), var(--mol-color-background-secondary))',
              }}
            >
              <span
                className={cm.cn('material-symbols-outlined text-4xl text-primary/60')}
                aria-hidden="true"
              >
                image
              </span>
            </div>
            <div className={cm.cn('flex-1 stack-y space-y-1')}>
              <p
                className={cm.cn(
                  'text-xs font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {data.category}
              </p>
              <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>{data.title}</h2>
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>{data.lot}</p>
              <Link
                to={`/sellers/${data.seller_handle}`}
                className={cm.cn('text-sm font-bold text-primary hover:underline')}
              >
                {t(
                  'wonAuctionCheckout.soldBy',
                  { seller: data.seller_name },
                  { defaultValue: 'Sold by {{seller}}' },
                )}
              </Link>
            </div>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'end', gap: 'xs' }),
                'text-right',
              )}
            >
              <p
                className={cm.cn(
                  'text-xs font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('wonAuctionCheckout.finalPrice', {}, { defaultValue: 'Final price' })}
              </p>
              <p
                className={cm.cn('text-2xl font-extrabold tabular-nums')}
                style={{ color: 'var(--mol-color-primary)' }}
              >
                {fmt(data.final_price_cents)}
              </p>
            </div>
          </article>

          {/* Shipping address */}
          <article
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'rounded-xl bg-surface border border-outline-variant/40',
            )}
          >
            <h2
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                'text-lg font-extrabold tracking-tight',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-primary text-xl')}
                aria-hidden="true"
              >
                local_shipping
              </span>
              {t('wonAuctionCheckout.shippingHeading', {}, { defaultValue: 'Shipping Address' })}
            </h2>
            {data.shipping_addresses.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                {t(
                  'wonAuctionCheckout.noAddresses',
                  {},
                  { defaultValue: 'Add a shipping address in Settings before paying.' },
                )}
              </p>
            ) : (
              <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-3')}>
                {data.shipping_addresses.map((a) => {
                  const active = a.id === address
                  return (
                    <label
                      key={a.id}
                      className={cm.cn(
                        cm.sp('p', 4),
                        'rounded-xl border cursor-pointer transition-all',
                        active ? 'shadow-md' : 'hover:border-on-surface-variant',
                      )}
                      style={
                        active
                          ? {
                              borderColor: 'var(--mol-color-primary)',
                              background: 'var(--color-bid-panel)',
                            }
                          : { borderColor: 'var(--color-outline-variant)' }
                      }
                    >
                      <input
                        type="radio"
                        name="address"
                        className={cm.cn('sr-only')}
                        checked={active}
                        onChange={() => setAddress(a.id)}
                      />
                      <p className={cm.cn('font-bold')}>{a.label}</p>
                      {a.lines.map((line) => (
                        <p key={line} className={cm.cn('text-sm text-on-surface-variant')}>
                          {line}
                        </p>
                      ))}
                    </label>
                  )
                })}
              </div>
            )}
          </article>

          {/* Shipping option */}
          <article
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'rounded-xl bg-surface border border-outline-variant/40',
            )}
          >
            <h2 className={cm.cn('text-lg font-extrabold tracking-tight')}>
              {t(
                'wonAuctionCheckout.shippingOptionHeading',
                {},
                { defaultValue: 'Shipping option' },
              )}
            </h2>
            <div className={cm.cn('space-y-3')}>
              {data.shipping_options.map((o) => {
                const active = o.id === shipping
                return (
                  <label
                    key={o.id}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                      cm.sp('p', 4),
                      'rounded-xl border cursor-pointer transition-all',
                      active ? 'shadow-md' : 'hover:border-on-surface-variant',
                    )}
                    style={
                      active
                        ? {
                            borderColor: 'var(--mol-color-primary)',
                            background: 'var(--color-bid-panel)',
                          }
                        : { borderColor: 'var(--color-outline-variant)' }
                    }
                  >
                    <input
                      type="radio"
                      name="shipping"
                      className={cm.cn('sr-only')}
                      checked={active}
                      onChange={() => setShipping(o.id)}
                    />
                    <div>
                      <p className={cm.cn('font-bold')}>{o.label}</p>
                      <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>{o.eta}</p>
                    </div>
                    <span className={cm.cn('font-extrabold tabular-nums')}>{fmt(o.cents)}</span>
                  </label>
                )
              })}
            </div>
          </article>

          {/* Payment */}
          <article
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'rounded-xl bg-surface border border-outline-variant/40',
            )}
          >
            <h2
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                'text-lg font-extrabold tracking-tight',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-primary text-xl')}
                aria-hidden="true"
              >
                payment
              </span>
              {t('nav.paymentMethod', {}, { defaultValue: 'Payment Method' })}
            </h2>
            {data.payment_options.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                {t(
                  'wonAuctionCheckout.stripeNoticed',
                  {},
                  {
                    defaultValue:
                      'You will enter card details on the secure Stripe checkout page after pressing Pay. Apple Pay, Google Pay, and any saved cards on the Stripe side are surfaced there.',
                  },
                )}
              </p>
            ) : (
              <div className={cm.cn('space-y-3')}>
                {data.payment_options.map((p) => {
                  const active = p.id === payment
                  return (
                    <label
                      key={p.id}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                        cm.sp('p', 4),
                        'rounded-xl border cursor-pointer transition-all',
                        active ? 'shadow-md' : 'hover:border-on-surface-variant',
                      )}
                      style={
                        active
                          ? {
                              borderColor: 'var(--mol-color-primary)',
                              background: 'var(--color-bid-panel)',
                            }
                          : { borderColor: 'var(--color-outline-variant)' }
                      }
                    >
                      <input
                        type="radio"
                        name="payment"
                        className={cm.cn('sr-only')}
                        checked={active}
                        onChange={() => setPayment(p.id)}
                      />
                      <div className={cm.flex({ align: 'center', gap: 'md' })}>
                        <span
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'center' }),
                            'w-10 h-10 rounded-md text-white font-bold text-xs uppercase',
                          )}
                          style={{ background: p.kind === 'visa' ? '#1a1f71' : '#eb001b' }}
                        >
                          {p.kind}
                        </span>
                        <p className={cm.cn('font-bold tabular-nums')}>•••• {p.last4}</p>
                      </div>
                      {p.primary ? (
                        <span
                          className={cm.cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white',
                          )}
                          style={{ background: 'var(--color-accent)' }}
                        >
                          {t('wonAuctionCheckout.primary', {}, { defaultValue: 'Primary' })}
                        </span>
                      ) : null}
                    </label>
                  )
                })}
              </div>
            )}
          </article>
        </div>

        {/* Sticky order summary */}
        <aside className={cm.cn('lg:col-span-4 space-y-3 lg:sticky lg:top-6 self-start')}>
          <article
            className={cm.cn(cm.sp('p', 6), cm.stack(4), 'rounded-2xl border shadow-md')}
            style={{ background: 'var(--color-bid-panel)', borderColor: 'var(--mol-color-border)' }}
          >
            <h2 className={cm.cn('text-lg font-extrabold tracking-tight')}>
              {t('nav.orderSummary', {}, { defaultValue: 'Order summary' })}
            </h2>
            <dl className={cm.cn('space-y-2 text-sm')}>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <dt className={cm.cn('text-on-surface-variant')}>
                  {t('wonAuctionCheckout.lineWinningBid', {}, { defaultValue: 'Winning bid' })}
                </dt>
                <dd className={cm.cn('font-bold tabular-nums')}>{fmt(data.final_price_cents)}</dd>
              </div>
              {data.fee_cents.platform > 0 ? (
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <dt className={cm.cn('text-on-surface-variant')}>
                    {t(
                      'wonAuctionCheckout.linePlatformFee',
                      {},
                      { defaultValue: 'Buyer premium (12%)' },
                    )}
                  </dt>
                  <dd className={cm.cn('font-bold tabular-nums')}>
                    {fmt(data.fee_cents.platform)}
                  </dd>
                </div>
              ) : null}
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <dt className={cm.cn('text-on-surface-variant')}>
                  {t('wonAuctionCheckout.lineShipping', {}, { defaultValue: 'Shipping' })}
                </dt>
                <dd className={cm.cn('font-bold tabular-nums')}>{fmt(shippingCents)}</dd>
              </div>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <dt className={cm.cn('text-on-surface-variant')}>
                  {t('wonAuctionCheckout.lineTax', {}, { defaultValue: 'Estimated tax' })}
                </dt>
                <dd className={cm.cn('font-bold tabular-nums')}>{fmt(data.fee_cents.tax)}</dd>
              </div>
              <div
                className={cm.flex({ align: 'center', justify: 'between' })}
                style={{ borderTop: '1px solid var(--mol-color-border)', paddingTop: '0.75rem' }}
              >
                <dt className={cm.cn('text-base font-extrabold uppercase tracking-widest')}>
                  {t('nav.total', {}, { defaultValue: 'Total' })}
                </dt>
                <dd
                  className={cm.cn('text-2xl font-extrabold tabular-nums')}
                  style={{ color: 'var(--color-accent-dark)' }}
                >
                  {fmt(total)}
                </dd>
              </div>
            </dl>
            {payStatus.message ? (
              <p
                role="status"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-lg text-xs font-semibold',
                  payStatus.kind === 'success'
                    ? 'text-success bg-success/10'
                    : 'text-error bg-error/10',
                )}
              >
                {payStatus.message}
              </p>
            ) : null}
            <button
              type="button"
              onClick={handlePay}
              disabled={payStatus.kind === 'pending' || payStatus.kind === 'success'}
              className={cm.cn(
                cm.w('full'),
                cm.sp('py', 4),
                'rounded-xl text-white font-extrabold text-base shadow-md hover:brightness-105 transition-all disabled:opacity-60',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-accent-dark), var(--color-accent))',
              }}
            >
              {payStatus.kind === 'pending'
                ? t('wonAuctionCheckout.paying', {}, { defaultValue: 'Processing…' })
                : t(
                    'wonAuctionCheckout.payCta',
                    { amount: fmt(total) },
                    { defaultValue: 'Pay {{amount}} now' },
                  )}
            </button>
            <p className={cm.cn(cm.textSize('xs'), cm.textCenter, cm.textMuted)}>
              {t(
                'wonAuctionCheckout.protected',
                {},
                { defaultValue: 'Funds held in escrow until your lot is delivered safely.' },
              )}
            </p>
          </article>
        </aside>
      </div>
    </div>
  )
}

export default WonAuctionCheckout
