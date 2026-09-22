import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'
import { useCart } from '../lib/useCart.js'

interface Restaurant {
  id: string
  name: string
  cuisine: string
  description: string
  rating: number
  review_count: number
  estimated_delivery_min: number
  delivery_fee_cents: number
  minimum_order_cents: number
}

interface MenuItem {
  id: string
  restaurant_id: string
  section: string
  name: string
  description: string
  price_cents: number
  thumbnail_url?: string | null
}

interface MenuPayload {
  restaurant: Restaurant
  items: MenuItem[]
  categories: Record<string, MenuItem[]>
}

const SECTION_LABELS: Record<string, string> = {
  starters: 'Starters',
  rolls: 'Rolls',
  sashimi: 'Sashimi',
  mains: 'Mains',
  desserts: 'Desserts',
  pizzas: 'Pizzas',
  pasta: 'Pasta',
  tandoor: 'Tandoor',
  curries: 'Curries',
  breads: 'Breads',
  tacos: 'Tacos',
  sides: 'Sides',
  burgers: 'Burgers',
  drinks: 'Drinks',
  salads: 'Salads',
  bowls: 'Bowls',
  scoops: 'Scoops',
  specials: 'Specials',
}

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function RestaurantMenu() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const navigate = useNavigate()
  const cart = useCart()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [favoriteId, setFavoriteId] = useState<string | null>(null)
  const [favoriteBusy, setFavoriteBusy] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/menu/restaurant/${id}`)
      .then((res) => {
        if (cancelled) return
        const payload = unwrapSingle<MenuPayload>(res)
        if (payload) {
          setRestaurant(payload.restaurant)
          setItems(payload.items)
          track({
            name: 'restaurant.viewed',
            properties: {
              restaurant_id: payload.restaurant?.id,
              cuisine: payload.restaurant?.cuisine,
              item_count: payload.items?.length ?? 0,
            },
          })
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(t('restaurantMenu.loadError', {}, { defaultValue: 'Failed to load menu.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, http, t])

  const refreshFavoriteId = useCallback((): void => {
    if (!id) return
    http
      .get('/api/favorites')
      .then((res) => {
        const payload = unwrapSingle<{ restaurants: Array<{ id: string; restaurant_id: string }> }>(
          res,
        )
        const list = payload?.restaurants ?? []
        const match = list.find((f) => f.restaurant_id === id)
        setFavoriteId(match?.id ?? null)
      })
      .catch(() => {
        /* ignore */
      })
  }, [http, id])

  useEffect(() => {
    refreshFavoriteId()
  }, [refreshFavoriteId])

  async function toggleFavorite(): Promise<void> {
    if (!id || favoriteBusy) return
    setFavoriteBusy(true)
    try {
      if (favoriteId) {
        await http.delete(`/api/favorites/${favoriteId}`)
        setFavoriteId(null)
        track({
          name: 'favorite.removed',
          properties: { restaurant_id: id },
        })
      } else {
        const res = await http.post('/api/favorites', { restaurant_id: id })
        const created = unwrapSingle<{ id: string }>(res)
        if (created?.id) setFavoriteId(created.id)
        else refreshFavoriteId()
        track({
          name: 'favorite.added',
          properties: { restaurant_id: id },
        })
      }
    } catch (_error) {
      // best-effort; reload to recover accurate favorite state
      refreshFavoriteId()
    } finally {
      setFavoriteBusy(false)
    }
  }

  function handleAdd(item: MenuItem): void {
    if (!restaurant) return
    cart.addItem(
      { id: restaurant.id, name: restaurant.name },
      { id: item.id, name: item.name, price_cents: item.price_cents },
      1,
    )
    track({
      name: 'item.added_to_cart',
      properties: { item_id: item.id, restaurant_id: restaurant.id, price_cents: item.price_cents },
    })
  }

  // Cart filtered to lines that belong to this restaurant (clearing happens
  // automatically when a different restaurant is opened and an item added).
  const restaurantLines = cart.restaurantId === restaurant?.id ? cart.lines : []
  const cartCount = restaurantLines.reduce((n, l) => n + l.qty, 0)
  const cartSubtotal = restaurantLines.reduce((n, l) => n + l.qty * l.price_cents, 0)

  const sectionsInOrder = Array.from(new Set(items.map((i) => i.section)))

  function goToCheckout(): void {
    navigate('/checkout')
  }

  return (
    <div
      className={cm.cn(
        cm.maxW('7xl'),
        cm.sp('px', 6),
        cm.sp('py', 8),
        cm.mxAuto,
        cm.grid({ cols: 12, gap: 'lg' }),
      )}
    >
      <div className={'col-span-12 lg:col-span-8'}>
        <Link
          to="/restaurants"
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant hover:underline')}
        >
          ← {t('restaurantMenu.backLink', {}, { defaultValue: 'Back to restaurants' })}
        </Link>

        {error ? (
          <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
        ) : loading ? (
          <p className={cm.cn(cm.sp('py', 16), cm.textMuted)}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : !restaurant ? (
          <p className={cm.cn(cm.sp('py', 16), cm.textMuted)}>
            {t('restaurantMenu.notFound', {}, { defaultValue: 'Restaurant not found.' })}
          </p>
        ) : (
          <>
            <header className={cm.cn(cm.sp('mt', 2), cm.sp('mb', 6))}>
              <div className={cm.flex({ align: 'center', justify: 'between', gap: 'md' })}>
                <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
                  {restaurant.name}
                </h1>
                <button
                  type="button"
                  onClick={toggleFavorite}
                  disabled={favoriteBusy}
                  aria-pressed={favoriteId != null}
                  aria-label={
                    favoriteId != null
                      ? t(
                          'restaurantMenu.removeFavorite',
                          {},
                          { defaultValue: 'Remove from favorites' },
                        )
                      : t('restaurantMenu.addFavorite', {}, { defaultValue: 'Add to favorites' })
                  }
                  data-testid="restaurant-favorite-toggle"
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.flex({ align: 'center', gap: 'sm' }),
                    'rounded-full border border-outline hover:bg-surface-container disabled:opacity-50',
                  )}
                >
                  <span
                    className={cm.cn(
                      'material-symbols-outlined',
                      favoriteId != null ? 'text-error' : 'text-on-surface-variant',
                    )}
                    aria-hidden="true"
                    style={favoriteId != null ? { fontVariationSettings: '"FILL" 1' } : undefined}
                  >
                    favorite
                  </span>
                  <span className={cm.textSize('sm')} data-testid="restaurant-favorite-label">
                    {favoriteId != null
                      ? t('restaurantMenu.favorited', {}, { defaultValue: 'Favorited' })
                      : t('common.save', {}, { defaultValue: 'Save' })}
                  </span>
                </button>
              </div>
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>{restaurant.description}</p>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('mt', 2),
                  cm.textSize('sm'),
                )}
              >
                <span aria-hidden="true">★</span>
                <span data-testid="restaurant-rating">
                  {Number(restaurant.rating ?? 0).toFixed(1)}
                </span>
                <span className="text-on-surface-variant">·</span>
                <span className="text-on-surface-variant">
                  {t(
                    'restaurantMenu.eta',
                    { range: restaurant.estimated_delivery_min },
                    { defaultValue: '{{range}} min' },
                  )}
                </span>
                <span className="text-on-surface-variant">·</span>
                <span className="text-on-surface-variant">
                  {fmt(restaurant.delivery_fee_cents)}{' '}
                  {t('restaurantMenu.deliveryFeeSuffix', {}, { defaultValue: 'delivery' })}
                </span>
              </div>
            </header>

            {sectionsInOrder.map((sectionKey) => {
              const sectionItems = items.filter((i) => i.section === sectionKey)
              if (sectionItems.length === 0) return null
              return (
                <section key={sectionKey} className={cm.sp('mb', 8)}>
                  <h2
                    className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mb', 3))}
                  >
                    {t(
                      `restaurantMenu.section.${sectionKey}`,
                      {},
                      { defaultValue: SECTION_LABELS[sectionKey.toLowerCase()] || sectionKey },
                    )}
                  </h2>
                  <ul className={cm.cn('divide-y divide-outline-variant')}>
                    {sectionItems.map((item) => (
                      <li
                        key={item.id}
                        data-testid="menu-item"
                        className={cm.cn(
                          cm.flex({ align: 'start', justify: 'between', gap: 'md' }),
                          cm.sp('py', 4),
                        )}
                      >
                        <div className={'flex-1'}>
                          <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                            {item.name}
                          </h3>
                          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                            {item.description}
                          </p>
                          <p
                            className={cm.cn(
                              cm.textSize('sm'),
                              cm.fontWeight('medium'),
                              cm.sp('mt', 1),
                            )}
                          >
                            {fmt(item.price_cents)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAdd(item)}
                          data-testid={`menu-add-${item.id}`}
                          className={cm.cn(
                            cm.sp('px', 4),
                            cm.sp('py', 2),
                            cm.fontWeight('medium'),
                            'bg-primary text-on-primary rounded-full text-sm hover:bg-primary-hover',
                          )}
                        >
                          {t('restaurantMenu.add', {}, { defaultValue: 'Add' })}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </>
        )}
      </div>

      <aside className={'col-span-12 lg:col-span-4'}>
        <div
          data-testid="cart-summary"
          className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm sticky top-24')}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
            {t(
              'restaurantMenu.cartHeading',
              { count: cartCount },
              { defaultValue: 'Your cart ({{count}})' },
            )}
          </h2>
          {cartCount === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t('restaurantMenu.cartEmpty', {}, { defaultValue: 'Add items to start an order.' })}
            </p>
          ) : (
            <>
              <ul className={cm.cn('divide-y divide-outline-variant', cm.sp('mb', 4))}>
                {restaurantLines.map((l) => (
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
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                )}
              >
                <span>{t('nav.subtotal', {}, { defaultValue: 'Subtotal' })}</span>
                <span data-testid="cart-subtotal">{fmt(cartSubtotal)}</span>
              </div>
              <button
                type="button"
                onClick={goToCheckout}
                data-testid="cart-checkout"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.sp('mt', 3),
                  cm.fontWeight('semibold'),
                  'block w-full text-center bg-primary text-on-primary rounded-full hover:bg-primary-hover',
                )}
              >
                {t('restaurantMenu.checkoutCta', {}, { defaultValue: 'Go to checkout' })}
              </button>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
