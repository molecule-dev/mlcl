import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the wordmark renders.
 *
 * Every surface (landing nav, authed shell, auth pages, 404, footer)
 * consumes this component so the brand is identical everywhere: the
 * design's pure type wordmark — DM Sans (the `font-headline` token),
 * bold, tight-tracked, primary ink, no logo tile — driven by
 * `branding.ts`. Nothing else may render `APP_NAME` as a brand
 * (grep-enforced by scripts/verify-brand-consistency.mjs and asserted
 * per page by e2e/brand.spec.ts via
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
  /** for dark chrome: light ink on the dark surface */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(
        'font-headline font-bold tracking-tight leading-none truncate min-w-0',
        textSize,
        invert ? 'text-surface' : 'text-primary',
      )}
    >
      {APP_NAME}
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" className={cm.cn('group shrink-0')} aria-label={APP_NAME}>
      {mark}
    </Link>
  )
}
