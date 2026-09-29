import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (mobile bar, drawer header, desktop sidebar) consumes this
 * component so the brand is byte-identical across the app: the filled
 * `school` glyph and the bold wordmark, driven by `branding.ts` and the
 * brand tokens. Nothing else may render `APP_NAME` as a brand
 * (grep-enforced by scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/dashboard` by
 * default; pass `as="span"` inside chrome that already provides its own
 * link (the mobile bar's brand link). `invert` is for dark chrome.
 * `footer` carries data-mol-id="brand-wordmark-footer" so the per-page
 * "exactly one brand-wordmark" contract stays header-scoped.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** for dark chrome: tile + text on the dark surface (light glyph/ink) */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const textSize =
    size === 'sm' ? cm.textSize('lg') : size === 'lg' ? cm.textSize('2xl') : cm.textSize('xl')
  const glyphSize =
    size === 'sm' ? cm.textSize('lg') : size === 'lg' ? cm.textSize('2xl') : cm.textSize('xl')
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn('material-symbols-outlined shrink-0', glyphSize)}
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        school
      </span>
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          'tracking-tight leading-none truncate',
          textSize,
          invert ? 'text-surface' : 'text-primary',
        )}
      >
        {APP_NAME}
      </span>
    </span>
  )
  if (footer || as === 'span') return mark
  return (
    <Link to="/dashboard" className={cm.cn('min-w-0 truncate shrink-0')} aria-label={APP_NAME}>
      {mark}
    </Link>
  )
}

export default BrandWordmark
