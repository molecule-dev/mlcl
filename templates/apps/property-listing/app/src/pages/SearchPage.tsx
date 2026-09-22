import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import SearchFilterBar from '../components/SearchFilterBar.js'
import SearchPageBottomNavBar from '../components/SearchPageBottomNavBar.js'
import SearchPageFooter from '../components/SearchPageFooter.js'
import SearchPageTopAppBar from '../components/SearchPageTopAppBar.js'

interface Property {
  id: string
  title?: string
  address: string
  city: string
  state: string
  zip_code: string
  price: number | string
  bedrooms: number
  bathrooms: number | string
  square_feet: number | string
  property_type: string
  photos: string[] | string
  latitude?: number | string
  longitude?: number | string
  status?: string
  listed_by_name?: string
  agent_id?: string | null
}

interface Agent {
  id: string
  name: string
}

interface Filters {
  q: string
  type: string
  min_price: string
  max_price: string
  bedrooms: string
  bathrooms: string
  sort_by: string
}

function asNumber(v: number | string | undefined | null): number {
  if (v == null) return 0
  return typeof v === 'number' ? v : Number(v)
}

function asArray(v: string[] | string | undefined | null): string[] {
  if (!v) return []
  if (Array.isArray(v)) return v
  try {
    const parsed = JSON.parse(v as string)
    return Array.isArray(parsed) ? parsed : []
  } catch (_error) {
    // JSON.parse failed — value is not a valid array string, fall back to empty
    return []
  }
}

