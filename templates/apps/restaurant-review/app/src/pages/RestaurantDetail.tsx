import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PriceLevel } from '../components/PriceLevel.js'
import { type ReviewExcerpt, ReviewExcerptCard } from '../components/ReviewExcerptCard.js'
import { StarRating } from '../components/StarRating.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface ApiRestaurant {
  id: string
  name: string
  cuisine: string
  neighborhood: string | null
  city: string
  address: string
  description: string
  price_level: number
  rating: number | string
  review_count: number
  thumbnail_url?: string | null
  gallery?: string[] | string | null
  badges?: string[] | string | null
  hours?: Record<string, string> | string | null
  latitude?: number
  longitude?: number
}

interface ApiMenuItem {
  id: string
  name: string
  description: string
  price_cents: number
  currency: string
  category: string
}

interface ApiReview {
  id: string
  owner_id: string
  rating: number
  body: string
  title?: string | null
  helpful_count?: number
  photos?: string[] | string | null
  created_at: string
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

function asObject(value: unknown): Record<string, string> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, string>
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, string>
      }
    } catch (_error) {
      // JSON.parse failed on a malformed string; fall back to empty object
    }
  }
  return {}
}

function priceCentsToString(cents: number, currency: string): string {
  const amount = cents / 100
  return `${currency === 'USD' ? '$' : ''}${amount.toFixed(2)}`
}

