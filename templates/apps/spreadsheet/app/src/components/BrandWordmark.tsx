import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Calcite's brand mark — the ONLY place the tile + wordmark render.
 *
 * Every surface (public nav, auth pages' header, authed sidebar/top bar/
 * drawer, 404) consumes this component so the brand is byte-identical
 * across the app: the filled grid_on glyph in the primary→primary-dark
 * gradient tile and the extrabold tracking-tight wordmark, both driven by
 * `branding.ts`. Nothing else may render `APP_NAME` as a brand
 * (grep-enforced by scripts/verify-brand-consistency.mjs and asserted per
 * page by e2e/brand.spec.ts via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link.
 * `tagline` renders the small-caps line under the wordmark — pass the
 * already-translated string (typically `APP_TAGLINE`).
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  tagline,
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** small-caps line under the wordmark (already-translated string) */
  tagline?: string
  /** dark chrome: light ink */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tile =
    size === 'sm'
      ? 'h-8 w-8 rounded-lg shadow-md shadow-primary/30'
      : size === 'lg'
        ? 'h-10 w-10 rounded-xl shadow-lg shadow-primary/30'
        : 'h-9 w-9 rounded-xl shadow-lg shadow-primary/30'
  const glyphSize = size === 'sm' ? 'text-lg' : size === 'lg' ? '' : 'text-xl'
  const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-3xl' : 'text-lg'
  const taglineSize = size === 'sm' ? 'text-[9px]' : 'text-[10px]'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'shrink-0 bg-gradient-to-br from-primary to-primary-dark text-on-primary',
          tile,
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined', glyphSize)}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          grid_on
        </span>
      </span>
      <span className="flex flex-col min-w-0">
        <span
          className={cm.cn(
            cm.fontWeight('extrabold'),
            'tracking-tight leading-none truncate',
            textSize,
            invert ? 'text-surface' : 'text-on-surface',
          )}
        >
          {APP_NAME}
        </span>
        {tagline ? (
          <span
            className={cm.cn(
              'uppercase tracking-widest text-on-surface-variant truncate',
              taglineSize,
            )}
          >
            {tagline}
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
