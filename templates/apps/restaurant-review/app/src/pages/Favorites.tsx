import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  RestaurantListingCard,
  type RestaurantSummary,
} from '../components/RestaurantListingCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApiFavorite {
  id: string
  restaurant_id: string
  created_at: string
}

interface ApiRestaurant {
  id: string
  name: string
  cuisine: string
  neighborhood: string | null
  city: string
  rating: number | string
  review_count: number
  price_level: number
  thumbnail_url?: string | null
  badges?: string[] | string | null
}

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[]
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch (_error) {
      // JSON.parse failed on a malformed string; fall back to empty array
      return []
    }
  }
  return []
}

function toSummary(r: ApiRestaurant): RestaurantSummary {
  return {
    id: r.id,
    name: r.name,
    cuisine: r.cuisine,
    neighborhood: r.neighborhood ?? '',
    city: r.city,
    rating: typeof r.rating === 'string' ? Number(r.rating) : r.rating,
    review_count: r.review_count,
    price_level: r.price_level,
    thumbnail_url: r.thumbnail_url ?? undefined,
    badges: asArray(r.badges),
    open_now: true,
  }
}

export function Favorites() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [favorites, setFavorites] = useState<ApiFavorite[]>([])
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  // Hydrate restaurant details one-by-one. Per-id GETs let the server hide
  // de-listed restaurants (404 → silently skip) and let any per-restaurant
  // permission/auth scope work without leaking through a bulk endpoint.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/favorites?limit=100')
      .then(async (favRes) => {
        if (cancelled) return
        const favs = unwrapList<ApiFavorite>(favRes)
        setFavorites(favs)
        const fetched = await Promise.all(
          favs.map((f) =>
            http
              .get<ApiRestaurant | { data: ApiRestaurant }>(`/api/restaurants/${f.restaurant_id}`)
              .then((res) => {
                const body = (res as { data?: unknown }).data ?? res
                if (
                  body &&
                  typeof body === 'object' &&
                  'data' in (body as Record<string, unknown>)
                ) {
                  return (body as { data: ApiRestaurant }).data
                }
                return body as ApiRestaurant
              })
              .catch(() => null),
          ),
        )
        if (cancelled) return
        const list = fetched
          .filter((r): r is ApiRestaurant => r != null && typeof r === 'object' && 'id' in r)
          .map(toSummary)
        setRestaurants(list)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('favorites.loadError', {}, { defaultValue: 'Failed to load favorites.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const totalCount = restaurants.length
  const stats = useMemo(() => {
    const cuisines = new Set(restaurants.map((r) => r.cuisine))
    const cities = new Set(restaurants.map((r) => r.city ?? '').filter(Boolean))
    return { cuisineCount: cuisines.size, cityCount: cities.size }
  }, [restaurants])

  async function removeFavorite(restaurantId: string) {
    const fav = favorites.find((f) => f.restaurant_id === restaurantId)
    if (!fav || pendingId) return
    const prevFavs = favorites
    const prevRestaurants = restaurants
    setPendingId(restaurantId)
    setFavorites((cur) => cur.filter((f) => f.id !== fav.id))
    setRestaurants((cur) => cur.filter((r) => r.id !== restaurantId))
    try {
      await http.delete(`/api/favorites/${fav.id}`)
      void track({ name: 'favorite.removed', properties: { restaurant_id: restaurantId } })
    } catch (err) {
      console.error('[Favorites] removeFavorite failed', err)
      setFavorites(prevFavs)
      setRestaurants(prevRestaurants)
    } finally {
      setPendingId(null)
    }
  }

  return (
    <main className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 10), cm.mxAuto)}>
      <header
        className={cm.cn(
          cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 8),
        )}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.3em] text-primary',
            )}
          >
            {t('favorites.eyebrow', {}, { defaultValue: 'Your shortlist' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('5xl'), cm.sp('mt', 2), 'leading-tight')}
            style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
          >
            {t('favorites.heading', {}, { defaultValue: 'Saved spots' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('base'),
              cm.sp('mt', 2),
              cm.maxW('xl'),
              'text-on-surface-variant',
            )}
          >
            {t(
              'favorites.subheading',
              { count: totalCount },
              {
                defaultValue:
                  '{{count}} restaurants you bookmarked — ranked by your taste, not the algorithm.',
              },
            )}
          </p>
        </div>
        {totalCount > 0 ? (
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'md' }),
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            <span data-testid="favorites-cuisine-count">
              {t(
                'favorites.stats.cuisines',
                { n: stats.cuisineCount },
                { defaultValue: '{{n}} cuisines' },
              )}
            </span>
            <span aria-hidden>·</span>
            <span data-testid="favorites-city-count">
              {t(
                'favorites.stats.cities',
                { n: stats.cityCount },
                { defaultValue: '{{n}} cities' },
              )}
            </span>
          </div>
        ) : null}
      </header>

      {loading ? (
        <p className={cm.cn(cm.sp('p', 6), cm.textCenter, 'text-on-surface-variant')}>
          {t('favorites.loading', {}, { defaultValue: 'Loading saved spots…' })}
        </p>
      ) : error ? (
        <p className={cm.cn(cm.sp('p', 6), cm.textCenter, 'text-error')}>{error}</p>
      ) : restaurants.length === 0 ? (
        <div
          data-testid="favorites-empty"
          className={cm.cn(
            cm.sp('p', 10),
            cm.flex({ direction: 'col', gap: 'sm', align: 'center' }),
            cm.textCenter,
            'rounded-2xl border border-dashed border-outline-variant',
          )}
        >
          <span
            className="material-symbols-outlined text-5xl text-on-surface-variant"
            aria-hidden="true"
          >
            heart_broken
          </span>
          <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'))}>
            {t('favorites.empty.heading', {}, { defaultValue: 'No favorites yet' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'favorites.empty.body',
              {},
              { defaultValue: 'Tap the heart on a restaurant card to start your shortlist.' },
            )}
          </p>
          <Link
            to="/discover"
            className={cm.cn(
              cm.sp('mt', 3),
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors',
            )}
          >
            {t('favorites.empty.cta', {}, { defaultValue: 'Browse spots' })}
          </Link>
        </div>
      ) : (
        <div
          data-testid="favorites-results"
          className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6')}
        >
          {restaurants.map((r) => (
            <RestaurantListingCard
              key={r.id}
              restaurant={r}
              bookmarked
              onToggleBookmark={removeFavorite}
            />
          ))}
        </div>
      )}
    </main>
  )
}
