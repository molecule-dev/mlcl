import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AlcoveHeroSearchCard } from '../components/AlcoveHeroSearchCard.js'
import { type RateKind, VenueListingCard } from '../components/VenueListingCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface Venue {
  id: string
  name: string
  subtitle?: string
  city: string
  neighborhood?: string
  country?: string
  venue_type?: string
  capacity?: number
  rating?: number
  review_count?: number
  hourly_rate_cents?: number | null
  daily_rate_cents?: number | null
  thumbnail_url?: string | null
  amenities?: string[]
  badges?: string[]
  instant_book?: boolean
  superhost?: boolean
  latitude?: number
  longitude?: number
}

const TYPE_FILTERS = [
  { value: 'all', label: 'All spaces' },
  { value: 'studio', label: 'Studios' },
  { value: 'loft', label: 'Lofts' },
  { value: 'rooftop', label: 'Rooftops' },
  { value: 'garden', label: 'Gardens' },
  { value: 'banquet', label: 'Banquet halls' },
] as const

const PRICE_FILTERS = [
  { value: 'all', min: 0, max: Infinity, label: 'Any price' },
  { value: 'low', min: 0, max: 15000, label: 'Under $150/hr' },
  { value: 'mid', min: 15000, max: 25000, label: '$150 – $250/hr' },
  { value: 'high', min: 25000, max: Infinity, label: '$250+ /hr' },
] as const

const FEATURES = ['Instant book', 'Superhost', 'Pet friendly', 'Parking', 'Wi-Fi', 'AV'] as const

function fmtPrice(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`
}

function rateOf(v: Venue): { kind: RateKind; cents: number } | null {
  if (typeof v.hourly_rate_cents === 'number' && v.hourly_rate_cents > 0)
    return { kind: 'hour', cents: v.hourly_rate_cents }
  if (typeof v.daily_rate_cents === 'number' && v.daily_rate_cents > 0)
    return { kind: 'day', cents: v.daily_rate_cents }
  return null
}

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const initialType = params.get('type') ?? 'all'

  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const [typeFilter, setTypeFilter] = useState<string>(initialType)
  const [priceFilter, setPriceFilter] = useState<(typeof PRICE_FILTERS)[number]['value']>('all')
  const [featureFilters, setFeatureFilters] = useState<Set<string>>(new Set())
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/venues')
      .then((res) => {
        if (cancelled) return
        setVenues(unwrapList<Venue>(res.data))
      })
      .catch(() => {
        if (cancelled) return
        setError(t('search.loadError', {}, { defaultValue: 'Failed to load venues.' }))
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
    return venues.filter((v) => {
      if (
        queryNeedle &&
        !`${v.name} ${v.city} ${v.neighborhood ?? ''} ${v.country ?? ''}`
          .toLowerCase()
          .includes(queryNeedle)
      )
        return false
      if (typeFilter !== 'all' && v.venue_type !== typeFilter) return false
      const rate = rateOf(v)
      if (
        rate &&
        rate.kind === 'hour' &&
        (rate.cents < priceConfig.min || rate.cents >= priceConfig.max)
      )
        return false
      if (featureFilters.has('Instant book') && !v.instant_book) return false
      if (featureFilters.has('Superhost') && !v.superhost) return false
      const have = new Set(v.amenities ?? [])
      for (const f of featureFilters) {
        if (f === 'Instant book' || f === 'Superhost') continue
        if (!have.has(f)) return false
      }
      return true
    })
  }, [venues, q, typeFilter, priceFilter, featureFilters])

  const toggleBookmark = (id: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleFeature = (f: string) => {
    setFeatureFilters((prev) => {
      const next = new Set(prev)
      if (next.has(f)) next.delete(f)
      else next.add(f)
      return next
    })
  }

  return (
    <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      {/* Compact hero, per DESIGN.md "collapses from 520 to 200 on results" */}
      <section className={cm.sp('mb', 8)}>
        <AlcoveHeroSearchCard compact />
      </section>

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
              'uppercase tracking-[0.25em] text-primary',
            )}
          >
            {t('search.eyebrow', {}, { defaultValue: 'Spaces' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('extrabold'),
              cm.sp('mt', 2),
              'leading-tight',
            )}
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif', letterSpacing: '-0.02em' }}
          >
            {q
              ? t('search.headingForQuery', { q }, { defaultValue: 'Spaces for "{{q}}"' })
              : t('search.heading', {}, { defaultValue: 'Curated spaces' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {loading
              ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
              : t(
                  'search.summary',
                  { count: visible.length },
                  { defaultValue: '{{count}} spaces match your filters' },
                )}
          </p>
        </div>
      </header>

      {/* Type chips */}
      <div className={cm.cn(cm.sp('mb', 4), cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
        {TYPE_FILTERS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setTypeFilter(p.value)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest rounded-full transition-colors',
              typeFilter === p.value
                ? 'bg-primary text-on-primary'
                : 'bg-surface border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary',
            )}
          >
            {t(`search.type.${p.value}`, {}, { defaultValue: p.label })}
          </button>
        ))}
      </div>

      {/* Price + feature chips */}
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
            {t(`search.price.${p.value}`, {}, { defaultValue: p.label })}
          </button>
        ))}
        <span aria-hidden="true" className={'h-6 w-px bg-outline-variant mx-2'} />
        {FEATURES.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => toggleFeature(f)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'rounded-full transition-colors',
              featureFilters.has(f)
                ? 'bg-accent/20 text-primary border border-accent'
                : 'bg-surface border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary',
            )}
          >
            {f}
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
                {t('search.empty', {}, { defaultValue: 'No spaces match your filters.' })}
              </p>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-sm')}>
                {t(
                  'search.emptyHint',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      'Try widening the price ceiling or removing a feature filter — {{appName}} has spaces in 28 cities.',
                  },
                )}
              </p>
            </div>
          ) : (
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-5')}>
              {visible.map((v) => (
                <div
                  key={v.id}
                  onMouseEnter={() => setActiveId(v.id)}
                  onMouseLeave={() => setActiveId(null)}
                >
                  <VenueListingCard
                    venue={v}
                    bookmarked={bookmarks.has(v.id)}
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
                  'linear-gradient(rgba(43,122,111,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(43,122,111,0.18) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />
            {visible.slice(0, 8).map((v, i) => {
              const top = 12 + ((i * 73) % 76)
              const left = 8 + ((i * 47) % 80)
              const isActive = activeId === v.id
              const rate = rateOf(v)
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => navigate(`/venue/${v.id}`)}
                  onMouseEnter={() => setActiveId(v.id)}
                  onMouseLeave={() => setActiveId(null)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    'absolute rounded-full shadow-md transition-all tabular-nums',
                    isActive
                      ? 'bg-accent text-on-primary scale-125 z-20'
                      : 'bg-surface text-primary hover:scale-110',
                  )}
                  style={{ top: `${top}%`, left: `${left}%` }}
                  aria-label={t(
                    'search.mapPinAria',
                    { name: v.name },
                    { defaultValue: '{{name}}' },
                  )}
                >
                  {rate ? fmtPrice(rate.cents) : v.name}
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
              <span className="material-symbols-outlined text-primary" aria-hidden="true">
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
