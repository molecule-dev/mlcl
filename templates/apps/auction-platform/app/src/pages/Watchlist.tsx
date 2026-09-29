import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuctionCard } from '../components/AuctionCard.js'

interface WatchlistRow {
  id: string
  user_id: string
  listing_id: string
  created_at: string
  listing?: {
    id: string
    title: string
    category: string
    current_price: number
    bid_count: number
    end_time: string
    status: string
    thumbnails?: string[]
  } | null
}

interface WatchedAuction {
  id: string
  watch_id: string
  title: string
  category: string
  lot?: string | null
  current_bid_cents: number
  bid_count: number
  ends_at: string
  status: 'live' | 'ending' | 'closed' | 'reserve_not_met'
  notify: boolean
  image_url?: string | null
  image_alt?: string | null
}

/** One card in the design's right-hand Alerts rail. Derived strictly from the
 *  watched lots' own clock/status — never fabricated. */
interface WatchAlert {
  id: string
  tone: 'urgent' | 'closing' | 'neutral'
  icon: string
  title: string
  body: string
  to: string
}

const ALERT_TONE: Record<WatchAlert['tone'], { fg: string; bg: string; border: string }> = {
  urgent: {
    fg: 'var(--color-urgent)',
    bg: 'var(--color-bid-outbid-light)',
    border: 'var(--color-bid-outbid)',
  },
  closing: {
    fg: 'var(--color-ending-soon)',
    bg: 'var(--color-ending-soon-light)',
    border: 'var(--color-ending-soon)',
  },
  neutral: {
    fg: 'var(--color-status-neutral-fg)',
    bg: 'var(--color-status-neutral-bg)',
    border: 'var(--color-status-neutral-fg)',
  },
}

function alertMinutesLeft(iso: string): number {
  return Math.floor((new Date(iso).getTime() - Date.now()) / 60_000)
}

type Translate = ReturnType<typeof useTranslation>['t']

function alertsFromItems(items: WatchedAuction[], t: Translate): WatchAlert[] {
  const alerts: WatchAlert[] = []
  for (const it of items) {
    const mins = alertMinutesLeft(it.ends_at)
    if (it.status === 'closed' || mins <= 0) {
      alerts.push({
        id: `closed-${it.id}`,
        tone: 'neutral',
        icon: 'history',
        title: t('watchlist.alertClosedTitle', {}, { defaultValue: 'Auction closed' }),
        body: t(
          'watchlist.alertClosedBody',
          { title: it.title },
          { defaultValue: '{{title}} has ended.' },
        ),
        to: `/auctions/${it.id}`,
      })
    } else if (mins < 2 * 60) {
      alerts.push({
        id: `ending-${it.id}`,
        tone: mins < 30 ? 'urgent' : 'closing',
        icon: 'schedule',
        title:
          mins < 60
            ? t(
                'watchlist.alertEndingMins',
                { count: mins },
                { defaultValue: 'Ending in {{count}} min' },
              )
            : t(
                'watchlist.alertEndingHours',
                { h: Math.floor(mins / 60), m: mins % 60 },
                { defaultValue: 'Ending in {{h}}h {{m}}m' },
              ),
        body: t(
          'watchlist.alertEndingBody',
          { title: it.title },
          { defaultValue: '{{title}} is closing soon.' },
        ),
        to: `/auctions/${it.id}`,
      })
    }
  }
  return alerts.slice(0, 4)
}

function inferUiStatus(endTime: string, status: string): WatchedAuction['status'] {
  if (status !== 'active') return 'closed'
  const remaining = new Date(endTime).getTime() - Date.now()
  if (remaining < 0) return 'closed'
  if (remaining < 1000 * 60 * 30) return 'ending'
  return 'live'
}

function rowToAuction(row: WatchlistRow): WatchedAuction | null {
  if (!row.listing) return null
  const listing = row.listing
  const thumb =
    Array.isArray(listing.thumbnails) && listing.thumbnails.length > 0
      ? listing.thumbnails[0]
      : null
  return {
    id: listing.id,
    watch_id: row.id,
    title: listing.title,
    category: listing.category,
    lot: `Lot #${String(listing.id).slice(0, 4).toUpperCase()}`,
    current_bid_cents: Number(listing.current_price ?? 0),
    bid_count: Number(listing.bid_count ?? 0),
    ends_at: listing.end_time,
    status: inferUiStatus(listing.end_time, listing.status),
    notify: true,
    image_url: thumb,
    image_alt: listing.title,
  }
}

