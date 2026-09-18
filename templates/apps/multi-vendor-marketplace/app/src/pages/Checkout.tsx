import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const STEPS = [
  { id: 'shipping', label: 'Shipping' },
  { id: 'payment', label: 'Payment' },
  { id: 'review', label: 'Review' },
] as const

interface ApiCartItem {
  id: string
  product_id: string
  variant_id: string | null
  name: string
  image: string | null
  unit_price_cents: number
  quantity: number
}

interface ApiCartGroup {
  vendor_id: string
  vendor_slug: string
  vendor_name: string
  vendor_verified: boolean
  shipping_cents: number
  estimated_delivery: string
  items: ApiCartItem[]
  subtotal_cents: number
}

interface ApiCart {
  groups: ApiCartGroup[]
  item_count: number
  item_subtotal_cents: number
  shipping_total_cents: number
  total_cents: number
  currency: string
}

const EMPTY_CART: ApiCart = {
  groups: [],
  item_count: 0,
  item_subtotal_cents: 0,
  shipping_total_cents: 0,
  total_cents: 0,
  currency: 'USD',
}

interface ShippingAddress {
  firstName: string
  lastName: string
  street: string
  city: string
  state: string
  postal: string
}

const SHIPPING_FIELDS: Array<{
  id: keyof ShippingAddress
  label: string
  placeholder: string
  col?: 1 | 2 | 3
}> = [
  { id: 'firstName', label: 'First name', placeholder: 'Helena', col: 2 },
  { id: 'lastName', label: 'Last name', placeholder: 'Souza', col: 2 },
  { id: 'street', label: 'Street address', placeholder: '221B Rua das Janelas Verdes', col: 1 },
  { id: 'city', label: 'City', placeholder: 'Lisbon', col: 3 },
  { id: 'state', label: 'State / Region', placeholder: 'Lisboa', col: 3 },
  { id: 'postal', label: 'Postal code', placeholder: '1200-690', col: 3 },
]

function formatCents(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
}

const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit or debit card', icon: 'credit_card', sub: 'Visa, Mastercard, Amex' },
  { id: 'apple', label: 'Apple Pay', icon: 'phone_iphone', sub: 'One-tap with Touch ID' },
  { id: 'paypal', label: 'PayPal', icon: 'account_balance_wallet', sub: 'Use your PayPal balance' },
] as const

