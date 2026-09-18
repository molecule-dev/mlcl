import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { unwrapSingle } from '@molecule/app-http'
import { useHttpClient, useTranslation, useUser } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type ReviewExcerpt, ReviewExcerptCard } from '../components/ReviewExcerptCard.js'
import { StarRating } from '../components/StarRating.js'
import { unwrapList } from '../lib/unwrap.js'

interface AuthUser {
  id: string
  name?: string
  email?: string | null
  username?: string
}

interface ApiReview {
  id: string
  restaurant_id: string
  owner_id: string
  rating: number
  body: string
  title?: string | null
  helpful_count?: number
  photos?: string[] | string | null
  created_at: string
}

interface ApiRestaurant {
  id: string
  name: string
  cuisine: string
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

export function MyReviews() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const user = useUser<AuthUser>()
  const [reviews, setReviews] = useState<ApiReview[]>([])
  const [restaurantsById, setRestaurantsById] = useState<Map<string, ApiRestaurant>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(
        `/api/reviews?user_id=${encodeURIComponent(user.id)}&limit=100&sort_by=created_at&sort_order=desc`,
      )
      .then(async (res) => {
        if (cancelled) return
        const list = unwrapList<ApiReview>(res)
        setReviews(list)
        // Hydrate the parent restaurant for each review so the excerpt
        // card can show "Maialino Rosso · Italian". One small extra fetch
        // is cheaper than serializing JOINed reviews from the API and
        // keeps the reviews handler unchanged.
        const ids = Array.from(new Set(list.map((r) => r.restaurant_id)))
        const map = new Map<string, ApiRestaurant>()
        await Promise.all(
          ids.map(async (id) => {
            try {
              const r = await http.get<ApiRestaurant>(`/api/restaurants/${id}`)
              const rest = unwrapSingle<ApiRestaurant>(r.data)
              if (rest && typeof rest === 'object' && 'id' in rest) {
                map.set(rest.id, rest)
              }
            } catch (_error) {
              // Ignore per-restaurant fetch errors; the review card renders without restaurant metadata
            }
          }),
        )
        if (!cancelled) setRestaurantsById(map)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('myReviews.loadError', {}, { defaultValue: 'Failed to load your reviews.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t, user?.id])

  const total = reviews.length
  const avg = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0
  const helpfulTotal = reviews.reduce((s, r) => s + (r.helpful_count ?? 0), 0)
  const photoTotal = reviews.reduce((s, r) => s + asArray(r.photos).length, 0)

  const excerpts: ReviewExcerpt[] = useMemo(() => {
    const author = {
      id: user?.id ?? 'me',
      name: user?.name || user?.username || user?.email || 'You',
      review_count: total,
    }
    return reviews.map((r) => {
      const rest = restaurantsById.get(r.restaurant_id)
      return {
        id: r.id,
        rating: r.rating,
        body: r.body,
        posted_at: r.created_at,
        helpful_count: r.helpful_count ?? 0,
        photo_urls: asArray(r.photos),
        author,
        restaurant: rest
          ? { id: rest.id, name: rest.name, cuisine: rest.cuisine }
          : {
              id: r.restaurant_id,
              name: t('myReviews.unknownRestaurant', {}, { defaultValue: 'Restaurant' }),
            },
      }
    })
  }, [reviews, restaurantsById, user, total, t])

  return (
    <main className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 10), cm.mxAuto)}>
      <header className={cm.cn(cm.sp('mb', 8))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.3em] text-primary',
          )}
        >
          {t('myReviews.eyebrow', {}, { defaultValue: 'Your shelf' })}
        </p>
        <h1
          className={cm.cn(cm.textSize('5xl'), cm.sp('mt', 2), 'leading-tight')}
          style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
        >
          {t('myReviews.heading', {}, { defaultValue: 'My reviews' })}
        </h1>
      </header>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          cm.sp('mb', 8),
          'bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-2xl relative overflow-hidden',
        )}
      >
        <div
          className={cm.cn(
            cm.w(40),
            cm.h(40),
            cm.roundedFull,
            'absolute -right-10 -top-10 bg-accent/30 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div className={cm.cn('grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10')}>
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-accent-on-surface',
              )}
            >
              {t('myReviews.stat.total', {}, { defaultValue: 'Reviews written' })}
            </p>
            <p
              data-testid="my-reviews-total"
              className={cm.cn(
                cm.textSize('5xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 2),
                'tabular-nums leading-none',
              )}
            >
              {total.toLocaleString()}
            </p>
          </div>
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-accent-on-surface',
              )}
            >
              {t('myReviews.stat.avg', {}, { defaultValue: 'Average rating you give' })}
            </p>
            <p className={cm.cn(cm.sp('mt', 2), cm.flex({ align: 'center', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  cm.textSize('5xl'),
                  cm.fontWeight('bold'),
                  'tabular-nums leading-none',
                )}
              >
                {avg.toFixed(1)}
              </span>
              <span className={cm.cn(cm.textSize('lg'), 'text-white/70')}>/ 5</span>
            </p>
            <span className={cm.sp('mt', 1)}>
              <StarRating value={avg} size="sm" showScore={false} />
            </span>
          </div>
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-accent-on-surface',
              )}
            >
              {t('myReviews.stat.helpful', {}, { defaultValue: 'People you’ve helped' })}
            </p>
            <p
              className={cm.cn(
                cm.textSize('5xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 2),
                'tabular-nums leading-none',
              )}
            >
              {helpfulTotal.toLocaleString()}
            </p>
          </div>
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-accent-on-surface',
              )}
            >
              {t('myReviews.stat.photos', {}, { defaultValue: 'Photos shared' })}
            </p>
            <p
              className={cm.cn(
                cm.textSize('5xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 2),
                'tabular-nums leading-none',
              )}
            >
              {photoTotal.toLocaleString()}
            </p>
          </div>
        </div>
      </section>

      <section className={cm.flex({ direction: 'col', gap: 'md' })}>
        {loading ? (
          <p className={cm.cn(cm.sp('p', 6), cm.textCenter, 'text-on-surface-variant')}>
            {t('myReviews.loading', {}, { defaultValue: 'Loading your reviews…' })}
          </p>
        ) : error ? (
          <p className={cm.cn(cm.sp('p', 6), cm.textCenter, 'text-error')}>{error}</p>
        ) : excerpts.length === 0 ? (
          <div
            data-testid="my-reviews-empty"
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
              edit_note
            </span>
            <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'))}>
              {t('myReviews.empty.heading', {}, { defaultValue: 'No reviews yet' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'myReviews.empty.body',
                {},
                {
                  defaultValue: 'Find a place worth talking about — your tasting notes start here.',
                },
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
              {t('myReviews.empty.cta', {}, { defaultValue: 'Browse spots' })}
            </Link>
          </div>
        ) : (
          <div data-testid="my-reviews-list" className={cm.flex({ direction: 'col', gap: 'sm' })}>
            {excerpts.map((rv) => (
              <div key={rv.id} className={cm.flex({ direction: 'col', gap: 'sm' })}>
                <ReviewExcerptCard review={rv} />
                <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }), 'pr-2')}>
                  <Link
                    to={`/reviews/${rv.id}/edit`}
                    data-testid={`my-reviews-edit-${rv.id}`}
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'text-primary hover:underline uppercase tracking-widest',
                    )}
                  >
                    {t('common.edit', {}, { defaultValue: 'Edit' })}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
