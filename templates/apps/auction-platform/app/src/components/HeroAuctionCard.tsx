import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CountdownTimer } from './CountdownTimer.js'

/**
 * Featured auction hero — gradient peach card with rotated "Ending soon"
 * ribbon, countdown bar, oversized current bid, place-bid CTA. Used on the
 * Landing hero (logged-out preview) and as the SellerProfile spotlight.
 *
 * Translated from the Stitch Gavl baseline featured-auction tile + the
 * personal-finance NetWorthCard hero composition.
 */
interface HeroAuctionCardProps {
  id: string
  title: string
  lot: string
  category: string
  imageUrl?: string
  imageAlt: string
  currentBidCents: number
  bidCount: number
  endsAtIso: string
  ribbonLabel?: string
}

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export function HeroAuctionCard({
  id,
  title,
  lot,
  category,
  imageUrl,
  imageAlt,
  currentBidCents,
  bidCount,
  endsAtIso,
  ribbonLabel,
}: HeroAuctionCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const placeholder = !imageUrl
  return (
    <div className={cm.cn('relative w-full max-w-lg')}>
      <div
        className={cm.cn('absolute -inset-1 rounded-[2rem] blur-2xl opacity-30')}
        style={{
          background: 'linear-gradient(135deg, var(--mol-color-primary), var(--color-accent))',
        }}
        aria-hidden="true"
      />
      <article
        className={cm.cn(
          'relative bg-surface rounded-[2rem] overflow-hidden shadow-2xl shadow-primary/20 border border-outline-variant/40',
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
              <span className={cm.cn('material-symbols-outlined text-7xl text-primary/60')}>
                image
              </span>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt={imageAlt}
              className={cm.cn('absolute inset-0 w-full h-full object-cover')}
            />
          )}

          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'absolute top-4 left-4 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-widest text-white shadow-md',
            )}
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              groups
            </span>
            {t('heroAuctionCard.bidCount', { count: bidCount }, { defaultValue: '{{count}} bids' })}
          </div>

          <div
            className={cm.cn(
              'absolute top-4 right-[-32px] w-36 text-center transform rotate-45 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-md',
            )}
            style={{ backgroundColor: 'var(--color-urgent)' }}
          >
            {ribbonLabel ?? t('heroAuctionCard.endingSoon', {}, { defaultValue: 'Ending soon' })}
          </div>

          <div
            className={cm.cn(
              'absolute inset-x-0 bottom-0 p-3 bg-foreground/85 backdrop-blur-sm border-t border-surface/10 flex items-center justify-between',
            )}
          >
            <CountdownTimer endsAtIso={endsAtIso} size="md" showLabel />
          </div>
        </div>

        <div
          className={cm.cn(cm.sp('p', 6), cm.stack(4))}
          style={{
            background: 'linear-gradient(135deg, var(--color-bid-panel), var(--mol-color-surface))',
          }}
        >
          <div className={cm.stack(1)}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {category}
            </p>
            <h3 className={cm.cn('text-2xl font-extrabold tracking-tight text-on-surface')}>
              {title}
            </h3>
            <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>{lot}</p>
          </div>
          <div className={cm.flex({ align: 'end', justify: 'between' })}>
            <div className={cm.stack(1)}>
              <span
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('heroAuctionCard.currentBid', {}, { defaultValue: 'Current bid' })}
              </span>
              <span
                className={cm.cn('text-4xl font-extrabold tabular-nums tracking-tight')}
                style={{ color: 'var(--mol-color-primary)' }}
              >
                {fmt(currentBidCents)}
              </span>
            </div>
            <Link
              to={`/auctions/${id}`}
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                'rounded-lg text-white shadow-md shadow-primary/30 hover:shadow-lg active:scale-95 transition-all',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--mol-color-primary), var(--color-primary-gradient-end))',
              }}
            >
              {t('heroAuctionCard.placeBid', {}, { defaultValue: 'Place bid' })}
            </Link>
          </div>
        </div>
      </article>
    </div>
  )
}

export default HeroAuctionCard
