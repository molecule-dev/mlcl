/**
 * Editorial review-excerpt card — author avatar + name + posted-date
 * line, an inline StarRating, a serif-italic pull-quote in Lora (per
 * DESIGN.md typography), the restaurant name as a hover-link, an
 * optional photo strip across the bottom (5 thumbs + "+N" overflow),
 * and a thumbs-up Helpful chip.
 *
 * Translated from blog/CommentItem*.tsx editorial-comment treatment +
 * crm/ActivityFeed.tsx avatar-row pattern, tuned for restaurant
 * reviews: the body uses the brand's review font (Lora italic), the
 * rating fills with saffron-gold via StarRating, and photos render as
 * 80px tiles with 8px radius (matching DESIGN.md "Review Card" specs).
 */

import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StarRating } from './StarRating.js'

export interface ReviewExcerpt {
  id: string
  rating: number
  body: string
  posted_at: string
  helpful_count?: number
  photo_urls?: string[]
  author: {
    id: string
    name: string
    avatar_url?: string | null
    review_count?: number
  }
  restaurant: {
    id: string
    name: string
    cuisine?: string
  }
}

function formatPostedDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch (_error) {
    // Date constructor threw on a malformed ISO string; return the raw value as fallback
    return iso
  }
}

export function ReviewExcerptCard({
  review,
  onMarkHelpful,
}: {
  review: ReviewExcerpt
  onMarkHelpful?: (id: string) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const photos = review.photo_urls ?? []
  const visiblePhotos = photos.slice(0, 5)
  const overflow = Math.max(0, photos.length - 5)

  return (
    <article
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface rounded-2xl border border-outline-variant/40 shadow-sm hover:shadow-md transition-shadow',
      )}
    >
      <header className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}>
        <Link
          to={`/users/${review.author.id}`}
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
        >
          <span
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'overflow-hidden bg-primary-container text-on-primary-container shrink-0',
            )}
            aria-hidden="true"
          >
            {review.author.avatar_url ? (
              <img
                src={review.author.avatar_url}
                alt=""
                className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
              />
            ) : (
              <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
                {review.author.name.charAt(0).toUpperCase()}
              </span>
            )}
          </span>
          <span className={cm.flex({ direction: 'col' })}>
            <span
              className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), 'text-on-surface')}
            >
              {review.author.name}
            </span>
            {typeof review.author.review_count === 'number' ? (
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'reviewExcerptCard.reviewCount',
                  { n: review.author.review_count },
                  { defaultValue: '{{n}} reviews' },
                )}
              </span>
            ) : null}
          </span>
        </Link>
        <StarRating value={review.rating} size="sm" showScore={false} />
      </header>

      <div className={cm.cn(cm.sp('mt', 4))}>
        <Link
          to={`/restaurants/${review.restaurant.id}`}
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'self-start inline-flex items-center min-h-[24px] uppercase tracking-[0.25em] text-primary hover:underline',
          )}
        >
          {review.restaurant.name}
          {review.restaurant.cuisine ? (
            <span
              className={cm.cn(
                'text-on-surface-variant ml-2 normal-case tracking-normal font-medium',
              )}
            >
              · {review.restaurant.cuisine}
            </span>
          ) : null}
        </Link>
        <blockquote
          className={cm.cn(
            cm.textSize('base'),
            cm.sp('mt', 2),
            'leading-relaxed text-on-surface line-clamp-4',
          )}
          style={{ fontFamily: '"Lora", Georgia, serif' }}
        >
          “{review.body}”
        </blockquote>
      </div>

      {visiblePhotos.length > 0 ? (
        <div className={cm.cn(cm.flex({ gap: 'xs' }), cm.sp('mt', 4))}>
          {visiblePhotos.map((url, idx) => (
            <span
              key={idx}
              className={cm.cn(
                cm.w(20),
                cm.h(20),
                'rounded-lg bg-surface-variant overflow-hidden shrink-0',
              )}
              aria-hidden="true"
            >
              <img src={url} alt="" className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')} />
            </span>
          ))}
          {overflow > 0 ? (
            <span
              className={cm.cn(
                cm.w(20),
                cm.h(20),
                cm.flex({ align: 'center', justify: 'center' }),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-lg bg-surface-container text-on-surface',
              )}
            >
              +{overflow}
            </span>
          ) : null}
        </div>
      ) : null}

      <footer className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mt', 5))}>
        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {formatPostedDate(review.posted_at)}
        </span>
        <button
          type="button"
          onClick={() => onMarkHelpful?.(review.id)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'xs' }),
            'min-h-[2.5rem] rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors',
          )}
          aria-label={t(
            'reviewExcerptCard.helpfulAria',
            {},
            { defaultValue: 'Mark review as helpful' },
          )}
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            thumb_up
          </span>
          {t(
            'reviewExcerptCard.helpful',
            { count: review.helpful_count ?? 0 },
            { defaultValue: 'Helpful · {{count}}' },
          )}
        </button>
      </footer>
    </article>
  )
}
