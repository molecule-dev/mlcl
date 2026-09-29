import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, authed shell, auth pages, footer) consumes
 * this component so the brand is identical everywhere: the filled
 * `edit_note` glyph in the gradient primary tile + the display-font bold
 * wordmark, both driven by `branding.ts` and the brand tokens. Nothing
 * else may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs and asserted per page by
 * e2e/brand.spec.ts via [data-mol-id={footer ? "brand-wordmark-footer" :
 * "brand-wordmark"}]).
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
  /** for dark chrome: tile + text on the dark surface (light glyph/ink) */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tileSize = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-10 w-10' : 'h-9 w-9'
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          tileSize,
          'rounded-xl shadow-md shrink-0 bg-gradient-to-br from-primary to-primary-dark',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined text-on-primary')}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          edit_note
        </span>
      </span>
      <span
        className={cm.cn(
          'font-display font-bold tracking-tight leading-none truncate min-w-0',
          textSize,
          invert ? 'text-surface' : 'text-primary',
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
      className={cm.cn(cm.flex({ align: 'center' }), 'min-w-0 whitespace-nowrap shrink-0 group')}
      aria-label={APP_NAME}
    >
      {mark}
    </Link>
  )
}
