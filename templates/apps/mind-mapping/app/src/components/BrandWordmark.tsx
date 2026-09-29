import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, sidenav/drawer brand, auth header, public
 * map header) consumes this component so the brand is byte-identical
 * across the app: the `account_tree` glyph in the primary gradient tile
 * and the extrabold tight-tracked wordmark, both driven by
 * `branding.ts`. Nothing else may render `APP_NAME` as a brand
 * (grep-enforced by scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `tagline` renders a small line under the wordmark (the sidenav brand
 * block); pass nothing for the plain lockup.
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  tagline,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  tagline?: ReactNode
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tile = size === 'sm' ? cm.w(8) : cm.w(9)
  const tileH = size === 'sm' ? cm.h(8) : cm.h(9)
  const glyph = size === 'sm' ? cm.textSize('lg') : cm.textSize('xl')
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
          tile,
          tileH,
          'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md shrink-0',
        )}
      >
        <span
          className={cm.cn(glyph, 'material-symbols-outlined')}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          account_tree
        </span>
      </span>
      <span className={cm.flex({ direction: 'col' })}>
        <span
          className={cm.cn(
            'font-extrabold tracking-tight text-on-surface leading-none truncate',
            textSize,
          )}
        >
          {APP_NAME}
        </span>
        {tagline}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" className={cm.cn('group shrink-0 min-w-0')} aria-label={APP_NAME}>
      {mark}
    </Link>
  )
}
