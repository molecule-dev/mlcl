import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (marketing nav + footer, auth hero + form pane, authed
 * sidebar + drawer) consumes this component so the brand is byte-identical
 * across the app: the `filter_alt` glyph on the primary tile and the
 * headline-serif bold wordmark, both driven by `branding.ts` and the brand
 * tokens. Nothing else may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link or a
 * non-link slot (the footer lockup, the shell's sidebar/drawer brand).
 * `footer` carries brand-wordmark-footer so the per-page "exactly one
 * brand-wordmark" e2e contract stays header-scoped. `invert` is for the
 * dark primary-gradient auth hero (light ink, surface tile).
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** for dark chrome (auth hero gradient): light wordmark ink + surface tile */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tileSize = size === 'lg' ? 'h-10 w-10 rounded-xl' : size === 'sm' ? 'h-7 w-7' : 'h-8 w-8'
  const iconSize = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-lg' : 'text-xl'
  const textSize =
    size === 'sm' ? cm.textSize('lg') : size === 'lg' ? 'text-3xl' : cm.textSize('xl')
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          tileSize,
          'rounded-lg shrink-0',
          invert ? 'bg-surface text-primary' : 'bg-primary text-on-primary',
        )}
      >
        <span className={cm.cn('material-symbols-outlined', iconSize)}>filter_alt</span>
      </span>
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          'tracking-tight whitespace-nowrap truncate',
          textSize,
          invert ? 'text-surface' : 'text-on-surface',
        )}
        style={{ fontFamily: 'var(--font-headline)' }}
      >
        {APP_NAME}
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
