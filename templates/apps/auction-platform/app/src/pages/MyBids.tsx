import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type AuctionStatus, AuctionStatusPill } from '../components/AuctionStatusPill.js'
import { CountdownTimer } from '../components/CountdownTimer.js'
import { StatCard } from '../components/StatCard.js'

interface MyBid {
  id: string
  auction_id: string
  title: string
  category: string
  my_bid_cents: number
  current_bid_cents: number
  bid_count: number
  ends_at: string
  status: 'winning' | 'outbid' | 'won' | 'lost'
}

type Tab = 'active' | 'won' | 'lost'

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function parseTab(hash: string): Tab {
  const v = hash.replace(/^#/, '')
  return v === 'won' || v === 'lost' ? v : 'active'
}

export function MyBids() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const location = useLocation()
  const navigate = useNavigate()
  const tab = parseTab(location.hash)
  const setTab = (next: Tab) => {
    navigate({ pathname: '/my-bids', hash: `#${next}` })
  }
  const [items, setItems] = useState<MyBid[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setItems(null)
    setError(null)
    http
      .get<{ data?: MyBid[] }>('/api/my-bids')
      .then((res) => {
        if (cancelled) return
        const list = (res.data?.data ?? []) as MyBid[]
        setItems(list)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('myBids.error', {}, { defaultValue: 'Could not load your bids.' }),
        )
        setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- safeItems is a stable-reference guard; wrapping in useMemo would be circular
  const safeItems = items ?? []

  const filtered = useMemo(
    () =>
      safeItems.filter((b) => {
        if (tab === 'active') return b.status === 'winning' || b.status === 'outbid'
        if (tab === 'won') return b.status === 'won'
        return b.status === 'lost'
      }),
    [safeItems, tab],
  )

  const stats = useMemo(() => {
    const winning = safeItems.filter((i) => i.status === 'winning').length
    const outbid = safeItems.filter((i) => i.status === 'outbid').length
    const won = safeItems.filter((i) => i.status === 'won').length
    const totalSpent = safeItems
      .filter((i) => i.status === 'won')
      .reduce((sum, i) => sum + i.my_bid_cents, 0)
    return { winning, outbid, won, totalSpent }
  }, [safeItems])

  return (
    <div
      id="top"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}
    >
      <header className={cm.stack(2)}>
        <p className={cm.cn('text-xs font-black uppercase tracking-widest text-primary')}>
          {t('myBids.eyebrow', {}, { defaultValue: 'Your activity' })}
        </p>
        <h1 className={cm.cn('text-4xl font-extrabold tracking-tight')}>
          {t('myBids.heading', {}, { defaultValue: 'My bids' })}
        </h1>
      </header>

      <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 sm:grid-cols-4')}>
        <StatCard
          label={t('myBids.statWinning', {}, { defaultValue: 'Winning' })}
          value={String(stats.winning)}
          icon="how_to_vote"
          accent="accent"
        />
        <StatCard
          label={t('myBids.statOutbid', {}, { defaultValue: 'Outbid' })}
          value={String(stats.outbid)}
          icon="block"
          accent="urgent"
        />
        <StatCard
          label={t('myBids.statWon', {}, { defaultValue: 'Won' })}
          value={String(stats.won)}
          icon="celebration"
          accent="primary"
        />
        <StatCard
          label={t('myBids.statSpent', {}, { defaultValue: 'Total spent' })}
          value={fmt(stats.totalSpent)}
          icon="payments"
          accent="neutral"
        />
      </section>

      <section
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          'border-b border-outline-variant/40',
        )}
      >
        {(['active', 'won', 'lost'] as const).map((k) => {
          const active = k === tab
          const label = t(
            `myBids.tab.${k}`,
            {},
            { defaultValue: k.charAt(0).toUpperCase() + k.slice(1) },
          )
          if (active) {
            return (
              <span
                key={k}
                aria-current="true"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'text-sm font-bold tracking-tight border-b-2 text-primary',
                )}
                style={{ borderBottomColor: 'var(--mol-color-primary)' }}
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
                cm.sp('px', 4),
                cm.sp('py', 3),
                'text-sm font-bold tracking-tight border-b-2 transition-colors',
                'text-on-surface-variant border-transparent hover:text-on-surface',
              )}
            >
              {label}
            </button>
          )
        })}
      </section>

      {items === null ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, cm.textMuted)}>
          {t('myBids.loading', {}, { defaultValue: 'Loading your bids…' })}
        </p>
      ) : error ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-error')}>{error}</p>
      ) : filtered.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 12), cm.textCenter, cm.stack(2))}>
          <span
            className={cm.cn('material-symbols-outlined text-5xl text-on-surface-variant mx-auto')}
            aria-hidden="true"
          >
            how_to_vote
          </span>
          <p className={cm.cn('font-bold')}>
            {t('myBids.emptyTab', {}, { defaultValue: 'No bids in this tab yet.' })}
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
            {t('myBids.browseCta', {}, { defaultValue: 'Browse live auctions →' })}
          </Link>
        </div>
      ) : (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-xl bg-surface border border-outline-variant/40 overflow-x-auto',
          )}
        >
          <table className={cm.cn(cm.w('full'), 'text-sm')}>
            <thead>
              <tr
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/40',
                )}
              >
                <th className={cm.cn('text-left', cm.sp('py', 3))}>
                  {t('myBids.col.item', {}, { defaultValue: 'Item' })}
                </th>
                <th className={cm.cn('text-left', cm.sp('py', 3))}>
                  {t('nav.status', {}, { defaultValue: 'Status' })}
                </th>
                <th className={cm.cn(cm.textRight, cm.sp('py', 3))}>
                  {t('myBids.col.myBid', {}, { defaultValue: 'My bid' })}
                </th>
                <th className={cm.cn(cm.textRight, cm.sp('py', 3))}>
                  {t('nav.current', {}, { defaultValue: 'Current' })}
                </th>
                <th className={cm.cn(cm.textRight, cm.sp('py', 3))}>
                  {t('myBids.col.endsIn', {}, { defaultValue: 'Ends' })}
                </th>
                <th className={cm.cn(cm.textRight, cm.sp('py', 3))}>
                  {t('myBids.col.action', {}, { defaultValue: 'Action' })}
                </th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-outline-variant/40')}>
              {filtered.map((b) => {
                const isWinning = b.status === 'winning'
                const isOutbid = b.status === 'outbid'
                return (
                  <tr
                    key={b.id}
                    className={cm.cn('hover:bg-surface-container-low transition-colors')}
                  >
                    <td className={cm.sp('py', 4)}>
                      <Link to={`/auctions/${b.auction_id}`} className="block">
                        <p className={cm.cn('font-bold text-on-surface')}>{b.title}</p>
                        <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>{b.category}</p>
                      </Link>
                    </td>
                    <td className={cm.sp('py', 4)}>
                      <AuctionStatusPill status={b.status as AuctionStatus} />
                    </td>
                    <td className={cm.cn(cm.textRight, cm.sp('py', 4), 'font-bold tabular-nums')}>
                      {fmt(b.my_bid_cents)}
                    </td>
                    <td
                      className={cm.cn(
                        cm.textRight,
                        cm.sp('py', 4),
                        'tabular-nums',
                        isOutbid ? 'text-error' : 'text-on-surface-variant',
                      )}
                    >
                      {fmt(b.current_bid_cents)}
                    </td>
                    <td className={cm.cn(cm.textRight, cm.sp('py', 4))}>
                      {b.status === 'won' || b.status === 'lost' ? (
                        <span className={cm.textMuted}>
                          {new Date(b.ends_at).toLocaleDateString()}
                        </span>
                      ) : (
                        <CountdownTimer endsAtIso={b.ends_at} size="sm" showLabel={false} />
                      )}
                    </td>
                    <td className={cm.cn(cm.textRight, cm.sp('py', 4))}>
                      {b.status === 'won' ? (
                        <Link
                          to={`/my-bids/won/${b.auction_id}/checkout`}
                          className={cm.cn(
                            cm.sp('px', 4),
                            cm.sp('py', 2),
                            'rounded-full text-xs font-bold text-white',
                          )}
                          style={{ background: 'var(--color-accent)' }}
                        >
                          {t('myBids.checkoutCta', {}, { defaultValue: 'Pay now' })}
                        </Link>
                      ) : isWinning ? (
                        <Link
                          to={`/auctions/${b.auction_id}`}
                          className={cm.cn('text-xs font-bold text-primary hover:underline')}
                        >
                          {t('myBids.viewLot', {}, { defaultValue: 'View lot →' })}
                        </Link>
                      ) : isOutbid ? (
                        <Link
                          to={`/auctions/${b.auction_id}`}
                          className={cm.cn(
                            cm.sp('px', 3),
                            cm.sp('py', 1),
                            'rounded-full text-xs font-bold text-white',
                          )}
                          style={{
                            background:
                              'linear-gradient(135deg, var(--mol-color-primary), var(--color-primary-gradient-end))',
                          }}
                        >
                          {t('myBids.bidAgain', {}, { defaultValue: 'Bid again' })}
                        </Link>
                      ) : (
                        <Link
                          to={`/auctions/${b.auction_id}`}
                          className={cm.cn(
                            'text-xs font-semibold text-on-surface-variant hover:text-on-surface',
                          )}
                        >
                          {t('myBids.viewLot', {}, { defaultValue: 'View lot →' })}
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}

export default MyBids
