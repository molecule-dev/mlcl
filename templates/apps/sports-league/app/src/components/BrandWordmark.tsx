import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Pennant's brand mark — the ONLY place the tile + wordmark render.
 *
 * Every surface (landing nav, authed shell, mobile drawer, footer)
 * consumes this component so the brand is byte-identical across the app:
 * the filled shield glyph in the primary-gradient tile and the black
 * uppercase tracking-tighter wordmark, both driven by `branding.ts`.
 * Nothing else may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs and asserted per page by
 * e2e/brand.spec.ts via [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link.
 * `tagline` renders the small-caps line under the wordmark — pass the
 * ALREADY-TRANSLATED string from the surface's own t() call.
 * `invert` is for dark chrome (the landing footer): white ink.
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
  /** dark chrome (landing footer): white ink instead of primary */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tileSize = size === 'lg' ? 'w-9 h-9' : 'h-8 w-8'
  const glyphSize = size === 'sm' ? 'text-lg' : 'text-xl'
  const textSize = size === 'sm' ? 'text-lg' : 'text-xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          'inline-flex items-center justify-center rounded-lg shrink-0 shadow-md shadow-primary/30',
          tileSize,
        )}
        style={{
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
        }}
      >
        {/* Tile owns the sizing/centering — never the glyph span. */}
        <span
          className={cm.cn('material-symbols-outlined text-on-primary', glyphSize)}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          shield
        </span>
      </span>
      <span className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}>
        <span
          className={cm.cn(
            'font-black uppercase tracking-tighter leading-none truncate',
            textSize,
            invert ? 'text-white' : 'text-primary',
          )}
        >
          {APP_NAME}
        </span>
        {tagline ? (
          <span
            className={cm.cn(
              'text-[10px] font-bold uppercase tracking-normal whitespace-nowrap mt-1',
              invert ? 'text-slate-400' : 'text-on-surface-variant',
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
    <Link
      to="/"
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        'min-w-0 whitespace-nowrap shrink-0',
      )}
    >
      {mark}
    </Link>
  )
}
