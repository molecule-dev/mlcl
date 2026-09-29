import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, auth header, landing footer) consumes this
 * component so the brand is byte-identical across the app: the filled
 * `directions_transit` glyph on the primary roundel, the bold wordmark in
 * primary, both driven by `branding.ts` and the brand tokens. Nothing else
 * may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link.
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
  const tileSize =
    size === 'sm' ? [cm.w(6), cm.h(6)] : size === 'lg' ? [cm.w(10), cm.h(10)] : [cm.w(8), cm.h(8)]
  const glyphSize =
    size === 'sm' ? cm.textSize('sm') : size === 'lg' ? cm.textSize('xl') : cm.textSize('lg')
  const textSize =
    size === 'sm' ? cm.textSize('lg') : size === 'lg' ? cm.textSize('2xl') : cm.textSize('xl')
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'shrink-0 min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          tileSize,
          cm.roundedFull,
          'bg-primary text-on-primary shrink-0',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined', glyphSize)}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          directions_transit
        </span>
      </span>
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          'text-primary tracking-tight leading-none whitespace-nowrap',
          textSize,
        )}
      >
        {APP_NAME}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" className={cm.flex({ align: 'center', gap: 'sm' })} aria-label={APP_NAME}>
      {mark}
    </Link>
  )
}
