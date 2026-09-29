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
  }, [items, category, sort, search])

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
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.stack(3))}>
          <span
            className={cm.cn('material-symbols-outlined text-5xl text-on-surface-variant mx-auto')}
            aria-hidden="true"
          >
            search_off
          </span>
          <p className={cm.cn('font-bold')}>
            {category === 'all' && !search.trim()
              ? t(
                  'browseAuctions.emptyAll',
                  {},
                  { defaultValue: 'No live auctions yet — check back soon.' },
                )
              : t('browseAuctions.empty', {}, { defaultValue: 'No auctions match these filters.' })}
          </p>
          {category !== 'all' || search.trim() ? (
            <button
              type="button"
              onClick={() => {
                setCategory('all')
                setSearch('')
              }}
              className={cm.cn('text-sm font-semibold text-primary hover:underline')}
            >
              {t('browseAuctions.reset', {}, { defaultValue: 'Reset filters' })}
            </button>
          ) : null}
        </div>
      ) : (
        <section
          className={cm.cn(
            cm.grid({ gap: 'md' }),
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
          )}
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
  )
}

export default BrowseAuctions
