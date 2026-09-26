/**
 * Editorial rental listing card — `4:3` photograph, top-left badge stack
 * (superhost / instant_book / rare_find), top-right floating heart bookmark,
 * and a content block with property name in DM Sans, city/country in a muted
 * line, inline star rating + review count, and a tabular-nums price-per-night
 * (per Roost DESIGN.md §Listing Card and §Star Rating).
 *
 * Translated from travel-booking's PropertyListingCard.tsx — same shape,
 * adapted for Roost's "Stay like you belong" voice (warmer copy, terracotta
 * heart fill, teal star, and the marketplace-specific superhost gold pill).
 *
 * Props match `listings.json` and `wishlist.json` fixture shapes — never
 * invent fields.
 */

import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Listing {
  id: string
  title: string
  city: string
  country: string
  rating?: number
  review_count?: number
  price_per_night_cents: number
  thumbnail_url?: string | null
  amenities?: string[]
  badges?: string[]
}

const BADGE_THEME: Record<string, { className: string; label: string; icon?: string }> = {
  superhost: {
    className: 'bg-[--color-superhost] text-[--color-surface]',
    label: 'Superhost',
    icon: 'workspace_premium',
  },
  instant_book: {
    className: 'bg-[--color-instant-book] text-[--color-surface]',
    label: 'Instant book',
    icon: 'bolt',
  },
  rare_find: { className: 'bg-accent text-on-primary', label: 'Rare find', icon: 'auto_awesome' },
  new: { className: 'bg-[--color-success] text-[--color-surface]', label: 'New' },
  deal: { className: 'bg-[--color-deal] text-[--color-surface]', label: 'Deal' },
  // The API emits these too (api/src/handlers/_seed.ts, _decorate.ts) —
  // without an entry the fallback label IS the raw badge key, so the pill
  // renders "EDITOR_PICK" and the audits flag it as a leaked i18n key.
  editor_pick: {
    className: 'bg-[--color-superhost] text-[--color-surface]',
    label: "Editor's pick",
    icon: 'star',
  },
  frequently_booked: {
    className: 'bg-[--color-instant-book] text-[--color-surface]',
    label: 'Frequently booked',
  },
}

function fmtPrice(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`
}

export function RoostListingCard({
  listing,
  bookmarked,
  onToggleBookmark,
}: {
  listing: Listing
  bookmarked?: boolean
  onToggleBookmark?: (id: string) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <Link
      to={`/listings/${listing.id}`}
      className={cm.cn(
        'group relative block overflow-hidden rounded-2xl bg-surface shadow-sm hover:shadow-xl transition-all hover:-translate-y-0.5 border border-transparent hover:border-primary/30',
      )}
    >
      <div className={cm.cn('relative aspect-[4/3] overflow-hidden bg-surface-variant')}>
        {listing.thumbnail_url ? (
          <img
            src={listing.thumbnail_url}
            alt={t(
              'common.photographOf',
              { name: listing.title },
              { defaultValue: 'Photograph of {{name}}' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.h('full'),
              'object-cover transition-transform duration-500 group-hover:scale-105',
            )}
          />
        ) : null}

        {listing.badges && listing.badges.length > 0 ? (
          <div className={cm.cn('absolute top-3 left-3', cm.flex({ direction: 'col', gap: 'xs' }))}>
            {listing.badges.slice(0, 2).map((b) => {
              const theme = BADGE_THEME[b] ?? { className: 'bg-primary text-on-primary', label: b }
              return (
                <span
                  key={b}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.flex({ align: 'center', gap: 'xs' }),
                    'uppercase tracking-widest rounded-full backdrop-blur-md shadow-sm',
                    theme.className,
                  )}
                >
                  {theme.icon ? (
                    <span
                      className={'material-symbols-outlined text-sm'}
                      aria-hidden="true"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {theme.icon}
                    </span>
                  ) : null}
                  {t(`roostListingCard.badge.${b}`, {}, { defaultValue: theme.label })}
                </span>
              )
            })}
          </div>
        ) : null}

        {onToggleBookmark ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleBookmark(listing.id)
            }}
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'absolute top-3 right-3 bg-surface/95 shadow-sm hover:scale-110 transition-transform',
            )}
            aria-label={t('roostListingCard.bookmarkAria', {}, { defaultValue: 'Save listing' })}
          >
            <span
              className={cm.cn('material-symbols-outlined text-accent')}
              style={{ fontVariationSettings: bookmarked ? "'FILL' 1" : "'FILL' 0" }}
              aria-hidden="true"
            >
              favorite
            </span>
          </button>
        ) : null}
      </div>

      <div className={cm.sp('p', 5)}>
        <div className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'sm' }))}>
          <h3
            className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'leading-tight truncate')}
            style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
          >
            {listing.title}
          </h3>
          {typeof listing.rating === 'number' ? (
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'shrink-0',
              )}
            >
              <span
                className={'material-symbols-outlined text-base'}
                aria-hidden="true"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              {listing.rating.toFixed(2)}
            </span>
          ) : null}
        </div>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {listing.city}, {listing.country}
        </p>

        {listing.amenities && listing.amenities.length > 0 ? (
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mt', 3),
              'text-on-surface-variant line-clamp-1',
            )}
          >
            {listing.amenities.slice(0, 3).join(' · ')}
          </p>
        ) : null}

        <div className={cm.cn(cm.flex({ align: 'baseline', justify: 'between' }), cm.sp('mt', 4))}>
          <p>
            <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tabular-nums')}>
              {fmtPrice(listing.price_per_night_cents)}
            </span>
            <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {' '}
              / {t('roostListingCard.night', {}, { defaultValue: 'night' })}
            </span>
          </p>
          {typeof listing.review_count === 'number' && listing.review_count > 0 ? (
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'common.countReviews',
                { count: listing.review_count },
                { defaultValue: '{{count}} reviews' },
              )}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
