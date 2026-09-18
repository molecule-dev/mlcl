/**
 * Five-star rating row — saffron-gold filled stars (#d4a017) on a warm
 * empty-star track (`text-on-surface-variant/75` — /30 was 1.71:1 on white,
 * an axe color-contrast fail; /75 ≈ 5.0:1), with optional bold
 * numeric score and review count to the right. Half-star fill is shown
 * via the Material Symbols `'FILL' 1` variation axis on the leading
 * partial star.
 *
 * Translated from hotel-booking's PropertyListingCard star-pill treatment
 * (DESIGN.md mandates 5-level semantic stars + accent gold fill at
 * 18px / 24px / 32px sizes). This is the canonical rating primitive
 * for every Morsel screen — Discover cards, RestaurantDetail, Profile,
 * Reviews.
 */

import { getClassMap } from '@molecule/app-ui'

interface StarRatingProps {
  /** Rating value from 0–5 (decimals supported, e.g. 4.5). */
  value: number
  /** Render size. Mirrors DESIGN.md: card/list = sm, detail = md, write = lg. */
  size?: 'sm' | 'md' | 'lg'
  /** Optional review count rendered after the score. */
  reviewCount?: number
  /** Show the numeric score next to the stars (e.g. "4.7"). Defaults to true. */
  showScore?: boolean
  /** Override label for accessibility. */
  ariaLabel?: string
}

const PX_BY_SIZE: Record<NonNullable<StarRatingProps['size']>, string> = {
  sm: 'text-[18px]',
  md: 'text-[24px]',
  lg: 'text-[32px]',
}

const SCORE_BY_SIZE: Record<NonNullable<StarRatingProps['size']>, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
}

export function StarRating({
  value,
  size = 'sm',
  reviewCount,
  showScore = true,
  ariaLabel,
}: StarRatingProps) {
  const cm = getClassMap()
  const clamped = Math.max(0, Math.min(5, value))
  const stars = [1, 2, 3, 4, 5].map((i) => {
    const fill = clamped >= i ? 1 : clamped >= i - 0.5 ? 0.5 : 0
    return fill
  })
  const sizeClass = PX_BY_SIZE[size]
  const scoreSizeClass = SCORE_BY_SIZE[size]

  return (
    <span
      className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}
      aria-label={ariaLabel ?? `${clamped.toFixed(1)} out of 5 stars`}
      role="img"
    >
      <span className={cm.flex({ align: 'center' })} aria-hidden="true">
        {stars.map((fill, idx) => (
          <span
            key={idx}
            className={cm.cn(
              'material-symbols-outlined',
              sizeClass,
              fill > 0 ? 'text-accent-on-surface' : 'text-on-surface-variant/75',
            )}
            style={{
              fontVariationSettings:
                fill === 1
                  ? "'FILL' 1, 'wght' 600"
                  : fill === 0.5
                    ? "'FILL' 0.5, 'wght' 600"
                    : "'FILL' 0, 'wght' 500",
            }}
          >
            star
          </span>
        ))}
      </span>
      {showScore ? (
        <span
          className={cm.cn(cm.fontWeight('bold'), scoreSizeClass, 'tabular-nums text-on-surface')}
        >
          {clamped.toFixed(1)}
        </span>
      ) : null}
      {typeof reviewCount === 'number' ? (
        <span
          className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), 'text-on-surface-variant')}
        >
          ({reviewCount.toLocaleString()})
        </span>
      ) : null}
    </span>
  )
}
