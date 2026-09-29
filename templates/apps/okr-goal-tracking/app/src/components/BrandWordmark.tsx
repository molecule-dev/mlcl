import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the Ascent lockup renders.
 *
 * Every surface (landing nav + footer, auth shell panel + card header,
 * desktop side nav, mobile top bar + drawer) consumes this component so
 * the brand is identical everywhere: the design's `landscape` glyph tile
 * beside the `font-black tracking-tighter` wordmark
 * (design-okr-goal-tracking-landing), driven by `branding.ts`. Nothing
 * else may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default; pass
 * `as="span"` inside chrome that already provides its own link (the side
 * nav and shells link to their own destinations). `invert` is for the dark
 * indigo chrome (side nav, auth hero, drawer, footer). `withTagline` adds
 * the APP_TAGLINE eyebrow (dark chrome only). `footer` carries
 * brand-wordmark-footer so the per-page "exactly one brand-wordmark" e2e
 * contract stays header-scoped.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  withTagline = false,
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  withTagline?: boolean
  /** for dark chrome: white ink (the tile stays the brand gradient) */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tileSize = size === 'sm' ? 'w-9 h-9' : 'w-10 h-10'
  const glyphSize = size === 'sm' ? 'text-[20px]' : 'text-[22px]'
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          tileSize,
          'rounded-xl shrink-0 bg-gradient-to-br from-primary to-secondary text-white',
          'shadow-lg shadow-primary/30',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined', glyphSize)}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          landscape
        </span>
      </span>
      <span className={cm.flex({ direction: 'col' })}>
        <span
          className={cm.cn(
            textSize,
            'font-black tracking-tighter leading-none truncate min-w-0',
            invert ? 'text-white' : 'text-on-surface',
          )}
        >
          {APP_NAME}
        </span>
        {withTagline ? (
          <span className="text-[10px] uppercase tracking-[0.18em] text-indigo-300/70 font-bold">
            {APP_TAGLINE}
          </span>
        ) : null}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" aria-label={APP_NAME} className={cm.cn('shrink-0')}>
      {mark}
    </Link>
  )
}

export default BrandWordmark
