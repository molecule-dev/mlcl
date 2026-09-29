import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing/public top nav, authed shell sidebar + header,
 * auth pages) consumes this component so the brand is byte-identical
 * across the app: the filled `psychology` glyph on the primary gradient
 * tile, the bold wordmark, both driven by `branding.ts` and the brand
 * tokens. Nothing else may render `APP_NAME` as a brand (grep-enforced
 * by scripts/verify-brand-consistency.mjs and asserted per page by e2e
 * via [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link
 * (the nav's `nav-logo` and auth's `auth-brand-link` contracts stay).
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** for dark chrome: tile + text on the dark surface (light glyph/ink) */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tileSize = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-10 w-10' : 'h-9 w-9'
  const glyphSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-lg'
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'
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
          'rounded-xl bg-gradient-to-br from-primary to-primary-container shadow-md shrink-0',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined text-white', glyphSize)}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          psychology
        </span>
      </span>
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          'tracking-tight leading-none truncate',
          textSize,
          invert ? 'text-surface' : 'text-on-surface',
        )}
      >
        {APP_NAME}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" className={cm.cn('group shrink-0')} aria-label={APP_NAME}>
      {mark}
    </Link>
  )
}