export function Watchlist() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<WatchedAuction[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false
    setItems(null)
    setError(null)
    http
      .get<{ data?: WatchlistRow[] }>('/api/watchlist')
      .then((res) => {
        if (cancelled) return
        const rows = (res.data?.data ?? []) as WatchlistRow[]
        setItems(rows.map(rowToAuction).filter((row): row is WatchedAuction => row !== null))
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('watchlist.error', {}, { defaultValue: 'Could not load watchlist.' }),
        )
        setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const handleRemove = (listingId: string) => {
    setRemoving((prev) => ({ ...prev, [listingId]: true }))
    http
      .delete(`/api/watchlist/${listingId}`)
      .then(() => {
        setItems((prev) => (prev ?? []).filter((it) => it.id !== listingId))
      })
      .catch(() => {
        // Surface error but keep optimistic removal as no-op on failure.
      })
      .finally(() => {
        setRemoving((prev) => {
          const next = { ...prev }
          delete next[listingId]
          return next
        })
      })
  }

  const liveItems = items ?? []
  const alerts = alertsFromItems(liveItems, t)

  return (
    <div
      id="top"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}
    >
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div className={cm.stack(2)}>
          <p className={cm.cn('text-xs font-black uppercase tracking-widest text-primary')}>
            {t('watchlist.eyebrow', {}, { defaultValue: 'Saved lots' })}
          </p>
          <h1 className={cm.cn('text-4xl font-extrabold tracking-tight')}>
            {t('watchlist.heading', {}, { defaultValue: 'Watchlist' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t(
              'watchlist.subheading',
              { count: liveItems.length },
              { defaultValue: '{{count}} auctions you are watching · live updates' },
            )}
          </p>
        </div>
      </header>

      <div className={cm.cn('grid grid-cols-1 xl:grid-cols-12 gap-6 items-start')}>
        <div className={cm.cn('xl:col-span-9 min-w-0 stack-y space-y-6')}>
          {items === null ? (
            <p className={cm.cn(cm.sp('py', 12), cm.textCenter, cm.textMuted)}>
              {t('watchlist.loading', {}, { defaultValue: 'Loading watchlist…' })}
            </p>
          ) : error ? (
            <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-error')}>{error}</p>
          ) : items.length === 0 ? (
            <div className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.stack(3))}>
              <span
                className={cm.cn(
                  'material-symbols-outlined text-5xl text-on-surface-variant mx-auto',
                )}
                aria-hidden="true"
              >
                visibility_off
              </span>
              <p className={cm.cn('font-bold')}>
                {t('watchlist.empty', {}, { defaultValue: 'No watched auctions yet.' })}
              </p>
              <Link
                to="/auctions"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  // Inline-flex + py keeps the empty-state CTA a 44px tap target.
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.mxAuto,
                  'min-h-11 rounded-full text-sm font-semibold text-primary border border-primary/40 hover:bg-primary/10',
                )}
              >
                {t('watchlist.browseCta', {}, { defaultValue: 'Browse live auctions →' })}
              </Link>
            </div>
          ) : (
            <section
              className={cm.cn(
                cm.grid({ gap: 'md' }),
                'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
              )}
            >
              {items.map((it) => (
                <div key={it.id} className={cm.cn('relative')}>
                  <AuctionCard
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
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      handleRemove(it.id)
                    }}
                    disabled={Boolean(removing[it.id])}
                    aria-label={t(
                      'watchlist.remove',
                      {},
                      { defaultValue: 'Remove from watchlist' },
                    )}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'absolute top-3 right-3 z-10 w-9 h-9 rounded-full backdrop-blur-md transition-colors',
                    )}
                    style={{
                      background: 'color-mix(in srgb, var(--color-primary) 95%, transparent)',
                      color: 'var(--color-on-primary)',
                    }}
                  >
                    <span className={cm.cn('material-symbols-outlined text-lg')} aria-hidden="true">
                      {removing[it.id] ? 'hourglass_empty' : 'close'}
                    </span>
                  </button>
                </div>
              ))}
            </section>
          )}
        </div>

        {/* Alerts rail — the Stitch watchlist's right sidebar, fed by the
            watched lots' real clocks. */}
        <aside
          className={cm.cn('xl:col-span-3 stack-y space-y-3')}
          aria-label={t('watchlist.alertsLabel', {}, { defaultValue: 'Alerts' })}
        >
          <h3 className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'font-bold')}>
            <span className={cm.cn('material-symbols-outlined text-primary')} aria-hidden="true">
              notifications
            </span>
            {t('watchlist.alertsHeading', {}, { defaultValue: 'Alerts' })}
          </h3>
          {alerts.length === 0 ? (
            <div
              className={cm.cn(
                cm.sp('p', 4),
                cm.flex({ align: 'start', gap: 'sm' }),
                'rounded-xl border border-outline-variant/40 bg-surface text-on-surface-variant',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-xl text-success')}
                aria-hidden="true"
              >
                task_alt
              </span>
              <p className={cm.cn(cm.textSize('sm'))}>
                {t(
                  'watchlist.alertsQuiet',
                  {},
                  { defaultValue: "You're all caught up — nothing closing in the next two hours." },
                )}
              </p>
            </div>
          ) : (
            alerts.map((a) => {
              const tone = ALERT_TONE[a.tone]
              return (
                <div
                  key={a.id}
                  className={cm.cn(
                    cm.sp('p', 3),
                    cm.flex({ align: 'start', gap: 'sm' }),
                    'relative overflow-hidden rounded-xl border shadow-sm',
                  )}
                  style={{ background: tone.bg, borderColor: tone.border }}
                >
                  <span
                    className={cm.cn('absolute left-0 top-0 bottom-0 w-1')}
                    style={{ background: tone.fg }}
                    aria-hidden="true"
                  />
                  <span
                    className={cm.cn('material-symbols-outlined text-xl')}
                    aria-hidden="true"
                    style={{ color: tone.fg }}
                  >
                    {a.icon}
                  </span>
                  <div className={cm.cn(cm.stack(1), 'flex-1 min-w-0')}>
                    <p className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface')}>
                      {a.title}
                    </p>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant leading-relaxed line-clamp-2',
                      )}
                    >
                      {a.body}
                    </p>
                    <Link
                      to={a.to}
                      data-mol-id={`watchlist-alert-${a.id}`}
                      className={cm.cn(cm.textSize('xs'), 'font-bold hover:underline')}
                      style={{ color: tone.fg }}
                    >
                      {t('watchlist.alertViewCta', {}, { defaultValue: 'View auction →' })}
                    </Link>
                  </div>
                </div>
              )
            })
          )}
        </aside>
      </div>
    </div>
  )
}

export default Watchlist
