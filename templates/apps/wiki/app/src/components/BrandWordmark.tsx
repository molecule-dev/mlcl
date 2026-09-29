import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the brand lockup renders.
 *
 * Every surface (landing nav, auth pages, sidebar tree, footer) consumes
 * this component so the brand is byte-identical across the app: the filled
 * landscape glyph in the primary ink plus the bold tight-tracked wordmark,
 * per the design's nav lockup, driven by `branding.ts` and the brand
 * tokens. Nothing else may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs and asserted per page by
 * e2e/brand.spec.ts via [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link
 * (the sidebar tree's home link, the footer lockup).
 *
 * `subtitle` stacks a secondary line (the workspace name in the sidebar)
 * under the wordmark — pass it through `t()` from the caller.
 * `invert` renders the light-on-dark variant for dark chrome.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  footer = false,
  subtitle,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** for dark chrome: glyph + text on the dark surface (light ink) */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
  /** optional secondary line under the wordmark (already-translated copy) */
  subtitle?: string
}) {
  const cm = getClassMap()
  const iconSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn('material-symbols-outlined text-primary shrink-0', iconSize)}
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        landscape
      </span>
      <span className={cm.cn('flex flex-col min-w-0')}>
        <span
          className={cm.cn(
            'truncate font-bold tracking-tighter leading-none',
            textSize,
            invert ? 'text-white' : 'text-on-surface',
          )}
        >
          {APP_NAME}
        </span>
        {subtitle ? (
          <span className={cm.cn('truncate text-xs text-on-surface-variant mt-0.5')}>
            {subtitle}
          </span>
        ) : null}
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
