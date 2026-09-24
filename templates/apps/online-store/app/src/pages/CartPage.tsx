// Phase 1 baseline — verbatim JSX of design-online-store-cart.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import CartItem from '../components/CartItem.js'
import CartOrderSummary from '../components/CartOrderSummary.js'
import CartPageHeader from '../components/CartPageHeader.js'
import CartRecommendationsSection from '../components/CartRecommendationsSection.js'
import CartTopNavBar from '../components/CartTopNavBar.js'
import StoreFooter from '../components/StoreFooter.js'
import { unpackCartPayload } from '../utils/httpUnpack.js'

interface CartItemData {
  id: string
  product_id: string
  quantity: number
  product: {
    id: string
    name: string
    price: number
    thumbnails: string[]
    sale_price?: number
    variant?: string
  }
}

function CartPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<CartItemData[]>([])
  const [subtotal, setSubtotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [unauthenticated, setUnauthenticated] = useState(false)

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true)
      setLoadFailed(false)
      setUnauthenticated(false)
      const res = await http.get('/api/cart')
      const cart = unpackCartPayload(res)
      setItems((cart?.items ?? []) as CartItemData[])
      setSubtotal(cart?.subtotal ?? 0)
    } catch (err) {
      // /cart is a public route so anonymous visits are expected.
      // Surface a sign-in prompt on 401 instead of a generic load error
      // (otherwise the empty browser tab looks like the app is broken).
      const status =
        (err as { status?: number; response?: { status?: number } })?.status ??
        (err as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        setUnauthenticated(true)
      } else {
        setLoadFailed(true)
      }
      setItems([])
      setSubtotal(0)
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        await http.delete(`/api/cart/items/${itemId}`)
      } else {
        await http.put(`/api/cart/items/${itemId}`, { quantity })
      }
      fetchCart()
    } catch (_error) {
      // Mutation failed — skip the refetch so the row keeps its last-known
      // server state; the user can simply retry the quantity change.
    }
  }

  const removeItem = async (itemId: string) => {
    try {
      await http.delete(`/api/cart/items/${itemId}`)
      fetchCart()
    } catch (_error) {
      // Removal failed — the item stays visible, so no state change is needed.
    }
  }

  if (loading) {
    return (
      <div className={cm.cn(cm.surface, 'antialiased')}>
        <CartTopNavBar cartCount={0} />
        <main className={cm.cn(cm.mxAuto, cm.sp('px', 6), cm.sp('py', 12), cm.maxW('[1280px]'))}>
          <div className={cm.stack(8)}>
            <CartPageHeader count={0} />
            <div className={cm.cn(cm.grid({ cols: 1, gap: 12 }), 'lg:grid-cols-12')}>
              <div className={cm.cn(cm.stack(6), 'lg:col-span-7')}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className={cm.cn(
                      cm.sp('p', 6),
                      cm.h(44),
                      'bg-surface rounded-lg shadow-sm border border-border animate-pulse',
                    )}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <div className={cm.cn('lg:col-span-5')}>
                <CartOrderSummary subtotal={0} />
              </div>
            </div>
          </div>
        </main>
        <StoreFooter />
      </div>
    )
  }

  if (unauthenticated) {
    return (
      <div className={cm.cn(cm.surface, 'antialiased')} data-mol-id="cart-anon-state">
        <CartTopNavBar cartCount={0} />
        <main className={cm.cn(cm.mxAuto, cm.sp('px', 6), cm.sp('py', 12), cm.maxW('[1280px]'))}>
          <div className={cm.stack(8)}>
            <CartPageHeader count={0} />
            <div
              className={cm.cn(
                cm.sp('p', 12),
                cm.textCenter,
                cm.stack(4),
                'bg-surface rounded-lg shadow-sm border border-border',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn(
                  cm.textSize('5xl'),
                  'material-symbols-outlined text-foreground-tertiary block',
                )}
              >
                shopping_cart
              </span>
              <h2
                className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-foreground')}
              >
                {t('cartPage.signInTitle', {}, { defaultValue: 'Sign in to view your cart' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-text-secondary')}>
                {t(
                  'cartPage.signInSubtitle',
                  {},
                  {
                    defaultValue:
                      'Your cart is saved with your account so you can pick up where you left off.',
                  },
                )}
              </p>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'bg-primary text-white rounded-md hover:bg-primary-hover transition-colors inline-block',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </div>
          </div>
        </main>
        <StoreFooter />
      </div>
    )
  }

  if (loadFailed) {
    return (
      <div className={cm.cn(cm.surface, 'antialiased')}>
        <CartTopNavBar cartCount={0} />
        <main className={cm.cn(cm.mxAuto, cm.sp('px', 6), cm.sp('py', 12), cm.maxW('[1280px]'))}>
          <div className={cm.stack(8)}>
            <CartPageHeader count={0} />
            <LoadErrorBanner
              message={t(
                'cartPage.loadError',
                {},
                { defaultValue: 'Failed to load cart. Please try again.' },
              )}
              retryLabel={t('common.retry', {}, { defaultValue: 'Retry' })}
              onRetry={fetchCart}
            />
          </div>
        </main>
        <StoreFooter />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className={cm.cn(cm.surface, 'antialiased')}>
        <CartTopNavBar cartCount={0} />
        <main className={cm.cn(cm.mxAuto, cm.sp('px', 6), cm.sp('py', 12), cm.maxW('[1280px]'))}>
          <div className={cm.stack(8)}>
            <CartPageHeader count={0} />
            <div
              className={cm.cn(
                cm.sp('p', 12),
                cm.textCenter,
                cm.stack(4),
                'bg-surface rounded-lg shadow-sm border border-border',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn(
                  cm.textSize('5xl'),
                  'material-symbols-outlined text-foreground-tertiary block',
                )}
              >
                shopping_cart
              </span>
              <h2
                className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-foreground')}
              >
                {t('cartPage.emptyTitle', {}, { defaultValue: 'Your cart is empty' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-text-secondary')}>
                {t('cartPage.emptySubtitle', {}, { defaultValue: 'Add some items to get started' })}
              </p>
              <Link
                to="/"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'bg-primary text-white rounded-md hover:bg-primary-hover transition-colors inline-block',
                )}
              >
                {t('cartPage.continueShopping', {}, { defaultValue: 'Continue Shopping' })}
              </Link>
            </div>
            <CartRecommendationsSection />
          </div>
        </main>
        <StoreFooter />
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.surface, 'antialiased')}>
      <CartTopNavBar cartCount={items.length} />
      <main className={cm.cn(cm.mxAuto, cm.sp('px', 6), cm.sp('py', 12), cm.maxW('[1280px]'))}>
        <div className={cm.stack(8)}>
          <CartPageHeader count={items.length} />
          <div className={cm.cn(cm.grid({ cols: 1, gap: 12 }), 'lg:grid-cols-12')}>
            <div className={cm.cn(cm.stack(6), 'lg:col-span-7')}>
              {items.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeItem}
                />
              ))}
            </div>
            <div className={cm.cn('lg:col-span-5')}>
              <CartOrderSummary subtotal={subtotal} />
            </div>
          </div>
          <CartRecommendationsSection />
        </div>
      </main>
      <StoreFooter />
    </div>
  )
}

export default CartPage
export { CartPage, CartPage as CartPagePage }
