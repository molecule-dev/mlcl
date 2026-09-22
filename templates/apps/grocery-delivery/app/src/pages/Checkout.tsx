import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface CartItem {
  id: string
  product_id: string
  name: string
  qty: number
  price_cents: number
}

interface DeliverySlot {
  id: string
  label: string
  fee_cents: number | null
}

interface CartBody {
  items?: CartItem[]
  data?: CartItem[]
  subtotal_cents?: number
  delivery_fee_cents?: number
  total_cents?: number
}

const TIP_OPTIONS = [
  { cents: 200, label: '$2' },
  { cents: 500, label: '$5' },
  { cents: 1000, label: '$10' },
  { cents: 0, label: 'No tip' },
] as const

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function Checkout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [searchParams] = useSearchParams()

  const [items, setItems] = useState<CartItem[]>([])
  const [subtotalCents, setSubtotalCents] = useState(0)
  const [deliveryFeeCents, setDeliveryFeeCents] = useState(0)
  const [slots, setSlots] = useState<DeliverySlot[]>([])
  const [slotId, setSlotId] = useState<string>(searchParams.get('slot') ?? '')
  const [tip, setTip] = useState(0)
  const [address, setAddress] = useState({
    line1: '742 Evergreen Terrace',
    city: 'Springfield',
    region: 'OR',
    postal_code: '54321',
  })
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple_pay' | 'google_pay'>('card')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    // Read the deep-linked slot ONCE here — putting slotId in the deps would
    // refetch cart + slots every time the user picks a slot (the effect also
    // SETS slotId, so it re-ran itself right after the initial load too).
    const initialSlot = searchParams.get('slot') ?? ''
    Promise.all([
      http
        .get('/api/cart')
        .then((res) => {
          const body = (
            res && typeof res === 'object' && 'data' in res ? (res as { data: unknown }).data : null
          ) as (CartBody & { items?: CartItem[]; data?: CartItem[] }) | null
          // Read the field. GET /api/cart answers a cart OBJECT, so unwrapList
          // correctly declines to peel it and returned [] — checkout rendered an
          // empty cart while the API held the items. Same cause as Cart.tsx;
          // Shop.tsx already had this fallback, which is why only these two broke.
          const items = body?.items ?? body?.data ?? []
          return { items, body: body ?? {} }
        })
        .catch(() => ({ items: [] as CartItem[], body: {} as CartBody })),
      http
        .get('/api/delivery-slots')
        .then((res) => unwrapList<DeliverySlot>(res))
        .catch(() => [] as DeliverySlot[]),
    ])
      .then(([cart, slotList]) => {
        if (cancelled) return
        const cartItems = cart.items
        setItems(cartItems)
        setSubtotalCents(
          cart.body.subtotal_cents ?? cartItems.reduce((s, i) => s + i.price_cents * i.qty, 0),
        )
        setDeliveryFeeCents(cart.body.delivery_fee_cents ?? 0)
        setSlots(slotList)
        if (slotList.length > 0) {
          const found = initialSlot ? slotList.find((s) => s.id === initialSlot) : null
          setSlotId(found?.id ?? slotList[0].id)
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(t('checkout.loadError', {}, { defaultValue: 'Failed to load cart.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t, searchParams])

  const itemCount = items.reduce((s, i) => s + i.qty, 0)
  const total = subtotalCents + deliveryFeeCents + tip

  async function placeOrder(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (submitting || items.length === 0) return
    if (!slotId) {
      setError(t('checkout.slotRequired', {}, { defaultValue: 'Please pick a delivery slot.' }))
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await http.post('/api/orders', {
        deliveryAddress: address,
        deliverySlotId: slotId,
        deliveryInstructions: '',
        tip: tip / 100,
      })
      const order = unwrapSingle<{ id?: string }>(res)
      const id = order?.id
      if (!id) {
        setError(t('checkout.placeOrderError', {}, { defaultValue: 'Could not place order.' }))
        return
      }
      void track({
        name: 'order.placed',
        properties: {
          order_id: id,
          slot_id: slotId,
          item_count: itemCount,
          total_cents: total,
          tip_cents: tip,
        },
      })
      navigate(`/order/${id}/confirmation`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setError(msg || t('checkout.placeOrderError', {}, { defaultValue: 'Could not place order.' }))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
        {t('checkout.heading', {}, { defaultValue: 'Checkout' })}
      </h1>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : items.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter)}>
          <p className={cm.cn(cm.textSize('lg'), cm.textMuted, cm.sp('mb', 4))}>
            {t('checkout.emptyCart', {}, { defaultValue: 'Your cart is empty.' })}
          </p>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'inline-flex items-center gap-2 bg-primary text-on-primary rounded-full hover:shadow-lg transition-shadow',
            )}
          >
            {t('checkout.shopCta', {}, { defaultValue: 'Browse the aisles' })}
          </button>
        </div>
      ) : (
        <form onSubmit={placeOrder} className={cm.grid({ cols: 12, gap: 'lg' })}>
          <div className={'col-span-12 lg:col-span-7 space-y-6'}>
            <section className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
                {t('checkout.deliveryHeading', {}, { defaultValue: 'Delivery address' })}
              </h2>
              <div className={'space-y-2'}>
                <input
                  aria-label={t(
                    'checkout.addressLine1Placeholder',
                    {},
                    { defaultValue: 'Street address' },
                  )}
                  type="text"
                  value={address.line1}
                  onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
                  placeholder={t(
                    'checkout.addressLine1Placeholder',
                    {},
                    { defaultValue: 'Street address' },
                  )}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'w-full border border-outline-variant rounded-md',
                  )}
                />
                <div className={cm.flex({ gap: 'sm' })}>
                  <input
                    aria-label={t('checkout.cityPlaceholder', {}, { defaultValue: 'City' })}
                    type="text"
                    value={address.city}
                    onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                    placeholder={t('checkout.cityPlaceholder', {}, { defaultValue: 'City' })}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'flex-1 border border-outline-variant rounded-md',
                    )}
                  />
                  <input
                    aria-label={t('checkout.zipPlaceholder', {}, { defaultValue: 'ZIP' })}
                    type="text"
                    value={address.postal_code}
                    onChange={(e) => setAddress((a) => ({ ...a, postal_code: e.target.value }))}
                    placeholder={t('checkout.zipPlaceholder', {}, { defaultValue: 'ZIP' })}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'w-32 border border-outline-variant rounded-md',
                    )}
                  />
                </div>
              </div>
            </section>

            <section className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
                {t('checkout.slotHeading', {}, { defaultValue: 'Delivery slot' })}
              </h2>
              {slots.length === 0 ? (
                <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                  {t(
                    'checkout.noSlots',
                    {},
                    { defaultValue: 'No delivery slots available right now.' },
                  )}
                </p>
              ) : (
                <div className={'grid grid-cols-1 sm:grid-cols-2 gap-2'}>
                  {slots.slice(0, 8).map((s) => {
                    const isActive = slotId === s.id
                    return (
                      <label
                        key={s.id}
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          cm.flex({ align: 'center', justify: 'between' }),
                          'border-2 rounded-xl cursor-pointer transition-all',
                          isActive
                            ? 'border-primary bg-primary/5'
                            : 'border-outline-variant hover:border-primary/40',
                        )}
                      >
                        <span className={cm.flex({ align: 'center', gap: 'sm' })}>
                          <input
                            type="radio"
                            name="slot"
                            value={s.id}
                            checked={isActive}
                            onChange={() => {
                              setSlotId(s.id)
                              void track({
                                name: 'delivery.scheduled',
                                properties: { slot_id: s.id, slot_label: s.label },
                              })
                            }}
                            className="accent-primary"
                          />
                          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                            {s.label}
                          </span>
                        </span>
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            (s.fee_cents ?? deliveryFeeCents) === 0 ? 'text-success' : '',
                          )}
                        >
                          {(s.fee_cents ?? deliveryFeeCents) === 0
                            ? t('nav.free', {}, { defaultValue: 'Free' })
                            : fmt(s.fee_cents ?? deliveryFeeCents)}
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </section>

            <section className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
                {t('checkout.tipHeading', {}, { defaultValue: 'Tip your shopper' })}
              </h2>
              <div className={cm.flex({ gap: 'sm' })}>
                {TIP_OPTIONS.map((opt) => {
                  const isActive = tip === opt.cents
                  return (
                    <button
                      key={opt.cents}
                      type="button"
                      onClick={() => setTip(opt.cents)}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                        'rounded-full',
                        isActive
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container text-on-surface',
                      )}
                    >
                      {t(`checkout.tip.${opt.cents}`, {}, { defaultValue: opt.label })}
                    </button>
                  )
                })}
              </div>
            </section>

            <section className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
                {t('checkout.paymentHeading', {}, { defaultValue: 'Payment method' })}
              </h2>
              <div className={'space-y-2'}>
                {(['card', 'apple_pay', 'google_pay'] as const).map((method) => (
                  <label
                    key={method}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'border border-outline-variant rounded-md cursor-pointer',
                    )}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method}
                      checked={paymentMethod === method}
                      onChange={() => setPaymentMethod(method)}
                    />
                    <span>
                      {t(
                        `checkout.payment.${method}`,
                        {},
                        {
                          defaultValue:
                            method === 'card'
                              ? 'Credit / debit card'
                              : method === 'apple_pay'
                                ? 'Apple Pay'
                                : 'Google Pay',
                        },
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          <aside className={'col-span-12 lg:col-span-5'}>
            <div className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm sticky top-24')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
                {t('checkout.summaryHeading', {}, { defaultValue: 'Order summary' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 3), cm.textMuted)}>
                {t('checkout.itemCount', { count: itemCount }, { defaultValue: '{{count}} items' })}
              </p>
              <ul className={cm.cn(cm.textSize('sm'), 'space-y-1', cm.sp('mb', 3))}>
                {items.slice(0, 5).map((it) => (
                  <li key={it.id} className={cm.flex({ align: 'center', justify: 'between' })}>
                    <span className="truncate">
                      {it.qty}× {it.name}
                    </span>
                    <span className="tabular-nums">{fmt(it.qty * it.price_cents)}</span>
                  </li>
                ))}
                {items.length > 5 ? (
                  <li className={cm.textMuted}>
                    {t(
                      'checkout.moreItems',
                      { n: items.length - 5 },
                      { defaultValue: '+ {{n}} more' },
                    )}
                  </li>
                ) : null}
              </ul>
              <dl className={cm.cn(cm.textSize('sm'), 'space-y-1', cm.sp('mb', 3))}>
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <dt>{t('nav.subtotal', {}, { defaultValue: 'Subtotal' })}</dt>
                  <dd>{fmt(subtotalCents)}</dd>
                </div>
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <dt>{t('checkout.deliveryFee', {}, { defaultValue: 'Delivery' })}</dt>
                  <dd>
                    {deliveryFeeCents === 0
                      ? t('nav.free', {}, { defaultValue: 'Free' })
                      : fmt(deliveryFeeCents)}
                  </dd>
                </div>
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <dt>{t('checkout.tipLabel', {}, { defaultValue: 'Tip' })}</dt>
                  <dd>{fmt(tip)}</dd>
                </div>
              </dl>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  cm.textSize('lg'),
                  'border-t border-outline-variant',
                )}
              >
                <span>{t('nav.total', {}, { defaultValue: 'Total' })}</span>
                <span data-test="checkout-total">{fmt(total)}</span>
              </div>
              {error ? (
                <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-error')} role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={submitting || !slotId}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.sp('mt', 4),
                  cm.fontWeight('semibold'),
                  'block w-full text-center bg-primary text-on-primary rounded-full hover:bg-primary-hover disabled:opacity-50',
                )}
              >
                {submitting
                  ? t('checkout.placingOrder', {}, { defaultValue: 'Placing order…' })
                  : t(
                      'checkout.placeOrder',
                      { total: fmt(total) },
                      { defaultValue: 'Place order · {{total}}' },
                    )}
              </button>
            </div>
          </aside>
        </form>
      )}
    </div>
  )
}
