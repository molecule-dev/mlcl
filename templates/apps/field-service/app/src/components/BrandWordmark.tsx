import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, landing footer) consumes this component so
 * the brand is byte-identical across the app: the `build` glyph on the
 * primary tile, the extra-bold wordmark, both driven by `branding.ts` and
 * the brand tokens. Nothing else may render `APP_NAME` as a brand
 * (grep-enforced by scripts/verify-brand-consistency.mjs).
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
  const tileRadius = size === 'sm' ? 'rounded-md' : 'rounded-lg'
  const glyphSize =
    size === 'sm' ? cm.textSize('sm') : size === 'lg' ? cm.textSize('xl') : 'text-[18px]'
  const textSize =
    size === 'sm'
      ? cm.cn(cm.textSize('base'), cm.fontWeight('bold'))
      : size === 'lg'
        ? cm.cn(cm.textSize('2xl'), cm.fontWeight('extrabold'))
        : cm.cn('text-xl', cm.fontWeight('extrabold'))
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
          tileRadius,
          'bg-primary text-on-primary shadow-sm shrink-0',
        )}
      >
        <span className={cm.cn('material-symbols-outlined', glyphSize)} aria-hidden="true">
          build
        </span>
      </span>
      <span className={cm.cn('tracking-tight whitespace-nowrap leading-none', textSize)}>
        {APP_NAME}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link
      to="/"
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'shrink-0')}
      aria-label={APP_NAME}
    >
      {mark}
    </Link>
  )
}
