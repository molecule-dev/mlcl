import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (public status nav, mobile shell top bar + drawer, auth
 * pages, settings branding section) consumes this component so the brand is
 * byte-identical across the app: the `graphic_eq` glyph on the operational
 * green tile (--color-status-operational) and the extra-bold tracking-tight
 * wordmark. Nothing else may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default; pass
 * `as="span"` inside chrome that already provides its own link (the shells'
 * brand Links, the auth page's centered h1). `footer` carries
 * brand-wordmark-footer so the per-page "exactly one brand-wordmark" e2e
 * contract stays header-scoped.
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
  const tileSize = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-9 w-9' : 'h-8 w-8'
  const glyphSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-[20px]'
  const textSize =
    size === 'sm' ? cm.textSize('lg') : size === 'lg' ? cm.textSize('2xl') : cm.textSize('xl')
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          tileSize,
          'rounded-lg shrink-0 bg-[var(--color-status-operational)] text-[var(--color-auth-on-primary)]',
        )}
      >
        <span className={cm.cn('material-symbols-outlined', glyphSize)}>graphic_eq</span>
      </span>
      <span
        className={cm.cn(
          cm.fontWeight('extrabold'),
          'tracking-tight text-on-background truncate leading-none',
          textSize,
        )}
      >
        {APP_NAME}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link
      to="/"
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'shrink-0 rounded')}
      aria-label={APP_NAME}
    >
      {mark}
    </Link>
  )
}
