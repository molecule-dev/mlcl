import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the Trove lockup renders.
 *
 * Every surface (authed sidebar, login/signup/forgot/reset headers)
 * consumes this component so the brand is identical everywhere: the filled
 * `inventory_2` glyph in the primary→accent round tile beside the
 * `font-bold tracking-tight` wordmark. Nothing else may render `APP_NAME`
 * as a brand (grep-enforced by scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link by default (`to` is
 * configurable — the sidebar points it at `/dashboard`, the auth pages at
 * `/`); pass `as="span"` inside chrome that already provides its own link.
 * `invert` is for dark chrome; `footer` for footer lockups (carries
 * brand-wordmark-footer so the per-page "exactly one brand-wordmark" e2e
 * contract stays header-scoped).
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
  const textSize = compact ? 'lg' : '2xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.roundedFull,
          cm.shrink0,
          'bg-gradient-to-br from-primary to-accent shadow-md shadow-primary/30',
        )}
        style={compact ? { width: 36, height: 36 } : { width: 44, height: 44 }}
      >
        <span
          className="material-symbols-outlined text-white"
          style={{ fontSize: compact ? 22 : 26 }}
        >
          inventory_2
        </span>
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
    <Link
      to={to}
      aria-label={APP_NAME}
      className={cm.cn(cm.displayInlineBlock, 'shrink-0 leading-none')}
    >
      {mark}
    </Link>
  )
}