export function Checkout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()

  const [step, setStep] = useState<(typeof STEPS)[number]['id']>('shipping')
  const [cart, setCart] = useState<ApiCart>(EMPTY_CART)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]['id']>('card')
  const [shipping, setShipping] = useState<ShippingAddress>({
    firstName: '',
    lastName: '',
    street: '',
    city: '',
    state: '',
    postal: '',
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get<ApiCart | { data?: ApiCart }>('/api/cart')
      .then((res) => {
        if (cancelled) return
        const raw = (res as { data?: unknown })?.data ?? res
        const body = (
          raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)
            ? (raw as { data?: ApiCart }).data
            : (raw as ApiCart)
        ) as ApiCart | undefined
        setCart(body && 'groups' in body ? body : EMPTY_CART)
      })
      .catch(() => {
        if (cancelled) return
        setCart(EMPTY_CART)
        setError(
          t(
            'checkout.loadError',
            {},
            { defaultValue: 'Could not load your cart. Please try again.' },
          ),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const subtotal = cart.item_subtotal_cents
  const shippingTotal = cart.shipping_total_cents
  const tax = useMemo(() => Math.round(subtotal * 0.07), [subtotal])
  const total = subtotal + shippingTotal + tax
  const stepIndex = STEPS.findIndex((s) => s.id === step)

  const validShipping =
    shipping.firstName.trim().length > 0 &&
    shipping.lastName.trim().length > 0 &&
    shipping.street.trim().length > 0 &&
    shipping.city.trim().length > 0 &&
    shipping.postal.trim().length > 0

  async function placeOrder() {
    if (!validShipping || cart.groups.length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await http.post<
        { orders?: Array<{ id: string }> } | { data?: { orders?: Array<{ id: string }> } }
      >('/api/orders', {
        shippingAddress: shipping,
        billingAddress: shipping,
        paymentMethodId: paymentMethod,
      })
      const raw = (res as { data?: unknown })?.data ?? res
      const body = (
        raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)
          ? (raw as { data?: { orders?: Array<{ id: string }> } }).data
          : (raw as { orders?: Array<{ id: string }> })
      ) as { orders?: Array<{ id: string }> } | undefined
      const firstOrderId = body?.orders?.[0]?.id
      navigate(firstOrderId ? `/orders/${firstOrderId}` : '/orders')
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : t('checkout.placeOrderError', {}, { defaultValue: 'Could not place your order.' })
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const advance = () => {
    if (step === 'shipping') {
      if (!validShipping) {
        setError(
          t(
            'checkout.shippingValidation',
            {},
            { defaultValue: 'Please fill out all required shipping fields.' },
          ),
        )
        return
      }
      setError(null)
      setStep('payment')
    } else if (step === 'payment') {
      setStep('review')
    } else {
      void placeOrder()
    }
  }

  const back = () => {
    const prev = STEPS[stepIndex - 1]
    if (prev) setStep(prev.id)
  }

  return (
    <div className={cm.cn(cm.maxW('full'), cm.mxAuto, cm.sp('p', 8), 'max-w-[1280px] space-y-8')}>
      <header className={cm.cn(cm.stack(2))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-orange-700 dark:text-primary',
          )}
        >
          {t('checkout.eyebrow', {}, { defaultValue: 'Secure checkout' })}
        </p>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-4xl tracking-tight font-extrabold text-on-surface',
          )}
        >
          {t('checkout.title', {}, { defaultValue: 'One checkout, many makers' })}
        </h1>
      </header>

      {error && (
        <p
          role="alert"
          className={cm.cn(
            cm.textSize('sm'),
            'rounded-xl border border-error/30 bg-error/10 px-4 py-2 text-error',
          )}
        >
          {error}
        </p>
      )}

      {/* Progress bar */}
      <ol className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
        {STEPS.map((s, idx) => {
          const active = idx <= stepIndex
          return (
            <li key={s.id} className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  cm.roundedFull,
                  'h-9 w-9 transition-colors',
                  active
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-high text-on-surface-variant',
                )}
              >
                {idx + 1}
              </span>
              <span
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  active ? 'text-on-surface' : 'text-on-surface-variant',
                )}
              >
                {t(`checkout.step.${s.id}`, {}, { defaultValue: s.label })}
              </span>
              {idx < STEPS.length - 1 && (
                <span
                  className={cm.cn(cm.h(0), 'mx-2 w-8 border-t border-outline-variant')}
                  aria-hidden
                />
              )}
            </li>
          )
        })}
      </ol>

      {loading ? (
        <p className="text-on-surface-variant">
          {t('checkout.loading', {}, { defaultValue: 'Loading your cart…' })}
        </p>
      ) : cart.groups.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 10),
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            'rounded-3xl border border-dashed border-outline-variant text-center',
          )}
        >
          <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface text-lg')}>
            {t('checkout.emptyTitle', {}, { defaultValue: 'Your cart is empty.' })}
          </p>
          <Link
            to="/catalog"
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.sp('mt', 4),
              cm.roundedFull,
              'bg-primary text-on-primary hover:bg-primary-dark transition-colors',
            )}
          >
            {t('checkout.emptyCta', {}, { defaultValue: 'Browse the catalog' })}
          </Link>
        </div>
      ) : (
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-[1.5fr_1fr]')}>
          {/* Step content */}
          <section className={cm.cn(cm.stack(6))}>
            {step === 'shipping' && (
              <article
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-3xl border border-outline-variant bg-surface space-y-4',
                )}
              >
                <h2 className={cm.cn(cm.fontWeight('bold'), 'text-xl text-on-surface')}>
                  {t('checkout.shipping.title', {}, { defaultValue: 'Where should we ship to?' })}
                </h2>
                <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
                  {SHIPPING_FIELDS.filter((f) => f.col !== 3).map((field) => (
                    <label
                      key={field.id}
                      className={cm.cn(
                        cm.stack(1),
                        cm.textSize('sm'),
                        field.col === 1 && 'md:col-span-2',
                      )}
                    >
                      <span className="font-semibold text-on-surface-variant">
                        {t(`checkout.field.${field.id}`, {}, { defaultValue: field.label })}
                      </span>
                      <input
                        type="text"
                        name={field.id}
                        placeholder={field.placeholder}
                        value={shipping[field.id]}
                        onChange={(e) =>
                          setShipping((prev) => ({ ...prev, [field.id]: e.target.value }))
                        }
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none transition-colors',
                        )}
                      />
                    </label>
                  ))}
                </div>
                <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-3')}>
                  {SHIPPING_FIELDS.filter((f) => f.col === 3).map((field) => (
                    <label key={field.id} className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
                      <span className="font-semibold text-on-surface-variant">
                        {t(`checkout.field.${field.id}`, {}, { defaultValue: field.label })}
                      </span>
                      <input
                        type="text"
                        name={field.id}
                        placeholder={field.placeholder}
                        value={shipping[field.id]}
                        onChange={(e) =>
                          setShipping((prev) => ({ ...prev, [field.id]: e.target.value }))
                        }
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none transition-colors',
                        )}
                      />
                    </label>
                  ))}
                </div>
              </article>
            )}

            {step === 'payment' && (
              <article
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-3xl border border-outline-variant bg-surface space-y-4',
                )}
              >
                <h2 className={cm.cn(cm.fontWeight('bold'), 'text-xl text-on-surface')}>
                  {t('nav.paymentMethod', {}, { defaultValue: 'Payment method' })}
                </h2>
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.id}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'md' }),
                      cm.sp('p', 4),
                      'rounded-2xl border border-outline-variant bg-surface-container-low cursor-pointer hover:border-primary transition-colors',
                      paymentMethod === method.id && 'border-primary bg-primary/5',
                    )}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method.id}
                      checked={paymentMethod === method.id}
                      onChange={() => setPaymentMethod(method.id)}
                      className="accent-primary"
                    />
                    <span className="material-symbols-outlined text-on-surface-variant" aria-hidden>
                      {method.icon}
                    </span>
                    <div className={'flex-1'}>
                      <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                        {t(
                          `checkout.payment.${method.id}.label`,
                          {},
                          { defaultValue: method.label },
                        )}
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(`checkout.payment.${method.id}.sub`, {}, { defaultValue: method.sub })}
                      </p>
                    </div>
                  </label>
                ))}
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'checkout.payment.testNote',
                    {},
                    {
                      defaultValue:
                        'Test mode: orders are recorded and balances are settled, but no real card is charged.',
                    },
                  )}
                </p>
              </article>
            )}

            {step === 'review' && (
              <article
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-3xl border border-outline-variant bg-surface space-y-4',
                )}
              >
                <h2 className={cm.cn(cm.fontWeight('bold'), 'text-xl text-on-surface')}>
                  {t(
                    'checkout.review.title',
                    {},
                    { defaultValue: 'Review your order, vendor by vendor' },
                  )}
                </h2>
                {cart.groups.map((group) => (
                  <div
                    key={group.vendor_id}
                    className={cm.cn(
                      cm.sp('p', 4),
                      'rounded-2xl border border-outline-variant bg-surface-container-low space-y-2',
                    )}
                  >
                    <p
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.fontWeight('bold'),
                        'text-sky-700 dark:text-info',
                      )}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
                        aria-hidden
                      >
                        storefront
                      </span>
                      {group.vendor_name}
                    </p>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {group.estimated_delivery}
                    </p>
                    <ul className="list-disc list-inside text-on-surface-variant text-sm">
                      {group.items.map((item) => (
                        <li key={item.id}>
                          {item.name} × {item.quantity} —{' '}
                          {formatCents(item.unit_price_cents * item.quantity, cart.currency)}
                        </li>
                      ))}
                    </ul>
                    <p
                      className={cm.cn(
                        cm.flex({ justify: 'between' }),
                        cm.fontWeight('semibold'),
                        'text-on-surface',
                      )}
                    >
                      <span>
                        {t('checkout.review.subtotal', {}, { defaultValue: 'Vendor subtotal' })}
                      </span>
                      <span className="tabular-nums">
                        {formatCents(group.subtotal_cents + group.shipping_cents, cart.currency)}
                      </span>
                    </p>
                  </div>
                ))}
                <div
                  className={cm.cn(
                    cm.sp('p', 4),
                    'rounded-2xl border border-outline-variant bg-surface-container-low space-y-1',
                  )}
                >
                  <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                    {t('checkout.review.shipTo', {}, { defaultValue: 'Shipping to' })}
                  </p>
                  <p className={'text-on-surface-variant text-sm'}>
                    {shipping.firstName} {shipping.lastName}
                    <br />
                    {shipping.street}
                    <br />
                    {shipping.city}, {shipping.state} {shipping.postal}
                  </p>
                </div>
              </article>
            )}

            <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
              <button
                type="button"
                onClick={back}
                disabled={stepIndex === 0}
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'text-on-surface-variant hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed',
                )}
              >
                ← {t('common.back', {}, { defaultValue: 'Back' })}
              </button>
              <button
                type="button"
                onClick={advance}
                disabled={submitting || cart.groups.length === 0}
                data-testid="checkout-advance"
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.roundedFull,
                  'bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-md shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed',
                )}
              >
                {submitting
                  ? t('checkout.placingOrder', {}, { defaultValue: 'Placing order…' })
                  : step === 'review'
                    ? t('checkout.placeOrderCta', {}, { defaultValue: 'Place order' })
                    : t('common.continue', {}, { defaultValue: 'Continue' })}
              </button>
            </div>
          </section>

          {/* Summary */}
          <aside
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'rounded-3xl border border-outline-variant bg-surface-container-low h-fit sticky top-8',
            )}
          >
            <h2 className={cm.cn(cm.fontWeight('bold'), 'text-xl text-on-surface')}>
              {t('nav.orderSummary', {}, { defaultValue: 'Order summary' })}
            </h2>
            <dl className={cm.cn(cm.stack(2), cm.textSize('sm'))}>
              <div className={cm.cn(cm.flex({ justify: 'between' }))}>
                <dt className="text-on-surface-variant">
                  {t('nav.subtotal', {}, { defaultValue: 'Subtotal' })}
                </dt>
                <dd className={cm.cn(cm.fontWeight('semibold'), 'tabular-nums')}>
                  {formatCents(subtotal, cart.currency)}
                </dd>
              </div>
              <div className={cm.cn(cm.flex({ justify: 'between' }))}>
                <dt className="text-on-surface-variant">
                  {t('checkout.summary.shipping', {}, { defaultValue: 'Shipping' })}
                </dt>
                <dd className={cm.cn(cm.fontWeight('semibold'), 'tabular-nums')}>
                  {formatCents(shippingTotal, cart.currency)}
                </dd>
              </div>
              <div className={cm.cn(cm.flex({ justify: 'between' }))}>
                <dt className="text-on-surface-variant">
                  {t('checkout.summary.tax', {}, { defaultValue: 'Estimated tax' })}
                </dt>
                <dd className={cm.cn(cm.fontWeight('semibold'), 'tabular-nums')}>
                  {formatCents(tax, cart.currency)}
                </dd>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ justify: 'between' }),
                  cm.sp('pt', 3),
                  'border-t border-outline-variant',
                )}
              >
                <dt className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                  {t('nav.total', {}, { defaultValue: 'Total' })}
                </dt>
                <dd
                  data-testid="checkout-summary-total"
                  className={cm.cn(cm.fontWeight('bold'), 'tabular-nums text-lg')}
                >
                  {formatCents(total, cart.currency)}
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      )}
    </div>
  )
}

export default Checkout
