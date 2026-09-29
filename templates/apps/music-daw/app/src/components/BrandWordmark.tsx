import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the Fugue lockup renders.
 *
 * Every surface (public nav, studio top bar / sidebar / mobile drawer,
 * landing footer) consumes this component so the brand is identical
 * everywhere: the design's `font-black tracking-tighter` wordmark with the
 * pulsing magenta dot (design-music-daw-landing), driven by `branding.ts`.
 * Nothing else may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default; pass
 * `as="span"` inside chrome that already provides its own link (the studio
 * shell links to `/dashboard`, the public nav wraps its own link).
 * `footer` renders the footer lockup (primary-ink wordmark, no pulse dot)
 * and carries brand-wordmark-footer so the per-page "exactly one
 * brand-wordmark" e2e contract stays header-scoped.
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
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(
        textSize,
        'font-black tracking-tighter leading-none truncate min-w-0',
        footer ? 'text-[var(--daw-primary)]' : 'text-on-surface',
        footer
          ? undefined
          : "after:content-[''] after:ml-2 after:inline-block after:w-2 after:h-2" +
              ' after:rounded-full after:bg-[var(--daw-secondary)] after:animate-pulse',
      )}
    >
      {APP_NAME}
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" data-mol-id="brand-wordmark-link" aria-label={APP_NAME} className="shrink-0">
      {mark}
    </Link>
  )
}

export default BrandWordmark
