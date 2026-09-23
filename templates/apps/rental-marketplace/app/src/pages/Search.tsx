import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { RoostListingCard } from '../components/RoostListingCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface Listing {
  id: string
  title: string
  city: string
  country: string
  rating: number
  review_count: number
  price_per_night_cents: number
  thumbnail_url?: string | null
  amenities?: string[]
  badges?: string[]
}

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: low → high' },
  { value: 'price_desc', label: 'Price: high → low' },
  { value: 'rating', label: 'Top rated' },
] as const

const PRICE_FILTERS = [
  { value: 'all', min: 0, max: Infinity, label: 'Any price' },
  { value: 'low', min: 0, max: 20000, label: 'Under $200' },
  { value: 'mid', min: 20000, max: 35000, label: '$200 – $350' },
  { value: 'high', min: 35000, max: Infinity, label: '$350+' },
] as const

const AMENITY_FILTERS = [
  'Pool',
  'Hot tub',
  'Wood stove',
  'Pet friendly',
  'Wi-Fi',
  'Self check-in',
  'Free parking',
] as const

function fmtPrice(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`
}

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const http = useHttpClient()
  const navigate = useNavigate()
  const q = params.get('q') ?? ''
  const guests = params.get('guests') ?? '2'
  const checkIn = params.get('check_in') ?? ''
  const checkOut = params.get('check_out') ?? ''

  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]['value']>('recommended')
  const [priceFilter, setPriceFilter] = useState<(typeof PRICE_FILTERS)[number]['value']>('all')
  const [amenityFilters, setAmenityFilters] = useState<Set<string>>(new Set())
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/listings').catch(() => null),
      http.get('/api/bookmarks').catch(() => null),
    ])
      .then(([listingsRes, bookmarksRes]) => {
        if (cancelled) return
        if (!listingsRes) {
          setError(t('search.loadError', {}, { defaultValue: 'Failed to load listings.' }))
          return
        }
        setListings(unwrapList<Listing>(listingsRes.data))
        if (bookmarksRes) {
          const bookmarkRows = unwrapList<{ listing_id: string }>(bookmarksRes.data)
          setBookmarks(new Set(bookmarkRows.map((b) => b.listing_id)))
        }
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const visible = useMemo(() => {
    const queryNeedle = q.toLowerCase()
    const priceConfig = PRICE_FILTERS.find((p) => p.value === priceFilter) ?? PRICE_FILTERS[0]
    let list = listings.filter((p) => {
      if (queryNeedle && !`${p.title} ${p.city} ${p.country}`.toLowerCase().includes(queryNeedle))
        return false
      if (p.price_per_night_cents < priceConfig.min || p.price_per_night_cents >= priceConfig.max)
        return false
      if (amenityFilters.size > 0) {
        const have = new Set(p.amenities ?? [])
        for (const a of amenityFilters) if (!have.has(a)) return false
      }
      return true
    })
    if (sort === 'price_asc')
      list = list.slice().sort((a, b) => a.price_per_night_cents - b.price_per_night_cents)
    else if (sort === 'price_desc')
      list = list.slice().sort((a, b) => b.price_per_night_cents - a.price_per_night_cents)
    else if (sort === 'rating') list = list.slice().sort((a, b) => b.rating - a.rating)
    return list
  }, [listings, q, priceFilter, amenityFilters, sort])

  const toggleBookmark = async (id: string) => {
    const had = bookmarks.has(id)
    setBookmarks((prev) => {
      const next = new Set(prev)
      if (had) next.delete(id)
      else next.add(id)
      return next
    })
    try {
      if (had) {
        await http.delete(`/api/bookmarks/${id}`)
        track({ name: 'bookmark.removed', properties: { listing_id: id } })
      } else {
        await http.post('/api/bookmarks', { listing_id: id })
        track({ name: 'bookmark.added', properties: { listing_id: id } })
      }
    } catch (_error) {
      // Optimistic update failed — roll back the bookmark toggle.
      setBookmarks((prev) => {
        const next = new Set(prev)
        if (had) next.add(id)
        else next.delete(id)
        return next
      })
    }
  }

  const toggleAmenity = (a: string) => {
    setAmenityFilters((prev) => {
      const next = new Set(prev)
      if (next.has(a)) next.delete(a)
      else next.add(a)
      return next
    })
  }

  return (
    <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header
        className={cm.cn(
          cm.sp('mb', 6),
          cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }),
        )}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.25em] text-primary-dark',
            )}
          >
            {t('search.eyebrow', {}, { defaultValue: 'Stays' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('extrabold'),
              cm.sp('mt', 2),
              'leading-tight tracking-tight',
            )}
            style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
          >
            {q
              ? t('search.headingForQuery', { q }, { defaultValue: 'Stays for "{{q}}"' })
              : t('search.heading', {}, { defaultValue: 'A place that feels like home' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {loading
              ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
              : t(
                  'search.subheading',
                  { count: visible.length, guests },
                  { defaultValue: '{{count}} listings · {{guests}} guests' },
                )}
            {checkIn && checkOut ? (
              <>
                {' '}
                ·{' '}
                {t(
                  'search.dates',
                  { from: checkIn, to: checkOut },
                  { defaultValue: '{{from}} → {{to}}' },
                )}
              </>
            ) : null}
          </p>
        </div>
        <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('sm'))}>
          <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface-variant')}>
            {t('search.sortLabel', {}, { defaultValue: 'Sort by' })}
          </span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'bg-surface border border-outline-variant rounded-lg font-semibold',
            )}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {t(`search.sort.${o.value}`, {}, { defaultValue: o.label })}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className={cm.cn(cm.sp('mb', 6), cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
        {PRICE_FILTERS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPriceFilter(p.value)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest rounded-full transition-colors',
              priceFilter === p.value
                ? 'bg-primary text-on-primary'
                : 'bg-surface border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary',
            )}
          >
            {t(`search.priceFilter.${p.value}`, {}, { defaultValue: p.label })}
          </button>
        ))}
        <span aria-hidden="true" className={'h-6 w-px bg-outline-variant mx-2'} />
        {AMENITY_FILTERS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => toggleAmenity(a)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'rounded-full transition-colors',
              amenityFilters.has(a)
                ? 'bg-accent/20 text-primary-dark border border-accent'
                : 'bg-surface border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary',
            )}
          >
            {a}
          </button>
        ))}
      </div>

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-8')}>
        <div className={'lg:col-span-7 xl:col-span-8'}>
          {error ? (
            <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
          ) : loading ? (
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-5')}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={cm.cn('aspect-[4/3] rounded-2xl bg-surface-container animate-pulse')}
                />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div
              className={cm.cn(
                cm.sp('py', 20),
                cm.textCenter,
                cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
              )}
            >
              <span
                className="material-symbols-outlined text-6xl text-on-surface-variant"
                aria-hidden="true"
              >
                travel_explore
              </span>
              <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('search.empty', {}, { defaultValue: 'No listings match your search.' })}
              </p>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-sm')}>
                {t(
                  'search.emptyHint',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      'Try widening your filters or removing the price ceiling — {{appName}} has stays in 26 countries.',
                  },
                )}
              </p>
            </div>
          ) : (
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-5')}>
              {visible.map((p) => (
                <div
                  key={p.id}
                  onMouseEnter={() => setActiveId(p.id)}
                  onMouseLeave={() => setActiveId(null)}
                >
                  <RoostListingCard
                    listing={p}
                    bookmarked={bookmarks.has(p.id)}
                    onToggleBookmark={toggleBookmark}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className={'lg:col-span-5 xl:col-span-4'}>
          <div
            className={cm.cn(
              'relative aspect-square lg:aspect-auto lg:h-[640px] rounded-2xl overflow-hidden sticky top-24 bg-gradient-to-br from-primary/15 to-accent/15',
            )}
          >
            <div
              className="absolute inset-0 opacity-40"
              aria-hidden="true"
              style={{
                backgroundImage:
                  'linear-gradient(color-mix(in srgb, var(--color-primary) 18%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 18%, transparent) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />
            {visible.slice(0, 8).map((p, i) => {
              const top = 12 + ((i * 73) % 76)
              const left = 8 + ((i * 47) % 80)
              const isActive = activeId === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigate(`/listings/${p.id}`)}
                  onMouseEnter={() => setActiveId(p.id)}
                  onMouseLeave={() => setActiveId(null)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    'py-1.5',
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    'absolute rounded-full shadow-md transition-all',
                    isActive
                      ? 'bg-accent text-on-primary scale-125 z-20'
                      : 'bg-surface text-primary-dark hover:scale-110',
                  )}
                  style={{ top: `${top}%`, left: `${left}%` }}
                  aria-label={t(
                    'search.mapPinAria',
                    { name: p.title, price: fmtPrice(p.price_per_night_cents) },
                    { defaultValue: '{{name}} — {{price}} per night' },
                  )}
                >
                  {fmtPrice(p.price_per_night_cents)}
                </button>
              )
            })}
            <div
              className={cm.cn(
                'absolute bottom-4 left-4 right-4',
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('p', 3),
                'bg-surface/95 backdrop-blur-md rounded-xl shadow-lg',
              )}
            >
              <span className="material-symbols-outlined text-primary-dark" aria-hidden="true">
                map
              </span>
              <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                {t(
                  'search.mapHint',
                  {},
                  {
                    defaultValue:
                      'Hover a card to highlight on the map. Live Mapbox tiles in production.',
                  },
                )}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