export function RestaurantDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [restaurant, setRestaurant] = useState<ApiRestaurant | null>(null)
  const [menu, setMenu] = useState<ApiMenuItem[]>([])
  const [reviews, setReviews] = useState<ApiReview[]>([])
  const [favoriteRow, setFavoriteRow] = useState<ApiFavorite | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [favoritePending, setFavoritePending] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get(`/api/restaurants/${id}`).catch(() => null),
      http.get(`/api/restaurants/${id}/menu`).catch(() => null),
      http.get(`/api/reviews?restaurant_id=${encodeURIComponent(id)}&limit=20`).catch(() => null),
      http.get('/api/favorites').catch(() => null),
    ])
      .then(([rest, menuRes, revRes, favRes]) => {
        if (cancelled) return
        const r = unwrapSingle<ApiRestaurant>(rest)
        if (!r) {
          setError(t('restaurantDetail.notFound', {}, { defaultValue: 'Restaurant not found.' }))
          setRestaurant(null)
          return
        }
        setRestaurant(r)
        setMenu(unwrapList<ApiMenuItem>(menuRes))
        setReviews(unwrapList<ApiReview>(revRes))
        const favs = unwrapList<ApiFavorite>(favRes)
        setFavoriteRow(favs.find((f) => f.restaurant_id === id) ?? null)
        void track({
          name: 'restaurant.viewed',
          properties: { restaurant_id: r.id, rating: r.rating, review_count: r.review_count },
        })
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('restaurantDetail.loadError', {}, { defaultValue: 'Failed to load restaurant.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const ratingBreakdown = useMemo(() => {
    const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    for (const r of reviews) breakdown[r.rating] = (breakdown[r.rating] ?? 0) + 1
    return breakdown
  }, [reviews])

  const totalScored = useMemo(
    () => Object.values(ratingBreakdown).reduce((a, b) => a + b, 0),
    [ratingBreakdown],
  )

  const menuByCategory = useMemo(() => {
    const grouped: Record<string, ApiMenuItem[]> = {}
    for (const m of menu) {
      grouped[m.category] = grouped[m.category] ?? []
      grouped[m.category]!.push(m)
    }
    return grouped
  }, [menu])

  const reviewExcerpts: ReviewExcerpt[] = useMemo(
    () =>
      reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        body: r.body,
        posted_at: r.created_at,
        helpful_count: r.helpful_count ?? 0,
        photo_urls: asArray(r.photos),
        author: {
          id: r.owner_id,
          name: t('restaurantDetail.reviewer', {}, { defaultValue: 'Diner' }),
          review_count: 0,
        },
        restaurant: restaurant
          ? { id: restaurant.id, name: restaurant.name }
          : { id: '', name: '' },
      })),
    [reviews, restaurant, t],
  )

  async function toggleFavorite() {
    if (!restaurant || favoritePending) return
    setFavoritePending(true)
    const prevFav = favoriteRow
    try {
      if (favoriteRow) {
        setFavoriteRow(null)
        await http.delete(`/api/favorites/${favoriteRow.id}`)
        void track({
          name: 'favorite.removed',
          properties: { restaurant_id: restaurant.id },
        })
      } else {
        const result = await http.post('/api/favorites', { restaurant_id: restaurant.id })
        const created = unwrapSingle<ApiFavorite>(result)
        setFavoriteRow(created)
        void track({
          name: 'favorite.added',
          properties: { restaurant_id: restaurant.id, favorite_id: created?.id },
        })
      }
    } catch (err) {
      console.error('[RestaurantDetail] favorite toggle failed', err)
      setFavoriteRow(prevFav)
    } finally {
      setFavoritePending(false)
    }
  }

  if (loading) {
    return (
      <main
        className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 12), cm.mxAuto, cm.textCenter)}
      >
        <p className={'text-on-surface-variant'}>
          {t('restaurantDetail.loading', {}, { defaultValue: 'Loading restaurant…' })}
        </p>
      </main>
    )
  }

  if (error || !restaurant) {
    return (
      <main
        className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 12), cm.mxAuto, cm.textCenter)}
      >
        <p className={'text-error'}>
          {error ?? t('restaurantDetail.notFound', {}, { defaultValue: 'Restaurant not found.' })}
        </p>
        <Link
          to="/discover"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.sp('mt', 6),
            'inline-block rounded-full bg-primary text-on-primary',
          )}
        >
          {t('restaurantDetail.backToDiscover', {}, { defaultValue: 'Back to Discover' })}
        </Link>
      </main>
    )
  }

  const gallery = asArray(restaurant.gallery)
  const hours = asObject(restaurant.hours)
  const heroUrl =
    restaurant.thumbnail_url ??
    gallery[0] ??
    'https://picsum.photos/seed/morsel-detail-fallback/1600/900'
  const ratingNumber =
    typeof restaurant.rating === 'string' ? Number(restaurant.rating) : restaurant.rating
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(restaurant.address)}`

  return (
    <main className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <section className={cm.cn(cm.sp('mb', 8), 'relative rounded-[2rem] overflow-hidden')}>
        {/* h-80 at 390px: the bottom-anchored overlay (badge + name + description)
            is taller than a 16/7 crop of a 342px column and the name clips off
            the top; 320px holds it, and sm+ restores the editorial 16/7. */}
        <div
          className={cm.cn(
            'relative h-80 sm:h-auto sm:aspect-[16/7] bg-surface-variant overflow-hidden',
          )}
        >
          <img src={heroUrl} alt="" className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')} />
          <div
            className={cm.cn(
              'absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              'absolute inset-x-0 bottom-0',
              cm.sp('p', 8),
              cm.flex({ direction: 'col', gap: 'xs' }),
            )}
          >
            {asArray(restaurant.badges).includes('editor_pick') ? (
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  'self-start uppercase tracking-widest rounded-full bg-accent text-on-secondary text-xs font-bold',
                )}
              >
                {t('restaurantDetail.editorPick', {}, { defaultValue: "Editor's pick" })}
              </span>
            ) : null}
            <h1
              data-testid="restaurant-name"
              className={cm.cn('text-4xl md:text-5xl', 'text-white leading-tight')}
              style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
            >
              {restaurant.name}
            </h1>
            <p className={cm.cn(cm.textSize('lg'), 'text-white/90')}>{restaurant.description}</p>
          </div>
        </div>

        <div
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
            'bg-surface border border-outline-variant/40 border-t-0 rounded-b-[2rem]',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }))}>
            <StarRating value={ratingNumber} reviewCount={restaurant.review_count} size="md" />
            <span className={cm.cn('text-on-surface-variant')}>·</span>
            <PriceLevel level={restaurant.price_level} size="md" />
            <span className={cm.cn('text-on-surface-variant')}>·</span>
            <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {restaurant.cuisine} · {restaurant.neighborhood ?? ''}, {restaurant.city}
            </span>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <button
              type="button"
              data-testid="restaurant-favorite"
              onClick={toggleFavorite}
              disabled={favoritePending}
              aria-pressed={!!favoriteRow}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'rounded-full transition-colors disabled:opacity-50',
                favoriteRow
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface hover:bg-surface-container-high',
              )}
            >
              <span
                className={'material-symbols-outlined text-base'}
                aria-hidden="true"
                style={{ fontVariationSettings: favoriteRow ? "'FILL' 1" : "'FILL' 0" }}
              >
                favorite
              </span>
              {favoriteRow
                ? t('common.saved', {}, { defaultValue: 'Saved' })
                : t('common.save', {}, { defaultValue: 'Save' })}
            </button>
            <Link
              to={`/restaurants/${restaurant.id}/review`}
              data-testid="restaurant-write-review"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-sm',
              )}
            >
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                edit_note
              </span>
              {t('restaurantDetail.writeReview', {}, { defaultValue: 'Write a review' })}
            </Link>
          </div>
        </div>
      </section>

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8')}>
        <section className={cm.flex({ direction: 'col', gap: 'lg' })}>
          {gallery.length > 0 ? (
            <article
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface rounded-2xl border border-outline-variant/40',
              )}
            >
              <h2
                className={cm.cn(cm.textSize('2xl'), cm.sp('mb', 5), 'leading-tight')}
                style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
              >
                {t(
                  'restaurantDetail.gallery.heading',
                  {},
                  { defaultValue: 'Photos from the table' },
                )}
              </h2>
              <div className={cm.cn('grid grid-cols-3 gap-2')}>
                {gallery.map((url, i) => (
                  <span
                    key={i}
                    className={cm.cn(
                      'aspect-square overflow-hidden rounded-lg bg-surface-variant block',
                    )}
                  >
                    <img
                      src={url}
                      alt={t(
                        'restaurantDetail.gallery.photoAlt',
                        { name: restaurant.name, n: i + 1 },
                        { defaultValue: '{{name}} — guest photo {{n}}' },
                      )}
                      className={cm.cn(
                        cm.w('full'),
                        cm.h('full'),
                        'object-cover hover:scale-105 transition-transform duration-500',
                      )}
                    />
                  </span>
                ))}
              </div>
            </article>
          ) : null}

          {Object.keys(menuByCategory).length > 0 ? (
            <article
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface rounded-2xl border border-outline-variant/40',
              )}
            >
              <h2
                className={cm.cn(cm.textSize('2xl'), cm.sp('mb', 5), 'leading-tight')}
                style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
              >
                {t('restaurantDetail.menu.heading', {}, { defaultValue: 'Menu highlights' })}
              </h2>
              {Object.entries(menuByCategory).map(([cat, items]) => (
                <section
                  key={cat}
                  className={cm.cn(
                    cm.sp('mb', 6),
                    'border-b border-outline-variant/40 last:border-b-0 pb-5 last:pb-0',
                  )}
                >
                  <h3
                    className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 3))}
                  >
                    {cat}
                  </h3>
                  <ul className={cm.flex({ direction: 'col', gap: 'sm' })}>
                    {items.map((item) => (
                      <li
                        key={item.id}
                        className={cm.cn(
                          cm.flex({ align: 'start', justify: 'between', gap: 'md' }),
                        )}
                      >
                        <div>
                          <p className={cm.cn(cm.fontWeight('semibold'))}>{item.name}</p>
                          <p
                            className={cm.cn(
                              cm.textSize('sm'),
                              cm.sp('mt', 1),
                              'text-on-surface-variant leading-relaxed',
                            )}
                          >
                            {item.description}
                          </p>
                        </div>
                        <span className={cm.cn(cm.fontWeight('bold'), 'tabular-nums shrink-0')}>
                          {priceCentsToString(item.price_cents, item.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </article>
          ) : null}

          <article
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface rounded-2xl border border-outline-variant/40',
            )}
          >
            <header
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 5))}
            >
              <h2
                className={cm.cn(cm.textSize('2xl'), 'leading-tight')}
                style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
              >
                {t(
                  'restaurantDetail.reviews.heading',
                  { count: reviewExcerpts.length },
                  { defaultValue: '{{count}} latest reviews' },
                )}
              </h2>
              <Link
                to={`/restaurants/${restaurant.id}/review`}
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'inline-flex items-center min-h-[24px] text-primary hover:underline',
                )}
              >
                {t('restaurantDetail.reviews.write', {}, { defaultValue: 'Write yours' })}
              </Link>
            </header>
            {reviewExcerpts.length === 0 ? (
              <p className={cm.cn(cm.sp('py', 6), cm.textCenter, 'text-on-surface-variant')}>
                {t(
                  'restaurantDetail.reviews.empty',
                  {},
                  { defaultValue: 'No reviews yet — be the first.' },
                )}
              </p>
            ) : (
              <div
                data-testid="restaurant-reviews"
                className={cm.flex({ direction: 'col', gap: 'md' })}
              >
                {reviewExcerpts.map((rv) => (
                  <ReviewExcerptCard key={rv.id} review={rv} />
                ))}
              </div>
            )}
          </article>
        </section>

        <aside className={cm.flex({ direction: 'col', gap: 'md' })}>
          <article
            className={cm.cn(
              cm.sp('p', 5),
              'bg-surface rounded-2xl border border-outline-variant/40',
            )}
          >
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-[0.25em] text-primary',
              )}
            >
              {t('restaurantDetail.contact.eyebrow', {}, { defaultValue: 'Visit' })}
            </h3>
            <ul
              className={cm.cn(
                cm.sp('mt', 4),
                cm.flex({ direction: 'col', gap: 'sm' }),
                cm.textSize('sm'),
              )}
            >
              <li className={cm.flex({ align: 'start', gap: 'sm' })}>
                <span
                  className={'material-symbols-outlined text-base text-primary mt-0.5'}
                  aria-hidden="true"
                >
                  location_on
                </span>
                <span>{restaurant.address}</span>
              </li>
              {Object.entries(hours)
                .slice(0, 3)
                .map(([day, time]) => (
                  <li key={day} className={cm.flex({ align: 'start', gap: 'sm' })}>
                    <span
                      className={'material-symbols-outlined text-base text-primary mt-0.5'}
                      aria-hidden="true"
                    >
                      schedule
                    </span>
                    <span>
                      <span className={cm.fontWeight('semibold')}>{day.replace(/_/g, '–')}: </span>
                      {time}
                    </span>
                  </li>
                ))}
            </ul>
            <a
              href={directionsHref}
              target="_blank"
              rel="noreferrer"
              data-testid="restaurant-directions"
              className={cm.cn(
                cm.sp('mt', 5),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                'w-full rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-sm',
              )}
            >
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                map
              </span>
              {t('restaurantDetail.directions', {}, { defaultValue: 'Get directions' })}
            </a>
          </article>

          {totalScored > 0 ? (
            <article
              className={cm.cn(
                cm.sp('p', 5),
                'bg-surface rounded-2xl border border-outline-variant/40',
              )}
            >
              <h3
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-[0.25em] text-primary',
                )}
              >
                {t('restaurantDetail.breakdown.eyebrow', {}, { defaultValue: 'Rating breakdown' })}
              </h3>
              <ul className={cm.cn(cm.sp('mt', 4), cm.flex({ direction: 'col', gap: 'sm' }))}>
                {[5, 4, 3, 2, 1].map((stars) => {
                  const cnt = ratingBreakdown[stars] ?? 0
                  const pct = totalScored > 0 ? Math.round((cnt / totalScored) * 100) : 0
                  return (
                    <li
                      key={stars}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                      )}
                    >
                      <span className={'w-10 text-on-surface-variant'}>{stars}★</span>
                      <span
                        className={cm.cn(
                          'flex-1 h-2 rounded-full overflow-hidden bg-surface-container',
                        )}
                      >
                        <span
                          className={cm.cn(
                            'block h-full rounded-full bg-accent transition-[width]',
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className={'w-12 text-right tabular-nums text-on-surface-variant'}>
                        {cnt.toLocaleString()}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </article>
          ) : null}
        </aside>
      </div>
    </main>
  )
}
