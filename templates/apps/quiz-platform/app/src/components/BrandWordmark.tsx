import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { SparqLogo } from './SparqLogo.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (authed sidebar, mobile drawer, auth pages, marketing
 * chrome) consumes this component so the brand is byte-identical across
 * the app. It carries the existing SparqLogo lockup (spark tile + the
 * gold-"q" wordmark) under the shared brand contract: nothing else may
 * render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link or a
 * non-link slot (the drawer header). `footer` carries
 * brand-wordmark-footer so the per-page "exactly one brand-wordmark" e2e
 * contract stays header-scoped. `invert` maps to SparqLogo's onPrimary
 * variant for dark chrome.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** for dark chrome: SparqLogo's onPrimary variant */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center' }), 'min-w-0')}
    >
      <SparqLogo size={size} variant={invert ? 'onPrimary' : 'onSurface'} />
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" className={cm.cn('group shrink-0')} aria-label={APP_NAME}>
      {mark}
    </Link>
  )
}
