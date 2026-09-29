import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_GRADIENT } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (public top nav, landing footer, mobile top bar + drawer)
 * consumes this component so the brand is byte-identical across the app:
 * the `psychology` glyph on the BRAND_GRADIENT tile and the extrabold
 * tracking-tight wordmark in primary, both driven by `branding.ts` and
 * the brand tokens. Nothing else may render `APP_NAME` as a brand
 * (grep-enforced by scripts/verify-brand-consistency.mjs — the landing
 * chat demo's brand label is translated copy, not the lockup).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link (the
 * shell's `mobile-brand` Link) or a non-link slot (drawer header, footer
 * lockup). `footer` carries brand-wordmark-footer so the per-page
 * "exactly one brand-wordmark" e2e contract stays header-scoped.
 * `invert` is for dark chrome (light ink); current surfaces are light,
 * so it stays unused.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** for dark chrome: light wordmark ink */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tileSize = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8'
  const glyphSize = size === 'sm' ? 14 : 18
  const textSize = size === 'sm' ? cm.textSize('lg') : cm.textSize('xl')
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
          'rounded-lg text-white shrink-0',
        )}
        style={{ background: BRAND_GRADIENT }}
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          style={{ fontSize: glyphSize, fontVariationSettings: "'FILL' 1" }}
        >
          psychology
        </span>
      </span>
      <span
        className={cm.cn(
          cm.fontWeight('extrabold'),
          'tracking-tight whitespace-nowrap truncate',
          textSize,
          invert ? 'text-surface' : 'text-primary',
        )}
      >
        {APP_NAME}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" className={cm.cn('group shrink-0')} aria-label={APP_NAME}>
      {mark}
    </Link>
  )
}
