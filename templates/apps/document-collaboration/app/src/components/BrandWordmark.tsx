import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the Quillon wordmark renders.
 *
 * Every surface (landing nav, authed shell top bar + sidebar, auth brand
 * panel) consumes this component so the brand is identical everywhere: the
 * design's `font-bold tracking-tighter` wordmark on the primary token.
 * Nothing else may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link by default (`to` is
 * configurable — the authed shell points it at `/dashboard`, the landing
 * at `/`); pass `as="span"` inside chrome that already provides its own
 * link. `invert` is for dark chrome (the auth split-screen's indigo→cyan
 * gradient panel).
 */
export function BrandWordmark({
  as = 'link',
  to = '/',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  to?: string
  size?: 'sm' | 'md' | 'lg'
  /** for dark chrome: light ink on the dark panel */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const textSize = size === 'sm' ? 'lg' : size === 'lg' ? '5xl' : '2xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(
        cm.textSize(textSize),
        cm.fontWeight('bold'),
        'tracking-tighter leading-none',
        invert ? 'text-white' : 'text-primary',
      )}
    >
      {APP_NAME}
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link
      to={to}
      aria-label={APP_NAME}
      className={cm.cn(cm.displayInlineBlock, 'min-w-0 shrink-0 leading-none')}
    >
      {mark}
    </Link>
  )
}
