import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo + wordmark render.
 *
 * Every surface (landing nav, landing footer, authed shell sidebar/drawer
 * and mobile bar, auth page lockups) consumes this component so the brand
 * is byte-identical across the app: the outlined `trip_origin` mark and the
 * headline wordmark in the primary ink, both driven by `branding.ts` and
 * the brand tokens. Nothing else may render `APP_NAME` as a brand
 * (grep-enforced by scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link
 * (the shell brand links to /home, the landing nav/footer carry their own
 * Links). `invert` is for dark chrome (the auth aside): light glyph/ink.
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
  /** for dark chrome: light glyph + wordmark on the dark surface */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const glyphSize = size === 'sm' ? cm.textSize('xl') : size === 'lg' ? 'text-4xl' : 'text-2xl'
  const textSize = size === 'sm' ? cm.textSize('lg') : size === 'lg' ? 'text-4xl' : 'text-2xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn('material-symbols-outlined shrink-0', glyphSize)}
        style={{ fontVariationSettings: "'FILL' 0" }}
      >
        trip_origin
      </span>
      <span
        className={cm.cn(
          cm.fontWeight('medium'),
          'font-headline tracking-tighter leading-none truncate',
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
    <Link to="/" className={cm.cn('shrink-0 rounded')} aria-label={APP_NAME}>
      {mark}
    </Link>
  )
}

export default BrandWordmark
