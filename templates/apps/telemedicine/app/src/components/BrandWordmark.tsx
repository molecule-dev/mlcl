import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the wordmark renders.
 *
 * Every surface (landing nav, landing footer, mobile drawer) consumes this
 * component so the brand is byte-identical across the app: the design's
 * text-only wordmark — font-bold tracking-tighter in primary ink (no logo
 * tile anywhere in the design's header/footer treatments). Nothing else may
 * render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs; the desktop SidebarLayout receives
 * appName as a prop and renders the framework's own reviewed brand).
 *
 * `as` renders the wrapping element: a router Link to `/` by default; pass
 * `as="span"` inside chrome that already provides its own link (the drawer's
 * Link, the landing nav's Link). `footer` carries brand-wordmark-footer so
 * the per-page "exactly one brand-wordmark" e2e contract stays
 * header-scoped.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const textSize =
    size === 'sm' ? cm.textSize('lg') : size === 'lg' ? cm.textSize('3xl') : cm.textSize('2xl')
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn('font-bold tracking-tighter text-primary truncate leading-none', textSize)}
    >
      {APP_NAME}
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" className={cm.cn('shrink-0')} aria-label={APP_NAME}>
      {mark}
    </Link>
  )
}
