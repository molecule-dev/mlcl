/**
 * Editorial property listing card — `4:3` photograph (DESIGN.md-mandated
 * aspect), top-left badge stack (editor_pick / rare_find / new), top-right
 * floating bookmark pill, and a content block with property name in serif,
 * city/country in a muted line, an inline star rating + review count, and
 * a price-per-night with tabular numerals.
 *
 * Translated from online-store's ProductCard.tsx hover-reveal treatment,
 * adapted for hospitality: photo aspect bumped to `4:3` (never square),
 * pill stack uses Auberge's deal/limited semantic palette, and price uses
 * `tabular-nums` per DESIGN.md typography rules.
 *
 * Props match the actual `properties.json` and `favorites.json` fixture
 * shapes — never invent fields.
 */

import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface PropertyListing {
  id: string
  name: string
  city: string
  country: string
  rating?: number
  review_count?: number
  price_per_night_cents: number
  thumbnail_url?: string | null
  amenities?: string[]
  badges?: string[]
}

const BADGE_THEME: Record<string, { bg: string; text: string; label: string }> = {
  editor_pick: { bg: 'bg-accent/95', text: 'text-on-accent', label: "Editor's pick" },
  rare_find: {
    bg: 'bg-amber-700',
    text: 'text-white',
    label: 'Rare find',
  } /* amber-700 (#b45309) = 5.02:1 vs white; amber-600 was 3.19:1 (fail) */,
  new: {
    bg: 'bg-emerald-700',
    text: 'text-white',
    label: 'New',
  } /* emerald-700 (#047857) = 5.48:1 vs white; emerald-600 was 3.77:1 (fail) */,
}

function fmtPrice(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`
}

export function PropertyListingCard({
  property,
  bookmarked,
  onToggleBookmark,
}: {
  property: PropertyListing
  bookmarked?: boolean
  onToggleBookmark?: (id: string) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <Link
      to={`/property/${property.id}`}
      className={cm.cn(
        'group relative block overflow-hidden rounded-2xl bg-surface shadow-sm hover:shadow-xl transition-all hover:-translate-y-0.5',
      )}
    >
      {/* Photo */}
      <div className={cm.cn('relative aspect-[4/3] overflow-hidden bg-surface-variant')}>
        {property.thumbnail_url ? (
          <img
            src={property.thumbnail_url}
            alt={t(
              'common.photographOf',
              { name: property.name },
              { defaultValue: 'Photograph of {{name}}' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.h('full'),
              'object-cover transition-transform duration-500 group-hover:scale-105',
            )}
          />
        ) : null}

        {/* Badge stack — top-left */}
        {property.badges && property.badges.length > 0 ? (
          <div className={cm.cn('absolute top-3 left-3', cm.flex({ direction: 'col', gap: 'xs' }))}>
            {property.badges.slice(0, 2).map((b) => {
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
                    'uppercase tracking-widest rounded-full backdrop-blur-md',
                    theme.bg,
                    theme.text,
                  )}
                >
                  {t(`propertyListingCard.badge.${b}`, {}, { defaultValue: theme.label })}
                </span>
              )
            })}
          </div>
        ) : null}

        {/* Bookmark — top-right */}
        {onToggleBookmark ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleBookmark(property.id)
            }}
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'absolute top-3 right-3 bg-surface/95 shadow-sm hover:scale-110 transition-transform',
            )}
            aria-label={t(
              'propertyListingCard.bookmarkAria',
              {},
              { defaultValue: 'Save property' },
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

      {/* Content */}
      <div className={cm.sp('p', 5)}>
        <div className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'sm' }))}>
          <h3
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('semibold'),
              'leading-tight truncate',
            )}
            style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
          >
            {property.name}
          </h3>
          {typeof property.rating === 'number' ? (
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'shrink-0',
              )}
            >
              <span
                className={'material-symbols-outlined text-base text-warning'}
                aria-hidden="true"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              {property.rating.toFixed(1)}
            </span>
          ) : null}
        </div>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {property.city}, {property.country}
        </p>

        {property.amenities && property.amenities.length > 0 ? (
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mt', 3),
              'text-on-surface-variant line-clamp-1',
            )}
          >
            {property.amenities.slice(0, 3).join(' · ')}
          </p>
        ) : null}

        <div className={cm.cn(cm.flex({ align: 'baseline', justify: 'between' }), cm.sp('mt', 4))}>
          <p>
            <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tabular-nums')}>
              {fmtPrice(property.price_per_night_cents)}
            </span>
            <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {' '}
              / {t('propertyListingCard.night', {}, { defaultValue: 'night' })}
            </span>
          </p>
          {typeof property.review_count === 'number' ? (
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'common.countReviews',
                { count: property.review_count },
                { defaultValue: '{{count}} reviews' },
              )}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
