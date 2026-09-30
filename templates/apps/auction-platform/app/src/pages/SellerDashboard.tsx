import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type AuctionStatus, AuctionStatusPill } from '../components/AuctionStatusPill.js'
import { CountdownTimer } from '../components/CountdownTimer.js'
import { type NotificationKind, NotificationRow } from '../components/NotificationRow.js'
import { StatCard } from '../components/StatCard.js'

interface SellerListing {
  id: string
  title: string
  category: string
  current_bid_cents: number
  bid_count: number
  watchers: number
  ends_at: string
  status: 'live' | 'ending' | 'closed' | 'reserve_not_met' | 'draft'
}

interface SellerActivity {
  id: string
  kind: NotificationKind
  title: string
  body: string
  when: string
  to?: string
}

interface SellerStats {
  active_listings: number
  total_bids_30d: number
  items_sold_30d: number
  revenue_30d_cents: number
}

const ZERO_STATS: SellerStats = {
  active_listings: 0,
  total_bids_30d: 0,
  items_sold_30d: 0,
  revenue_30d_cents: 0,
}

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

type ListingTab = 'active' | 'sold' | 'ended' | 'drafts'

const LISTING_TABS: readonly ListingTab[] = ['active', 'sold', 'ended', 'drafts']

function parseTab(hash: string): ListingTab {
  const v = hash.replace(/^#/, '')
  return (LISTING_TABS as readonly string[]).includes(v) ? (v as ListingTab) : 'active'
}

export function SellerDashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const location = useLocation()
  const navigate = useNavigate()
  const tab = parseTab(location.hash)
  const setTab = (next: ListingTab) => {
    navigate({ pathname: '/seller', hash: `#${next}` })
  }
  const [stats, setStats] = useState<SellerStats | null>(null)
  const [listings, setListings] = useState<SellerListing[] | null>(null)
  const [activity, setActivity] = useState<SellerActivity[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setStats(null)
    setListings(null)
    setActivity(null)
    setError(null)
    Promise.all([
      http.get<SellerStats | { data?: SellerStats }>('/api/seller/stats').catch(() => null),
      http.get<{ data?: SellerListing[] }>('/api/seller/listings').catch(() => null),
      http.get<{ data?: SellerActivity[] }>('/api/seller/activity').catch(() => null),
    ])
      .then(([sRes, lRes, aRes]) => {
        if (cancelled) return
        const sBody = sRes?.data as SellerStats | { data?: SellerStats } | undefined
        if (sBody && 'active_listings' in (sBody as SellerStats)) {
          setStats(sBody as SellerStats)
        } else {
          setStats(ZERO_STATS)
        }
        const lBody = (lRes?.data?.data ?? lRes?.data ?? []) as SellerListing[]
        setListings(Array.isArray(lBody) ? lBody : [])
        const aBody = (aRes?.data?.data ?? aRes?.data ?? []) as SellerActivity[]
        setActivity(Array.isArray(aBody) ? aBody : [])
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('sellerDashboard.error', {}, { defaultValue: 'Could not load seller data.' }),
        )
        setStats(ZERO_STATS)
        setListings([])
        setActivity([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const safeListings = listings ?? []
  const safeStats = stats ?? ZERO_STATS

  const filteredListings = safeListings.filter((l) => {
    if (tab === 'active') return l.status === 'live' || l.status === 'ending'
    if (tab === 'sold') return l.status === 'closed' && l.bid_count > 0
    if (tab === 'ended') return l.status === 'closed' || l.status === 'reserve_not_met'
    return l.status === 'draft'
  })

  return (
    <div
      id="top"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}
    >
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div className={cm.stack(2)}>
          <p className={cm.cn('text-xs font-black uppercase tracking-widest text-primary')}>
            {t('sellerDashboard.eyebrow', {}, { defaultValue: 'Seller hub' })}
          </p>
          <h1 className={cm.cn('text-4xl font-extrabold tracking-tight')}>
            {t('sellerDashboard.heading', {}, { defaultValue: 'Seller Dashboard' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t(
              'sellerDashboard.subheading',
              {},
              { defaultValue: 'Live listings, recent bids, and a real-time activity feed.' },
            )}
          </p>
        </div>
        <Link
          to="/sell/new"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 6),
            cm.sp('py', 3),
            'rounded-full text-white text-sm font-bold shadow-md shadow-primary/30',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--mol-color-primary), var(--color-primary-gradient-end))',
          }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            add
          </span>
          {t('sellerDashboard.newListing', {}, { defaultValue: 'New listing' })}
        </Link>
      </header>

      {error ? <p className={cm.cn(cm.sp('py', 4), 'text-error font-semibold')}>{error}</p> : null}

      <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 lg:grid-cols-4')}>
        <StatCard
          label={t('sellerDashboard.statListings', {}, { defaultValue: 'Active listings' })}
          value={String(safeStats.active_listings)}
          icon="storefront"
          accent="primary"
        />
        <StatCard
          label={t('sellerDashboard.statBids', {}, { defaultValue: 'Bids in 30d' })}
          value={String(safeStats.total_bids_30d)}
          icon="how_to_vote"
          accent="accent"
        />
        <StatCard
          label={t('sellerDashboard.statSold', {}, { defaultValue: 'Items sold' })}
          value={String(safeStats.items_sold_30d)}
          icon="celebration"
          accent="ending"
        />
        <StatCard
          label={t('sellerDashboard.statRevenue', {}, { defaultValue: 'Revenue 30d' })}
          value={fmt(safeStats.revenue_30d_cents)}
          icon="payments"
          accent="accent"
        />
      </section>

      <section className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-6')}>
        <article
          className={cm.cn(
            cm.sp('p', 6),
            'lg:col-span-8 rounded-xl bg-surface border border-outline-variant/40 stack-y space-y-4 overflow-hidden',
          )}
        >
          <header
            className={cm.cn(
              // wrap: the 4 tab chips overflow a 390px row next to the heading —
              // let them drop to their own line instead of clipping.
              cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
            )}
          >
            <h2 className={cm.cn('text-lg font-extrabold tracking-tight')}>
              {t('sellerDashboard.listingsHeading', {}, { defaultValue: 'Your listings' })}
            </h2>
            <div className={cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' })}>
              {(['active', 'sold', 'ended', 'drafts'] as const).map((k) => {
                const active = k === tab
                const label = t(`sellerDashboard.tab.${k}`, {}, { defaultValue: k })
                if (active) {
                  return (
                    <span
                      key={k}
                      aria-current="true"
                      className={cm.cn(
                        cm.flex({ align: 'center' }),
                        cm.sp('px', 4),
                        'min-h-9 rounded-full text-xs font-bold uppercase tracking-widest text-white',
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
                    key={k}
                    type="button"
                    onClick={() => setTab(k)}
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      cm.sp('px', 4),
                      'min-h-9 rounded-full text-xs font-bold uppercase tracking-widest transition-colors',
                      'text-on-surface-variant hover:text-on-surface',
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </header>

          {listings === null ? (
            <p className={cm.cn(cm.sp('py', 8), cm.textCenter, cm.textMuted)}>
              {t('sellerDashboard.listingsLoading', {}, { defaultValue: 'Loading listings…' })}
            </p>
          ) : filteredListings.length === 0 ? (
            <div className={cm.cn(cm.sp('py', 8), cm.textCenter, cm.stack(2))}>
              <p className={cm.cn('font-bold')}>
                {t('sellerDashboard.emptyTab', {}, { defaultValue: 'Nothing here yet.' })}
              </p>
              <Link
                to="/sell/new"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  // Inline-flex + py keeps the empty-state CTA a 44px tap target.
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.mxAuto,
                  'min-h-11 w-fit rounded-full text-sm font-semibold text-primary border border-primary/40 hover:bg-primary/10',
                )}
              >
                {t(
                  'sellerDashboard.createFirstCta',
                  {},
                  { defaultValue: 'Create your first listing →' },
                )}
              </Link>
            </div>
          ) : (
            <div className={cm.cn('overflow-x-auto -mx-2')}>
              <table className={cm.cn(cm.w('full'), 'text-sm')}>
                <thead>
                  <tr
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/40',
                    )}
                  >
                    <th className={cm.cn('text-left', cm.sp('py', 3), cm.sp('px', 2))}>
                      {t('sellerDashboard.col.lot', {}, { defaultValue: 'Lot' })}
                    </th>
                    <th className={cm.cn('text-left', cm.sp('py', 3), cm.sp('px', 2))}>
                      {t('nav.status', {}, { defaultValue: 'Status' })}
                    </th>
                    <th className={cm.cn(cm.textRight, cm.sp('py', 3), cm.sp('px', 2))}>
                      {t('sellerDashboard.col.bid', {}, { defaultValue: 'Bid' })}
                    </th>
                    <th className={cm.cn(cm.textRight, cm.sp('py', 3), cm.sp('px', 2))}>
                      {t('sellerDashboard.col.bids', {}, { defaultValue: 'Bids' })}
                    </th>
                    <th className={cm.cn(cm.textRight, cm.sp('py', 3), cm.sp('px', 2))}>
                      {t('sellerDashboard.col.watchers', {}, { defaultValue: 'Watchers' })}
                    </th>
                    <th className={cm.cn(cm.textRight, cm.sp('py', 3), cm.sp('px', 2))}>
                      {t('sellerDashboard.col.ends', {}, { defaultValue: 'Ends' })}
                    </th>
                  </tr>
                </thead>
                <tbody className={cm.cn('divide-y divide-outline-variant/40')}>
                  {filteredListings.map((l) => (
                    <tr
                      key={l.id}
                      className={cm.cn('hover:bg-surface-container-low transition-colors')}
                    >
                      <td className={cm.cn(cm.sp('py', 4), cm.sp('px', 2))}>
                        <Link to={`/auctions/${l.id}`} className="block">
                          <p className={cm.cn('font-bold text-on-surface')}>{l.title}</p>
                          <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>{l.category}</p>
                        </Link>
                      </td>
                      <td className={cm.cn(cm.sp('py', 4), cm.sp('px', 2))}>
                        <AuctionStatusPill status={l.status as AuctionStatus} />
                      </td>
                      <td
                        className={cm.cn(
                          cm.textRight,
                          cm.sp('py', 4),
                          cm.sp('px', 2),
                          'tabular-nums font-bold',
                        )}
                      >
                        {l.bid_count > 0 ? fmt(l.current_bid_cents) : '—'}
                      </td>
                      <td
                        className={cm.cn(
                          cm.textRight,
                          cm.sp('py', 4),
                          cm.sp('px', 2),
                          'tabular-nums',
                        )}
                      >
                        {l.bid_count}
                      </td>
                      <td
                        className={cm.cn(
                          cm.textRight,
                          cm.sp('py', 4),
                          cm.sp('px', 2),
                          'tabular-nums',
                        )}
                      >
                        {l.watchers}
                      </td>
                      <td className={cm.cn(cm.textRight, cm.sp('py', 4), cm.sp('px', 2))}>
                        {l.status === 'closed' ? (
                          <span className={cm.textMuted}>
                            {new Date(l.ends_at).toLocaleDateString()}
                          </span>
                        ) : (
                          <CountdownTimer endsAtIso={l.ends_at} size="sm" showLabel={false} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <aside className={cm.cn('lg:col-span-4 stack-y space-y-3')}>
          <h2 className={cm.cn('text-lg font-extrabold tracking-tight')}>
            {t('nav.recentActivity', {}, { defaultValue: 'Recent activity' })}
          </h2>
          {activity === null ? (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t('nav.loadingActivity', {}, { defaultValue: 'Loading activity…' })}
            </p>
          ) : activity.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t('sellerDashboard.activityEmpty', {}, { defaultValue: 'No recent activity yet.' })}
            </p>
          ) : (
            <div className={cm.cn('space-y-3')}>
              {activity.map((a) => (
                <NotificationRow
                  key={a.id}
                  kind={a.kind}
                  title={a.title}
                  body={a.body}
                  whenIso={a.when}
                  actionTo={a.to}
                />
              ))}
            </div>
          )}
        </aside>
      </section>
    </div>
  )
}

export default SellerDashboard
