import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, authed shell brand, auth pages' display
 * wordmark, footer) consumes this component so the brand is byte-identical
 * across the app: the `graphic_eq` glyph in the BRAND_COLOR tile beside the
 * heavy tracked-tighter wordmark, both driven by `branding.ts` and the
 * brand tokens. Nothing else may render `APP_NAME` as a brand
 * (grep-enforced by scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link
 * (the shell brand links to /dashboard, the landing nav to /).
 * `invert` is for light chrome: the wordmark renders in the surface ink.
 * `footer` renders the footer lockup and carries
 * data-mol-id="brand-wordmark-footer" so the per-page "exactly one
 * brand-wordmark" contract stays header-scoped.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** for light chrome: tile + wordmark on the light surface (surface ink) */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tileSize = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8'
  const glyphSize = size === 'sm' ? 'text-base' : 'text-[20px]'
  const textSize =
    size === 'sm' ? cm.textSize('lg') : size === 'lg' ? 'text-4xl' : cm.textSize('xl')
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          tileSize,
          'rounded-lg shrink-0',
        )}
        style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
      >
        <span className={cm.cn('material-symbols-outlined', glyphSize)}>graphic_eq</span>
      </span>
      <span
        className={cm.cn(
          'font-extrabold tracking-tighter leading-none truncate',
          textSize,
          invert ? 'text-surface' : 'text-on-surface',
        )}
      >
        {APP_NAME}
      </span>
    </span>
  )
  if (footer || as === 'span') return mark
  return (
    <Link to="/" className={cm.cn('shrink-0')} aria-label={APP_NAME}>
      {mark}
    </Link>
  )
}

export default BrandWordmark
