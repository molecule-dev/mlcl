import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

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

function formatCents(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
}

export function Cart() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [cart, setCart] = useState<ApiCart>(EMPTY_CART)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    return http
      .get<ApiCart | { data?: ApiCart }>('/api/cart')
      .then((res) => {
        const raw = (res as { data?: unknown })?.data ?? res
        const body = (
          raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)
            ? (raw as { data?: ApiCart }).data
            : (raw as ApiCart)
        ) as ApiCart | undefined
        setCart(body && 'groups' in body ? body : EMPTY_CART)
        setError(null)
      })
      .catch(() => {
        setError(
          t('cart.loadError', {}, { defaultValue: 'Could not load your cart. Please try again.' }),
        )
        setCart(EMPTY_CART)
      })
      .finally(() => setLoading(false))
  }, [http, t])

  useEffect(() => {
    refresh()
  }, [refresh])

  const updateQty = async (itemId: string, nextQty: number) => {
    if (nextQty < 1) {
      await removeItem(itemId)
      return
    }
    setError(null)
    try {
      await http.put(`/api/cart/${encodeURIComponent(itemId)}`, { quantity: nextQty })
      await refresh()
    } catch (error) {
      logError('cart.updateQty', error)
      setError(t('cart.updateError', {}, { defaultValue: 'Could not update item quantity.' }))
    }
  }

  const removeItem = async (itemId: string) => {
    setError(null)
    try {
      await http.delete(`/api/cart/${encodeURIComponent(itemId)}`)
      track({ name: 'cart.item_removed', properties: { cart_item_id: itemId } })
      await refresh()
    } catch (error) {
      logError('cart.removeItem', error)
      setError(t('cart.removeError', {}, { defaultValue: 'Could not remove item.' }))
    }
  }

  const totalItems = cart.groups.reduce(
    (sum, g) => sum + g.items.reduce((s, i) => s + i.quantity, 0),
    0,
  )
  const vendorCount = cart.groups.length

  return (
    <div
      data-testid="cart-page"
      className={cm.cn(cm.maxW('full'), cm.mxAuto, cm.sp('p', 8), 'max-w-[1280px] space-y-8')}
    >
      <div className={cm.cn(cm.stack(2))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-orange-700 dark:text-primary',
          )}
        >
          {t('cart.eyebrow', {}, { defaultValue: 'Your cart' })}
        </p>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-4xl md:text-5xl tracking-tight font-extrabold text-on-surface',
          )}
        >
          {t(
            'cart.title',
            { count: totalItems, vendorCount },
            { defaultValue: 'Cart · {{count}} items from {{vendorCount}} vendors' },
          )}
        </h1>
        <p className={cm.cn('text-on-surface-variant text-lg leading-relaxed')}>
          {t(
            'cart.subtitle',
            { appName: APP_NAME },
            {
              defaultValue:
                'Each vendor ships on their own — you only check out once. {{appName}} handles the rest.',
            },
          )}
        </p>
      </div>

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

      <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-[1.5fr_1fr]')}>
        {/* Vendor groups */}
        <div className={cm.cn(cm.stack(4))}>
          {loading && cart.groups.length === 0 ? (
            <p className="text-on-surface-variant">
              {t('cart.loading', {}, { defaultValue: 'Loading your cart…' })}
            </p>
          ) : cart.groups.length === 0 ? (
            <div
              data-testid="cart-empty"
              className={cm.cn(
                cm.sp('p', 10),
                cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
                'rounded-3xl border border-dashed border-outline-variant text-center',
              )}
            >
              <span
                className="material-symbols-outlined text-on-surface-variant"
                style={{ fontSize: '48px' }}
                aria-hidden
              >
                shopping_basket
              </span>
              <p
                className={cm.cn(cm.fontWeight('bold'), cm.sp('mt', 4), 'text-on-surface text-lg')}
              >
                {t('cart.empty.title', {}, { defaultValue: 'Your cart is empty' })}
              </p>
              <p className={cm.cn(cm.sp('mt', 2), 'text-on-surface-variant')}>
                {t(
                  'cart.empty.body',
                  {},
                  { defaultValue: 'Browse the catalog and add a few makers to your bag.' },
                )}
              </p>
              <Link
                to="/catalog"
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.sp('mt', 6),
                  cm.roundedFull,
                  'bg-primary text-on-primary hover:bg-primary-dark transition-colors',
                )}
              >
                {t('cart.empty.cta', {}, { defaultValue: 'Browse the catalog' })}
              </Link>
            </div>
          ) : (
            cart.groups.map((group) => {
              const groupSubtotal = group.subtotal_cents
              return (
                <article
                  key={group.vendor_id}
                  data-testid="cart-group"
                  data-vendor-id={group.vendor_id}
                  className={cm.cn(
                    'overflow-hidden rounded-2xl border border-outline-variant bg-surface',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ justify: 'between', align: 'center', wrap: 'wrap', gap: 'md' }),
                      cm.sp('px', 6),
                      cm.sp('py', 4),
                      'bg-info/5 border-b border-outline-variant',
                    )}
                  >
                    <Link
                      to={group.vendor_slug ? `/vendors/${group.vendor_slug}` : '#'}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.fontWeight('bold'),
                        'text-sky-700 dark:text-info hover:underline',
                      )}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
                        aria-hidden
                      >
                        storefront
                      </span>
                      {group.vendor_name}
                      {group.vendor_verified && (
                        <span
                          className="material-symbols-outlined text-secondary"
                          style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
                          aria-label={t(
                            'cart.verifiedAria',
                            {},
                            { defaultValue: 'Verified vendor' },
                          )}
                        >
                          verified
                        </span>
                      )}
                    </Link>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'cart.deliveryEstimate',
                        { range: group.estimated_delivery },
                        { defaultValue: 'Estimated delivery {{range}}' },
                      )}
                    </p>
                  </div>
                  <ul className={cm.cn(cm.stack(0))}>
                    {group.items.map((item, idx) => (
                      <li
                        key={item.id}
                        data-testid="cart-item"
                        data-cart-item-id={item.id}
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'md' }),
                          cm.sp('px', 6),
                          cm.sp('py', 4),
                          idx > 0 && 'border-t border-outline-variant',
                        )}
                      >
                        <img
                          src={
                            item.image ?? `https://picsum.photos/seed/vendry-cart-${item.id}/96/120`
                          }
                          alt=""
                          className={'h-20 w-16 rounded-xl object-cover bg-surface-container-low'}
                        />
                        <div className={'min-w-0 flex-1'}>
                          <Link
                            to={`/products/${item.product_id}`}
                            className={cm.cn(
                              cm.fontWeight('bold'),
                              'text-on-surface hover:text-primary',
                            )}
                          >
                            {item.name}
                          </Link>
                          {item.variant_id && (
                            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                              {item.variant_id}
                            </p>
                          )}
                          <div
                            className={cm.cn(
                              cm.flex({ align: 'center', gap: 'sm' }),
                              cm.sp('mt', 2),
                            )}
                          >
                            <div
                              className={cm.cn(
                                cm.flex({ align: 'center', gap: 'sm' }),
                                cm.textSize('sm'),
                                'rounded-full border border-outline-variant',
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => updateQty(item.id, item.quantity - 1)}
                                className={cm.cn(
                                  cm.sp('px', 3),
                                  cm.sp('py', 1),
                                  'text-on-surface-variant hover:text-primary',
                                )}
                                aria-label={t(
                                  'cart.decreaseAria',
                                  {},
                                  { defaultValue: 'Decrease quantity' },
                                )}
                              >
                                <span
                                  className="material-symbols-outlined"
                                  style={{ fontSize: '18px' }}
                                  aria-hidden
                                >
                                  remove
                                </span>
                              </button>
                              <span
                                data-testid="cart-item-qty"
                                className={cm.cn(cm.fontWeight('semibold'), 'tabular-nums')}
                              >
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQty(item.id, item.quantity + 1)}
                                className={cm.cn(
                                  cm.sp('px', 3),
                                  cm.sp('py', 1),
                                  'text-on-surface-variant hover:text-primary',
                                )}
                                aria-label={t(
                                  'cart.increaseAria',
                                  {},
                                  { defaultValue: 'Increase quantity' },
                                )}
                              >
                                <span
                                  className="material-symbols-outlined"
                                  style={{ fontSize: '18px' }}
                                  aria-hidden
                                >
                                  add
                                </span>
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className={cm.cn(
                                cm.textSize('sm'),
                                'text-on-surface-variant hover:text-error',
                              )}
                            >
                              {t('common.remove', {}, { defaultValue: 'Remove' })}
                            </button>
                          </div>
                        </div>
                        <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface tabular-nums')}>
                          {formatCents(item.unit_price_cents * item.quantity, cart.currency)}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <footer
                    className={cm.cn(
                      cm.flex({ justify: 'between', align: 'center' }),
                      cm.sp('px', 6),
                      cm.sp('py', 3),
                      'border-t border-outline-variant bg-surface-container-low',
                    )}
                  >
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {t(
                        'cart.shippingFromVendor',
                        { amount: formatCents(group.shipping_cents, cart.currency) },
                        { defaultValue: 'Shipping from this vendor: {{amount}}' },
                      )}
                    </p>
                    <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface tabular-nums')}>
                      {t(
                        'cart.subtotalGroup',
                        {
                          amount: formatCents(groupSubtotal + group.shipping_cents, cart.currency),
                        },
                        { defaultValue: 'Subtotal {{amount}}' },
                      )}
                    </p>
                  </footer>
                </article>
              )
            })
          )}
        </div>

        {/* Order summary */}
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
                {t('cart.summaryItems', {}, { defaultValue: 'Items' })}
              </dt>
              <dd
                data-testid="cart-summary-items"
                className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface tabular-nums')}
              >
                {formatCents(cart.item_subtotal_cents, cart.currency)}
              </dd>
            </div>
            <div className={cm.cn(cm.flex({ justify: 'between' }))}>
              <dt className="text-on-surface-variant">
                {t('cart.summaryShipping', {}, { defaultValue: 'Shipping (combined)' })}
              </dt>
              <dd className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface tabular-nums')}>
                {formatCents(cart.shipping_total_cents, cart.currency)}
              </dd>
            </div>
            <div
              className={cm.cn(
                cm.flex({ justify: 'between' }),
                cm.sp('pt', 3),
                'border-t border-outline-variant',
              )}
            >
              <dt className={cm.cn(cm.fontWeight('bold'), 'text-on-surface text-base')}>
                {t('nav.total', {}, { defaultValue: 'Total' })}
              </dt>
              <dd
                data-testid="cart-summary-total"
                className={cm.cn(cm.fontWeight('bold'), 'text-on-surface tabular-nums text-lg')}
              >
                {formatCents(cart.total_cents, cart.currency)}
              </dd>
            </div>
          </dl>
          <Link
            to="/checkout"
            aria-disabled={cart.groups.length === 0}
            data-testid="cart-checkout-cta"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              cm.fontWeight('bold'),
              cm.sp('py', 4),
              cm.roundedFull,
              cart.groups.length === 0
                ? 'bg-surface-container text-on-surface-variant pointer-events-none'
                : 'bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-md shadow-primary/20',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden>
              lock
            </span>
            {t('cart.checkoutCta', {}, { defaultValue: 'Continue to checkout' })}
          </Link>
          <p className={cm.cn(cm.textSize('xs'), cm.textCenter, 'text-on-surface-variant')}>
            {t(
              'cart.protectionNote',
              { appName: APP_NAME },
              { defaultValue: '{{appName}} protects every order. Free returns within 30 days.' },
            )}
          </p>
        </aside>
      </div>
    </div>
  )
}

export default Cart
