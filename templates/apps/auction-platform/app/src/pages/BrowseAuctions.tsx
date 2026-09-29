import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuctionCard } from '../components/AuctionCard.js'

interface AuctionListItem {
  id: string
  title: string
  category: string
  lot?: string | null
  current_bid_cents: number
  bid_count: number
  ends_at: string
  status?: 'live' | 'ending' | 'closed' | 'reserve_not_met'
  image_url?: string | null
  image_alt?: string | null
}

const CATEGORY_FILTERS = [
  { key: 'all', defaultLabel: 'All categories', icon: 'apps' },
  { key: 'art', defaultLabel: 'Fine art', icon: 'palette' },
  { key: 'watches', defaultLabel: 'Watches', icon: 'watch' },
  { key: 'cars', defaultLabel: 'Classic cars', icon: 'directions_car' },
  { key: 'jewelry', defaultLabel: 'Jewelry', icon: 'diamond' },
  { key: 'collectibles', defaultLabel: 'Collectibles', icon: 'category' },
] as const

type CategoryKey = (typeof CATEGORY_FILTERS)[number]['key']

const SORT_OPTIONS = [
  { key: 'ending_soon', defaultLabel: 'Ending soon' },
  { key: 'most_bids', defaultLabel: 'Most bids' },
  { key: 'highest_bid', defaultLabel: 'Highest bid' },
  { key: 'newest', defaultLabel: 'Newest' },
] as const

type SortKey = (typeof SORT_OPTIONS)[number]['key']

/** Filters-rail facets (the Stitch browse design's left rail). Status and
 *  Current Bid filter on real listing fields; Art Medium and Condition are
 *  metadata facets matched against the lot's own text (title / lot line /
 *  category), so a facet only ever selects lots that actually name it. */
const STATUS_FACETS = [
  { key: 'live', defaultLabel: 'Live auctions' },
  { key: 'ending', defaultLabel: 'Ending soon (< 2h)' },
  { key: 'closed', defaultLabel: 'Closed' },
] as const

type StatusFacetKey = (typeof STATUS_FACETS)[number]['key']

const MEDIUM_FACETS = [
  'Oil on canvas',
  'Acrylic',
  'Watercolor',
  'Bronze',
  'Mixed media',
  'Lithograph',
] as const

const CONDITION_FACETS = ['Mint', 'Excellent', 'Very good', 'Good', 'Fair'] as const

function statusKeyOf(it: AuctionListItem): StatusFacetKey {
  if (it.status === 'closed') return 'closed'
  const remaining = new Date(it.ends_at).getTime() - Date.now()
  if (remaining <= 0) return 'closed'
  if (remaining < 2 * 60 * 60 * 1000) return 'ending'
  return 'live'
}

function facetWords(facet: string): string[] {
  return facet
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2)
}

function facetMatches(facet: string, it: AuctionListItem): boolean {
  const hay = `${it.title} ${it.lot ?? ''} ${it.category}`.toLowerCase()
  return facetWords(facet).every((w) => hay.includes(w))
}

function parseHash(hash: string): { category: CategoryKey; sort: SortKey } {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const category = params.get('cat') as CategoryKey | null
  const sort = params.get('sort') as SortKey | null
  return {
    category: CATEGORY_FILTERS.some((c) => c.key === category) ? (category as CategoryKey) : 'all',
    sort: SORT_OPTIONS.some((s) => s.key === sort) ? (sort as SortKey) : 'ending_soon',
  }
}

