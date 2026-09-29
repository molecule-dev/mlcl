import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the Forja wordmark renders.
 *
 * Every surface (landing nav, authed shell sidebar / top bar / drawer,
 * auth pages, 404) consumes this component so the brand is identical
 * everywhere: the app name in the heading font at black weight,
 * tracking-tighter — the design's text-based logo (DESIGN.md "Brand
 * Identity": text logo, no alternatives, no variations). Nothing else may
 * render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * Ink follows the design system: brand-ink (`text-on-surface`) on light
 * chrome, forge-orange `text-primary` on dark chrome (`invert` — the
 * sidebar/404 treatment from the dashboard design).
 *
 * `as` renders the wrapping element: a router Link by default (`to` is
 * configurable — the authed shell points it at `/dashboard`); pass
 * `as="span"` inside chrome that already provides its own link.
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
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'display'
  /** for dark chrome: forge-orange ink on the dark surface */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const textSize =
    size === 'sm'
      ? 'text-xl'
      : size === 'lg'
        ? 'text-3xl'
        : size === 'xl'
          ? 'text-5xl'
          : size === 'display'
            ? 'text-[80px]'
            : 'text-2xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(
        'font-black tracking-tighter leading-none select-none',
        textSize,
        invert ? 'text-primary' : 'text-on-surface',
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
      className={cm.cn(cm.displayInlineBlock, 'shrink-0 leading-none')}
    >
      {mark}
    </Link>
  )
}
