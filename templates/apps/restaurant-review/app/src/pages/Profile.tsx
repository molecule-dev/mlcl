import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router'

import { useHttpClient, useTranslation, useUser } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { type ReviewExcerpt, ReviewExcerptCard } from '../components/ReviewExcerptCard.js'
import { StarRating } from '../components/StarRating.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface AuthUser {
  id: string
  name?: string
  username?: string
  email?: string | null
}

interface ApiUser {
  id: string
  name?: string | null
  username?: string | null
  email?: string | null
  createdAt?: string
}

interface ApiReview {
  id: string
  restaurant_id: string
  owner_id: string
  rating: number
  body: string
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

function formatJoined(iso?: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return `Joined ${d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`
  } catch (_error) {
    // Date constructor threw on a malformed ISO string; return empty string as fallback
    return ''
  }
}

const COVER_FALLBACK = 'https://picsum.photos/seed/morsel-profile-cover/1600/600'
const AVATAR_FALLBACK = 'https://picsum.photos/seed/morsel-profile-avatar/240/240'

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id: routeId } = useParams<{ id: string }>()
  const http = useHttpClient()
  const me = useUser<AuthUser>()
  const targetId = routeId ?? me?.id ?? null
  const isMe = !!me?.id && targetId === me.id

  const [profileUser, setProfileUser] = useState<ApiUser | null>(null)
  const [reviews, setReviews] = useState<ApiReview[]>([])
  const [restaurantsById, setRestaurantsById] = useState<Map<string, ApiRestaurant>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!targetId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get(`/api/users/${targetId}`).catch(() => null),
      http
        .get(
          `/api/reviews?user_id=${encodeURIComponent(targetId)}&limit=50&sort_by=created_at&sort_order=desc`,
        )
        .catch(() => null),
    ])
      .then(async ([userRes, revRes]) => {
        if (cancelled) return
        const u = unwrapSingle<ApiUser>(userRes)
        if (!u) {
          // /users/:id is auth-protected to self only in this scaffold; if
          // you ask for a stranger's user row you get 404. We fall back to
          // a synthetic profile derived from the reviews so the page still
          // renders something useful when browsing /users/<other>.
          setProfileUser({
            id: targetId,
            name: t('profile.diner', { appName: APP_NAME }, { defaultValue: '{{appName}} diner' }),
          })
        } else {
          setProfileUser(u)
        }
        const list = unwrapList<ApiReview>(revRes)
        setReviews(list)
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
          setError(t('nav.failedToLoadProfile', {}, { defaultValue: 'Failed to load profile.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, targetId, t])

  const stats = useMemo(() => {
    const photoCount = reviews.reduce((s, r) => s + asArray(r.photos).length, 0)
    const helpful = reviews.reduce((s, r) => s + (r.helpful_count ?? 0), 0)
    return {
      reviews: reviews.length,
      photos: photoCount,
      helpful,
      // Without a follows table in this scaffold, we don't fake counts;
      // we expose 0 and let UI hide the cards if it wants to. The Profile
      // page in molecule shows them as a stat strip.
      followers: 0,
      following: 0,
    }
  }, [reviews])

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0
    return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
  }, [reviews])

  const cuisines = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of reviews) {
      const rest = restaurantsById.get(r.restaurant_id)
      if (!rest) continue
      counts.set(rest.cuisine, (counts.get(rest.cuisine) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [reviews, restaurantsById])

  const excerpts: ReviewExcerpt[] = useMemo(() => {
    const author = {
      id: profileUser?.id ?? '',
      name:
        profileUser?.name ||
        profileUser?.username ||
        profileUser?.email ||
        t('profile.diner', { appName: APP_NAME }, { defaultValue: '{{appName}} diner' }),
      review_count: reviews.length,
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
              name: t('profile.unknownRestaurant', {}, { defaultValue: 'Restaurant' }),
            },
      }
    })
  }, [reviews, restaurantsById, profileUser, t])

  if (loading) {
    return (
      <main
        className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 12), cm.mxAuto, cm.textCenter)}
      >
        <p className={'text-on-surface-variant'}>
          {t('nav.loadingProfile', {}, { defaultValue: 'Loading profile…' })}
        </p>
      </main>
    )
  }

  if (error || !profileUser) {
    return (
      <main
        className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 12), cm.mxAuto, cm.textCenter)}
      >
        <p className={'text-error'}>
          {error ?? t('profile.notFound', {}, { defaultValue: 'Profile not found.' })}
        </p>
      </main>
    )
  }

  const displayName =
    profileUser.name ||
    profileUser.username ||
    profileUser.email ||
    t('profile.diner', { appName: APP_NAME }, { defaultValue: '{{appName}} diner' })
  const handle = profileUser.username ? `@${profileUser.username}` : ''
  const joined = formatJoined(profileUser.createdAt)

  return (
    <main className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <section className={cm.cn(cm.sp('mb', 8), 'relative rounded-[2rem] overflow-hidden')}>
        <div className={cm.cn('relative h-48 md:h-60 bg-surface-variant overflow-hidden')}>
          <img
            src={COVER_FALLBACK}
            alt=""
            className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
          />
          <div
            className={cm.cn('absolute inset-0 bg-gradient-to-t from-black/40 to-transparent')}
            aria-hidden="true"
          />
        </div>
        <div
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface border border-outline-variant/40 border-t-0 rounded-b-[2rem] relative',
          )}
        >
          <span
            className={cm.cn(
              cm.w(28),
              cm.h(28),
              cm.roundedFull,
              'absolute -top-14 left-6 ring-4 ring-surface overflow-hidden bg-surface-variant',
            )}
          >
            <img
              src={AVATAR_FALLBACK}
              alt=""
              className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
            />
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }),
              cm.sp('pt', 16),
            )}
          >
            <div>
              <h1
                data-testid="profile-name"
                className={cm.cn(cm.textSize('4xl'), 'leading-tight')}
                style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
              >
                {displayName}
              </h1>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                {[handle, joined].filter(Boolean).join(' · ')}
              </p>
            </div>
            {!isMe ? (
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant italic')}>
                {t(
                  'profile.publicReadOnly',
                  {},
                  { defaultValue: 'Following + messaging coming soon.' },
                )}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className={cm.cn('grid grid-cols-2 md:grid-cols-3 gap-3', cm.sp('mb', 10))}>
        {[
          { key: 'reviews', label: 'Reviews' },
          { key: 'photos', label: 'Photos' },
          { key: 'helpful', label: 'Helpful' },
        ].map((s) => {
          const value = stats[s.key as keyof typeof stats]
          return (
            <div
              key={s.key}
              className={cm.cn(
                cm.sp('p', 4),
                cm.accentCard({ tone: 'primary' }),
                'bg-surface rounded-2xl border border-outline-variant/40',
              )}
            >
              <p className={cm.accentCardLabel({ tone: 'primary' })}>
                {t(`profile.stat.${s.key}`, {}, { defaultValue: s.label })}
              </p>
              <p
                data-testid={`profile-stat-${s.key}`}
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mt', 1),
                  'tabular-nums leading-none',
                )}
              >
                {value.toLocaleString()}
              </p>
            </div>
          )
        })}
      </section>

      <div className={cm.cn('grid grid-cols-1 md:grid-cols-[1fr_280px] gap-8')}>
        <section>
          <header
            className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 5))}
          >
            <h2
              className={cm.cn(cm.textSize('2xl'), 'leading-tight')}
              style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
            >
              {t('profile.reviews.heading', {}, { defaultValue: 'Recent reviews' })}
            </h2>
            <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              <StarRating value={averageRating} size="sm" reviewCount={stats.reviews} />
            </span>
          </header>
          {excerpts.length === 0 ? (
            <p
              data-testid="profile-reviews-empty"
              className={cm.cn(
                cm.sp('p', 6),
                cm.textCenter,
                'text-on-surface-variant rounded-2xl border border-dashed border-outline-variant',
              )}
            >
              {t('profile.reviews.empty', {}, { defaultValue: 'No reviews yet.' })}
            </p>
          ) : (
            <div data-testid="profile-reviews" className={cm.flex({ direction: 'col', gap: 'md' })}>
              {excerpts.map((rv) => (
                <ReviewExcerptCard key={rv.id} review={rv} />
              ))}
            </div>
          )}
        </section>

        <aside
          className={cm.cn(
            cm.sp('p', 5),
            'bg-surface rounded-2xl border border-outline-variant/40 self-start',
          )}
        >
          <h3
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.25em] text-primary',
            )}
          >
            {t('profile.cuisines.heading', {}, { defaultValue: 'Goes deepest on' })}
          </h3>
          {cuisines.length === 0 ? (
            <p className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'profile.cuisines.empty',
                {},
                { defaultValue: 'No taste pattern yet — write a few reviews.' },
              )}
            </p>
          ) : (
            <ul className={cm.cn(cm.sp('mt', 4), cm.flex({ direction: 'col', gap: 'sm' }))}>
              {cuisines.map(([cuisine, count]) => (
                <li
                  key={cuisine}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.textSize('sm'),
                  )}
                >
                  <span className={cm.fontWeight('semibold')}>{cuisine}</span>
                  <span
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}
                  >
                    {count} {t('profile.reviewsSuffix', {}, { defaultValue: 'reviews' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </main>
  )
}
