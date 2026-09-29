import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the Parcel lockup renders.
 *
 * Every surface (landing nav, authed sidebar, mobile top bar + drawer)
 * consumes this component so the brand is identical everywhere: the filled
 * `route` glyph in the primary tile beside the `font-bold tracking-tight`
 * wordmark from the design's header. Nothing else may render `APP_NAME` as
 * a brand (grep-enforced by scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link by default (`to` is
 * configurable — the authed shell points it at `/dashboard`, the landing
 * at `/`); pass `as="span"` inside chrome that already provides its own
 * link. `invert` is for dark chrome.
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
  const textSize = size === 'sm' ? 'lg' : size === 'lg' ? '2xl' : 'xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(
        cm.flex({ align: 'center' }),
        'gap-3 min-w-0',
        cm.textSize(textSize),
        cm.fontWeight('bold'),
        'tracking-tight leading-none',
        invert ? 'text-surface' : 'text-navy dark:text-surface',
      )}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'h-8 w-8 rounded-lg bg-primary text-on-primary shrink-0',
        )}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
        >
          route
        </span>
      </span>
      <span className="truncate">{APP_NAME}</span>
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
