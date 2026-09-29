import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the brand lockup renders.
 *
 * Every surface (landing nav, authed top bar, auth shells' header) consumes
 * this component so the brand is identical everywhere: the filled `brush`
 * glyph in the primary→secondary gradient tile beside the `font-extrabold
 * tracking-tight` wordmark. Nothing else may render `APP_NAME` as a brand
 * (grep-enforced by scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link by default (`to` is
 * configurable — the authed top bar points it at `/dashboard`, the landing
 * and auth shells at `/`); pass `as="span"` inside chrome that already
 * provides its own link. `invert` is for dark chrome; `footer` for footer
 * lockups (carries brand-wordmark-footer so the per-page "exactly one
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
  const tile = compact ? cm.w(8) : cm.w(9)
  const tileH = compact ? cm.h(8) : cm.h(9)
  const textSize = size === 'lg' ? 'xl' : 'lg'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
    >
      <span
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          tile,
          tileH,
          cm.shrink0,
          compact
            ? 'bg-gradient-to-br from-primary to-secondary rounded-lg text-white shadow-sm'
            : 'bg-gradient-to-br from-primary to-secondary rounded-xl text-white shadow-md',
        )}
      >
        <span
          className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          brush
        </span>
      </span>
      <span
        className={cm.cn(
          cm.textSize(textSize),
          'font-extrabold tracking-tight leading-none truncate',
          invert ? 'text-surface' : 'text-on-surface',
        )}
      >
        {APP_NAME}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    // No aria-label: the composed accessible name ("brush Atelier", icon
    // ligature + wordmark) is the e2e contract (e2e/root.spec.ts).
    <Link to={to} className={cm.cn(cm.displayInlineBlock, 'min-w-0 shrink-0 leading-none')}>
      {mark}
    </Link>
  )
}
