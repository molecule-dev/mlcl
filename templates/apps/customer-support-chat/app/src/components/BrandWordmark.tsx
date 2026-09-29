import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the brand lockup renders.
 *
 * Every surface (landing nav, footer, auth split-screen, inbox sidebar)
 * consumes this component so the brand is identical everywhere: the
 * `forum` glyph in the round primary tile beside the `font-extrabold
 * tracking-tight` wordmark. Nothing else may render `APP_NAME` as a brand
 * (grep-enforced by scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link (the
 * landing nav's Link, the sidebar's `sidebar-brand` Link). `invert` is for
 * dark chrome (the auth panel, the landing footer's dark band).
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** for dark chrome: light ink + glass tile on the dark surface */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tile = size === 'sm' ? cm.w(8) : cm.w(10)
  const tileH = size === 'sm' ? cm.h(8) : cm.h(10)
  const textSize = size === 'sm' ? 'lg' : size === 'lg' ? '2xl' : 'xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          tile,
          tileH,
          cm.roundedFull,
          cm.shrink0,
          invert ? 'bg-surface/20 backdrop-blur-md' : 'bg-primary text-surface',
        )}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
          forum
        </span>
      </span>
      <span
        className={cm.cn(
          cm.textSize(textSize),
          'font-extrabold tracking-tight leading-none truncate',
          invert ? 'text-surface' : 'text-primary',
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
