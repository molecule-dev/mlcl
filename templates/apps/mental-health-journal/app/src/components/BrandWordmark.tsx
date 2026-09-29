import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo + wordmark render.
 *
 * Every surface (public nav, auth shell header, authed layout's mobile
 * header) consumes this component so the brand is byte-identical across
 * the app: the filled `nights_stay` mark in the primary ink and the
 * extrabold tracked-tight wordmark, both driven by `branding.ts` and the
 * brand tokens. Nothing else may render `APP_NAME` as a brand
 * (grep-enforced by scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link
 * (the public nav and layout header carry their own Links).
 * `invert` is for dark chrome. `footer` carries
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
  /** for dark chrome: light glyph/ink on the dark surface */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const textSize =
    size === 'sm' ? cm.textSize('lg') : size === 'lg' ? cm.textSize('2xl') : cm.textSize('xl')
  const glyphSize = size === 'sm' ? cm.textSize('xl') : cm.textSize('2xl')
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn('material-symbols-outlined shrink-0', glyphSize)}
        style={{ color: 'var(--mol-color-primary)', fontVariationSettings: "'FILL' 1" }}
      >
        nights_stay
      </span>
      <span
        className={cm.cn(
          cm.fontWeight('extrabold'),
          'leading-none truncate',
          textSize,
          invert ? 'text-surface' : 'text-on-surface',
        )}
        style={{ letterSpacing: '-0.02em' }}
      >
        {APP_NAME}
      </span>
    </span>
  )
  if (footer || as === 'span') return mark
  return (
    <Link to="/" className={cm.cn('shrink-0 rounded')} aria-label={APP_NAME}>
      {mark}
    </Link>
  )
}

export default BrandWordmark
