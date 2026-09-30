import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the Reverb lockup renders.
 *
 * Every surface (landing nav, signed-in shell's top bar / sidebar / mobile
 * drawer) consumes this component so the brand is identical everywhere:
 * the design's `font-black tracking-tighter` wordmark
 * (design-music-streaming-landing), driven by `branding.ts`. Nothing else
 * may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default; pass
 * `as="span"` inside chrome that already provides its own link (the shell
 * links to `/home`).
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
}) {
  const cm = getClassMap()
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'
  const mark = (
    <span
      data-mol-id="brand-wordmark"
      className={cm.cn(
        textSize,
        'font-black tracking-tighter leading-none truncate min-w-0 text-on-surface',
      )}
    >
      {APP_NAME}
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" aria-label={APP_NAME} className={cm.cn('shrink-0')}>
      {mark}
    </Link>
  )
}

export default BrandWordmark
