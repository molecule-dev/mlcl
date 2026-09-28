/**
 * Editorial venue listing card — `4:3` photograph, top-left badge stack
 * (instant_book / superhost / editor_pick / rare_find / new), top-right
 * floating bookmark heart, content block with venue name in DM Sans bold,
 * city · neighborhood · capacity, inline rating, and a price block
 * showing hourly OR daily (per DESIGN.md "never both simultaneously").
 *
 * Translated from hotel-booking's PropertyListingCard.tsx — same hover-
 * lift treatment, with venue-bookings-specific badges, capacity meta,
 * and dual-unit pricing where the unit color differentiates per/hour vs
 * per/day per DESIGN.md.
 *
 * Props match the venues.json + favorites.json fixture shapes.
 */

import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type RateKind = 'hour' | 'day'

export interface VenueListing {
  id: string
  venue_id?: string
  name: string
  subtitle?: string
  city: string
  neighborhood?: string
  country?: string
  venue_type?: string
  capacity?: number
  rating?: number
  review_count?: number
  rate_kind?: RateKind
  rate_unit_cents?: number
  hourly_rate_cents?: number | null
  daily_rate_cents?: number | null
  thumbnail_url?: string | null
  amenities?: string[]
  badges?: string[]
  instant_book?: boolean
  superhost?: boolean
}

const BADGE_THEME: Record<string, { bg: string; text: string; label: string }> = {
  editor_pick: { bg: 'bg-accent/95', text: 'text-on-primary', label: "Editor's pick" },
  rare_find: { bg: 'bg-warning-container', text: 'text-on-warning-container', label: 'Rare find' },
  new: { bg: 'bg-success-container', text: 'text-on-success-container', label: 'New' },
  instant_book: { bg: 'bg-info-container', text: 'text-on-info-container', label: 'Instant book' },
  superhost: {
    bg: 'bg-secondary-container',
    text: 'text-on-secondary-container',
    label: 'Superhost',
  },
}

function fmtPrice(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`
}

function getRate(v: VenueListing): { kind: RateKind; cents: number } | null {
  if (v.rate_kind && typeof v.rate_unit_cents === 'number') {
    return { kind: v.rate_kind, cents: v.rate_unit_cents }
  }
  if (typeof v.hourly_rate_cents === 'number' && v.hourly_rate_cents > 0) {
    return { kind: 'hour', cents: v.hourly_rate_cents }
  }
  if (typeof v.daily_rate_cents === 'number' && v.daily_rate_cents > 0) {
    return { kind: 'day', cents: v.daily_rate_cents }
  }
  return null
}

export function VenueListingCard({
  venue,
  bookmarked,
  onToggleBookmark,
  href,
}: {
  venue: VenueListing
  bookmarked?: boolean
  onToggleBookmark?: (id: string) => void
  href?: string
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const rate = getRate(venue)
  const target = href ?? `/venue/${venue.venue_id ?? venue.id}`

  const badgeStack: string[] = []
  if (venue.instant_book) badgeStack.push('instant_book')
  if (venue.superhost) badgeStack.push('superhost')
  for (const b of venue.badges ?? []) {
    if (badgeStack.length >= 2) break
    if (!badgeStack.includes(b)) badgeStack.push(b)
  }

  return (
    <Link
      to={target}
      className={cm.cn(
        'group relative block overflow-hidden rounded-2xl bg-surface shadow-sm hover:shadow-xl transition-all hover:-translate-y-0.5',
      )}
    >
      <div className={cm.cn('relative aspect-[4/3] overflow-hidden bg-surface-variant')}>
        {venue.thumbnail_url ? (
          <img
            src={venue.thumbnail_url}
            alt={t(
              'common.photographOf',
              { name: venue.name },
              { defaultValue: 'Photograph of {{name}}' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.h('full'),
              'object-cover transition-transform duration-500 group-hover:scale-105',
            )}
          />
        ) : null}

        {badgeStack.length > 0 ? (
          <div className={cm.cn('absolute top-3 left-3', cm.flex({ direction: 'col', gap: 'xs' }))}>
            {badgeStack.slice(0, 2).map((b) => {
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
                  {t(`venueListingCard.badge.${b}`, {}, { defaultValue: theme.label })}
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
              onToggleBookmark(venue.venue_id ?? venue.id)
            }}
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'absolute top-3 right-3 bg-surface/95 shadow-sm hover:scale-110 transition-transform',
            )}
            aria-label={t('venueListingCard.bookmarkAria', {}, { defaultValue: 'Save venue' })}
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
            className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'leading-tight truncate')}
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            {venue.name}
          </h3>
          {typeof venue.rating === 'number' ? (
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
              {venue.rating.toFixed(1)}
              {typeof venue.review_count === 'number' ? (
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  ({venue.review_count})
                </span>
              ) : null}
            </span>
          ) : null}
        </div>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {venue.neighborhood ? `${venue.neighborhood} · ${venue.city}` : venue.city}
          {typeof venue.capacity === 'number'
            ? ` · ${t('venueListingCard.capacity', { count: venue.capacity }, { defaultValue: 'up to {{count}} guests' })}`
            : null}
        </p>

        {venue.amenities && venue.amenities.length > 0 ? (
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mt', 3),
              'text-on-surface-variant line-clamp-1',
            )}
          >
            {venue.amenities.slice(0, 3).join(' · ')}
          </p>
        ) : null}

        <div className={cm.cn(cm.flex({ align: 'baseline', justify: 'between' }), cm.sp('mt', 4))}>
          {rate ? (
            <p>
              <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tabular-nums')}>
                {fmtPrice(rate.cents)}
              </span>
              <span
                className={cm.cn(
                  cm.sp('ml', 1),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  rate.kind === 'hour' ? 'text-indigo-600' : 'text-violet-600',
                )}
              >
                {rate.kind === 'hour'
                  ? t('venueListingCard.perHour', {}, { defaultValue: '/hr' })
                  : t('venueListingCard.perDay', {}, { defaultValue: '/day' })}
              </span>
            </p>
          ) : (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('venueListingCard.priceOnRequest', {}, { defaultValue: 'Price on request' })}
            </p>
          )}
          {venue.venue_type ? (
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                /* text-primary-dark — text-primary on the 10% primary tint
                   composites to 4.48:1 (axe color-contrast serious);
                   #1a3a35 on that tint is 10.86:1. */
                'uppercase tracking-widest rounded-md bg-primary/10 text-primary-dark',
              )}
            >
              {t(
                `venueListingCard.type.${venue.venue_type}`,
                {},
                { defaultValue: venue.venue_type },
              )}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
