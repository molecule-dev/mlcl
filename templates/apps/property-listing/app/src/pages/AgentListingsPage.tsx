/**
 * AgentListingsPage — `/admin/listings`
 *
 * Lists the authenticated agent's properties (owner_id = self) with search +
 * status filtering and inline edit / delete actions. The listing cards are
 * fully data-driven; on first run the agent has zero listings until they
 * use the editor (`/admin/listings/new`) to add some, so the empty state is
 * intentional, not a bug.
 *
 * Backend wiring:
 *   - GET    /api/properties?owner_id=me&status=all    → fetch
 *   - DELETE /api/properties/:id                       → delete
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton, LoadErrorBanner } from '@molecule/app-ui-react'

import AdminShell from '../components/AdminShell.js'

interface Listing {
  id: string
  title?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  price?: number | string
  bedrooms?: number
  bathrooms?: number | string
  square_feet?: number | string
  status?: string
  property_type?: string
  photos?: string[] | string
}

const STATUS_FILTERS = ['All', 'Active', 'Pending', 'Sold', 'Inactive'] as const

function asNumber(v: unknown): number {
  if (v == null || v === '') return 0
  return typeof v === 'number' ? v : Number(v)
}

function fmtPriceCompact(price: unknown): string {
  const n = asNumber(price)
  if (!n) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n)
}

function fmtPriceFull(price: unknown): string {
  const n = asNumber(price)
  if (!n) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function firstPhoto(p: Listing): string | null {
  const v = p.photos
  if (!v) return null
  if (Array.isArray(v)) return v[0] ?? null
  try {
    const parsed = JSON.parse(v as string)
    return Array.isArray(parsed) ? (parsed[0] ?? null) : null
  } catch (_error) {
    // JSON.parse failed — photos value is not a valid array string, return null
    return null
  }
}

function unwrapList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[]
  if (res && typeof res === 'object') {
    const inner = (res as { data?: unknown }).data
    if (Array.isArray(inner)) return inner as T[]
    if (inner && typeof inner === 'object' && Array.isArray((inner as { data?: unknown }).data)) {
      return (inner as { data: T[] }).data
    }
  }
  return []
}

function statusBadgeClass(status: string | undefined, cm: ReturnType<typeof getClassMap>) {
  switch ((status ?? '').toLowerCase()) {
    case 'active':
      return cm.cn('bg-success-light text-success')
    case 'pending':
      return cm.cn('bg-warning-light text-warning')
    case 'sold':
      return cm.cn('bg-border text-foreground')
    case 'inactive':
      return cm.cn('bg-rose-100 text-error')
    default:
      return cm.cn('bg-success-light text-success')
  }
}

function AgentListingsPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()

  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<(typeof STATUS_FILTERS)[number]>('All')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)

  const fetchListings = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get('/api/properties?owner_id=me&status=all&limit=200')
      setListings(unwrapList<Listing>(res))
    } catch (err: unknown) {
      logError(err instanceof Error ? err : 'Failed to load listings')
      setError(t('listings.loadError', {}, { defaultValue: 'Failed to load your listings.' }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchListings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!notificationsOpen) return
    function onClickOutside(event: globalThis.MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [notificationsOpen])

  const filteredListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return listings.filter((l) => {
      const matchesSearch =
        !q ||
        (l.title ?? '').toLowerCase().includes(q) ||
        (l.address ?? '').toLowerCase().includes(q) ||
        (l.city ?? '').toLowerCase().includes(q)
      const matchesFilter =
        activeFilter === 'All' || (l.status ?? '').toLowerCase() === activeFilter.toLowerCase()
      return matchesSearch && matchesFilter
    })
  }, [listings, searchQuery, activeFilter])

  const stats = useMemo(() => {
    const total = listings.length
    const valuation = listings.reduce((sum, l) => sum + asNumber(l.price), 0)
    const pending = listings.filter((l) => (l.status ?? '').toLowerCase() === 'pending').length
    const active = listings.filter((l) => (l.status ?? '').toLowerCase() === 'active').length
    return { total, valuation, pending, active }
  }, [listings])

  const handleDelete = async (id: string) => {
    const previous = listings
    setListings((xs) => xs.filter((x) => x.id !== id))
    try {
      await http.delete(`/api/properties/${id}`)
      void track({ name: 'listing.deleted', properties: { listing_id: id } })
    } catch (err: unknown) {
      logError(err instanceof Error ? err : 'Failed to delete listing')
      setListings(previous)
      alert(t('listings.deleteError', {}, { defaultValue: 'Failed to delete listing.' }))
    }
  }

  return (
    <AdminShell rootMolId="page-agent-listings" className={cm.surface}>
      <header
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('px', 12),
          cm.h(20),
          'sticky top-0 bg-success-light/80 backdrop-blur-md z-40',
        )}
      >
        <div className={cm.cn(cm.w(96), 'relative')}>
          <span
            className={cm.cn(
              'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline',
            )}
          >
            search
          </span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cm.cn(
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.w('full'),
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.roundedFull,
              'bg-surface-container-low border-none focus:ring-1 focus:ring-primary/20 transition-all',
            )}
            placeholder={t('search.placeholder', {}, { defaultValue: 'Search listings...' })}
            type="text"
            data-mol-id="agent-listings-search"
          />
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))} ref={notificationsRef}>
          <div className={cm.cn('relative')}>
            <button
              onClick={() => setNotificationsOpen((v) => !v)}
              className={cm.cn('text-on-surface-variant hover:opacity-80 transition-opacity')}
              title={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            >
              <span className={cm.cn('material-symbols-outlined')}>notifications</span>
            </button>
            {notificationsOpen && (
              <div
                className={cm.cn(
                  cm.sp('mt', 2),
                  cm.sp('p', 4),
                  cm.w(64),
                  'absolute right-0 bg-surface-container-high rounded-xl shadow-lg z-50 border border-emerald-900/10',
                )}
              >
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('notifications.empty', {}, { defaultValue: 'No new notifications' })}
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className={cm.cn(cm.sp('px', 12), cm.sp('py', 8), cm.stack(8))}>
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'end' }))}>
          <div>
            <h2
              className={cm.cn(
                cm.sp('mb', 2),
                'text-[32px] font-extrabold text-success tracking-tight leading-none',
              )}
            >
              {t('listings.pageTitle', {}, { defaultValue: 'My Listings' })}
            </h2>
            <p className={cm.cn('text-success/60 font-body')}>
              {t(
                'listings.pageSubtitle',
                {},
                { defaultValue: 'Manage and curate your exclusive property portfolio.' },
              )}
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/listings/new')}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 8),
              cm.sp('py', 4),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'primary-gradient text-on-primary rounded-xl font-headline tracking-wide active:scale-95 transition-transform',
            )}
            data-mol-id="header-new-listing"
          >
            {t('listings.addButton', {}, { defaultValue: 'Add New Listing' })}
          </button>
        </div>

        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'md' }),
            cm.sp('pb', 2),
            'overflow-x-auto scrollbar-hide',
          )}
        >
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              data-mol-id={`status-filter-${filter.toLowerCase()}`}
              className={cm.cn(
                'px-6 py-2 rounded-full text-sm font-semibold active:scale-95 transition-transform',
                activeFilter === filter
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-highest text-on-surface-variant hover:bg-success-light',
              )}
            >
              {filter === 'All'
                ? t('status.all', {}, { defaultValue: 'All' })
                : filter === 'Active'
                  ? t('status.active', {}, { defaultValue: 'Active' })
                  : filter === 'Pending'
                    ? t('status.pending', {}, { defaultValue: 'Pending' })
                    : filter === 'Sold'
                      ? t('filters.sold', {}, { defaultValue: 'Sold' })
                      : t('filters.inactive', {}, { defaultValue: 'Inactive' })}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={cm.cn(cm.flex({ justify: 'center', align: 'center' }), cm.sp('py', 16))}>
            <div
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                'border-4 border-emerald-600 border-t-transparent animate-spin',
              )}
              aria-label={t('common.loading', {}, { defaultValue: 'Loading' })}
            />
          </div>
        ) : error ? (
          <LoadErrorBanner message={error} onRetry={fetchListings} />
        ) : filteredListings.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('p', 12),
              cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
              'rounded-xl bg-surface-container-low text-on-surface-variant text-center',
            )}
            data-mol-id="empty-listings"
          >
            <span className={cm.cn('material-symbols-outlined text-5xl text-success/30')}>
              home_work
            </span>
            <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('xl'), 'text-success')}>
              {listings.length === 0
                ? t('listings.emptyTitle', {}, { defaultValue: 'No listings yet' })
                : t(
                    'listings.noMatchTitle',
                    {},
                    { defaultValue: 'No listings match your filters' },
                  )}
            </p>
            <p className={cm.cn(cm.textSize('sm'))}>
              {listings.length === 0
                ? t(
                    'listings.emptyHint',
                    {},
                    { defaultValue: 'Add your first listing to start managing your portfolio.' },
                  )
                : t(
                    'listings.noMatchHint',
                    {},
                    { defaultValue: 'Try a different search or status.' },
                  )}
            </p>
            {listings.length === 0 && (
              <button
                onClick={() => navigate('/admin/listings/new')}
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'primary-gradient text-on-primary rounded-xl active:scale-95 transition-transform',
                )}
              >
                {t('listings.addButton', {}, { defaultValue: 'Add New Listing' })}
              </button>
            )}
          </div>
        ) : (
          <div
            className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2 lg:grid-cols-3')}
            data-mol-id="listing-grid"
          >
            {filteredListings.map((listing) => {
              const photo = firstPhoto(listing)
              return (
                <article
                  key={listing.id}
                  data-mol-id={`listing-card-${listing.id}`}
                  className={cm.cn(
                    'bg-surface-container-lowest rounded-xl ambient-shadow overflow-hidden group transition-all hover:-translate-y-1',
                  )}
                >
                  <button
                    type="button"
                    className={cm.cn(
                      'relative block w-full aspect-[16/9] overflow-hidden cursor-pointer',
                    )}
                    onClick={() => navigate(`/property/${listing.id}`)}
                  >
                    {photo ? (
                      <img
                        alt={listing.title ?? listing.address ?? 'Property'}
                        src={photo}
                        className={cm.cn(
                          'w-full h-full object-cover transition-transform duration-700 group-hover:scale-110',
                        )}
                      />
                    ) : (
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'center' }),
                          'w-full h-full bg-surface-container text-on-surface-variant',
                        )}
                      >
                        <span className={cm.cn('material-symbols-outlined text-5xl')}>image</span>
                      </div>
                    )}
                    <div
                      className={cm.cn('glass-price absolute top-4 right-4 px-4 py-2 rounded-lg')}
                    >
                      <span className={cm.cn('text-success font-headline font-bold')}>
                        {fmtPriceFull(listing.price)}
                      </span>
                    </div>
                    <div className={cm.cn('absolute top-4 left-4')}>
                      <span
                        className={cm.cn(
                          'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest',
                          statusBadgeClass(listing.status, cm),
                        )}
                      >
                        {listing.status ?? 'active'}
                      </span>
                    </div>
                  </button>
                  <div className={cm.cn('p-6')}>
                    <h3
                      className={cm.cn(
                        'text-xl font-bold text-success mb-1 group-hover:text-secondary transition-colors',
                      )}
                    >
                      {listing.title ?? listing.address ?? '—'}
                    </h3>
                    <p className={cm.cn('text-sm text-success/60 font-body mb-6')}>
                      {[listing.address, listing.city, listing.state, listing.zip_code]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    <div
                      className={cm.cn(
                        'flex items-center justify-between py-4 border-t border-emerald-900/5',
                      )}
                    >
                      <div className={cm.cn('flex items-center gap-4')}>
                        <div className={cm.cn('flex items-center gap-1.5')}>
                          <span
                            className={cm.cn('material-symbols-outlined text-success/40 text-lg')}
                          >
                            bed
                          </span>
                          <span className={cm.cn('text-xs font-bold text-success')}>
                            {listing.bedrooms ?? '—'}
                          </span>
                        </div>
                        <div className={cm.cn('flex items-center gap-1.5')}>
                          <span
                            className={cm.cn('material-symbols-outlined text-success/40 text-lg')}
                          >
                            bathtub
                          </span>
                          <span className={cm.cn('text-xs font-bold text-success')}>
                            {listing.bathrooms ?? '—'}
                          </span>
                        </div>
                        <div className={cm.cn('flex items-center gap-1.5')}>
                          <span
                            className={cm.cn('material-symbols-outlined text-success/40 text-lg')}
                          >
                            square_foot
                          </span>
                          <span className={cm.cn('text-xs font-bold text-success')}>
                            {listing.square_feet ?? '—'}
                          </span>
                        </div>
                      </div>
                      <div className={cm.cn('flex items-center gap-2')}>
                        <button
                          aria-label={t('listings.editAria', {}, { defaultValue: 'Edit listing' })}
                          data-mol-id={`edit-listing-${listing.id}`}
                          className={cm.cn(
                            'p-2 text-success/40 hover:text-success hover:bg-success-light rounded-lg transition-all',
                          )}
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/admin/listings/${listing.id}/edit`)
                          }}
                        >
                          <span className={cm.cn('material-symbols-outlined')}>edit</span>
                        </button>
                        <ConfirmButton
                          label={t('listings.deleteAria', {}, { defaultValue: 'Delete listing' })}
                          confirmLabel={t(
                            'listings.deleteConfirm',
                            {},
                            { defaultValue: 'Delete this listing? This cannot be undone.' },
                          )}
                          onConfirm={() => handleDelete(listing.id)}
                          color="error"
                          size="sm"
                          disarmSeconds={5}
                          data-mol-id={`delete-listing-${listing.id}`}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {!loading && !error && (
        <section
          className={cm.cn('px-12 py-8 bg-surface-container-low mt-8')}
          data-mol-id="listing-stats"
        >
          <div className={cm.cn('grid grid-cols-2 md:grid-cols-4 gap-8')}>
            <div className={cm.cn('space-y-1')}>
              <p className={cm.cn('text-xs font-bold text-success/40 uppercase tracking-widest')}>
                {t('listings.statTotal', {}, { defaultValue: 'Total Inventory' })}
              </p>
              <p className={cm.cn('text-4xl font-extrabold text-success')}>{stats.total}</p>
            </div>
            <div className={cm.cn('space-y-1')}>
              <p className={cm.cn('text-xs font-bold text-success/40 uppercase tracking-widest')}>
                {t('listings.statValuation', {}, { defaultValue: 'Total Valuation' })}
              </p>
              <p className={cm.cn('text-4xl font-extrabold text-success')}>
                {fmtPriceCompact(stats.valuation)}
              </p>
            </div>
            <div className={cm.cn('space-y-1')}>
              <p className={cm.cn('text-xs font-bold text-success/40 uppercase tracking-widest')}>
                {t('listings.statActive', {}, { defaultValue: 'Active Listings' })}
              </p>
              <p className={cm.cn('text-4xl font-extrabold text-success')}>{stats.active}</p>
            </div>
            <div className={cm.cn('space-y-1')}>
              <p className={cm.cn('text-xs font-bold text-success/40 uppercase tracking-widest')}>
                {t('listings.statPending', {}, { defaultValue: 'Pending Deals' })}
              </p>
              <p className={cm.cn('text-4xl font-extrabold text-success')}>{stats.pending}</p>
            </div>
          </div>
        </section>
      )}
    </AdminShell>
  )
}

export default AgentListingsPage
export { AgentListingsPage, AgentListingsPage as AgentListingsPagePage }
