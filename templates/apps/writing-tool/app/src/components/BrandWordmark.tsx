import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/** Versal's editorial brand face — Charter with serif fallbacks. */
const BRAND_FACE = 'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif'

/**
 * The app's brand mark — the ONLY place the Versal wordmark renders.
 *
 * Every surface (landing nav + footer, authed shell top bar / sidebar /
 * drawer, auth pages) consumes this component so the brand is identical
 * everywhere: the app name in the editorial Charter face — extrabold,
 * italic, tracking-tight, in the brand violet on light chrome — the
 * design landing's header treatment (DESIGN.md "Brand Identity":
 * text-based logo, no alternatives, no variations). Nothing else may
 * render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link by default (`to` is
 * configurable — the authed shell points it at `/library`); pass
 * `as="span"` inside chrome that already provides its own link. `invert`
 * is for dark chrome (light ink on the dark surface); the `footer`
 * lockup carries the design's neutral ink instead of the violet.
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
  /** for dark chrome: light ink on the dark surface */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(
        'font-extrabold italic tracking-tight leading-none truncate',
        textSize,
        footer ? 'text-on-surface' : invert ? 'text-surface' : 'text-primary',
      )}
      style={{ fontFamily: BRAND_FACE }}
    >
      {APP_NAME}
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to={to} aria-label={APP_NAME} className={cm.cn('inline-block shrink-0 leading-none')}>
      {mark}
    </Link>
  )
}
