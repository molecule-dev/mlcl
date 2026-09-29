import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the Voltrace lockup renders.
 *
 * Every surface (landing nav, authed shell top bar + sidebar, auth pages'
 * header) consumes this component so the brand is identical everywhere:
 * the `bolt` glyph in the primary→primary-container round tile beside the
 * `font-bold tracking-tight` wordmark. Nothing else may render `APP_NAME`
 * as a brand (grep-enforced by scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link by default (`to` is
 * configurable); pass `as="span"` inside chrome that already provides its
 * own link. `invert` is for dark chrome; `footer` for footer lockups
 * (carries brand-wordmark-footer so the per-page "exactly one
 * brand-wordmark" e2e contract stays header-scoped).
 */
export function BrandWordmark({
  as = 'link',
  to = '/',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  to?: string
  size?: 'sm' | 'md' | 'lg'
  /** for dark chrome: light ink on the dark surface */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const compact = size === 'sm'
  const tilePx = compact ? 7 : 8
  const textSize = compact ? 'lg' : size === 'lg' ? '2xl' : 'xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.w(tilePx),
          cm.h(tilePx),
          cm.roundedFull,
          cm.flex({ align: 'center', justify: 'center' }),
          cm.shrink0,
          'bg-gradient-to-br from-primary to-primary-container shadow-md shadow-primary/30 text-white',
        )}
      >
        <span className={cm.cn(compact ? 'text-base' : 'text-xl', 'material-symbols-outlined')}>
          bolt
        </span>
      </span>
      <span
        className={cm.cn(
          cm.textSize(textSize),
          cm.fontWeight('bold'),
          'tracking-tight leading-none truncate',
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
      to={to}
      aria-label={APP_NAME}
      className={cm.cn(cm.displayInlineBlock, 'shrink-0 leading-none')}
    >
      {mark}
    </Link>
  )
}
