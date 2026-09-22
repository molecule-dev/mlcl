import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BushelHero } from '../components/BushelHero.js'
import { CategoryStrip } from '../components/CategoryStrip.js'
import { type FeaturedProduct, FeaturedProductsGrid } from '../components/FeaturedProductsGrid.js'
import { OrderSummaryCard } from '../components/OrderSummaryCard.js'
import { unwrapList } from '../lib/unwrap.js'

const CATEGORIES = [
  { key: 'all', defaultLabel: 'All', icon: 'apps' },
  { key: 'produce', defaultLabel: 'Produce', icon: 'eco' },
  { key: 'dairy', defaultLabel: 'Dairy & eggs', icon: 'icecream' },
  { key: 'bakery', defaultLabel: 'Bakery', icon: 'bakery_dining' },
  { key: 'meat', defaultLabel: 'Meat & seafood', icon: 'set_meal' },
  { key: 'pantry', defaultLabel: 'Pantry', icon: 'kitchen' },
  { key: 'frozen', defaultLabel: 'Frozen', icon: 'ac_unit' },
  { key: 'beverages', defaultLabel: 'Beverages', icon: 'local_drink' },
  { key: 'household', defaultLabel: 'Household', icon: 'cleaning_services' },
] as const

interface CartItem {
  id: string
  product_id: string
  name: string
  qty: number
  price_cents: number
}

async function refreshCart(http: ReturnType<typeof useHttpClient>): Promise<CartItem[]> {
  const res = await http.get('/api/cart')
  const items = unwrapList<CartItem>(res)
  if (items.length > 0) return items
  if (
    res &&
    typeof res === 'object' &&
    'items' in res &&
    Array.isArray((res as { items: unknown }).items)
  ) {
    return (res as { items: CartItem[] }).items
  }
  return []
}

export function Shop() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const categoryParam = searchParams.get('category')
  const [activeCategory, setActiveCategory] = useState<string>(() =>
    CATEGORIES.some((c) => c.key === categoryParam) ? (categoryParam as string) : 'all',
  )

  // Honor /shop?category=<key> deep links (e.g. the Landing category cards).
  useEffect(() => {
    setActiveCategory(
      CATEGORIES.some((c) => c.key === categoryParam) ? (categoryParam as string) : 'all',
    )
  }, [categoryParam])
  const [products, setProducts] = useState<FeaturedProduct[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/products').then((res) => unwrapList<FeaturedProduct>(res)),
      refreshCart(http).catch(() => [] as CartItem[]),
    ])
      .then(([prods, cartItems]) => {
        if (cancelled) return
        setProducts(prods)
        setCart(cartItems)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('shop.loadError', {}, { defaultValue: 'Failed to load products.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const visibleProducts = useMemo(() => {
    return activeCategory === 'all'
      ? products
      : products.filter((p) => p.category === activeCategory)
  }, [products, activeCategory])

  const localizedCategories = CATEGORIES.map((c) => ({
    key: c.key,
    label: t(`shop.category.${c.key}`, {}, { defaultValue: c.defaultLabel }),
    icon: c.icon,
  }))

  async function handleAdd(productId: string): Promise<void> {
    if (adding) return
    if (!user) {
      navigate('/login', { state: { from: location } })
      return
    }
    setAdding(productId)
    try {
      await http.post('/api/cart/items', { productId, quantity: 1 })
      void track({ name: 'item.added', properties: { product_id: productId, source: 'shop' } })
      const next = await refreshCart(http)
      setCart(next)
    } catch (err) {
      const status =
        (err as { status?: number; response?: { status?: number } } | null)?.status ??
        (err as { response?: { status?: number } } | null)?.response?.status
      if (status === 401) {
        navigate('/login', { state: { from: location } })
        return
      }
      setError(t('shop.addError', {}, { defaultValue: 'Could not add to cart.' }))
    } finally {
      setAdding(null)
    }
  }

  const itemCount = cart.reduce((s, i) => s + i.qty, 0)
  const subtotalCents = cart.reduce((s, i) => s + i.qty * i.price_cents, 0)

  return (
    <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto, 'space-y-8')}>
      <BushelHero
        itemsInStock={products.length || 4823}
        averageDeliveryMins="58"
        freshDealsCount={products.filter((p) => p.badges?.includes('sale')).length}
        deliverToLabel="Springfield, OR"
        headlineKey="shop.heroHeadline"
        headlineDefault="Build your bushel — {{count}}+ items in stock."
        subtitleKey="shop.heroSubtitle"
        subtitleDefault="Filter by aisle, tap to add. We'll have it at your door before sunset."
        primaryCta={{
          to: '/cart',
          key: 'shop.heroPrimaryCta',
          defaultLabel: 'Review cart',
          icon: 'shopping_cart',
        }}
        secondaryCta={{
          to: '/lists',
          key: 'shop.heroSecondaryCta',
          defaultLabel: 'My lists',
          icon: 'bookmark',
        }}
      />

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12')}>
        <section className={'lg:col-span-8 space-y-6'}>
          <CategoryStrip
            categories={localizedCategories}
            activeKey={activeCategory}
            onSelect={setActiveCategory}
          />

          {error ? (
            <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
          ) : loading ? (
            <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : visibleProducts.length === 0 ? (
            <p className={cm.cn(cm.sp('py', 20), cm.textCenter, cm.textMuted)}>
              {t('shop.empty', {}, { defaultValue: 'No products in this category.' })}
            </p>
          ) : (
            <FeaturedProductsGrid products={visibleProducts} cols="2-3-5" onAdd={handleAdd} />
          )}
        </section>

        <aside className={'lg:col-span-4'}>
          <OrderSummaryCard
            itemCount={itemCount}
            subtotalCents={subtotalCents}
            deliveryFeeCents={subtotalCents >= 3500 ? 0 : 599}
            taxCents={0}
            slotLabel={t('shop.slotPreview', {}, { defaultValue: 'Tomorrow, 9–11 AM' })}
            preview={cart
              .slice(0, 3)
              .map((c) => ({ name: c.name, qty: c.qty, price_cents: c.price_cents }))}
            ctaTo="/cart"
            ctaKey="shop.checkoutCta"
            ctaDefault="Review cart · {{total}}"
            freeDeliveryThresholdCents={3500}
            emptyState={itemCount === 0}
          />
        </aside>
      </div>
    </div>
  )
}
