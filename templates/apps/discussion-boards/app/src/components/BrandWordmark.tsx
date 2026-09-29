import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the Stoa lockup renders.
 *
 * Every surface (landing nav, auth shells' header, app top bar) consumes
 * this component so the brand is identical everywhere: the "S" initial in
 * the round primary→secondary gradient tile beside the `font-bold
 * tracking-tight` wordmark. Nothing else may render `APP_NAME` as a brand
 * (grep-enforced by scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link.
 * `invert` is for dark chrome; `footer` for footer lockups (carries
 * brand-wordmark-footer so the per-page "exactly one brand-wordmark" e2e
 * contract stays header-scoped).
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** for dark chrome: light ink on the dark surface */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const textSize = size === 'sm' ? 'base' : size === 'lg' ? 'xl' : 'lg'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.w(8),
          cm.h(8),
          cm.flex({ align: 'center', justify: 'center' }),
          cm.fontWeight('bold'),
          cm.roundedFull,
          cm.shrink0,
          'bg-gradient-to-br from-primary to-secondary text-white text-sm shadow-md shadow-primary/30',
        )}
      >
        S
      </span>
      <span
        className={cm.cn(
          cm.textSize(textSize),
          cm.fontWeight('bold'),
          'tracking-tight leading-none truncate',
          invert ? 'text-surface' : 'text-on-surface',
        )}
      >
        {APP_NAME}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" aria-label={APP_NAME} className={cm.cn(cm.displayInlineBlock, 'shrink-0')}>
      {mark}
    </Link>
  )
}
