import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Glint's brand mark — the ONLY place the tile + wordmark render.
 *
 * Every surface (sidebar, mobile top bar, auth pages, public player,
 * footer) consumes this component so the brand is byte-identical across
 * the app: the graphic_eq glyph in the brand-gradient tile and the bold
 * tracking-tight wordmark, both driven by `branding.ts` and the brand
 * gradient tokens. Nothing else may render `APP_NAME` as a brand
 * (grep-enforced by scripts/verify-brand-consistency.mjs and asserted per
 * page by e2e/brand.spec.ts via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link.
 * `tagline` renders the small-caps line under the wordmark — pass the
 * ALREADY-TRANSLATED string from the surface's own t() call.
 * `invert` is for dark chrome (the public player): white ink.
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
  /** dark chrome (public player): white ink instead of on-surface */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tileSize =
    size === 'sm'
      ? 'h-7 w-7 rounded-lg'
      : size === 'lg'
        ? 'h-10 w-10 rounded-xl shadow-lg shadow-[var(--color-brand-gradient-from)]/30'
        : 'h-8 w-8 rounded-lg shadow-md shadow-[var(--color-brand-gradient-from)]/30'
  const glyphSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'
  const textSize = size === 'sm' ? 'text-lg' : 'text-xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'shrink-0 bg-gradient-to-br from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)]',
          tileSize,
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-white', glyphSize)}>graphic_eq</span>
      </span>
      <span className="flex flex-col min-w-0">
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'tracking-tight leading-none truncate',
            textSize,
            invert ? 'text-white' : 'text-on-surface',
          )}
        >
          {APP_NAME}
        </span>
        {tagline ? (
          <span
            className={cm.cn(
              'text-[10px] uppercase tracking-[0.2em] whitespace-nowrap mt-1 font-semibold',
              invert ? 'text-white/60' : 'text-on-surface-variant',
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
    <Link to="/" className={cm.cn('group shrink-0')}>
      {mark}
    </Link>
  )
}
