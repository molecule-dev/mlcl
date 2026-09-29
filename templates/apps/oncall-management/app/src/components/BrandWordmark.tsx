import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, authed shell TopBar/Sidebar/Drawer, auth
 * pages) consumes this component so the brand is byte-identical across the
 * app: the `notifications_active` glyph on the signal-amber tile (BRAND_COLOR
 * from branding.ts — deliberately NOT --color-primary, which is the AA-adjusted
 * interactive token), the extra-bold wordmark. Nothing else may render
 * `APP_NAME` as a brand (grep-enforced by scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default; pass
 * `as="span"` inside chrome that already provides its own link (the authed
 * shell's nav-brand Link, an auth page's centered h1).
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
  const glyphSize =
    size === 'sm' ? cm.textSize('base') : size === 'lg' ? cm.textSize('2xl') : 'text-[20px]'
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
          'rounded-lg shrink-0',
        )}
        style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
      >
        <span className={cm.cn('material-symbols-outlined', glyphSize)}>notifications_active</span>
      </span>
      <span
        className={cm.cn(
          cm.fontWeight('extrabold'),
          'tracking-tight whitespace-nowrap leading-none',
          textSize,
        )}
        style={{ color: 'var(--color-text)' }}
      >
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
