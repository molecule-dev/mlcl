import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'

import { AuctionStatusPill } from '../components/AuctionStatusPill.js'
import { BidPanelCard } from '../components/BidPanelCard.js'
import { getRealtimeConnection } from '../lib/realtime.js'

interface AuctionDetailData {
  id: string
  title: string
  lot: string
  category: string
  description: string
  seller: { handle: string; name: string; rating: number; sales: number }
  current_bid_cents: number
  bid_count: number
  bid_increment_cents: number
  buy_now_cents?: number | null
  ends_at: string
  status: 'live' | 'ending' | 'closed'
  images: Array<{ url?: string | null; alt: string }>
  bid_history: Array<{
    id: string
    bidder: string
    amount_cents: number
    placed_at: string
    you?: boolean
  }>
  shipping_from: string
  return_window_days: number
  reserve_met: boolean
  is_watched?: boolean
}

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function fmtRelative(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString()
}

/** Payload of the server's `new_bid` broadcast (api/src/handlers/bids.ts). */
interface NewBidEvent {
  amount: number
  bidCount: number
  endTime?: string
}

function isNewBidEvent(data: unknown): data is NewBidEvent {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return typeof d.amount === 'number' && typeof d.bidCount === 'number'
}

export function AuctionDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<AuctionDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeImage, setActiveImage] = useState(0)
  const [bidStatus, setBidStatus] = useState<{
    kind: 'idle' | 'success' | 'error'
    message?: string
  }>({ kind: 'idle' })
  const [watching, setWatching] = useState(false)
  const [watchPending, setWatchPending] = useState(false)
  const [watchStatus, setWatchStatus] = useState<{
    kind: 'idle' | 'success' | 'error'
    message?: string
  }>({ kind: 'idle' })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get<AuctionDetailData>(`/api/auctions/${id ?? ''}`)
      .then((res) => {
        if (cancelled) return
        const body = res.data as AuctionDetailData | undefined
        if (!body || !body.id) {
          setData(null)
        } else {
          setData(body)
          setWatching(Boolean(body.is_watched))
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('auctionDetail.error', {}, { defaultValue: 'Could not load this auction.' }),
        )
        setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  // Live bids — the API broadcasts to the PUBLIC `listing:<id>` room on every
  // new bid and on a buy-now sale (api/src/handlers/bids.ts). Join that exact
  // room and merge the ABSOLUTE price/count the server sends, so a competing
  // bid appears without a reload. Absolute values are idempotent against this
  // page's own optimistic update, so receiving the echo of your own bid is a
  // no-op. Room + event names MUST match the server or it silently no-ops.
  useEffect(() => {
    if (!id) return
    const room = `listing:${id}`
    let active = true
    let connection: RealtimeConnection | null = null
    const onNewBid = (payload: unknown) => {
      if (!isNewBidEvent(payload)) return
      setData((prev) =>
        prev
          ? {
              ...prev,
              current_bid_cents: payload.amount,
              bid_count: payload.bidCount,
              ends_at: payload.endTime ?? prev.ends_at,
            }
          : prev,
      )
    }
    const onSold = () => {
      setData((prev) => (prev ? { ...prev, status: 'closed' } : prev))
    }
    getRealtimeConnection()
      .then((conn) => {
        if (!active) return
        connection = conn
        conn.on('new_bid', onNewBid)
        conn.on('sold', onSold)
        return conn.joinRoom(room)
      })
      .catch(() => {
        // Realtime is an enhancement — the page still works via fetch + the
        // optimistic update on your own bid if the socket can't connect.
      })
    return () => {
      active = false
      if (connection) {
        connection.off('new_bid', onNewBid)
        connection.off('sold', onSold)
        connection.leaveRoom(room).catch(() => {})
      }
    }
  }, [id])

  const visible = useMemo(() => data?.images ?? [], [data])

  const handlePlaceBid = (amountCents: number) => {
    if (!data) return
    setBidStatus({ kind: 'idle' })
    http
      .post('/api/bids', { listingId: data.id, amount: amountCents / 100 })
      .then(() => {
        setBidStatus({
          kind: 'success',
          message: t('auctionDetail.bidSuccess', {}, { defaultValue: 'Bid placed.' }),
        })
        setData((prev) =>
          prev ? { ...prev, current_bid_cents: amountCents, bid_count: prev.bid_count + 1 } : prev,
        )
      })
      .catch((e: unknown) => {
        setBidStatus({
          kind: 'error',
          message:
            e instanceof Error
              ? e.message
              : t('auctionDetail.bidError', {}, { defaultValue: 'Could not place bid.' }),
        })
      })
  }

  const handleToggleWatch = () => {
    if (!data || watchPending) return
    setWatchPending(true)
    setWatchStatus({ kind: 'idle' })
    const wasWatching = watching
    setWatching(!wasWatching)
    const promise = wasWatching
      ? http.delete(`/api/watchlist/${data.id}`)
      : http.post('/api/watchlist', { listingId: data.id })
    promise
      .then(() => {
        setWatchStatus({
          kind: 'success',
          message: wasWatching
            ? t('auctionDetail.watchRemoved', {}, { defaultValue: 'Removed from watchlist.' })
            : t('auctionDetail.watchAdded', {}, { defaultValue: 'Saved to watchlist.' }),
        })
      })
      .catch((e: unknown) => {
        setWatching(wasWatching)
        setWatchStatus({
          kind: 'error',
          message:
            e instanceof Error
              ? e.message
              : t('auctionDetail.watchError', {}, { defaultValue: 'Could not update watchlist.' }),
        })
      })
      .finally(() => setWatchPending(false))
  }

  const handleBuyNow = () => {
    if (!data) return
    setBidStatus({ kind: 'idle' })
    http
      .post('/api/bids/buy-now', { listingId: data.id })
      .then(() => {
        setBidStatus({
          kind: 'success',
          message: t('auctionDetail.buyNowSuccess', {}, { defaultValue: 'Purchase confirmed.' }),
        })
        setData((prev) => (prev ? { ...prev, status: 'closed' } : prev))
      })
      .catch((e: unknown) => {
        setBidStatus({
          kind: 'error',
          message:
            e instanceof Error
              ? e.message
              : t(
                  'auctionDetail.buyNowError',
                  {},
                  { defaultValue: 'Could not complete purchase.' },
                ),
        })
      })
  }

  if (loading) {
    return (
      <div id="top">
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      </div>
    )
  }
  if (error || !data) {
    return (
      <div
        id="top"
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.maxW('5xl'), cm.mxAuto, cm.stack(4))}
      >
        <p className={cm.cn(cm.textCenter, 'text-error')}>
          {error ??
            t('auctionDetail.unavailable', {}, { defaultValue: 'This auction is unavailable.' })}
        </p>
        <Link
          to="/auctions"
          className={cm.cn(cm.textCenter, 'text-sm font-semibold text-primary hover:underline')}
        >
          {t('auctionDetail.backToAuctions', {}, { defaultValue: 'Back to all auctions →' })}
        </Link>
      </div>
    )
  }

  return (
    <div
      id="top"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}
    >
      {/* Breadcrumb */}
      <nav
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
        )}
        aria-label={t('auctionDetail.breadcrumbLabel', {}, { defaultValue: 'Breadcrumb' })}
      >
        <Link to="/auctions" className={cm.cn('hover:text-primary')}>
          {t('auctionDetail.crumbAuctions', {}, { defaultValue: 'Auctions' })}
        </Link>
        <span aria-hidden="true">/</span>
        <span>{data.category}</span>
        <span aria-hidden="true">/</span>
        <span className={cm.cn('text-on-surface')}>{data.lot}</span>
      </nav>

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-8')}>
        {/* Gallery */}
        <section className={cm.cn('lg:col-span-7 stack-y space-y-4')}>
          <div
            className={cm.cn(
              'relative aspect-[4/3] rounded-2xl overflow-hidden bg-surface-container border border-outline-variant/40',
            )}
          >
            {visible[activeImage]?.url ? (
              <img
                src={visible[activeImage].url ?? undefined}
                alt={visible[activeImage].alt}
                className={cm.cn('absolute inset-0 w-full h-full object-cover')}
              />
            ) : (
              <div
                className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'w-full h-full')}
                aria-label={visible[activeImage]?.alt}
                style={{ background: 'var(--color-surface-gradient)' }}
              >
                <span className={cm.cn('material-symbols-outlined text-7xl text-primary/60')}>
                  image
                </span>
              </div>
            )}
            <div className={cm.cn('absolute top-4 left-4')}>
              <AuctionStatusPill
                status={
                  data.status === 'closed' ? 'closed' : data.status === 'ending' ? 'ending' : 'live'
                }
              />
            </div>
            {!data.reserve_met ? (
              <div className={cm.cn('absolute top-4 right-4')}>
                <AuctionStatusPill status="reserve_not_met" />
              </div>
            ) : null}
          </div>
          {visible.length > 0 ? (
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'overflow-x-auto')}>
              {visible.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(idx)}
                  className={cm.cn(
                    'relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all shrink-0',
                    idx === activeImage
                      ? 'border-primary'
                      : 'border-outline-variant/40 hover:border-on-surface-variant',
                  )}
                  aria-label={img.alt}
                >
                  {img.url ? (
                    <img
                      src={img.url}
                      alt={img.alt}
                      className={cm.cn('w-full h-full object-cover')}
                    />
                  ) : (
                    <div
                      className={cm.cn('w-full h-full flex items-center justify-center')}
                      style={{
                        background:
                          'linear-gradient(135deg, var(--color-bid-panel), var(--mol-color-background-secondary))',
                      }}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-on-surface-variant')}
                        aria-hidden="true"
                      >
                        image
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        {/* Bid panel + details */}
        <section className={cm.cn('lg:col-span-5 space-y-6')}>
          <header className={cm.stack(2)}>
            <div className={cm.flex({ align: 'start', justify: 'between', gap: 'md' })}>
              <div className={cm.stack(2)}>
                <p className={cm.cn('text-xs font-black uppercase tracking-widest text-primary')}>
                  {data.category}
                </p>
                <h1 className={cm.cn('text-3xl font-extrabold tracking-tight')}>{data.title}</h1>
                <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>{data.lot}</p>
              </div>
              <button
                type="button"
                onClick={handleToggleWatch}
                disabled={watchPending}
                aria-pressed={watching}
                aria-label={
                  watching
                    ? t(
                        'auctionDetail.watchRemoveLabel',
                        {},
                        { defaultValue: 'Remove from watchlist' },
                      )
                    : t('auctionDetail.watchAddLabel', {}, { defaultValue: 'Save to watchlist' })
                }
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-full text-sm font-bold border transition-colors disabled:opacity-60',
                  watching
                    ? 'border-primary text-primary bg-primary/10'
                    : 'border-outline-variant text-on-surface hover:border-primary',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  {watching ? 'bookmark_added' : 'bookmark_add'}
                </span>
                {watching
                  ? t('auctionDetail.watching', {}, { defaultValue: 'Watching' })
                  : t('auctionDetail.watchAdd', {}, { defaultValue: 'Watch' })}
              </button>
            </div>
            {watchStatus.message ? (
              <p
                role="status"
                data-testid="watch-status"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-lg text-xs font-semibold',
                  watchStatus.kind === 'success'
                    ? 'text-success bg-success/10'
                    : 'text-error bg-error/10',
                )}
              >
                {watchStatus.message}
              </p>
            ) : null}
          </header>
          {bidStatus.kind !== 'idle' && bidStatus.message ? (
            <p
              role="status"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-lg text-sm font-semibold',
                bidStatus.kind === 'success'
                  ? 'text-success bg-success/10'
                  : 'text-error bg-error/10',
              )}
            >
              {bidStatus.message}
            </p>
          ) : null}
          <BidPanelCard
            endsAtIso={data.ends_at}
            currentBidCents={data.current_bid_cents}
            bidIncrementCents={data.bid_increment_cents}
            buyNowCents={data.buy_now_cents ?? undefined}
            bidCount={data.bid_count}
            status={data.status}
            onPlaceBid={handlePlaceBid}
            onBuyNow={handleBuyNow}
          />
          <div
            className={cm.cn(
              cm.sp('p', 5),
              'rounded-xl bg-surface border border-outline-variant/40 stack-y space-y-4',
            )}
          >
            <header className={cm.flex({ align: 'center', gap: 'sm' })}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'w-10 h-10 rounded-full text-white font-bold',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))',
                }}
                aria-hidden="true"
              >
                {data.seller.name.charAt(0)}
              </div>
              <div className={cm.stack(0)}>
                <Link
                  to={`/sellers/${data.seller.handle}`}
                  className={cm.cn('font-bold hover:underline')}
                >
                  {data.seller.name}
                </Link>
                {data.seller.sales > 0 ? (
                  <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
                    ★ {data.seller.rating.toFixed(2)} ·{' '}
                    {t(
                      'auctionDetail.sellerSales',
                      { count: data.seller.sales },
                      { defaultValue: '{{count}} sales' },
                    )}
                  </p>
                ) : null}
              </div>
            </header>
            <dl className={cm.cn('grid grid-cols-2 gap-3 text-sm')}>
              <div>
                <dt
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.textMuted,
                    'uppercase font-bold tracking-widest',
                  )}
                >
                  {t('auctionDetail.shippingFrom', {}, { defaultValue: 'Ships from' })}
                </dt>
                <dd className={cm.cn('font-semibold')}>{data.shipping_from}</dd>
              </div>
              <div>
                <dt
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.textMuted,
                    'uppercase font-bold tracking-widest',
                  )}
                >
                  {t('auctionDetail.returnWindow', {}, { defaultValue: 'Returns' })}
                </dt>
                <dd className={cm.cn('font-semibold')}>
                  {t(
                    'auctionDetail.returnDays',
                    { count: data.return_window_days },
                    { defaultValue: '{{count}} days' },
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      {/* Description + bid history */}
      <section className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-8')}>
        <article
          className={cm.cn(
            cm.sp('p', 6),
            'lg:col-span-7 rounded-xl bg-surface border border-outline-variant/40 stack-y space-y-3',
          )}
        >
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {t('auctionDetail.descriptionHeading', {}, { defaultValue: 'About this lot' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {data.description ||
              t(
                'auctionDetail.noDescription',
                {},
                { defaultValue: 'No description provided yet.' },
              )}
          </p>
        </article>
        <article
          className={cm.cn(
            cm.sp('p', 6),
            'lg:col-span-5 rounded-xl bg-surface border border-outline-variant/40 stack-y space-y-3',
          )}
        >
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {t('auctionDetail.bidHistoryHeading', {}, { defaultValue: 'Bid history' })}
          </h2>
          {data.bid_history.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t('auctionDetail.noBids', {}, { defaultValue: 'No bids yet — be the first.' })}
            </p>
          ) : (
            <ul className={cm.cn('divide-y divide-outline-variant')}>
              {data.bid_history.map((b) => (
                <li
                  key={b.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('py', 3),
                  )}
                  style={
                    b.you
                      ? {
                          background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)',
                          marginInline: '-0.5rem',
                          paddingInline: '0.5rem',
                          borderRadius: '0.5rem',
                        }
                      : undefined
                  }
                >
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <div
                      className={cm.cn(
                        'w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center',
                      )}
                      style={{
                        background: b.you
                          ? 'var(--mol-color-primary)'
                          : 'var(--mol-color-text-secondary)',
                      }}
                    >
                      {b.bidder.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className={cm.cn('text-sm font-bold text-on-surface')}>
                        {b.you ? t('nav.you', {}, { defaultValue: 'You' }) : b.bidder}
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
                        {fmtRelative(b.placed_at)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cm.cn('text-base font-extrabold tabular-nums')}
                    style={{ color: 'var(--mol-color-primary)' }}
                  >
                    {fmt(b.amount_cents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  )
}

export default AuctionDetail
