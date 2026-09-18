/**
 * Editorial restaurant listing card — `16:10` photograph (DESIGN.md
 * mandated aspect for cards), top-left badge stack (editor_pick /
 * trending / new), top-right circular bookmark button, distance pill
 * bottom-left of the image, and a content block with restaurant name in
 * serif, cuisine + neighborhood in a muted line, and an inline star
 * rating + price level row.
 *
 * Translated from hotel-booking's PropertyListingCard.tsx — same hover
 * lift, same badge slot, but tuned for restaurants: image aspect bumped
 * to `16:10` (per DESIGN.md), rating row uses Morsel's StarRating
 * primitive (saffron-gold), price uses the four-glyph PriceLevel.
 *
 * Props mirror the shape that `mlcl/templates/apps/restaurant-review/api/handlers/restaurants/list.ts`
 * is expected to return — never invent fields beyond the documented
 * resource interface.
 */

import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PriceLevel } from './PriceLevel.js'
import { StarRating } from './StarRating.js'

export interface RestaurantSummary {
  id: string
  name: string
  cuisine: string
  neighborhood: string
  city?: string
  rating?: number
  review_count?: number
  price_level?: number
  thumbnail_url?: string | null
  distance_km?: number | null
  badges?: string[]
  open_now?: boolean
}

const BADGE_THEME: Record<string, { bg: string; text: string; label: string }> = {
  /* text-on-primary (white) on the gold accent was 2.38:1 (fail) — the theme's
     documented pairing for gold is the dark ink on-secondary (#1a0d00 = 8.03:1). */
  editor_pick: { bg: 'bg-accent', text: 'text-on-secondary', label: "Editor's pick" },
  trending: { bg: 'bg-primary', text: 'text-white', label: 'Trending' },
  new: { bg: 'bg-emerald-700', text: 'text-white', label: 'New' },
  hidden_gem: { bg: 'bg-amber-700', text: 'text-white', label: 'Hidden gem' },
  michelin: { bg: 'bg-rose-700', text: 'text-white', label: 'Michelin' },
}

export function RestaurantListingCard({
  restaurant,
  bookmarked,
  onToggleBookmark,
}: {
  restaurant: RestaurantSummary
  bookmarked?: boolean
  onToggleBookmark?: (id: string) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <Link
      to={`/restaurants/${restaurant.id}`}
      className={cm.cn(
        'group relative block overflow-hidden rounded-2xl bg-surface shadow-sm hover:shadow-xl transition-all hover:-translate-y-0.5 border border-outline-variant/40',
      )}
    >
      <div className={cm.cn('relative aspect-[16/10] overflow-hidden bg-surface-variant')}>
        {restaurant.thumbnail_url ? (
          <img
            src={restaurant.thumbnail_url}
            alt={t(
              'common.photographOf',
              { name: restaurant.name },
              { defaultValue: 'Photograph of {{name}}' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.h('full'),
              'object-cover transition-transform duration-500 group-hover:scale-105',
            )}
          />
        ) : (
          <div
            className={cm.cn(
              cm.w('full'),
              cm.h('full'),
              cm.flex({ align: 'center', justify: 'center' }),
              'bg-surface-variant text-on-surface-variant/40',
            )}
          >
            <span className="material-symbols-outlined text-5xl" aria-hidden="true">
              restaurant
            </span>
          </div>
        )}

        {restaurant.badges && restaurant.badges.length > 0 ? (
          <div className={cm.cn('absolute top-3 left-3', cm.flex({ direction: 'col', gap: 'xs' }))}>
            {restaurant.badges.slice(0, 2).map((b) => {
              const theme = BADGE_THEME[b] ?? {
                bg: 'bg-primary',
                text: 'text-on-primary',
                label: b,
              }
              return (
                <span
                  key={b}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest rounded-full backdrop-blur-md shadow-sm',
                    theme.bg,
                    theme.text,
                  )}
                >
                  {t(`restaurantListingCard.badge.${b}`, {}, { defaultValue: theme.label })}
                </span>
              )
            })}
          </div>
        ) : null}

        {typeof restaurant.distance_km === 'number' ? (
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'absolute bottom-3 left-3 rounded-full bg-foreground/60 text-white backdrop-blur-md',
            )}
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
              near_me
            </span>
            {t(
              'restaurantListingCard.distance',
              { km: restaurant.distance_km.toFixed(1) },
              { defaultValue: '{{km}} km' },
            )}
          </span>
        ) : null}

        {onToggleBookmark ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleBookmark(restaurant.id)
            }}
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'absolute top-3 right-3 bg-surface/95 shadow-sm hover:scale-110 transition-transform',
            )}
            aria-label={t(
              'restaurantListingCard.bookmarkAria',
              {},
              { defaultValue: 'Save restaurant' },
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-primary')}
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
            className={cm.cn(cm.textSize('xl'), 'leading-tight truncate text-on-surface')}
            style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
          >
            {restaurant.name}
          </h3>
          {restaurant.open_now !== undefined ? (
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'py-0.5 uppercase tracking-widest rounded-full whitespace-nowrap shrink-0',
                restaurant.open_now
                  ? 'text-success bg-success-light'
                  : 'text-on-surface-variant bg-surface-container',
              )}
            >
              {restaurant.open_now
                ? t('common.open', {}, { defaultValue: 'Open' })
                : t('restaurantListingCard.closed', {}, { defaultValue: 'Closed' })}
            </span>
          ) : null}
        </div>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {restaurant.cuisine} · {restaurant.neighborhood}
          {restaurant.city ? `, ${restaurant.city}` : ''}
        </p>

        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            cm.sp('mt', 4),
          )}
        >
          {typeof restaurant.rating === 'number' ? (
            <StarRating value={restaurant.rating} reviewCount={restaurant.review_count} size="sm" />
          ) : (
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant italic')}>
              {t('restaurantListingCard.noRating', {}, { defaultValue: 'No reviews yet' })}
            </span>
          )}
          {typeof restaurant.price_level === 'number' ? (
            <PriceLevel level={restaurant.price_level} size="sm" />
          ) : null}
        </div>
      </div>
    </Link>
  )
}
