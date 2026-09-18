import { type ReactNode, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import CheckoutPageFooter from '../components/CheckoutPageFooter.js'
import StorefrontTopNavBar from '../components/StorefrontTopNavBar.js'

function CheckoutChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <StorefrontTopNavBar />
      {children}
      <CheckoutPageFooter />
    </>
  )
}

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image?: string
  color?: string
  size?: string
  discount?: string
}

interface CartData {
  items: CartItem[]
  subtotal: number
  shipping: number
  tax: number
  total: number
}

// Default empty cart to ensure we always have valid data
const EMPTY_CART: CartData = {
  items: [],
  subtotal: 0,
  shipping: 0,
  tax: 0,
  total: 0,
}

// Safe number conversion - NEVER returns undefined
const toNumber = (value: unknown): number => {
  if (value === undefined || value === null) return 0
  if (typeof value === 'number') {
    return Number.isNaN(value) ? 0 : value
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return 0
    const num = parseFloat(trimmed)
    return Number.isNaN(num) ? 0 : num
  }
  return 0
}

// Safe formatter that handles undefined/null values - NEVER throws
const formatPrice = (value: unknown): string => {
  const num = toNumber(value)
  return num.toFixed(2)
}

// Cart items from /api/cart come hydrated as { id, product_id, product: {...},
// quantity, ... } where the price/name/image live on the nested product.
// Prices are stored in cents server-side, so divide by 100 for display.
const normalizeCartItem = (item: unknown): CartItem => {
  if (!item || typeof item !== 'object') {
    return { id: 'unknown', name: 'Unknown Item', price: 0, quantity: 0 }
  }
  const obj = item as Record<string, unknown>
  const product = (obj.product && typeof obj.product === 'object' ? obj.product : {}) as Record<
    string,
    unknown
  >
  const images = Array.isArray(product.images) ? product.images : []
  const variants = Array.isArray(product.variants) ? product.variants : []
  const variantId = typeof obj.variant_id === 'string' ? obj.variant_id : null
  const variant = variantId
    ? (variants.find(
        (v) => v && typeof v === 'object' && (v as Record<string, unknown>).id === variantId,
      ) as Record<string, unknown> | undefined)
    : undefined

  const flatName = typeof obj.name === 'string' ? obj.name : null
  const productName = typeof product.name === 'string' ? product.name : null

  const flatPrice = obj.price
  const productPriceCents = typeof product.price === 'number' ? product.price : null

  return {
    id: typeof obj.id === 'string' ? obj.id : String(obj.id ?? 'unknown'),
    name: flatName ?? productName ?? 'Unknown Item',
    price:
      flatPrice !== undefined
        ? toNumber(flatPrice)
        : productPriceCents != null
          ? productPriceCents / 100
          : 0,
    quantity: toNumber(obj.quantity) || 1,
    image:
      typeof obj.image === 'string'
        ? obj.image
        : typeof images[0] === 'string'
          ? (images[0] as string)
          : undefined,
    color:
      typeof obj.color === 'string'
        ? obj.color
        : variant && typeof variant.color === 'string'
          ? variant.color
          : undefined,
    size:
      typeof obj.size === 'string'
        ? obj.size
        : variant && typeof variant.size === 'string'
          ? variant.size
          : undefined,
    discount: typeof obj.discount === 'string' ? obj.discount : undefined,
  }
}

// /api/cart returns { items, subtotal, shipping, tax, total } with all
// monetary values in cents. We detect cents-vs-dollars by comparing the
// API subtotal against the sum of the (already-converted) line items, then
// scale every field consistently so the order summary stays in sync.
const TAX_RATE = 0.08
// Fallbacks only — the server now returns `shipping` and `total`, so these apply
// solely if the API omits them. Kept in step with the admin-settings defaults
// (adminSettings.shipping: $75 free-shipping threshold, $5.99 standard rate).
const FREE_SHIPPING_THRESHOLD = 75

