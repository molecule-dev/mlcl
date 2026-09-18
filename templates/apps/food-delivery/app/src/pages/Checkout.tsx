import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'
import { useCart } from '../lib/useCart.js'

interface Address {
  id: string
  label: string | null
  street: string
  city: string | null
  postal_code: string | null
  lat: number | null
  lng: number | null
  is_default: boolean
}

interface PaymentMethodRow {
  id: string
  brand: string | null
  last4: string | null
  is_default: boolean
}

const TAX_RATE = 0.0875

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function Checkout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const cart = useCart()

  const [addresses, setAddresses] = useState<Address[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRow[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [selectedPmId, setSelectedPmId] = useState<string | 'card_at_checkout'>('card_at_checkout')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deliveryFeeCents, setDeliveryFeeCents] = useState<number>(299)

  // Inline new-address form (used when the user has no saved addresses).
  const [newAddress, setNewAddress] = useState({ street: '', city: '', postal_code: '' })
  const usingNewAddress = addresses.length === 0 || !selectedAddressId

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get('/api/addresses').catch(() => null),
      http.get('/api/payment-methods').catch(() => null),
      cart.restaurantId
        ? http.get(`/api/restaurants/${cart.restaurantId}`).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([addrRes, pmRes, restRes]) => {
        if (cancelled) return
        const addrList = unwrapList<Address>(addrRes)
        setAddresses(addrList)
        const def = addrList.find((a) => a.is_default) ?? addrList[0] ?? null
        if (def) setSelectedAddressId(def.id)
        const pmList = unwrapList<PaymentMethodRow>(pmRes)
        setPaymentMethods(pmList)
        const defPm = pmList.find((p) => p.is_default) ?? pmList[0] ?? null
        if (defPm) setSelectedPmId(defPm.id)
        const rest = unwrapSingle<{ delivery_fee_cents?: number }>(restRes)
        if (rest?.delivery_fee_cents != null) setDeliveryFeeCents(Number(rest.delivery_fee_cents))
      })
      .catch(() => {
        /* leave defaults */
      })
    return () => {
      cancelled = true
    }
  }, [http, cart.restaurantId])

  const subtotal = cart.subtotalCents
  const tax = Math.round(subtotal * TAX_RATE)
  const total = subtotal + deliveryFeeCents + tax

  async function placeOrder(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!cart.restaurantId || cart.lines.length === 0) {
      setError(t('checkout.cartEmpty', {}, { defaultValue: 'Your cart is empty.' }))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      // Materialize the chosen address (or create one inline).
      let address: Address | null = null
      if (selectedAddressId && !usingNewAddress) {
        address = addresses.find((a) => a.id === selectedAddressId) ?? null
      }
      if (!address) {
        if (!newAddress.street || !newAddress.city) {
          setError(
            t('checkout.missingAddress', {}, { defaultValue: 'Please enter a delivery address.' }),
          )
          setSubmitting(false)
          return
        }
        const created = await http.post('/api/addresses', {
          label: 'Home',
          street: newAddress.street,
          city: newAddress.city,
          postal_code: newAddress.postal_code,
          is_default: addresses.length === 0,
        })
        address = unwrapSingle<Address>(created)
      }
      if (!address) {
        setError(
          t('checkout.missingAddress', {}, { defaultValue: 'Please enter a delivery address.' }),
        )
        setSubmitting(false)
        return
      }

      const lat = address.lat ?? 37.7749
      const lng = address.lng ?? -122.4194
      const items = cart.lines.map((l) => ({
        menu_item_id: l.itemId,
        quantity: l.qty,
      }))
      const payload = {
        restaurant_id: cart.restaurantId,
        items,
        delivery_address: [address.street, address.city, address.postal_code]
          .filter(Boolean)
          .join(', '),
        delivery_lat: lat,
        delivery_lng: lng,
        payment_method_id: selectedPmId === 'card_at_checkout' ? undefined : selectedPmId,
      }
      const res = await http.post<{ id: string }>('/api/orders', payload)
      const placed = unwrapSingle<{ id: string }>(res.data)
      if (!placed?.id) {
        setError(t('checkout.failed', {}, { defaultValue: 'Could not place order. Try again.' }))
        setSubmitting(false)
        return
      }
      cart.clear()
      navigate(`/checkout/confirmation/${placed.id}`)
    } catch (err) {
      setError(
        (err as Error).message ??
          t('checkout.failed', {}, { defaultValue: 'Could not place order. Try again.' }),
      )
      setSubmitting(false)
    }
  }

  if (cart.lines.length === 0) {
    return (
      <div
        className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 16), cm.mxAuto, cm.textCenter)}
      >
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
          {t('checkout.heading', {}, { defaultValue: 'Checkout' })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), cm.textMuted, cm.sp('mb', 6))}>
          {t('checkout.cartEmpty', {}, { defaultValue: 'Your cart is empty.' })}
        </p>
        <Link
          to="/restaurants"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            'inline-block bg-primary text-on-primary rounded-full hover:bg-primary-hover',
          )}
        >
          {t('checkout.browseCta', {}, { defaultValue: 'Browse restaurants' })}
        </Link>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
        {t('checkout.heading', {}, { defaultValue: 'Checkout' })}
      </h1>

      <form onSubmit={placeOrder} className={cm.grid({ cols: 12, gap: 'lg' })}>
        <div className={'col-span-12 lg:col-span-7 space-y-6'}>
          {/* Delivery address */}
          <section
            data-testid="checkout-address"
            className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm')}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
              {t('checkout.deliveryHeading', {}, { defaultValue: 'Delivery address' })}
            </h2>
            {addresses.length > 0 ? (
              <ul className={cm.cn('space-y-2', cm.sp('mb', 3))}>
                {addresses.map((a) => (
                  <li key={a.id}>
                    <label
                      className={cm.cn(
                        cm.flex({ align: 'start', gap: 'sm' }),
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        'border border-outline-variant rounded-md cursor-pointer',
                      )}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddressId === a.id}
                        onChange={() => setSelectedAddressId(a.id)}
                      />
                      <div>
                        <p className={cm.fontWeight('medium')}>
                          {a.label ??
                            t('checkout.savedAddress', {}, { defaultValue: 'Saved address' })}
                        </p>
                        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                          {a.street}
                          {a.city ? `, ${a.city}` : ''}
                          {a.postal_code ? ` ${a.postal_code}` : ''}
                        </p>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            ) : null}
            {usingNewAddress ? (
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                <input
                  type="text"
                  name="street"
                  aria-label={t(
                    'checkout.addressLine1Placeholder',
                    {},
                    { defaultValue: 'Street address' },
                  )}
                  value={newAddress.street}
                  onChange={(e) => setNewAddress((a) => ({ ...a, street: e.target.value }))}
                  placeholder={t(
                    'checkout.addressLine1Placeholder',
                    {},
                    { defaultValue: 'Street address' },
                  )}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'border border-outline-variant rounded-md',
                  )}
                />
                <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
                  <input
                    type="text"
                    name="city"
                    aria-label={t('checkout.cityPlaceholder', {}, { defaultValue: 'City' })}
                    value={newAddress.city}
                    onChange={(e) => setNewAddress((a) => ({ ...a, city: e.target.value }))}
                    placeholder={t('checkout.cityPlaceholder', {}, { defaultValue: 'City' })}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'flex-1 border border-outline-variant rounded-md',
                    )}
                  />
                  <input
                    type="text"
                    name="zip"
                    aria-label={t('checkout.zipPlaceholder', {}, { defaultValue: 'ZIP' })}
                    value={newAddress.postal_code}
                    onChange={(e) => setNewAddress((a) => ({ ...a, postal_code: e.target.value }))}
                    placeholder={t('checkout.zipPlaceholder', {}, { defaultValue: 'ZIP' })}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'w-32 border border-outline-variant rounded-md',
                    )}
                  />
                </div>
              </div>
            ) : null}
          </section>

          {/* Payment method */}
          <section
            data-testid="checkout-payment"
            className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm')}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
              {t('nav.paymentMethod', {}, { defaultValue: 'Payment method' })}
            </h2>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              {paymentMethods.map((p) => (
                <label
                  key={p.id}
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
                    value={p.id}
                    checked={selectedPmId === p.id}
                    onChange={() => setSelectedPmId(p.id)}
                  />
                  <span>
                    {(p.brand ?? 'card').toUpperCase()} {p.last4 ? `•••• ${p.last4}` : ''}
                  </span>
                </label>
              ))}
              <label
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
                  value="card_at_checkout"
                  checked={selectedPmId === 'card_at_checkout'}
                  onChange={() => setSelectedPmId('card_at_checkout')}
                />
                <span>
                  {t('checkout.payment.card', {}, { defaultValue: 'Pay with card on delivery' })}
                </span>
              </label>
            </div>
          </section>

          {error ? (
            <p
              data-testid="checkout-error"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'bg-error/10 text-error rounded-md text-sm',
              )}
            >
              {error}
            </p>
          ) : null}
        </div>

        {/* Order summary */}
        <aside className={'col-span-12 lg:col-span-5'}>
          <div className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm sticky top-24')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
              {t('nav.orderSummary', {}, { defaultValue: 'Order summary' })}
            </h2>
            {cart.restaurantName ? (
              <p
                data-testid="checkout-restaurant"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  cm.sp('mb', 3),
                  cm.textMuted,
                )}
              >
                {t(
                  'checkout.from',
                  { name: cart.restaurantName },
                  { defaultValue: 'From {{name}}' },
                )}
              </p>
            ) : null}
            <ul className={cm.cn('divide-y divide-outline-variant', cm.sp('mb', 3))}>
              {cart.lines.map((l) => (
                <li
                  key={l.itemId}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                  )}
                >
                  <span>
                    {l.qty}× {l.name}
                  </span>
                  <span>{fmt(l.price_cents * l.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className={cm.cn(cm.textSize('sm'), 'space-y-1', cm.sp('mb', 3))}>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <dt>{t('nav.subtotal', {}, { defaultValue: 'Subtotal' })}</dt>
                <dd data-testid="checkout-subtotal">{fmt(subtotal)}</dd>
              </div>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <dt>{t('checkout.deliveryFee', {}, { defaultValue: 'Delivery fee' })}</dt>
                <dd>{fmt(deliveryFeeCents)}</dd>
              </div>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <dt>{t('form.tax', {}, { defaultValue: 'Tax' })}</dt>
                <dd>{fmt(tax)}</dd>
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
              <span data-testid="checkout-total">{fmt(total)}</span>
            </div>
            <button
              type="submit"
              disabled={submitting}
              data-testid="checkout-submit"
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
    </div>
  )
}
