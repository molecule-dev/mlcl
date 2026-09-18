import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'
import { type CartItem, getCart, onCartChange, removeFromCart } from '../lib/cart.js'

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100)
}

export function Cart() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [items, setItems] = useState<CartItem[]>(() => getCart())

  useEffect(() => onCartChange(() => setItems(getCart())), [])

  const subtotal = items.reduce((s, i) => s + i.priceCents * i.quantity, 0)
  const total = subtotal

  return (
    <div className={cm.cn(cm.page, cm.flex({ direction: 'col' }), 'min-h-screen')}>
      <Header />
      <main className={cm.cn(cm.mxAuto, cm.sp('px', 6), cm.sp('py', 12), 'w-full max-w-[1200px]')}>
        <header className={cm.cn(cm.sp('mb', 8))}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary-dark',
            )}
          >
            {t('cart.eyebrow', {}, { defaultValue: 'Cart' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'text-on-surface',
            )}
          >
            {items.length === 0
              ? t('cart.titleEmpty', {}, { defaultValue: 'Your cart is empty' })
              : t(
                  'cart.title',
                  { count: items.length },
                  { defaultValue: 'You have {{count}} item(s)' },
                )}
          </h1>
        </header>

        <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
          <section className={cm.cn(cm.stack(4), 'lg:col-span-2')} data-testid="cart-items">
            {items.length === 0 ? (
              <div
                className={cm.cn(
                  cm.sp('p', 12),
                  'rounded-2xl bg-surface-container-lowest text-center',
                )}
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
                  {t('cart.empty', {}, { defaultValue: 'Your cart is empty' })}
                </p>
                <Link
                  to="/shop"
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    cm.sp('mt', 6),
                    cm.fontWeight('bold'),
                    'inline-flex items-center gap-2 bg-primary text-on-primary rounded-xl hover:bg-primary-hover transition-colors',
                  )}
                >
                  {t('cart.browse', {}, { defaultValue: 'Browse the storefront' })}
                </Link>
              </div>
            ) : (
              items.map((item) => (
                <article
                  key={item.productId}
                  data-testid="cart-item"
                  data-product-slug={item.productSlug}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md' }),
                    cm.sp('p', 4),
                    'rounded-2xl bg-surface-container-lowest shadow-sm',
                  )}
                >
                  {item.coverImage ? (
                    <img
                      src={item.coverImage}
                      alt=""
                      className={cm.cn('rounded-xl object-cover')}
                      style={{ width: 100, height: 64 }}
                    />
                  ) : (
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'rounded-xl bg-bg-secondary text-on-surface-variant',
                      )}
                      style={{ width: 100, height: 64 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 28 }}>
                        inventory_2
                      </span>
                    </div>
                  )}
                  <div className={cm.cn('flex-1')}>
                    <Link
                      to={`/shop/${item.productSlug}`}
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        'text-on-surface hover:text-primary',
                      )}
                    >
                      {item.name}
                    </Link>
                    {item.fileType && (
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('medium'),
                          'text-on-surface-variant',
                        )}
                        style={{ fontFamily: 'var(--font-family-mono)' }}
                      >
                        {item.fileType}
                      </p>
                    )}
                  </div>
                  <div className={cm.cn(cm.flex({ direction: 'col', align: 'end', gap: 'xs' }))}>
                    <span
                      className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {item.priceCents === 0
                        ? t('nav.free', {}, { defaultValue: 'Free' })
                        : formatPrice(item.priceCents)}
                    </span>
                    {item.originalPriceCents && item.originalPriceCents > item.priceCents && (
                      <span
                        className={cm.cn(cm.textSize('xs'), 'line-through text-on-surface-variant')}
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {formatPrice(item.originalPriceCents)}
                      </span>
                    )}
                    <button
                      type="button"
                      data-testid="cart-remove"
                      onClick={() => removeFromCart(item.productId)}
                      className={cm.cn(cm.textSize('xs'), 'text-error hover:underline')}
                    >
                      {t('common.remove', {}, { defaultValue: 'Remove' })}
                    </button>
                  </div>
                </article>
              ))
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
                {t('nav.orderSummary', {}, { defaultValue: 'Order summary' })}
              </h2>
              <dl className={cm.stack(3)}>
                <div className={cm.cn(cm.flex({ justify: 'between' }), cm.textSize('sm'))}>
                  <dt className={cm.cn('text-on-surface-variant')}>
                    {t('nav.subtotal', {}, { defaultValue: 'Subtotal' })}
                  </dt>
                  <dd
                    className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatPrice(subtotal)}
                  </dd>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ justify: 'between' }),
                    cm.sp('pt', 3),
                    'border-t border-border',
                  )}
                >
                  <dt className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                    {t('nav.total', {}, { defaultValue: 'Total' })}
                  </dt>
                  <dd
                    data-testid="cart-total"
                    className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-primary')}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatPrice(total)}
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                disabled={items.length === 0}
                onClick={() => navigate('/checkout')}
                data-testid="cart-checkout"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 4),
                  cm.fontWeight('bold'),
                  cm.sp('mt', 4),
                  'flex items-center justify-center gap-2 w-full bg-primary text-on-primary rounded-xl shadow-md shadow-primary/30 hover:bg-primary-hover transition-colors disabled:opacity-50',
                )}
              >
                {t('cart.checkout', {}, { defaultValue: 'Continue to checkout' })}
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  arrow_forward
                </span>
              </button>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.sp('mt', 3),
                  'text-on-surface-variant text-center',
                )}
              >
                {t(
                  'cart.note',
                  {},
                  { defaultValue: 'Each item is purchased separately on Stripe.' },
                )}
              </p>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Cart
