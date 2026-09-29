import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, LOGO_SIZE } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo + wordmark render.
 *
 * Every surface (landing nav, auth brand panel, authed mobile header +
 * drawer) consumes this component so the brand is byte-identical across
 * the app: the `/logo.svg` roundel (inverted on dark chrome) beside the
 * bold tracking-tight wordmark, driven by `branding.ts`. Nothing else
 * may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs and asserted per page by e2e via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** for dark chrome: the logo inverts to stay light on the dark surface */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const logoPx = size === 'sm' ? 24 : size === 'lg' ? 36 : LOGO_SIZE
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
    >
      <img
        src="/logo.svg"
        width={logoPx}
        height={logoPx}
        alt=""
        className={cm.cn('shrink-0', invert ? 'invert' : undefined)}
      />
      <span
        className={cm.cn(cm.fontWeight('bold'), 'tracking-tight leading-none truncate', textSize)}
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
