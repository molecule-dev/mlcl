import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuctionStatusPill } from './AuctionStatusPill.js'
import { CountdownTimer } from './CountdownTimer.js'

/**
 * Bid panel — peach `bg-bid-panel` card with countdown bar, current bid in
 * 5xl extrabold orange, suggested bid increments, full-width Place Bid CTA,
 * optional Buy-Now in green.
 *
 * Translated from the Stitch Gavl auction-detail bid-panel + the polished
 * personal-finance hero card composition (gradient label / huge value
 * pattern). The signature on-screen feature for AuctionDetail.
 */
interface BidPanelCardProps {
  endsAtIso: string
  currentBidCents: number
  bidIncrementCents: number
  buyNowCents?: number
  bidCount: number
  status: 'live' | 'ending' | 'closed'
  onPlaceBid?: (amountCents: number) => void
  onBuyNow?: () => void
}

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export function BidPanelCard({
  endsAtIso,
  currentBidCents,
  bidIncrementCents,
  buyNowCents,
  bidCount,
  status,
  onPlaceBid,
  onBuyNow,
}: BidPanelCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [amountCents, setAmountCents] = useState(currentBidCents + bidIncrementCents)
  const closed = status === 'closed'

  const quickIncrements = [bidIncrementCents, bidIncrementCents * 2, bidIncrementCents * 5]

  return (
    <aside
      className={cm.cn(cm.sp('p', 6), cm.stack(5), 'rounded-2xl border shadow-md')}
      style={{ background: 'var(--color-bid-panel)', borderColor: 'var(--mol-color-border)' }}
    >
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <AuctionStatusPill
          status={status === 'closed' ? 'closed' : status === 'ending' ? 'ending' : 'live'}
        />
        <CountdownTimer endsAtIso={endsAtIso} size="md" showLabel={false} />
      </div>

      <div className={cm.stack(1)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            'font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('bidPanelCard.currentBid', {}, { defaultValue: 'Current bid' })}
        </p>
        <p
          className={cm.cn('text-5xl font-extrabold tracking-tighter tabular-nums')}
          style={{ color: 'var(--mol-color-primary)' }}
        >
          {fmt(currentBidCents)}
        </p>
        <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
          {t(
            'bidPanelCard.bidCount',
            { count: bidCount, inc: fmt(bidIncrementCents) },
            { defaultValue: '{{count}} bids · increment {{inc}}' },
          )}
        </p>
      </div>

      {!closed ? (
        <>
          <div className={cm.stack(2)}>
            <label
              htmlFor="bid-amount"
              className={cm.cn(
                cm.textSize('xs'),
                'font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('bidPanelCard.amountLabel', {}, { defaultValue: 'Your bid' })}
            </label>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                'rounded-lg bg-surface border border-outline-variant px-4 py-3 focus-within:border-primary',
              )}
            >
              <span className={cm.cn('text-on-surface-variant font-bold')}>$</span>
              <input
                id="bid-amount"
                type="number"
                min={(currentBidCents + bidIncrementCents) / 100}
                value={Math.round(amountCents / 100)}
                onChange={(e) => setAmountCents(Math.round(Number(e.target.value) * 100))}
                className={cm.cn(
                  'flex-1 bg-transparent border-none focus:outline-none text-xl font-bold tabular-nums text-on-surface',
                )}
              />
            </div>
            <div className={cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' })}>
              {quickIncrements.map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => setAmountCents(currentBidCents + inc)}
                  className={cm.cn(
                    cm.textSize('xs'),
                    // min-h-11 keeps the quick-increment chips tappable on phones.
                    'px-4 min-h-11 rounded-full font-semibold border border-outline-variant hover:border-primary hover:text-primary transition-colors',
                  )}
                >
                  +{fmt(inc)}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onPlaceBid?.(amountCents)}
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 4),
              cm.fontWeight('bold'),
              cm.textSize('lg'),
              'rounded-lg text-white shadow-md shadow-primary/30 hover:shadow-lg active:scale-95 transition-all',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--mol-color-primary), var(--color-primary-gradient-end))',
            }}
          >
            {t('bidPanelCard.placeBid', {}, { defaultValue: 'Place bid' })}
          </button>

          {buyNowCents ? (
            <button
              type="button"
              onClick={onBuyNow}
              className={cm.cn(
                cm.w('full'),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('base'),
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                'rounded-lg text-white hover:brightness-105 transition-all',
              )}
              style={{ background: 'var(--color-accent)' }}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                bolt
              </span>
              {t(
                'bidPanelCard.buyNow',
                { price: fmt(buyNowCents) },
                { defaultValue: 'Buy now for {{price}}' },
              )}
            </button>
          ) : null}
        </>
      ) : (
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.textCenter,
            cm.sp('py', 3),
            'rounded-lg bg-surface text-on-surface-variant',
          )}
        >
          {t('bidPanelCard.auctionClosed', {}, { defaultValue: 'This auction has ended.' })}
        </p>
      )}
    </aside>
  )
}

export default BidPanelCard
