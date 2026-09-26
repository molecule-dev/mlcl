import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CartHero } from '../components/CartHero.js'
import { CategoryChips } from '../components/CategoryChips.js'
import { FeaturedRestaurantsGrid } from '../components/FeaturedRestaurantsGrid.js'
import { RestaurantsHero } from '../components/RestaurantsHero.js'
import { unwrapList } from '../lib/unwrap.js'
import { useCart } from '../lib/useCart.js'

interface Restaurant {
  id: string
  name: string
  cuisine: string
  category: string
  description?: string
  rating: number
  review_count: number
  estimated_delivery_min: string
  delivery_fee_cents: number
  thumbnail_url?: string | null
  open?: boolean
  tags?: string[]
}

// Icon names must be members of the fleet SUBSET icon font
// (scripts/subset-flagship-icon-fonts.mjs breadth-ranked top-350) — long-tail
// names only render via the async runtime healer and flash raw text on first paint.
const CATEGORIES = [
  { key: 'all', defaultLabel: 'All', icon: 'restaurant_menu' },
  { key: 'pizza', defaultLabel: 'Pizza', icon: 'restaurant' },
  { key: 'burgers', defaultLabel: 'Burgers', icon: 'lunch_dining' },
  { key: 'sushi', defaultLabel: 'Sushi', icon: 'ramen_dining' },
  { key: 'asian', defaultLabel: 'Asian', icon: 'ramen_dining' },
  { key: 'mexican', defaultLabel: 'Mexican', icon: 'lunch_dining' },
  { key: 'italian', defaultLabel: 'Italian', icon: 'restaurant_menu' },
  { key: 'healthy', defaultLabel: 'Healthy', icon: 'eco' },
  { key: 'desserts', defaultLabel: 'Desserts', icon: 'local_cafe' },
] as const

export function Restaurants() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const cart = useCart()
  // Honor the `?cuisine=` deep link used by Search's cuisine results.
  const [searchParams] = useSearchParams()
  const [activeCategory, setActiveCategory] = useState<string>(
    () => searchParams.get('cuisine') ?? 'all',
  )
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [defaultAddressLabel, setDefaultAddressLabel] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/restaurants')
      .then((res) => {
        if (!cancelled) setRestaurants(unwrapList<Restaurant>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('restaurants.loadError', {}, { defaultValue: 'Failed to load restaurants.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    http
      .get('/api/addresses')
      .then((res) => {
        if (cancelled) return
        const addresses = unwrapList<{
          label: string | null
          street: string
          city: string | null
          is_default: boolean
        }>(res)
        const def = addresses.find((a) => a.is_default) ?? addresses[0]
        if (def) {
          setDefaultAddressLabel(`${def.label ?? 'Home'} · ${def.street}`)
        }
      })
      .catch(() => {
        /* leave undefined */
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const visible = useMemo(
    () =>
      activeCategory === 'all'
        ? restaurants
        : restaurants.filter((r) => (r.category ?? r.cuisine) === activeCategory),
    [restaurants, activeCategory],
  )

  const featured = restaurants.slice(0, 3)
  const stats = useMemo(() => {
    const open = restaurants.filter((r) => r.open !== false)
    const promoCount = open.filter((r) => r.delivery_fee_cents === 0).length
    return {
      total: open.length,
      promoCount,
    }
  }, [restaurants])

  // Real cart pulled from local store (persisted across navigations).
  const cartPreview = cart.lines
    .slice(0, 4)
    .map((l) => ({ name: l.name, qty: l.qty, price_cents: l.price_cents }))

  return (
    <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto, cm.stack(8))}>
      <RestaurantsHero
        totalRestaurants={stats.total}
        averageDeliveryMins="28"
        promoCount={stats.promoCount}
        deliverToLabel={
          defaultAddressLabel ??
          t('restaurants.deliverToHome', {}, { defaultValue: 'Home · 215 Elm St' })
        }
      />

      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12 items-start')}>
        <div className={'lg:col-span-8 stack space-y-6'}>
          <header>
            <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>
              {t('restaurants.heading', {}, { defaultValue: 'Restaurants near you' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {loading
                ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
                : t(
                    'restaurants.subheading',
                    { count: visible.length },
                    { defaultValue: '{{count}} places ready to deliver' },
                  )}
            </p>
          </header>

          <CategoryChips
            categories={CATEGORIES.map((c) => ({
              key: c.key,
              label: t(`restaurants.category.${c.key}`, {}, { defaultValue: c.defaultLabel }),
              icon: c.icon,
            }))}
            activeKey={activeCategory}
            onSelect={setActiveCategory}
          />

          {featured.length > 0 && activeCategory === 'all' && (
            <section data-testid="featured-section" className={'space-y-3'}>
              <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
                {t('restaurants.featuredHeading', {}, { defaultValue: 'Featured tonight' })}
              </h2>
              <FeaturedRestaurantsGrid restaurants={featured} limit={3} />
            </section>
          )}

          <section data-testid="restaurants-section" className={'space-y-3'}>
            <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
              {activeCategory === 'all'
                ? t('restaurants.allHeading', {}, { defaultValue: 'All restaurants' })
                : t(`restaurants.category.${activeCategory}`, {}, { defaultValue: activeCategory })}
            </h2>
            {error ? (
              <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
            ) : loading ? (
              <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
                {t('restaurants.loading', {}, { defaultValue: 'Loading…' })}
              </p>
            ) : (
              <FeaturedRestaurantsGrid restaurants={visible} />
            )}
          </section>
        </div>

        <div className={'lg:col-span-4'}>
          {cart.lines.length === 0 ? null : (
            <CartHero
              itemCount={cart.itemCount}
              subtotalCents={cart.subtotalCents}
              deliveryFeeCents={299}
              estimatedMinutes="28-35"
              preview={cartPreview}
              fromName={cart.restaurantName ?? ''}
            />
          )}
        </div>
      </section>
    </div>
  )
}