function fmtPrice(price: number | string | undefined | null): string {
  const n = asNumber(price)
  if (!n) return ''
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function unwrapList(res: unknown): unknown[] {
  if (Array.isArray(res)) return res
  if (res && typeof res === 'object') {
    // http.get wraps payload in { data, status, ... }; API also wraps in { data: [...] }
    const inner = (res as { data?: unknown }).data
    if (Array.isArray(inner)) return inner
    if (inner && typeof inner === 'object' && Array.isArray((inner as { data?: unknown }).data)) {
      return (inner as { data: unknown[] }).data
    }
  }
  return []
}

function SearchPage() {
  const cm = getClassMap()
  const navigate = useNavigate()
  const http = useHttpClient()
  const { t } = useTranslation()
  const { user } = useAuth<{ id?: string }>()

  const [properties, setProperties] = useState<Property[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortOpen, setSortOpen] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [mapHint, setMapHint] = useState<string | null>(null)
  const [listingType, setListingType] = useState<'buy' | 'rent'>('buy')
  const [filters, setFilters] = useState<Filters>({
    q: '',
    type: '',
    min_price: '',
    max_price: '',
    bedrooms: '',
    bathrooms: '',
    sort_by: 'newest',
  })

  // Build query params from filters.
  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (filters.q.trim()) params.set('q', filters.q.trim())
    if (filters.type) params.set('type', filters.type)
    if (filters.min_price) params.set('min_price', filters.min_price)
    if (filters.max_price) params.set('max_price', filters.max_price)
    if (filters.bedrooms) params.set('bedrooms', filters.bedrooms)
    if (filters.bathrooms) params.set('bathrooms', filters.bathrooms)
    const sortMap: Record<string, { sort_by: string; sort_order: 'asc' | 'desc' }> = {
      newest: { sort_by: 'created_at', sort_order: 'desc' },
      price_asc: { sort_by: 'price', sort_order: 'asc' },
      price_desc: { sort_by: 'price', sort_order: 'desc' },
    }
    const sort = sortMap[filters.sort_by] ?? sortMap.newest
    params.set('sort_by', sort.sort_by)
    params.set('sort_order', sort.sort_order)
    params.set('limit', '40')
    return params.toString()
  }, [filters])

  // Fetch properties whenever filters change.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/properties?${queryString}`)
      .then((res) => {
        if (cancelled) return
        const list = unwrapList(res) as Property[]
        setProperties(list)
      })
      .catch(() => {
        if (cancelled) return
        setError(
          t(
            'search.fetchError',
            {},
            { defaultValue: 'Unable to load properties. Please try again.' },
          ),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, queryString, t])

  // Fetch agents to resolve display names on cards.
  useEffect(() => {
    let cancelled = false
    http
      .get('/api/agents?limit=50')
      .then((res) => {
        if (cancelled) return
        setAgents(unwrapList(res) as Agent[])
      })
      .catch(() => {
        if (cancelled) return
        setAgents([])
      })
    return () => {
      cancelled = true
    }
  }, [http])

  // Fetch the user's favorites so card hearts show the correct state.
  useEffect(() => {
    if (!user?.id) {
      setFavoriteIds(new Set())
      return
    }
    let cancelled = false
    http
      .get('/api/bookmarks?resourceType=property')
      .then((res) => {
        if (cancelled) return
        const items = unwrapList(res) as { resourceId?: string }[]
        setFavoriteIds(new Set(items.map((b) => b.resourceId).filter(Boolean) as string[]))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http, user?.id])

  const agentNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const a of agents) m.set(a.id, a.name)
    return m
  }, [agents])

  // Sort dropdown click-outside handling.
  useEffect(() => {
    if (!sortOpen) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-mol-id="sort-dropdown"]')) {
        setSortOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [sortOpen])

  const toggleFavorite = async (propertyId: string) => {
    if (!user?.id) {
      navigate('/login')
      return
    }
    const isFav = favoriteIds.has(propertyId)
    // Optimistic update.
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      if (isFav) next.delete(propertyId)
      else next.add(propertyId)
      return next
    })
    try {
      if (isFav) {
        await http.delete(`/api/bookmarks/property/${propertyId}`)
        void track({ name: 'property.unfavorited', properties: { property_id: propertyId } })
      } else {
        await http.post('/api/bookmarks', { resourceType: 'property', resourceId: propertyId })
        void track({ name: 'property.favorited', properties: { property_id: propertyId } })
      }
    } catch (_error) {
      // Revert optimistic update on failure; error is surfaced implicitly by the UI state
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        if (isFav) next.add(propertyId)
        else next.delete(propertyId)
        return next
      })
    }
  }

  const sortLabel = (() => {
    if (filters.sort_by === 'price_asc')
      return t('search.sort.priceAsc', {}, { defaultValue: 'Price: Low to High' })
    if (filters.sort_by === 'price_desc')
      return t('search.sort.priceDesc', {}, { defaultValue: 'Price: High to Low' })
    return t('search.sort.newest', {}, { defaultValue: 'Newest' })
  })()

  return (
    <div className={cm.cn('bg-background text-on-background font-body')} data-mol-id="page-search">
      <SearchPageTopAppBar
        searchQuery={filters.q}
        onSearchChange={(v) => setFilters((f) => ({ ...f, q: v }))}
      />
      <SearchFilterBar
        filters={filters}
        onFilterChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        listingType={listingType}
        onListingTypeChange={setListingType}
      />
      <main className={cm.cn(cm.flex(), 'pt-32 h-screen overflow-hidden')}>
        {/* Map column */}
        <section
          className={cm.cn(cm.w('1/2'), 'hidden lg:block relative bg-surface-container')}
          data-mol-id="map-container"
        >
          <img
            style={{ transform: `scale(${zoomLevel})` }}
            className={cm.cn(
              cm.w('full'),
              cm.h('full'),
              'object-cover grayscale-[0.2] transition-transform duration-200',
            )}
            data-alt="map view"
            data-location="Seattle, Washington"
            src="https://picsum.photos/seed/property-search-map/1200/800"
            alt={t('map.imageAlt', {}, { defaultValue: 'Map view' })}
          />
          <div className={cm.cn(cm.sp('p', 6), 'absolute inset-0 pointer-events-none')}>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'pointer-events-auto')}>
              <div
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.roundedFull,
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.textPrimary,
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'py-1.5 glass-card shadow-sm w-fit',
                )}
                data-mol-id="map-available-count"
              >
                <span
                  className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'bg-primary animate-pulse')}
                />
                {t(
                  'map.availableCount',
                  { count: properties.length },
                  { defaultValue: '{{count}} Available' },
                )}
              </div>
            </div>
            {/* Property markers — one per property with lat/lng */}
            {properties
              .filter((p) => Number(p.latitude) && Number(p.longitude))
              .slice(0, 12)
              .map((p, idx) => {
                // Spread markers across the visible map area for a sense of density.
                const top = `${15 + ((idx * 7) % 65)}%`
                const left = `${10 + ((idx * 11) % 75)}%`
                return (
                  <button
                    type="button"
                    key={`marker-${p.id}`}
                    onClick={() => navigate(`/property/${p.id}`)}
                    aria-label={p.title || `${p.address}, ${p.city}, ${p.state}`}
                    className={cm.cn(cm.cursorPointer, 'absolute pointer-events-auto group')}
                    style={{ top, left, transform: 'translate(-50%, -50%)' }}
                    data-mol-id={`map-marker-${p.id}`}
                  >
                    <div
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        'bg-primary text-on-primary text-[10px] rounded-lg shadow-lg group-hover:scale-110 transition-transform',
                      )}
                    >
                      {fmtPrice(p.price)
                        .replace(/,000$/, 'k')
                        .replace(/,000(\.|$)/, 'k')}
                    </div>
                  </button>
                )
              })}
          </div>
          <div
            className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'absolute bottom-8 right-6')}
          >
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 3))}
              className={cm.cn(
                cm.w(10),
                cm.h(10),
                cm.flex({ align: 'center', justify: 'center' }),
                'bg-surface rounded-xl shadow-md hover:bg-surface-container transition-colors',
              )}
              data-mol-id="map-zoom-in"
              aria-label={t('map.zoomIn', {}, { defaultValue: 'Zoom in' })}
            >
              <span className={cm.cn('material-symbols-outlined')}>add</span>
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.5))}
              className={cm.cn(
                cm.w(10),
                cm.h(10),
                cm.flex({ align: 'center', justify: 'center' }),
                'bg-surface rounded-xl shadow-md hover:bg-surface-container transition-colors',
              )}
              data-mol-id="map-zoom-out"
              aria-label={t('map.zoomOut', {}, { defaultValue: 'Zoom out' })}
            >
              <span className={cm.cn('material-symbols-outlined')}>remove</span>
            </button>
            <button
              type="button"
              onClick={() =>
                setMapHint(
                  t(
                    'map.locationHintUnavailable',
                    {},
                    { defaultValue: 'Live geolocation is not connected yet.' },
                  ),
                )
              }
              className={cm.cn(
                cm.w(10),
                cm.h(10),
                cm.flex({ align: 'center', justify: 'center' }),
                'bg-surface rounded-xl shadow-md hover:bg-surface-container transition-colors',
              )}
              data-mol-id="map-locate"
              aria-label={t('map.locateButton', {}, { defaultValue: 'Locate me' })}
            >
              <span className={cm.cn('material-symbols-outlined')}>my_location</span>
            </button>
          </div>
          {mapHint && (
            <div
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                'absolute bottom-8 left-6 bg-surface/95 text-on-surface rounded-lg shadow-md pointer-events-auto',
              )}
              data-mol-id="map-hint"
            >
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                <span
                  className={cm.cn(cm.textSize('base'), 'material-symbols-outlined text-primary')}
                  aria-hidden="true"
                >
                  info
                </span>
                <span>{mapHint}</span>
                <button
                  type="button"
                  className={cm.cn(
                    cm.sp('ml', 2),
                    cm.textSize('xs'),
                    'text-outline hover:text-on-surface',
                  )}
                  onClick={() => setMapHint(null)}
                >
                  {t('common.dismiss', {}, { defaultValue: 'Dismiss' })}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Results column */}
        <section
          className={cm.cn(
            cm.w('full'),
            cm.sp('px', 6),
            'lg:w-1/2 overflow-y-auto bg-background pb-24 lg:pb-12',
          )}
          data-mol-id="results-container"
        >
          <div
            className={cm.cn(
              cm.sp('py', 4),
              cm.flex({ align: 'end', justify: 'between' }),
              cm.sp('mb', 6),
              'sticky top-0 bg-background/90 backdrop-blur-md z-10 border-b border-outline-variant/10',
            )}
          >
            <div>
              <h1
                className={cm.cn(
                  cm.textSize('3xl'),
                  'font-headline font-extrabold tracking-tight text-on-surface',
                )}
              >
                {t('search.resultsTitle', {}, { defaultValue: 'Browse Properties' })}
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('mt', 1),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant',
                )}
                data-mol-id="search-results-count"
              >
                {t(
                  'search.resultsCount',
                  { count: properties.length },
                  { defaultValue: '{{count}} properties found' },
                )}
              </p>
            </div>
            <div
              className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'relative')}
              data-mol-id="sort-dropdown"
            >
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant',
                )}
              >
                {t('search.sortByLabel', {}, { defaultValue: 'Sort by:' })}
              </span>
              <button
                type="button"
                onClick={() => setSortOpen((o) => !o)}
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.textPrimary,
                  cm.flex({ align: 'center', gap: 'xs' }),
                )}
                data-mol-id="sort-toggle"
              >
                {sortLabel}
                <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                  keyboard_arrow_down
                </span>
              </button>
              {sortOpen && (
                <div
                  className={cm.cn(
                    cm.sp('mt', 2),
                    cm.w(48),
                    cm.sp('py', 1),
                    'absolute top-full right-0 bg-surface rounded-lg shadow-lg z-20 border border-outline-variant',
                  )}
                  role="menu"
                >
                  {(['newest', 'price_asc', 'price_desc'] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setFilters((f) => ({ ...f, sort_by: key }))
                        setSortOpen(false)
                      }}
                      className={cm.cn(
                        'w-full text-left px-4 py-2 text-sm hover:bg-surface-container',
                        filters.sort_by === key ? 'text-primary font-bold' : 'text-on-surface',
                      )}
                      data-mol-id={`sort-option-${key}`}
                    >
                      {key === 'newest'
                        ? t('search.sort.newest', {}, { defaultValue: 'Newest' })
                        : key === 'price_asc'
                          ? t('search.sort.priceAsc', {}, { defaultValue: 'Price: Low to High' })
                          : t('search.sort.priceDesc', {}, { defaultValue: 'Price: High to Low' })}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div
              className={cm.cn(cm.flex({ justify: 'center', align: 'center' }), cm.sp('py', 16))}
              data-mol-id="search-loading"
            >
              <div
                className={cm.cn(
                  cm.roundedFull,
                  cm.w(10),
                  cm.h(10),
                  'animate-spin border-b-2 border-primary',
                )}
              />
            </div>
          ) : error ? (
            <div
              className={cm.cn(
                cm.sp('p', 8),
                'bg-error-container text-on-error-container rounded-2xl text-center',
              )}
              data-mol-id="search-error"
            >
              {error}
            </div>
          ) : properties.length === 0 ? (
            <div
              className={cm.cn(cm.sp('p', 12), 'bg-surface-container-low rounded-2xl text-center')}
              data-mol-id="search-empty"
            >
              <span className={cm.cn('material-symbols-outlined text-5xl text-outline')}>
                search_off
              </span>
              <p className={cm.cn(cm.sp('mt', 4), cm.fontWeight('semibold'), cm.textSize('lg'))}>
                {t('search.empty.title', {}, { defaultValue: 'No properties match your filters' })}
              </p>
              <p className={cm.cn(cm.sp('mt', 2), 'text-outline-variant')}>
                {t(
                  'search.empty.body',
                  {},
                  { defaultValue: 'Try clearing a filter or widening your price range.' },
                )}
              </p>
            </div>
          ) : (
            <div
              className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2')}
              data-mol-id="property-grid"
            >
              {properties.map((p, idx) => {
                const photos = asArray(p.photos)
                const photoUrl = photos[0] ?? `https://picsum.photos/seed/property-${p.id}/800/600`
                const agentName = p.agent_id ? agentNameById.get(p.agent_id) : undefined
                const isFav = favoriteIds.has(p.id)
                return (
                  <article
                    key={p.id}
                    className={cm.cn('group relative')}
                    data-mol-id={`property-card-${p.id}`}
                    data-mol-card-index={idx}
                  >
                    <button
                      type="button"
                      aria-label={p.title || `${p.address}, ${p.city}, ${p.state}`}
                      className={cm.cn('absolute inset-0 z-[1]', cm.cursorPointer)}
                      onClick={() => navigate(`/property/${p.id}`)}
                    />
                    <div
                      className={cm.cn(
                        cm.sp('mb', 4),
                        'relative overflow-hidden aspect-[16/10] bg-surface-container rounded-xl',
                      )}
                    >
                      <img
                        alt={t('property.imageAlt', {}, { defaultValue: 'Property image' })}
                        className={cm.cn(
                          cm.w('full'),
                          cm.h('full'),
                          'object-cover transition-transform duration-500 group-hover:scale-105',
                        )}
                        src={photoUrl}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite(p.id)
                        }}
                        className={cm.cn(
                          'absolute top-4 right-4 z-[2] w-9 h-9 glass-card rounded-full flex items-center justify-center transition-colors shadow-sm',
                          isFav ? 'text-error' : 'text-primary-container hover:text-error',
                        )}
                        data-mol-id={`fav-${p.id}`}
                        aria-label={
                          isFav
                            ? t('property.unfavorite', {}, { defaultValue: 'Remove favorite' })
                            : t('property.favorite', {}, { defaultValue: 'Save to favorites' })
                        }
                        aria-pressed={isFav}
                      >
                        <span className={cm.cn('material-symbols-outlined')}>
                          {isFav ? 'favorite' : 'favorite_border'}
                        </span>
                      </button>
                      <div
                        className={cm.cn(
                          cm.sp('px', 3),
                          'absolute bottom-4 left-4 py-1.5 glass-card rounded-lg shadow-sm',
                        )}
                      >
                        <span
                          className={cm.cn(
                            cm.textPrimary,
                            cm.textSize('lg'),
                            'font-headline font-extrabold',
                          )}
                          data-mol-id={`price-${p.id}`}
                        >
                          {fmtPrice(p.price)}
                        </span>
                      </div>
                    </div>
                    <div className={cm.sp('px', 1)}>
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'start', justify: 'between' }),
                          cm.sp('mb', 2),
                        )}
                      >
                        <div>
                          <h3
                            className={cm.cn(
                              cm.fontWeight('bold'),
                              'text-on-surface leading-tight',
                            )}
                            data-mol-id={`address-${p.id}`}
                          >
                            {p.title || `${p.address}, ${p.city}, ${p.state}`}
                          </h3>
                          <p
                            className={cm.cn(
                              cm.textSize('xs'),
                              cm.sp('mt', 1),
                              'text-outline-variant',
                            )}
                          >
                            {p.address}, {p.city}, {p.state} {p.zip_code}
                          </p>
                        </div>
                        <span
                          className={cm.cn(
                            cm.sp('px', 2),
                            cm.fontWeight('bold'),
                            'py-0.5 bg-surface-container-highest text-on-surface-variant text-[10px] rounded uppercase',
                          )}
                          data-mol-id={`type-${p.id}`}
                        >
                          {p.property_type}
                        </span>
                      </div>
                      <div
                        className={cm.cn(
                          'flex items-center gap-3 text-sm text-on-surface-variant font-medium mt-4 pt-4 border-t border-outline-variant/10',
                        )}
                      >
                        <span className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
                          <span
                            className={cm.cn(
                              cm.textSize('sm'),
                              'material-symbols-outlined opacity-60',
                            )}
                          >
                            bed
                          </span>
                          {p.bedrooms} bed
                        </span>
                        <span className={cm.cn('flex items-center gap-1.5')}>
                          <span className={cm.cn('material-symbols-outlined text-sm opacity-60')}>
                            bathtub
                          </span>
                          {asNumber(p.bathrooms)} bath
                        </span>
                        <span className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
                          <span
                            className={cm.cn(
                              cm.textSize('sm'),
                              'material-symbols-outlined opacity-60',
                            )}
                          >
                            square_foot
                          </span>
                          {Math.round(asNumber(p.square_feet)).toLocaleString()} sqft
                        </span>
                      </div>
                      {agentName && (
                        <div
                          className={cm.cn(cm.sp('mt', 4), cm.flex({ align: 'center' }), 'gap-3')}
                        >
                          <span
                            className={cm.cn(
                              'text-[10px] font-semibold text-on-surface-variant uppercase tracking-widest',
                            )}
                          >
                            {t(
                              'property.listedBy',
                              { name: agentName },
                              { defaultValue: 'Listed by {{name}}' },
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
          <SearchPageFooter />
        </section>
      </main>
      <SearchPageBottomNavBar />
    </div>
  )
}

export default SearchPage
export { SearchPage, SearchPage as SearchPagePage }
