import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CuisineDiscoveryCard } from '../components/CuisineDiscoveryCard.js'
import {
  RestaurantListingCard,
  type RestaurantSummary,
} from '../components/RestaurantListingCard.js'
import { unwrapList } from '../lib/unwrap.js'

const CUISINE_FILTERS = [
  { value: '', label: 'All', emoji: '🍽️' },
  { value: 'italian', label: 'Italian', emoji: '🍝' },
  { value: 'japanese', label: 'Japanese', emoji: '🍣' },
  { value: 'mexican', label: 'Mexican', emoji: '🌮' },
  { value: 'korean', label: 'Korean', emoji: '🥢' },
  { value: 'french', label: 'French', emoji: '🥖' },
  { value: 'thai', label: 'Thai', emoji: '🍛' },
  { value: 'indian', label: 'Indian', emoji: '🍲' },
  { value: 'american', label: 'American', emoji: '🍔' },
] as const

const PRICE_FILTERS = [
  { value: '', label: 'Any price' },
  { value: '1', label: '$' },
  { value: '2', label: '$$' },
  { value: '3', label: '$$$' },
  { value: '4', label: '$$$$' },
] as const

const FEATURED_NEIGHBORHOODS = [
  {
    id: 'n1',
    name: 'East Village',
    subtitle: 'Lower-key kitchens, big flavor — wine bars and ramen counters',
    thumbnail: 'https://picsum.photos/seed/morsel-east-village/1200/900',
    pill: 'Tonight',
  },
  {
    id: 'n2',
    name: 'Mission',
    subtitle: 'Birria, mezcal, and the city’s most consistent burritos',
    thumbnail: 'https://picsum.photos/seed/morsel-mission/1200/900',
    pill: 'Trending',
  },
  {
    id: 'n3',
    name: 'West Loop',
    subtitle: 'Tasting menus, Michelin nods, and meatpacking-era warehouses',
    thumbnail: 'https://picsum.photos/seed/morsel-west-loop/1200/900',
    pill: 'Splurge',
  },
] as const

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
  tags?: string[] | string | null
}

interface ApiFavorite {
  id: string
  restaurant_id: string
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

export function Discover() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [cuisine, setCuisine] = useState<string>(searchParams.get('cuisine') ?? '')
  const [price, setPrice] = useState<string>(searchParams.get('price') ?? '')
  const [query, setQuery] = useState<string>(searchParams.get('q') ?? '')
  const [near, setNear] = useState<string>(searchParams.get('near') ?? '')
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<'rating' | 'reviews'>('rating')
  const [pendingFavorite, setPendingFavorite] = useState<string | null>(null)

