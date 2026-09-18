import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  RestaurantListingCard,
  type RestaurantSummary,
} from '../components/RestaurantListingCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface ApiList {
  id: string
  owner_id: string
  name: string
  description: string
  cover_url: string | null
  visibility: 'public' | 'private'
  created_at: string
}

interface ApiListItem {
  id: string
  list_id: string
  restaurant_id: string
  position: number
  note: string
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

const FALLBACK_COVER = 'https://picsum.photos/seed/morsel-list-detail/1600/700'

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

export function ListDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [list, setList] = useState<ApiList | null>(null)
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load the list, its items, then hydrate each item's restaurant one-by-one
  // (same per-id pattern as Favorites, so a de-listed restaurant 404s and is
  // silently skipped rather than breaking the whole page).
  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get(`/api/lists/${id}`).catch(() => null),
      http.get(`/api/lists/${id}/items`).catch(() => null),
    ])
      .then(async ([listRes, itemsRes]) => {
        if (cancelled) return
        const l = unwrapSingle<ApiList>(listRes)
        if (!l) {
          setError(t('listDetail.notFound', {}, { defaultValue: 'List not found.' }))
          setList(null)
          return
        }
        setList(l)
        const items = unwrapList<ApiListItem>(itemsRes)
        const fetched = await Promise.all(
          items.map((item) =>
            http
              .get<ApiRestaurant | { data: ApiRestaurant }>(
                `/api/restaurants/${item.restaurant_id}`,
              )
              .then((res) => unwrapSingle<ApiRestaurant>(res))
              .catch(() => null),
          ),
        )
        if (cancelled) return
        setRestaurants(
          fetched
            .filter((r): r is ApiRestaurant => r != null && typeof r === 'object' && 'id' in r)
            .map(toSummary),
        )
      })
      .catch(() => {
        if (!cancelled)
          setError(t('listDetail.loadError', {}, { defaultValue: 'Failed to load list.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (loading) {
    return (
      <main
        className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 12), cm.mxAuto, cm.textCenter)}
      >
        <p className={'text-on-surface-variant'}>
          {t('listDetail.loading', {}, { defaultValue: 'Loading list…' })}
        </p>
      </main>
    )
  }

  if (error || !list) {
    return (
      <main
        className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 12), cm.mxAuto, cm.textCenter)}
      >
        <p className={'text-error'}>
          {error ?? t('listDetail.notFound', {}, { defaultValue: 'List not found.' })}
        </p>
        <Link
          to="/lists"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.sp('mt', 6),
            cm.fontWeight('bold'),
            'inline-block rounded-full bg-primary text-on-primary',
          )}
        >
          {t('listDetail.backToLists', {}, { defaultValue: 'Back to Lists' })}
        </Link>
      </main>
    )
  }

  return (
    <main className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <Link
        to="/lists"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          cm.sp('mb', 5),
          'text-on-surface-variant hover:text-primary transition-colors',
        )}
      >
        <span className={'material-symbols-outlined text-base'} aria-hidden="true">
          arrow_back
        </span>
        {t('listDetail.backToLists', {}, { defaultValue: 'Back to Lists' })}
      </Link>

      <section className={cm.cn(cm.sp('mb', 10), 'relative rounded-[2rem] overflow-hidden')}>
        <div className={cm.cn('relative aspect-[16/7] bg-surface-variant overflow-hidden')}>
          <img
            src={list.cover_url ?? FALLBACK_COVER}
            alt=""
            className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
          />
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
              cm.flex({ direction: 'col', gap: 'sm' }),
            )}
          >
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'self-start uppercase tracking-widest rounded-full bg-accent text-on-secondary',
              )}
            >
              {list.visibility === 'public'
                ? t('lists.pill.public', {}, { defaultValue: 'Public' })
                : t('lists.pill.personal', {}, { defaultValue: 'Personal' })}
            </span>
            <h1
              data-testid="list-detail-name"
              className={cm.cn(cm.textSize('5xl'), 'text-white leading-tight')}
              style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
            >
              {list.name}
            </h1>
            {list.description ? (
              <p className={cm.cn(cm.textSize('lg'), cm.maxW('2xl'), 'text-white/90')}>
                {list.description}
              </p>
            ) : null}
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-white/80')}>
              {t('listDetail.count', { n: restaurants.length }, { defaultValue: '{{n}} spots' })}
            </p>
          </div>
        </div>
      </section>

      {restaurants.length === 0 ? (
        <div
          data-testid="list-detail-empty"
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
            bookmark_border
          </span>
          <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'))}>
            {t('listDetail.empty.heading', {}, { defaultValue: 'No spots in this list yet' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'listDetail.empty.body',
              {},
              { defaultValue: 'Browse restaurants and add the ones worth remembering.' },
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
            {t('listDetail.empty.cta', {}, { defaultValue: 'Browse spots' })}
          </Link>
        </div>
      ) : (
        <div
          data-testid="list-detail-results"
          className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6')}
        >
          {restaurants.map((r) => (
            <RestaurantListingCard key={r.id} restaurant={r} />
          ))}
        </div>
      )}
    </main>
  )
}
