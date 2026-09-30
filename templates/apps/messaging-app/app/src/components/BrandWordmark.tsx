import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, footer strip, authed shell sidebar/drawer)
 * consumes this component so the brand is byte-identical across the app:
 * the `lock` glyph in the primary→secondary gradient tile and the bold
 * tight-tracked wordmark, both driven by `branding.ts`. Nothing else may
 * render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link
 * (the shell's /inbox brand link, the footer strip).
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
  const tile = size === 'sm' ? cm.w(7) : size === 'lg' ? cm.w(9) : cm.w(8)
  const tileH = size === 'sm' ? cm.h(7) : size === 'lg' ? cm.h(9) : cm.h(8)
  const glyph = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'
  const textSize =
    size === 'sm' ? cm.textSize('lg') : size === 'lg' ? cm.textSize('2xl') : cm.textSize('xl')
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'tracking-tight min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          tile,
          tileH,
          'rounded-xl bg-gradient-to-br from-primary to-secondary text-white shrink-0',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined', glyph)}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          lock
        </span>
      </span>
      <span className={cm.cn(cm.fontWeight('bold'), 'truncate leading-none', textSize)}>
        {APP_NAME}
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