const normalizeCart = (data: unknown): CartData => {
  if (!data || typeof data !== 'object') {
    return EMPTY_CART
  }
  const obj = data as Record<string, unknown>
  const items = Array.isArray(obj.items) ? obj.items.map(normalizeCartItem) : []
  const itemsTotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0)

  const rawSubtotal = toNumber(obj.subtotal)
  // If the API subtotal matches our dollar-denominated items total, treat
  // every monetary field as dollars. Otherwise assume the server emits cents.
  const inCents = rawSubtotal > 0 && Math.abs(rawSubtotal - itemsTotal) > 0.5
  const scale = inCents ? 1 / 100 : 1

  const subtotal = rawSubtotal > 0 ? rawSubtotal * scale : itemsTotal
  const shipping =
    obj.shipping !== undefined
      ? toNumber(obj.shipping) * scale
      : subtotal >= FREE_SHIPPING_THRESHOLD
        ? 0
        : 5.99
  const tax = obj.tax !== undefined ? toNumber(obj.tax) * scale : subtotal * TAX_RATE
  const total = obj.total !== undefined ? toNumber(obj.total) * scale : subtotal + shipping + tax

  return { items, subtotal, shipping, tax, total }
}

export function CheckoutPage() {
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const cm = getClassMap()
  const [searchParams] = useSearchParams()

  // Honor ?method=paypal|apple deep links (e.g. the cart's PayPal button).
  const methodParam = searchParams.get('method')
  const [paymentMethod, setPaymentMethod] = useState(
    methodParam === 'paypal' || methodParam === 'apple' ? methodParam : 'card',
  )
  const [cardholderName, setCardholderName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [cvv, setCvv] = useState('')
  const [sameAsShipping, setSameAsShipping] = useState(true)
  const [promoCode, setPromoCode] = useState('')
  const [promoMessage, setPromoMessage] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [shippingName, setShippingName] = useState('')
  const [shippingLine1, setShippingLine1] = useState('')
  const [shippingLine2, setShippingLine2] = useState('')
  const [shippingCity, setShippingCity] = useState('')
  const [shippingState, setShippingState] = useState('')
  const [shippingPostalCode, setShippingPostalCode] = useState('')
  const [shippingCountry, setShippingCountry] = useState('US')

  const [cart, setCart] = useState<CartData>(EMPTY_CART)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false

    const fetchCart = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const res = await http.get<CartData>('/api/cart')
        if (cancelled) return
        setCart(res.data ? normalizeCart(res.data) : EMPTY_CART)
      } catch (_error) {
        // Cart load failed — surface error message to the user via setLoadError
        if (cancelled) return
        setLoadError(
          t('checkout.loadError', {}, { defaultValue: 'Failed to load cart. Please try again.' }),
        )
        setCart(EMPTY_CART)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchCart()

    return () => {
      cancelled = true
    }
  }, [http, t])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (
      !shippingName.trim() ||
      !shippingLine1.trim() ||
      !shippingCity.trim() ||
      !shippingState.trim() ||
      !shippingPostalCode.trim() ||
      !shippingCountry.trim()
    ) {
      setError(
        t(
          'checkout.shippingRequired',
          {},
          {
            defaultValue:
              'Please fill in your shipping address (name, line1, city, state, postal code, country).',
          },
        ),
      )
      return
    }

    setProcessing(true)
    const shippingAddress = {
      name: shippingName.trim(),
      line1: shippingLine1.trim(),
      line2: shippingLine2.trim(),
      city: shippingCity.trim(),
      state: shippingState.trim(),
      postalCode: shippingPostalCode.trim(),
      country: shippingCountry.trim(),
    }
    try {
      const res = await http.post<{ id: string }>('/api/orders', {
        shippingAddress,
        billingAddress: sameAsShipping ? undefined : shippingAddress,
        paymentMethodId: paymentMethod === 'card' ? 'pm_demo_card' : `pm_demo_${paymentMethod}`,
      })
      const orderId =
        (res as { data?: { id?: string }; id?: string })?.data?.id ?? (res as { id?: string })?.id
      if (orderId) {
        navigate(`/orders/${orderId}`)
      } else {
        navigate('/orders')
      }
    } catch (err) {
      const status =
        (err as { status?: number; response?: { status?: number } })?.status ??
        (err as { response?: { status?: number } })?.response?.status
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (err as { message?: string })?.message
      if (status === 401) {
        navigate('/login')
        return
      }
      setError(
        message ?? t('checkout.error', {}, { defaultValue: 'Order failed. Please try again.' }),
      )
      setProcessing(false)
    }
  }

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return
    try {
      await http.post('/api/cart/promo', { code: promoCode.trim() })
      setPromoMessage(t('promo.applied', {}, { defaultValue: 'Code applied.' }))
    } catch (_error) {
      // No matching promo — surface a clear inline message instead of failing silently
      setPromoMessage(t('promo.invalid', {}, { defaultValue: 'Invalid or expired code.' }))
    }
  }

  // ALWAYS render visible content - NEVER return null

  // Loading state with spinner
  if (loading) {
    return (
      <CheckoutChrome>
        <div
          className={cm.page}
          style={{
            fontFamily:
              '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <div
            className={cm.container()}
            style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 24px' }}
          >
            <div
              className={cm.flex({ direction: 'col', align: 'center', justify: 'center' })}
              style={{ minHeight: '50vh' }}
            >
              <div className={cm.spinner({ size: 'lg' })} style={{ marginBottom: '16px' }} />
              <p className={cm.textMuted}>
                {t('checkout.loading', {}, { defaultValue: 'Loading your cart...' })}
              </p>
            </div>
          </div>
        </div>
      </CheckoutChrome>
    )
  }

  // Error state
  if (loadError) {
    return (
      <CheckoutChrome>
        <div
          className={cm.page}
          style={{
            fontFamily:
              '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <div
            className={cm.container()}
            style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 24px' }}
          >
            <div className={cm.alert({ variant: 'error' })} style={{ marginBottom: '24px' }}>
              <div className={cm.alertIconWrapper}>
                <span className="material-symbols-outlined">error</span>
              </div>
              <div className={cm.alertContent}>
                <p className={cm.alertDescription}>{loadError}</p>
              </div>
            </div>
            <div className={cm.textCenter}>
              <button
                onClick={() => window.location.reload()}
                className={cm.button({ variant: 'solid' })}
                data-mol-id="error-retry"
              >
                {t('common.retry', {}, { defaultValue: 'Try Again' })}
              </button>
            </div>
          </div>
        </div>
      </CheckoutChrome>
    )
  }

  // Empty cart state - cart is guaranteed to exist here but may be empty
  const safeCart = cart || EMPTY_CART
  const hasItems = safeCart.items && safeCart.items.length > 0

  if (!hasItems) {
    return (
      <CheckoutChrome>
        <div
          className={cm.page}
          style={{
            fontFamily:
              '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <div
            className={cm.container()}
            style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px' }}
          >
            <div className={cm.emptyState}>
              <div className={cm.emptyStateIcon}>
                <span className="material-symbols-outlined" style={{ fontSize: '64px' }}>
                  shopping_cart
                </span>
              </div>
              <h3 className={cm.emptyStateTitle}>
                {t('checkout.emptyTitle', {}, { defaultValue: 'Your cart is empty' })}
              </h3>
              <p className={cm.emptyStateDescription}>
                {t(
                  'checkout.emptyDescription',
                  {},
                  { defaultValue: 'Add some items to your cart to proceed.' },
                )}
              </p>
              <Link
                to="/"
                className={cm.cn(
                  cm.button({ variant: 'solid', color: 'success' }),
                  cm.emptyStateAction,
                )}
              >
                {t('checkout.continueShopping', {}, { defaultValue: 'Continue Shopping' })}
              </Link>
            </div>
          </div>
        </div>
      </CheckoutChrome>
    )
  }

  // Main checkout form - cart has items
  return (
    <CheckoutChrome>
      <div
        className={cm.page}
        style={{
          paddingTop: '24px',
          paddingBottom: '48px',
          minHeight: '100%',
          backgroundColor: 'var(--color-surface-secondary)',
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          className={cm.container()}
          style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}
        >
          {/* Progress Bar */}
          <div data-mol-id="progress-bar" style={{ maxWidth: '672px', margin: '0 auto 48px auto' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative',
              }}
            >
              {/* Background line */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  width: '100%',
                  height: '2px',
                  backgroundColor: 'var(--color-star-empty)',
                  transform: 'translateY(-50%)',
                  zIndex: 0,
                }}
              />
              {/* Active line */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  width: '50%',
                  height: '2px',
                  backgroundColor: 'var(--color-in-stock)',
                  transform: 'translateY(-50%)',
                  zIndex: 0,
                }}
              />
              {/* Step 1 - Completed */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-in-stock)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-surface)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '14px', fontVariationSettings: "'wght' 700" }}
                  >
                    check
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    marginTop: '8px',
                    color: 'var(--color-in-stock)',
                  }}
                >
                  {t('checkout.stepShipping', {}, { defaultValue: 'Shipping' })}
                </span>
              </div>
              {/* Step 2 - Active */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-in-stock)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-surface)',
                    fontSize: '14px',
                    fontWeight: 700,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    outline: '4px solid var(--mol-color-primary-light)',
                    outlineOffset: '0px',
                  }}
                >
                  2
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    marginTop: '8px',
                    color: 'var(--color-in-stock)',
                  }}
                >
                  {t('checkout.stepPayment', {}, { defaultValue: 'Payment' })}
                </span>
              </div>
              {/* Step 3 - Pending */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-surface)',
                    border: '2px solid var(--color-star-empty)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-price-original)',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                >
                  3
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    marginTop: '8px',
                    color: 'var(--color-price-original)',
                  }}
                >
                  {t('checkout.stepReview', {}, { defaultValue: 'Review' })}
                </span>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: '48px',
              alignItems: 'start',
            }}
          >
            {/* Left Column - Payment Form */}
            <div
              style={{
                gridColumn: 'span 7',
                display: 'flex',
                flexDirection: 'column',
                gap: '32px',
              }}
            >
              {/* Payment Method Section */}
              <section
                data-mol-id="payment-section"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: '1rem',
                  border: '1px solid var(--color-border-light)',
                  padding: '32px',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                }}
              >
                <h2
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: 'var(--mol-color-secondary)',
                    marginBottom: '24px',
                    marginTop: 0,
                  }}
                >
                  {t('checkout.paymentMethodHeading', {}, { defaultValue: 'Payment Method' })}
                </h2>

                {/* Payment Method Cards */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '16px',
                    marginBottom: '32px',
                  }}
                >
                  {/* Credit Card Option */}
                  <label
                    data-mol-id="payment-card"
                    style={{
                      padding: '16px',
                      borderRadius: '6px',
                      border:
                        paymentMethod === 'card'
                          ? '2px solid var(--color-in-stock)'
                          : '2px solid var(--color-border-light)',
                      backgroundColor:
                        paymentMethod === 'card'
                          ? 'var(--color-border-light)'
                          : 'var(--color-surface)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative',
                    }}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'card'}
                      onChange={() => setPaymentMethod('card')}
                      style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: '24px',
                        color:
                          paymentMethod === 'card'
                            ? 'var(--color-in-stock)'
                            : 'var(--color-price-original)',
                        fontVariationSettings: "'FILL' 1",
                      }}
                    >
                      credit_card
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color:
                          paymentMethod === 'card'
                            ? 'var(--color-in-stock)'
                            : 'var(--color-out-of-stock)',
                      }}
                    >
                      {t('checkout.methodCard', {}, { defaultValue: 'Credit/Debit Card' })}
                    </span>
                  </label>

                  {/* PayPal Option */}
                  <label
                    data-mol-id="payment-paypal"
                    style={{
                      padding: '16px',
                      borderRadius: '6px',
                      border:
                        paymentMethod === 'paypal'
                          ? '2px solid var(--color-in-stock)'
                          : '2px solid var(--color-border-light)',
                      backgroundColor:
                        paymentMethod === 'paypal'
                          ? 'var(--color-border-light)'
                          : 'var(--color-surface)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative',
                    }}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'paypal'}
                      onChange={() => setPaymentMethod('paypal')}
                      style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '24px', color: 'var(--color-price-original)' }}
                    >
                      account_balance_wallet
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--color-out-of-stock)',
                      }}
                    >
                      {t('checkout.methodPaypal', {}, { defaultValue: 'PayPal' })}
                    </span>
                  </label>

                  {/* Apple Pay Option */}
                  <label
                    data-mol-id="payment-apple"
                    style={{
                      padding: '16px',
                      borderRadius: '6px',
                      border:
                        paymentMethod === 'apple'
                          ? '2px solid var(--color-in-stock)'
                          : '2px solid var(--color-border-light)',
                      backgroundColor:
                        paymentMethod === 'apple'
                          ? 'var(--color-border-light)'
                          : 'var(--color-surface)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative',
                    }}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'apple'}
                      onChange={() => setPaymentMethod('apple')}
                      style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '24px', color: 'var(--color-price-original)' }}
                    >
                      ios
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--color-out-of-stock)',
                      }}
                    >
                      {t('checkout.methodApplePay', {}, { defaultValue: 'Apple Pay' })}
                    </span>
                  </label>
                </div>

                {/* Card Form Fields */}
                {paymentMethod === 'card' && (
                  <div
                    data-mol-id="card-form"
                    style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                  >
                    <div>
                      <label
                        htmlFor="checkout-cardholder"
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: 'var(--color-out-of-stock)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: '6px',
                        }}
                      >
                        {t('checkout.cardholderName', {}, { defaultValue: 'Cardholder Name' })}
                      </label>
                      <input
                        type="text"
                        data-mol-id="input-cardholder"
                        id="checkout-cardholder"
                        value={cardholderName}
                        onChange={(e) => setCardholderName(e.target.value)}
                        style={{
                          width: '100%',
                          height: '48px',
                          padding: '0 16px',
                          fontSize: '15px',
                          border: '1px solid var(--color-star-empty)',
                          borderRadius: '6px',
                          backgroundColor: 'var(--color-surface)',
                          color: 'var(--mol-color-secondary)',
                          outline: 'none',
                          boxSizing: 'border-box',
                          fontFamily:
                            '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        }}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="checkout-card-number"
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: 'var(--color-out-of-stock)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: '6px',
                        }}
                      >
                        {t('checkout.cardNumber', {}, { defaultValue: 'Card Number' })}
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          data-mol-id="input-card-number"
                          id="checkout-card-number"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="0000 0000 0000 0000"
                          style={{
                            width: '100%',
                            height: '48px',
                            padding: '0 44px 0 16px',
                            fontSize: '15px',
                            border: '1px solid var(--color-star-empty)',
                            borderRadius: '6px',
                            backgroundColor: 'var(--color-surface)',
                            color: 'var(--mol-color-secondary)',
                            outline: 'none',
                            boxSizing: 'border-box',
                            fontFamily:
                              '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        />
                        <span
                          className="material-symbols-outlined"
                          style={{
                            position: 'absolute',
                            right: '16px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--color-price-original)',
                            fontSize: '20px',
                          }}
                        >
                          contactless
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label
                          htmlFor="checkout-expiry"
                          style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: 'var(--color-out-of-stock)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: '6px',
                          }}
                        >
                          {t('checkout.expiryDate', {}, { defaultValue: 'Expiry Date' })}
                        </label>
                        <input
                          type="text"
                          data-mol-id="input-expiry"
                          id="checkout-expiry"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          placeholder="MM/YY"
                          style={{
                            width: '100%',
                            height: '48px',
                            padding: '0 16px',
                            fontSize: '15px',
                            border: '1px solid var(--color-star-empty)',
                            borderRadius: '6px',
                            backgroundColor: 'var(--color-surface)',
                            color: 'var(--mol-color-secondary)',
                            outline: 'none',
                            boxSizing: 'border-box',
                            fontFamily:
                              '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="checkout-cvv"
                          style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: 'var(--color-out-of-stock)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: '6px',
                          }}
                        >
                          {t('checkout.cvv', {}, { defaultValue: 'CVV' })}
                        </label>
                        <input
                          type="password"
                          data-mol-id="input-cvv"
                          id="checkout-cvv"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value)}
                          placeholder="•••"
                          style={{
                            width: '100%',
                            height: '48px',
                            padding: '0 16px',
                            fontSize: '15px',
                            border: '1px solid var(--color-star-empty)',
                            borderRadius: '6px',
                            backgroundColor: 'var(--color-surface)',
                            color: 'var(--mol-color-secondary)',
                            outline: 'none',
                            boxSizing: 'border-box',
                            fontFamily:
                              '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Shipping Address Section */}
              <section
                data-mol-id="shipping-section"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: '1rem',
                  border: '1px solid var(--color-border-light)',
                  padding: '32px',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                }}
              >
                <h2
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: 'var(--mol-color-secondary)',
                    marginBottom: '24px',
                    marginTop: 0,
                  }}
                >
                  {t('checkout.shippingHeading', {}, { defaultValue: 'Shipping Address' })}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--color-out-of-stock)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '6px',
                      }}
                    >
                      {t('checkout.shippingNameLabel', {}, { defaultValue: 'Full Name' })}
                    </label>
                    <input
                      type="text"
                      data-mol-id="input-shipping-name"
                      name="shippingName"
                      value={shippingName}
                      onChange={(e) => setShippingName(e.target.value)}
                      style={{
                        width: '100%',
                        height: '44px',
                        padding: '0 14px',
                        fontSize: '14px',
                        border: '1px solid var(--color-star-empty)',
                        borderRadius: '6px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--color-out-of-stock)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '6px',
                      }}
                    >
                      {t('checkout.shippingLine1Label', {}, { defaultValue: 'Address Line 1' })}
                    </label>
                    <input
                      type="text"
                      data-mol-id="input-shipping-line1"
                      name="shippingLine1"
                      value={shippingLine1}
                      onChange={(e) => setShippingLine1(e.target.value)}
                      style={{
                        width: '100%',
                        height: '44px',
                        padding: '0 14px',
                        fontSize: '14px',
                        border: '1px solid var(--color-star-empty)',
                        borderRadius: '6px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--color-out-of-stock)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '6px',
                      }}
                    >
                      {t(
                        'checkout.shippingLine2Label',
                        {},
                        { defaultValue: 'Apt / Suite (optional)' },
                      )}
                    </label>
                    <input
                      type="text"
                      data-mol-id="input-shipping-line2"
                      name="shippingLine2"
                      value={shippingLine2}
                      onChange={(e) => setShippingLine2(e.target.value)}
                      style={{
                        width: '100%',
                        height: '44px',
                        padding: '0 14px',
                        fontSize: '14px',
                        border: '1px solid var(--color-star-empty)',
                        borderRadius: '6px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: 'var(--color-out-of-stock)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: '6px',
                        }}
                      >
                        {t('checkout.shippingCityLabel', {}, { defaultValue: 'City' })}
                      </label>
                      <input
                        type="text"
                        data-mol-id="input-shipping-city"
                        name="shippingCity"
                        value={shippingCity}
                        onChange={(e) => setShippingCity(e.target.value)}
                        style={{
                          width: '100%',
                          height: '44px',
                          padding: '0 14px',
                          fontSize: '14px',
                          border: '1px solid var(--color-star-empty)',
                          borderRadius: '6px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: 'var(--color-out-of-stock)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: '6px',
                        }}
                      >
                        {t('checkout.shippingStateLabel', {}, { defaultValue: 'State' })}
                      </label>
                      <input
                        type="text"
                        data-mol-id="input-shipping-state"
                        name="shippingState"
                        value={shippingState}
                        onChange={(e) => setShippingState(e.target.value)}
                        style={{
                          width: '100%',
                          height: '44px',
                          padding: '0 14px',
                          fontSize: '14px',
                          border: '1px solid var(--color-star-empty)',
                          borderRadius: '6px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: 'var(--color-out-of-stock)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: '6px',
                        }}
                      >
                        {t('checkout.shippingPostalLabel', {}, { defaultValue: 'Postal' })}
                      </label>
                      <input
                        type="text"
                        data-mol-id="input-shipping-postal"
                        name="shippingPostalCode"
                        value={shippingPostalCode}
                        onChange={(e) => setShippingPostalCode(e.target.value)}
                        style={{
                          width: '100%',
                          height: '44px',
                          padding: '0 14px',
                          fontSize: '14px',
                          border: '1px solid var(--color-star-empty)',
                          borderRadius: '6px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--color-out-of-stock)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '6px',
                      }}
                    >
                      {t('checkout.shippingCountryLabel', {}, { defaultValue: 'Country' })}
                    </label>
                    <input
                      type="text"
                      data-mol-id="input-shipping-country"
                      name="shippingCountry"
                      value={shippingCountry}
                      onChange={(e) => setShippingCountry(e.target.value)}
                      style={{
                        width: '100%',
                        height: '44px',
                        padding: '0 14px',
                        fontSize: '14px',
                        border: '1px solid var(--color-star-empty)',
                        borderRadius: '6px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <label
                    data-mol-id="billing-same-toggle"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      marginTop: '4px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={sameAsShipping}
                      onChange={(e) => setSameAsShipping(e.target.checked)}
                      style={{
                        width: '18px',
                        height: '18px',
                        accentColor: 'var(--color-in-stock)',
                        cursor: 'pointer',
                      }}
                    />
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'var(--mol-color-text-secondary)',
                      }}
                    >
                      {t(
                        'checkout.billingSameLabel',
                        {},
                        { defaultValue: 'Billing address is the same as shipping' },
                      )}
                    </span>
                  </label>
                </div>
              </section>

              {error && (
                <div
                  data-mol-id="checkout-error"
                  role="alert"
                  style={{
                    padding: '12px 16px',
                    backgroundColor: 'var(--color-surface-secondary)',
                    color: 'var(--color-error-text)',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                >
                  {error}
                </div>
              )}

              {/* Navigation Buttons */}
              <div
                data-mol-id="navigation-buttons"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '16px',
                }}
              >
                <Link
                  to="/cart"
                  data-mol-id="link-back-shipping"
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--color-out-of-stock)',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'color 0.2s',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    arrow_back
                  </span>
                  {t('checkout.backToCart', {}, { defaultValue: 'Back to Cart' })}
                </Link>
                <button
                  type="submit"
                  data-mol-id="btn-continue-review"
                  disabled={processing}
                  style={{
                    height: '48px',
                    padding: '0 40px',
                    backgroundColor: 'var(--color-in-stock)',
                    color: 'var(--color-surface)',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: processing ? 'not-allowed' : 'pointer',
                    opacity: processing ? 0.7 : 1,
                    fontFamily:
                      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.15s',
                    transform: processing ? 'none' : undefined,
                  }}
                >
                  {processing
                    ? t('checkout.processing', {}, { defaultValue: 'Processing…' })
                    : t('checkout.placeOrder', {}, { defaultValue: 'Place Order' })}
                </button>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <aside
              data-mol-id="order-summary"
              style={{
                gridColumn: 'span 5',
                position: 'sticky',
                top: '96px',
                backgroundColor: 'var(--color-surface)',
                borderRadius: '1rem',
                border: '1px solid var(--color-border-light)',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                padding: '32px',
              }}
            >
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--mol-color-secondary)',
                  marginBottom: '24px',
                  marginTop: 0,
                }}
              >
                {t('cartOrderSummary.title', {}, { defaultValue: 'Order Summary' })}
              </h2>

              {/* Cart Items */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px',
                  marginBottom: '32px',
                }}
              >
                {safeCart.items.map((item) => (
                  <div key={item.id || 'unknown'} style={{ display: 'flex', gap: '16px' }}>
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        backgroundColor: 'var(--color-border-light)',
                      }}
                    >
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name || 'Product'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <p
                            style={{
                              fontSize: '14px',
                              fontWeight: 700,
                              color: 'var(--mol-color-secondary)',
                              margin: '0 0 4px 0',
                            }}
                          >
                            {item.name || 'Unknown Item'}
                          </p>
                          {item.color && (
                            <p
                              style={{
                                fontSize: '12px',
                                color: 'var(--color-out-of-stock)',
                                margin: '0 0 4px 0',
                              }}
                            >
                              {t(
                                'checkout.itemColor',
                                { color: item.color },
                                { defaultValue: 'Color: {{color}}' },
                              )}
                            </p>
                          )}
                          {item.size && (
                            <p
                              style={{
                                fontSize: '12px',
                                color: 'var(--color-out-of-stock)',
                                margin: 0,
                              }}
                            >
                              {t(
                                'checkout.itemSize',
                                { size: item.size },
                                { defaultValue: 'Size: {{size}}' },
                              )}
                            </p>
                          )}
                          <p
                            style={{
                              fontSize: '14px',
                              fontWeight: 700,
                              color: 'var(--mol-color-secondary)',
                              margin: '4px 0 0 0',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            ${formatPrice(item.price)}
                          </p>
                        </div>
                        {item.discount && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: 'var(--color-surface)',
                              backgroundColor: 'var(--color-low-stock)',
                              padding: '2px 6px',
                              borderRadius: '9999px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            {item.discount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Code */}
              <div
                style={{ display: 'flex', gap: '8px', marginBottom: promoMessage ? '8px' : '32px' }}
              >
                <input
                  type="text"
                  data-mol-id="input-promo"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value)
                    setPromoMessage('')
                  }}
                  placeholder={t('promo.placeholder', {}, { defaultValue: 'Promo code' })}
                  style={{
                    flex: 1,
                    height: '44px',
                    padding: '0 16px',
                    fontSize: '14px',
                    border: '1px solid var(--color-star-empty)',
                    borderRadius: '6px',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--mol-color-secondary)',
                    outline: 'none',
                    fontFamily:
                      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  }}
                />
                <button
                  type="button"
                  data-mol-id="btn-apply-promo"
                  onClick={handleApplyPromo}
                  style={{
                    height: '44px',
                    padding: '0 24px',
                    backgroundColor: 'var(--mol-color-secondary)',
                    color: 'var(--color-surface)',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {t('common.apply', {}, { defaultValue: 'Apply' })}
                </button>
              </div>
              {promoMessage && (
                <p
                  data-mol-id="promo-message"
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-out-of-stock)',
                    margin: '0 0 24px 0',
                  }}
                >
                  {promoMessage}
                </p>
              )}

              {/* Price Breakdown */}
              <div
                style={{
                  borderTop: '1px solid var(--color-border-light)',
                  paddingTop: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', color: 'var(--color-out-of-stock)' }}>
                    {t('nav.subtotal', {}, { defaultValue: 'Subtotal' })}
                  </span>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'var(--mol-color-secondary)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    ${formatPrice(safeCart.subtotal)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', color: 'var(--color-out-of-stock)' }}>
                    {t('cartOrderSummary.shipping', {}, { defaultValue: 'Shipping' })}
                  </span>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--color-in-stock)',
                      textTransform: 'uppercase',
                      letterSpacing: '-0.025em',
                    }}
                  >
                    {t('nav.free', {}, { defaultValue: 'Free' })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', color: 'var(--color-out-of-stock)' }}>
                    {t('checkout.tax', {}, { defaultValue: 'Tax' })}
                  </span>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'var(--mol-color-secondary)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    ${formatPrice(safeCart.tax)}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '16px',
                    borderTop: '1px dashed var(--color-star-empty)',
                    marginTop: '4px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '18px',
                      fontWeight: 900,
                      color: 'var(--mol-color-secondary)',
                    }}
                  >
                    {t('nav.total', {}, { defaultValue: 'Total' })}
                  </span>
                  <span
                    style={{
                      fontSize: '18px',
                      fontWeight: 900,
                      color: 'var(--mol-color-secondary)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    ${formatPrice(safeCart.total)}
                  </span>
                </div>
              </div>

              {/* Security Badge */}
              <div style={{ marginTop: '32px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    backgroundColor: 'var(--color-surface-secondary)',
                    borderRadius: '0.375rem',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: '18px',
                      color: 'var(--color-price-original)',
                      fontVariationSettings: "'FILL' 1",
                    }}
                  >
                    verified_user
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'var(--color-price-original)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {t('checkout.sslSecure', {}, { defaultValue: 'SSL Secure Checkout' })}
                  </span>
                </div>
              </div>
            </aside>
          </form>
        </div>
      </div>
    </CheckoutChrome>
  )
}