export function BrowseAuctions() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const location = useLocation()
  const parsed = parseHash(location.hash)
  const [items, setItems] = useState<AuctionListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusSel, setStatusSel] = useState<StatusFacetKey[]>([])
  const [minBid, setMinBid] = useState('')
  const [maxBid, setMaxBid] = useState('')
  const [mediumSel, setMediumSel] = useState<string[]>([])
  const [conditionSel, setConditionSel] = useState<string[]>([])

  const category = parsed.category
  const sort = parsed.sort

  const setCategory = (next: CategoryKey) => {
    const params = new URLSearchParams(location.hash.replace(/^#/, ''))
    if (next === 'all') params.delete('cat')
    else params.set('cat', next)
    const qs = params.toString()
    navigate({ pathname: '/auctions', hash: qs ? `#${qs}` : '#top' }, { replace: false })
  }

  const setSort = (next: SortKey) => {
    const params = new URLSearchParams(location.hash.replace(/^#/, ''))
    if (next === 'ending_soon') params.delete('sort')
    else params.set('sort', next)
    const qs = params.toString()
    navigate({ pathname: '/auctions', hash: qs ? `#${qs}` : '#top' }, { replace: false })
  }

  const toggleFacet = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

  const clearFilters = () => {
    setStatusSel([])
    setMinBid('')
    setMaxBid('')
    setMediumSel([])
    setConditionSel([])
  }

  const filtersActive =
    statusSel.length > 0 ||
    minBid.trim() !== '' ||
    maxBid.trim() !== '' ||
    mediumSel.length > 0 ||
    conditionSel.length > 0

  useEffect(() => {
    let cancelled = false
    setItems(null)
    setError(null)
    http
      .get<{ data?: AuctionListItem[] }>('/api/auctions?limit=100')
      .then((res) => {
        if (cancelled) return
        const list = (res.data?.data ?? []) as AuctionListItem[]
        setItems(list)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('browseAuctions.error', {}, { defaultValue: 'Could not load auctions.' }),
        )
        setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- safeItems is a stable-reference guard; wrapping in useMemo would be circular
  const safeItems = items ?? []

  const facetCounts = useMemo(() => {
    const byStatus: Record<StatusFacetKey, number> = { live: 0, ending: 0, closed: 0 }
    for (const it of safeItems) byStatus[statusKeyOf(it)] += 1
    const countFacet = (facets: readonly string[]) =>
      Object.fromEntries(
        facets.map((f) => [f, safeItems.filter((it) => facetMatches(f, it)).length]),
      )
    return {
      status: byStatus,
      medium: countFacet(MEDIUM_FACETS) as Record<string, number>,
      condition: countFacet(CONDITION_FACETS) as Record<string, number>,
    }
  }, [safeItems])

  const filtered = useMemo(() => {
    if (items === null) return null
    let list = items
    if (category !== 'all') {
      list = list.filter((it) => it.category === category)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((it) => it.title.toLowerCase().includes(q))
    }
    if (statusSel.length > 0) {
      list = list.filter((it) => statusSel.includes(statusKeyOf(it)))
    }
    const minCents = Number(minBid) * 100
    const maxCents = Number(maxBid) * 100
    if (minBid.trim() !== '' && Number.isFinite(minCents)) {
      list = list.filter((it) => it.current_bid_cents >= minCents)
    }
    if (maxBid.trim() !== '' && Number.isFinite(maxCents)) {
      list = list.filter((it) => it.current_bid_cents <= maxCents)
    }
    if (mediumSel.length > 0) {
      list = list.filter((it) => mediumSel.some((f) => facetMatches(f, it)))
    }
    if (conditionSel.length > 0) {
      list = list.filter((it) => conditionSel.some((f) => facetMatches(f, it)))
    }
    list = [...list]
    switch (sort) {
      case 'ending_soon':
        list.sort((a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime())
        break
      case 'most_bids':
        list.sort((a, b) => b.bid_count - a.bid_count)
        break
      case 'highest_bid':
        list.sort((a, b) => b.current_bid_cents - a.current_bid_cents)
        break
      case 'newest':
        list.reverse()
        break
    }
    return list
  }, [items, category, sort, search, statusSel, minBid, maxBid, mediumSel, conditionSel])

  const filterRail = (
    <aside
      className={cm.cn('xl:col-span-3 hidden xl:block')}
      aria-label={t('browseAuctions.filtersLabel', {}, { defaultValue: 'Filters' })}
    >
      <div
        className={cm.cn(
          cm.sp('p', 5),
          cm.stack(5),
          'rounded-xl bg-surface border border-outline-variant/40',
        )}
      >
        <header className={cm.flex({ align: 'center', justify: 'between' })}>
          <h2 className={cm.cn('text-lg font-extrabold tracking-tight')}>
            {t('browseAuctions.filtersHeading', {}, { defaultValue: 'Filters' })}
          </h2>
          {filtersActive ? (
            <button
              type="button"
              onClick={clearFilters}
              data-mol-id="browse-filters-clear"
              className={cm.cn('text-sm font-semibold text-primary hover:underline')}
            >
              {t('browseAuctions.filtersClear', {}, { defaultValue: 'Clear all' })}
            </button>
          ) : null}
        </header>

        {/* Status */}
        <section className={cm.cn(cm.stack(3))}>
          <h3
            className={cm.cn(
              cm.textSize('xs'),
              'font-bold uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('browseAuctions.facetStatus', {}, { defaultValue: 'Status' })}
          </h3>
          <ul className={cm.cn(cm.stack(2))}>
            {STATUS_FACETS.map((f) => (
              <li key={f.key}>
                <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'cursor-pointer')}>
                  <input
                    type="checkbox"
                    checked={statusSel.includes(f.key)}
                    onChange={() => setStatusSel((prev) => toggleFacet(prev, f.key))}
                    className={cm.cn('w-4 h-4 accent-[var(--mol-color-primary)]')}
                  />
                  <span className={cm.cn(cm.textSize('sm'), 'flex-1 text-on-surface')}>
                    {t(`browseAuctions.facetStatus.${f.key}`, {}, { defaultValue: f.defaultLabel })}
                  </span>
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      'rounded-full text-xs font-semibold bg-surface-container-low text-on-surface-variant tabular-nums',
                    )}
                  >
                    {facetCounts.status[f.key]}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        {/* Current Bid */}
        <section className={cm.cn(cm.stack(3))}>
          <h3
            className={cm.cn(
              cm.textSize('xs'),
              'font-bold uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('browseAuctions.facetCurrentBid', {}, { defaultValue: 'Current Bid' })}
          </h3>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <input
              type="number"
              min={0}
              value={minBid}
              onChange={(e) => setMinBid(e.target.value)}
              placeholder={t('browseAuctions.bidMin', {}, { defaultValue: 'Min' })}
              aria-label={t(
                'browseAuctions.bidMinLabel',
                {},
                { defaultValue: 'Minimum current bid' },
              )}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.w('full'),
                'rounded-lg border border-outline-variant bg-surface text-sm font-mono tabular-nums focus:outline-none focus:border-primary',
              )}
            />
            <span className={cm.textMuted} aria-hidden="true">
              –
            </span>
            <input
              type="number"
              min={0}
              value={maxBid}
              onChange={(e) => setMaxBid(e.target.value)}
              placeholder={t('browseAuctions.bidMax', {}, { defaultValue: 'Max' })}
              aria-label={t(
                'browseAuctions.bidMaxLabel',
                {},
                { defaultValue: 'Maximum current bid' },
              )}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.w('full'),
                'rounded-lg border border-outline-variant bg-surface text-sm font-mono tabular-nums focus:outline-none focus:border-primary',
              )}
            />
          </div>
        </section>

        {/* Art Medium */}
        <section className={cm.cn(cm.stack(3))}>
          <h3
            className={cm.cn(
              cm.textSize('xs'),
              'font-bold uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('browseAuctions.facetMedium', {}, { defaultValue: 'Art Medium' })}
          </h3>
          <ul className={cm.cn(cm.stack(2))}>
            {MEDIUM_FACETS.map((f) => (
              <li key={f}>
                <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'cursor-pointer')}>
                  <input
                    type="checkbox"
                    checked={mediumSel.includes(f)}
                    onChange={() => setMediumSel((prev) => toggleFacet(prev, f))}
                    className={cm.cn('w-4 h-4 accent-[var(--mol-color-primary)]')}
                  />
                  <span className={cm.cn(cm.textSize('sm'), 'flex-1 text-on-surface-variant')}>
                    {f}
                  </span>
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      'rounded-full text-xs font-semibold bg-surface-container-low text-on-surface-variant tabular-nums',
                    )}
                  >
                    {facetCounts.medium[f] ?? 0}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        {/* Condition */}
        <section className={cm.cn(cm.stack(3))}>
          <h3
            className={cm.cn(
              cm.textSize('xs'),
              'font-bold uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('browseAuctions.facetCondition', {}, { defaultValue: 'Condition' })}
          </h3>
          <ul className={cm.cn(cm.stack(2))}>
            {CONDITION_FACETS.map((f) => (
              <li key={f}>
                <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'cursor-pointer')}>
                  <input
                    type="checkbox"
                    checked={conditionSel.includes(f)}
                    onChange={() => setConditionSel((prev) => toggleFacet(prev, f))}
                    className={cm.cn('w-4 h-4 accent-[var(--mol-color-primary)]')}
                  />
                  <span className={cm.cn(cm.textSize('sm'), 'flex-1 text-on-surface-variant')}>
                    {f}
                  </span>
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      'rounded-full text-xs font-semibold bg-surface-container-low text-on-surface-variant tabular-nums',
                    )}
                  >
                    {facetCounts.condition[f] ?? 0}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  )

  return (
    <div
      id="top"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}
    >
      <header className={cm.stack(2)}>
        <p className={cm.cn('text-xs font-black uppercase tracking-widest text-primary')}>
          {t('browseAuctions.eyebrow', {}, { defaultValue: 'Live floor' })}
        </p>
        <h1 className={cm.cn('text-4xl font-extrabold tracking-tight')}>
          {t('browseAuctions.heading', {}, { defaultValue: 'Browse auctions' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'max-w-2xl')}>
          {t(
            'browseAuctions.subheading',
            {},
            {
              defaultValue:
                'Filter by category, sort by what matters most, and place a bid before the gavel falls.',
            },
          )}
        </p>
      </header>

      <div className={cm.cn('grid grid-cols-1 xl:grid-cols-12 gap-8 items-start')}>
        {filterRail}
        <div className={cm.cn('xl:col-span-9 stack-y space-y-6 min-w-0')}>
          {/* Search + sort row */}
          <section className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }))}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'flex-1 min-w-[220px] rounded-full bg-surface border border-outline-variant focus-within:border-primary',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-on-surface-variant')}
                aria-hidden="true"
              >
                search
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t(
                  'browseAuctions.searchPlaceholder',
                  {},
                  { defaultValue: 'Search lots, sellers, or categories…' },
                )}
                className={cm.cn(
                  'flex-1 bg-transparent border-none focus:outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant',
                )}
              />
            </div>
            <label
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                'text-sm font-bold text-on-surface-variant',
              )}
            >
              {t('browseAuctions.sortLabel', {}, { defaultValue: 'Sort by' })}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-full bg-surface border border-outline-variant text-sm font-semibold text-on-surface focus:outline-none focus:border-primary',
                )}
              >
                {SORT_OPTIONS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {t(`browseAuctions.sort.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                  </option>
                ))}
              </select>
            </label>
          </section>

          {/* Category chips */}
          <section className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
            {CATEGORY_FILTERS.map((c) => {
              const active = c.key === category
              const label = (
                <>
                  <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                    {c.icon}
                  </span>
                  {t(`browseAuctions.category.${c.key}`, {}, { defaultValue: c.defaultLabel })}
                </>
              )
              if (active) {
                return (
                  <span
                    key={c.key}
                    aria-current="true"
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      'rounded-full text-sm font-semibold border text-white border-transparent shadow-sm shadow-primary/30',
                    )}
                    style={{
                      background:
                        'linear-gradient(135deg, var(--mol-color-primary), var(--color-primary-gradient-end))',
                    }}
                  >
                    {label}
                  </span>
                )
              }
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'rounded-full text-sm font-semibold border transition-colors',
                    'border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-on-surface-variant',
                  )}
                >
                  {label}
                </button>
              )
            })}
          </section>

          {filtered === null ? (
            <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
              {t('browseAuctions.loading', {}, { defaultValue: 'Loading live auctions…' })}
            </p>
          ) : error ? (
            <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
          ) : filtered.length === 0 ? (
            <div className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.stack(2))}>
              <span
                className={cm.cn(
                  'material-symbols-outlined text-5xl text-on-surface-variant mx-auto',
                )}
                aria-hidden="true"
              >
                search_off
              </span>
              <p className={cm.cn('font-bold')}>
                {category === 'all' && !search.trim() && !filtersActive
                  ? t(
                      'browseAuctions.emptyAll',
                      {},
                      { defaultValue: 'No live auctions yet — check back soon.' },
                    )
                  : t(
                      'browseAuctions.empty',
                      {},
                      { defaultValue: 'No auctions match these filters.' },
                    )}
              </p>
              {category !== 'all' || search.trim() || filtersActive ? (
                <button
                  type="button"
                  onClick={() => {
                    setCategory('all')
                    setSearch('')
                    clearFilters()
                  }}
                  className={cm.cn('text-sm font-semibold text-primary hover:underline')}
                >
                  {t('browseAuctions.reset', {}, { defaultValue: 'Reset filters' })}
                </button>
              ) : null}
            </div>
          ) : (
            <section
              className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}
            >
              {filtered.map((it) => (
                <AuctionCard
                  key={it.id}
                  id={it.id}
                  title={it.title}
                  lot={it.lot ?? ''}
                  category={it.category}
                  imageUrl={it.image_url ?? undefined}
                  imageAlt={it.image_alt ?? it.title}
                  currentBidCents={it.current_bid_cents}
                  bidCount={it.bid_count}
                  endsAtIso={it.ends_at}
                  status={it.status}
                />
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

export default BrowseAuctions
