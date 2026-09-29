import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the Nexus CRM lockup renders.
 *
 * Every surface (CRM layout top bar, dashboard + settings side navs,
 * settings top bar) consumes this component so the brand is identical
 * everywhere: the design's primary tile with the filled `dataset` glyph
 * beside the `font-black tracking-tight` wordmark. Nothing else may render
 * `APP_NAME` as a brand (grep-enforced by scripts/verify-brand-consistency.mjs
 * via [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link or in
 * non-navigating lockups (side navs are position-fixed, not link-wrapped).
 * `invert` is for dark chrome; `footer` for footer lockups (carries
 * brand-wordmark-footer so the per-page "exactly one brand-wordmark" e2e
 * contract stays header-scoped).
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** for dark chrome: light ink + outlined tile on the dark surface */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tileSize = size === 'sm' ? cm.w(7) : cm.w(8)
  const tileH = size === 'sm' ? cm.h(7) : cm.h(8)
  const textSize = size === 'sm' ? 'lg' : 'xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center' }), 'gap-3 min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          tileSize,
          tileH,
          cm.shrink0,
          'rounded-lg',
          invert
            ? 'bg-surface text-primary border border-outline-variant'
            : 'bg-primary text-white',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          dataset
        </span>
      </span>
      <span
        className={cm.cn(
          cm.textSize(textSize),
          'font-black tracking-tight leading-none truncate',
          invert ? 'text-white' : 'text-blue-800',
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
