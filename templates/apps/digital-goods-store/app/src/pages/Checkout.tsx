import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'
import { type CartItem, getCart, onCartChange, removeFromCart } from '../lib/cart.js'

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

interface CheckoutSessionResponse {
  url?: string
  sessionId?: string
  freeOrder?: boolean
  orderId?: string
  licenseKey?: string
  data?: CheckoutSessionResponse
}

function unwrap(res: unknown): CheckoutSessionResponse {
  if (!res || typeof res !== 'object') return {}
  if ('data' in res && (res as CheckoutSessionResponse).data) {
    const d = (res as CheckoutSessionResponse).data!
    return { ...d, ...((res as Record<string, unknown>) ?? {}) }
  }
  return res as CheckoutSessionResponse
}

export function Checkout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [items, setItems] = useState<CartItem[]>(() => getCart())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => onCartChange(() => setItems(getCart())), [])

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.priceCents * i.quantity, 0), [items])

  const handlePay = async (item: CartItem) => {
    setBusyId(item.productId)
    setError(null)
    try {
      const res = await http.post('/api/checkout/create-session', {
        productId: item.productId,
      })
      const data = unwrap(res)
      if (data.freeOrder && data.orderId) {
        removeFromCart(item.productId)
        navigate(`/order/${data.orderId}/confirm`)
        return
      }
      if (data.url) {
        removeFromCart(item.productId)
        window.location.assign(data.url)
        return
      }
      setError(t('nav.couldNotStartCheckout', {}, { defaultValue: 'Could not start checkout.' }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className={cm.cn(cm.page, cm.flex({ direction: 'col' }), 'min-h-screen')}>
      <Header />
      <main className={cm.cn(cm.mxAuto, cm.sp('px', 6), cm.sp('py', 12), 'w-full max-w-[1100px]')}>
        <header className={cm.cn(cm.sp('mb', 8))}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary-dark',
            )}
          >
            {t('checkout.eyebrow', {}, { defaultValue: 'Secure checkout' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'text-on-surface',
            )}
          >
            {t('checkout.title', {}, { defaultValue: 'One step from your downloads' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {t(
              'checkout.subtitle',
              {},
              {
                defaultValue:
                  'Each item opens its own Stripe-hosted checkout. License keys are issued on confirmation.',
              },
            )}
          </p>
        </header>

        {items.length === 0 ? (
          <div
            className={cm.cn(cm.sp('p', 12), 'rounded-2xl bg-surface-container-lowest text-center')}
          >
            <span
              className="material-symbols-outlined text-on-surface-variant"
              style={{ fontSize: 56 }}
            >
              shopping_cart_off
            </span>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('bold'),
                cm.sp('mt', 4),
                'text-on-surface',
              )}
            >
              {t('checkout.empty', {}, { defaultValue: 'Nothing to check out' })}
            </p>
            <div
              className={cm.cn(
                cm.flex({ justify: 'center', gap: 'sm' }),
                cm.sp('mt', 6),
                'flex-wrap',
              )}
            >
              <Link
                to="/cart"
                data-testid="checkout-back-to-cart"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  'inline-flex items-center gap-2 bg-surface text-primary-dark border border-primary rounded-xl hover:bg-primary-light transition-colors',
                )}
              >
                {t('checkout.backToCart', {}, { defaultValue: 'Back to cart' })}
              </Link>
              <Link
                to="/shop"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  'inline-flex items-center gap-2 bg-primary text-on-primary rounded-xl hover:bg-primary-hover transition-colors',
                )}
              >
                {t('checkout.browse', {}, { defaultValue: 'Browse the storefront' })}
              </Link>
            </div>
          </div>
        ) : (
          <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
            <section className={cm.cn(cm.stack(4), 'lg:col-span-2')} data-testid="checkout-items">
              {items.map((item) => (
                <article
                  key={item.productId}
                  data-testid="checkout-item"
                  data-product-slug={item.productSlug}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md' }),
                    cm.sp('p', 5),
                    'rounded-2xl bg-surface-container-lowest shadow-sm',
                  )}
                >
                  {item.coverImage ? (
                    <img
                      src={item.coverImage}
                      alt=""
                      className={cm.cn('rounded-xl object-cover')}
                      style={{ width: 92, height: 64 }}
                    />
                  ) : (
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'rounded-xl bg-bg-secondary text-on-surface-variant',
                      )}
                      style={{ width: 92, height: 64 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 28 }}>
                        inventory_2
                      </span>
                    </div>
                  )}
                  <div className={cm.cn('flex-1')}>
                    <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>{item.name}</p>
                    {item.fileType && (
                      <p
                        className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
                        style={{ fontFamily: 'var(--font-family-mono)' }}
                      >
                        {item.fileType}
                      </p>
                    )}
                  </div>
                  <div className={cm.cn(cm.flex({ direction: 'col', align: 'end', gap: 'sm' }))}>
                    <span
                      className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {item.priceCents === 0
                        ? t('nav.free', {}, { defaultValue: 'Free' })
                        : formatPrice(item.priceCents)}
                    </span>
                    <button
                      type="button"
                      data-testid="checkout-pay"
                      data-product-slug={item.productSlug}
                      disabled={busyId === item.productId}
                      onClick={() => handlePay(item)}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.fontWeight('bold'),
                        'rounded-lg bg-primary text-on-primary hover:bg-primary-hover transition-colors disabled:opacity-60',
                      )}
                    >
                      {busyId === item.productId
                        ? t('checkout.cta.processing', {}, { defaultValue: 'Processing…' })
                        : item.priceCents === 0
                          ? t('checkout.cta.get', {}, { defaultValue: 'Get for free' })
                          : t(
                              'checkout.cta.payOne',
                              { amount: formatPrice(item.priceCents) },
                              { defaultValue: 'Pay {{amount}}' },
                            )}
                    </button>
                  </div>
                </article>
              ))}
              {error && (
                <p
                  className={cm.cn(
                    cm.sp('p', 4),
                    'rounded-xl bg-error-container text-on-error-container text-sm',
                  )}
                  role="alert"
                >
                  {error}
                </p>
              )}
            </section>

            <aside className={cm.cn('lg:sticky lg:top-6 self-start')}>
              <div
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface border border-border shadow-sm',
                )}
              >
                <h2
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 4),
                    'text-on-surface',
                  )}
                >
                  {t('checkout.review', {}, { defaultValue: 'Order review' })}
                </h2>
                <ul className={cm.stack(3)}>
                  {items.map((item) => (
                    <li
                      key={item.productId}
                      className={cm.cn(cm.flex({ justify: 'between' }), cm.textSize('sm'))}
                    >
                      <span className={cm.cn('text-on-surface')}>{item.name}</span>
                      <span
                        className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {item.priceCents === 0
                          ? t('nav.free', {}, { defaultValue: 'Free' })
                          : formatPrice(item.priceCents)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div
                  className={cm.cn(
                    cm.flex({ justify: 'between' }),
                    cm.sp('pt', 4),
                    cm.sp('mt', 4),
                    'border-t border-border',
                  )}
                >
                  <span className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                    {t('nav.total', {}, { defaultValue: 'Total' })}
                  </span>
                  <span
                    data-testid="checkout-total"
                    className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-primary')}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatPrice(subtotal)}
                  </span>
                </div>
                <p
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.textSize('xs'),
                    cm.sp('mt', 4),
                    'text-on-surface-variant',
                  )}
                >
                  <span className="material-symbols-outlined text-success" style={{ fontSize: 16 }}>
                    shield
                  </span>
                  {t(
                    'checkout.payment.note',
                    { appName: APP_NAME },
                    { defaultValue: 'Stripe-encrypted. {{appName}} never sees raw card data.' },
                  )}
                </p>
                <Link
                  to="/cart"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mt', 4),
                    'block text-center text-primary-dark hover:underline',
                  )}
                >
                  {t('checkout.editCart', {}, { defaultValue: '← Edit cart' })}
                </Link>
              </div>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default Checkout
