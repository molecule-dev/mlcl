import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the Meridian lockup renders.
 *
 * Every surface (hero mockup chrome, headers) consumes this component so
 * the brand is identical everywhere: the filled `mail` glyph in the
 * primary→secondary gradient tile beside the bold tracking-tight wordmark
 * on the primary token. Nothing else may render `APP_NAME` as a brand
 * (grep-enforced by scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link or in
 * decorative mockups. `invert` is for dark chrome; `footer` for footer
 * lockups (carries brand-wordmark-footer so the per-page "exactly one
 * brand-wordmark" e2e contract stays header-scoped).
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** for dark chrome: light ink on the dark surface */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tile = size === 'sm' ? cm.w(6) : size === 'lg' ? cm.w(14) : cm.w(10)
  const tileH = size === 'sm' ? cm.h(6) : size === 'lg' ? cm.h(14) : cm.h(10)
  const tileText =
    size === 'sm' ? 'text-sm' : size === 'lg' ? cm.textSize('3xl') : cm.textSize('xl')
  const tileRadius = size === 'sm' ? 'rounded-md' : size === 'lg' ? 'rounded-2xl' : 'rounded-xl'
  const textSize = size === 'sm' ? 'sm' : size === 'lg' ? '4xl' : 'lg'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          tile,
          tileH,
          cm.shrink0,
          tileRadius,
          'bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/20',
        )}
      >
        <span
          className={cm.cn(tileText, 'material-symbols-outlined')}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          mail
        </span>
      </span>
      <span
        className={cm.cn(
          cm.textSize(textSize),
          cm.fontWeight('bold'),
          'tracking-tight leading-none truncate',
          invert ? 'text-surface' : 'text-primary',
        )}
      >
        {APP_NAME}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" aria-label={APP_NAME} className={cm.cn(cm.displayInlineBlock, 'shrink-0')}>
      {mark}
    </Link>
  )
}
