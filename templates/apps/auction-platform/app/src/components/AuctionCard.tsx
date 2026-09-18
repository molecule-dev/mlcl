import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CountdownTimer } from './CountdownTimer.js'

/**
 * Auction grid card — 4:3 image with timer overlay, bid count chip, optional
 * status ribbon, body with title + lot subtitle + current bid in primary
 * orange + bidders count.
 *
 * Translated from online-store's CategoryProductCard treatment + the Stitch
 * Gavl baseline auction-card. Used in BrowseAuctions, Watchlist,
 * SellerProfile, and the Landing "Live now" strip.
 */
interface AuctionCardProps {
  id: string
  title: string
  lot: string
  category: string
  imageUrl?: string
  imageAlt: string
  currentBidCents: number
  bidCount: number
  endsAtIso: string
  status?: 'live' | 'ending' | 'closed' | 'reserve_not_met'
  badge?: string
}

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function ribbonStyle(status?: AuctionCardProps['status']): { bg: string; label: string } | null {
  switch (status) {
    case 'live':
      return { bg: 'var(--color-status-live-fg)', label: 'Live' }
    case 'ending':
      return { bg: 'var(--color-status-ending-fg)', label: 'Ending' }
    case 'reserve_not_met':
      return { bg: 'var(--color-status-neutral-fg)', label: 'Reserve' }
    case 'closed':
      return { bg: 'var(--color-status-closed-fg)', label: 'Closed' }
    default:
      return null
  }
}

export function AuctionCard({
  id,
  title,
  lot,
  category,
  imageUrl,
  imageAlt,
  currentBidCents,
  bidCount,
  endsAtIso,
  status = 'live',
  badge,
}: AuctionCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const ribbon = ribbonStyle(status)
  const placeholder = !imageUrl

  return (
    <Link
      to={`/auctions/${id}`}
      className={cm.cn(
        'group relative overflow-hidden bg-surface rounded-xl border border-outline-variant/40',
        'shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all',
      )}
    >
      <div className={cm.cn('relative aspect-[4/3] bg-surface-container overflow-hidden')}>
        {placeholder ? (
          <div
            className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'w-full h-full')}
            aria-hidden="true"
            style={{
              background:
                'linear-gradient(135deg, var(--color-bid-panel), var(--mol-color-background-secondary))',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-6xl text-primary/60')}>
              image
            </span>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={imageAlt}
            className={cm.cn(
              'absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500',
            )}
          />
        )}

        {/* Bid count chip */}
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            'absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest text-white shadow-sm',
          )}
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          <span className={cm.cn('material-symbols-outlined text-[12px]')} aria-hidden="true">
            groups
          </span>
          {t('auctionCard.bidCount', { count: bidCount }, { defaultValue: '{{count}} bids' })}
        </div>

        {ribbon ? (
          <div
            className={cm.cn(
              'absolute top-3 right-[-32px] w-32 text-center transform rotate-45 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-md',
            )}
            style={{ backgroundColor: ribbon.bg }}
          >
            {badge ?? t(`auctionCard.ribbon.${status}`, {}, { defaultValue: ribbon.label })}
          </div>
        ) : null}

        {/* Timer overlay along the bottom of the image */}
        <div
          className={cm.cn(
            'absolute inset-x-0 bottom-0 px-3 py-2 bg-foreground/85 backdrop-blur-sm border-t border-surface/10',
          )}
        >
          <CountdownTimer endsAtIso={endsAtIso} size="sm" variant="overlay" showLabel />
        </div>
      </div>

      <div className={cm.cn(cm.sp('p', 4), cm.stack(2))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            'uppercase tracking-widest font-bold text-on-surface-variant',
          )}
        >
          {category}
        </p>
        <h3
          className={cm.cn(
            cm.textSize('base'),
            'font-bold leading-snug line-clamp-2 text-on-surface',
          )}
        >
          {title}
        </h3>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <span className={cm.cn(cm.textSize('xs'), cm.textMuted)}>{lot}</span>
          <div className={cm.flex({ direction: 'col', align: 'end' })}>
            <span
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auctionCard.currentBid', {}, { defaultValue: 'Current bid' })}
            </span>
            <span className={cm.cn('text-lg font-extrabold text-primary tabular-nums')}>
              {fmt(currentBidCents)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default AuctionCard
