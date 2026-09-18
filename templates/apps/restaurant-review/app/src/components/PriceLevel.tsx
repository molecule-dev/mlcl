/**
 * Inline price-level indicator — renders four `$` glyphs, with `active`
 * count rendered in deep slate (`text-on-surface`) and the rest in a
 * muted dot color (`text-on-surface-variant/75`). Per DESIGN.md the
 * inactive glyphs are not hidden — the four-glyph footprint is always
 * visible so prices align across cards.
 *
 * Translated from food-delivery's price-row pattern + DESIGN.md's
 * `$, $$, $$$, $$$$` rule. Reused by Discover, RestaurantDetail,
 * Favorites, Lists.
 */

import { getClassMap } from '@molecule/app-ui'

interface PriceLevelProps {
  /** 1–4. Capped to 4. */
  level: number
  /** Render size. */
  size?: 'sm' | 'md' | 'lg'
  /** Override aria-label. Defaults to e.g. "Price level 3 out of 4". */
  ariaLabel?: string
}

const SIZE_CLASS: Record<NonNullable<PriceLevelProps['size']>, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
}

export function PriceLevel({ level, size = 'sm', ariaLabel }: PriceLevelProps) {
  const cm = getClassMap()
  const active = Math.max(0, Math.min(4, Math.round(level)))
  const sizeClass = SIZE_CLASS[size]

  return (
    <span
      className={cm.cn('tabular-nums tracking-wide', cm.fontWeight('bold'), sizeClass)}
      aria-label={ariaLabel ?? `Price level ${active} out of 4`}
      role="img"
    >
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={i <= active ? 'text-on-surface' : 'text-on-surface-variant/75'}
          aria-hidden="true"
        >
          $
        </span>
      ))}
    </span>
  )
}