  // Load restaurants from the live API. We do client-side filter/sort on top
  // of the server result for instant interactivity.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/restaurants?limit=50&sort_by=rating&sort_order=desc').catch(() => null),
      http.get('/api/favorites').catch(() => null),
    ])
      .then(([restRes, favRes]) => {
        if (cancelled) return
        const list = unwrapList<ApiRestaurant>(restRes)
        setRestaurants(list.map(toSummary))
        const favs = unwrapList<ApiFavorite>(favRes)
        setFavoriteIds(new Set(favs.map((f) => f.restaurant_id)))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('discover.loadError', {}, { defaultValue: 'Could not load restaurants.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filtered = useMemo(() => {
    const list = restaurants.filter((r) => {
      if (cuisine && r.cuisine.toLowerCase() !== cuisine) return false
      if (price && String(r.price_level) !== price) return false
      if (near) {
        const n = near.toLowerCase()
        if (
          !r.neighborhood.toLowerCase().includes(n) &&
          !(r.city ?? '').toLowerCase().includes(n)
        ) {
          return false
        }
      }
      if (query) {
        const q = query.toLowerCase()
        if (
          !r.name.toLowerCase().includes(q) &&
          !r.cuisine.toLowerCase().includes(q) &&
          !r.neighborhood.toLowerCase().includes(q)
        ) {
          return false
        }
      }
      return true
    })
    return [...list].sort((a, b) => {
      if (sort === 'reviews') return (b.review_count ?? 0) - (a.review_count ?? 0)
      return (b.rating ?? 0) - (a.rating ?? 0)
    })
  }, [cuisine, price, query, near, sort, restaurants])

  const updateParams = (patch: Record<string, string>) => {
    const next = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setSearchParams(next, { replace: true })
  }

  // Toggle favorite via the real API. Optimistic UI update; rollback on
  // network error so the user always sees the truth.
  async function toggleBookmark(restaurantId: string) {
    if (pendingFavorite) return
    const isFav = favoriteIds.has(restaurantId)
    setPendingFavorite(restaurantId)
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      if (isFav) next.delete(restaurantId)
      else next.add(restaurantId)
      return next
    })
    try {
      if (isFav) {
        // Need the favorite row id, not just the restaurant id, to delete.
        const favRes = await http.get('/api/favorites')
        const favs = unwrapList<ApiFavorite>(favRes)
        const row = favs.find((f) => f.restaurant_id === restaurantId)
        if (row) await http.delete(`/api/favorites/${row.id}`)
        void track({ name: 'favorite.removed', properties: { restaurant_id: restaurantId } })
      } else {
        await http.post('/api/favorites', { restaurant_id: restaurantId })
        void track({ name: 'favorite.added', properties: { restaurant_id: restaurantId } })
      }
    } catch (err) {
      console.error('[Discover] favorite toggle failed', err)
      // rollback
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        if (isFav) next.add(restaurantId)
        else next.delete(restaurantId)
        return next
      })
    } finally {
      setPendingFavorite(null)
    }
  }

  return (
    <main className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 10), cm.mxAuto)}>
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('mb', 8))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.3em] text-primary',
          )}
        >
          {t('nav.discover', {}, { defaultValue: 'Discover' })}
        </p>
        <h1
          className={cm.cn(cm.textSize('5xl'), 'leading-tight')}
          style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
        >
          {t('discover.heading', {}, { defaultValue: 'Find your next favorite spot' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('base'),
            cm.maxW('2xl'),
            'text-on-surface-variant leading-relaxed',
          )}
        >
          {t(
            'discover.subheading',
            {},
            {
              defaultValue:
                'Filter by cuisine, neighborhood, or price — every listing is verified by the diners who actually showed up.',
            },
          )}
        </p>
      </header>

      <section
        className={cm.cn(
          cm.sp('p', 5),
          cm.sp('mb', 8),
          'bg-surface rounded-2xl border border-outline-variant/40 shadow-sm',
        )}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            updateParams({ q: query, cuisine, price })
          }}
          className={cm.cn('grid grid-cols-1 md:grid-cols-[1.6fr_1fr_0.8fr_auto] gap-3')}
        >
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('common.search', {}, { defaultValue: 'Search' })}
            </span>
            <input
              type="text"
              data-testid="discover-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t(
                'discover.search.placeholder',
                {},
                { defaultValue: 'Restaurant, cuisine, or neighborhood' },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
              )}
            />
          </label>
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('discover.cuisine.label', {}, { defaultValue: 'Cuisine' })}
            </span>
            <select
              value={cuisine}
              data-testid="discover-cuisine"
              onChange={(e) => {
                setCuisine(e.target.value)
                updateParams({ cuisine: e.target.value })
              }}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary outline-none',
              )}
            >
              {CUISINE_FILTERS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.emoji}{' '}
                  {t(`discover.cuisine.${c.value || 'all'}`, {}, { defaultValue: c.label })}
                </option>
              ))}
            </select>
          </label>
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.price', {}, { defaultValue: 'Price' })}
            </span>
            <select
              value={price}
              data-testid="discover-price"
              onChange={(e) => {
                setPrice(e.target.value)
                updateParams({ price: e.target.value })
              }}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary outline-none',
              )}
            >
              {PRICE_FILTERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {t(`discover.price.${p.value || 'any'}`, {}, { defaultValue: p.label })}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
              'self-end rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-lg',
            )}
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              search
            </span>
            {t('common.search', {}, { defaultValue: 'Search' })}
          </button>
        </form>

        <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }), cm.sp('mt', 4))}>
          {CUISINE_FILTERS.slice(1).map((c) => {
            const active = c.value === cuisine
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => {
                  const next = active ? '' : c.value
                  setCuisine(next)
                  updateParams({ cuisine: next })
                }}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'py-1.5 rounded-full transition-colors',
                  active
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-low text-on-surface hover:bg-surface-container',
                )}
              >
                <span className={'mr-1'}>{c.emoji}</span>
                {t(`discover.chip.${c.value}`, {}, { defaultValue: c.label })}
              </button>
            )
          })}
        </div>
      </section>

      <section className={cm.cn(cm.sp('mb', 12))}>
        <header className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 6))}>
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-[0.25em] text-primary',
              )}
            >
              {t('discover.neighborhoods.eyebrow', {}, { defaultValue: 'Hot tonight' })}
            </p>
            <h2
              className={cm.cn(cm.textSize('3xl'), cm.sp('mt', 1), 'leading-tight')}
              style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
            >
              {t('discover.neighborhoods.heading', {}, { defaultValue: 'Trending neighborhoods' })}
            </h2>
          </div>
        </header>
        <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-5')}>
          {FEATURED_NEIGHBORHOODS.map((n) => (
            <CuisineDiscoveryCard
              key={n.id}
              cuisine={{
                id: n.id,
                name: n.name,
                subtitle: n.subtitle,
                thumbnail: n.thumbnail,
                pill: n.pill,
                href: `/discover?near=${encodeURIComponent(n.name)}`,
              }}
            />
          ))}
        </div>
      </section>

      <section>
        <header className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 6))}>
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-[0.25em] text-primary',
              )}
            >
              {t(
                'discover.results.eyebrow',
                { count: filtered.length },
                { defaultValue: '{{count}} spots' },
              )}
            </p>
            <h2
              className={cm.cn(cm.textSize('3xl'), cm.sp('mt', 1), 'leading-tight')}
              style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
            >
              {t('discover.results.heading', {}, { defaultValue: 'Restaurants for you' })}
            </h2>
          </div>
          <label
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            <span className={'hidden md:inline'}>
              {t('discover.sortLabel', {}, { defaultValue: 'Sort' })}
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'rating' | 'reviews')}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'bg-surface-container-low rounded-lg border border-outline-variant outline-none',
              )}
            >
              <option value="rating">
                {t('discover.sort.rating', {}, { defaultValue: 'Highest rated' })}
              </option>
              <option value="reviews">
                {t('discover.sort.reviews', {}, { defaultValue: 'Most reviewed' })}
              </option>
            </select>
          </label>
        </header>

        {near ? (
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.sp('mb', 5))}>
            <span
              className={cm.cn(
                cm.sp('pl', 3),
                cm.sp('pr', 2),
                cm.sp('py', 1),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'rounded-full bg-primary/10 text-primary',
              )}
            >
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                near_me
              </span>
              {t('discover.nearFilter', { near }, { defaultValue: 'Near {{near}}' })}
              <button
                type="button"
                onClick={() => {
                  setNear('')
                  updateParams({ near: '' })
                }}
                aria-label={t('discover.clearNear', {}, { defaultValue: 'Clear location filter' })}
                className={'flex items-center hover:opacity-70 transition-opacity'}
              >
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  close
                </span>
              </button>
            </span>
          </div>
        ) : null}

        {error ? (
          <p className={cm.cn(cm.sp('p', 6), cm.textCenter, 'text-error')}>{error}</p>
        ) : loading ? (
          <p className={cm.cn(cm.sp('p', 6), cm.textCenter, 'text-on-surface-variant')}>
            {t('discover.loading', {}, { defaultValue: 'Loading restaurants…' })}
          </p>
        ) : filtered.length === 0 ? (
          <div
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
              no_meals
            </span>
            <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'))}>
              {t('discover.empty.heading', {}, { defaultValue: 'No tables match those filters' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'discover.empty.body',
                {},
                { defaultValue: 'Try clearing a filter or widening the cuisine.' },
              )}
            </p>
          </div>
        ) : (
          <div
            data-testid="discover-results"
            className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6')}
          >
            {filtered.map((r) => (
              <RestaurantListingCard
                key={r.id}
                restaurant={r}
                bookmarked={favoriteIds.has(r.id)}
                onToggleBookmark={toggleBookmark}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
