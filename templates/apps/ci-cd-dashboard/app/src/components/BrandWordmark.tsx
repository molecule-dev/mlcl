import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav + footer, shell sidebar brand row, auth
 * heroes) consumes this component so the brand is byte-identical across
 * the app: the `deployed_code` glyph in the emerald tile and the
 * mono-tight wordmark, both driven by `branding.ts`. Nothing else may
 * render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `layout="stacked"` is the auth-hero shape (tile above the centered
 * wordmark) — pair it with `invert` on the dark terminal panel.
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  layout = 'row',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'hero'
  layout?: 'row' | 'stacked'
  /** for dark chrome (the auth terminal panel): light wordmark ink */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const hero = size === 'hero'
  const tile = size === 'sm' ? 'h-7 w-7' : hero ? 'h-11 w-11' : 'h-8 w-8'
  const glyph = size === 'sm' ? 'text-base' : hero ? 'text-2xl' : 'text-xl'
  const textSize = size === 'sm' ? 'text-lg' : hero ? 'text-4xl' : 'text-xl'
  const tileEl = (
    <span
      aria-hidden="true"
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        tile,
        'rounded-lg shrink-0',
      )}
      style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
    >
      <span className={cm.cn('material-symbols-outlined', glyph)}>deployed_code</span>
    </span>
  )
  const wordmark = (
    <span
      className={cm.cn(
        'font-mono font-bold tracking-tighter leading-none truncate',
        textSize,
        invert ? 'text-white' : 'text-on-surface',
      )}
    >
      {APP_NAME}
    </span>
  )
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={
        layout === 'stacked'
          ? cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'sm' }), 'min-w-0')
          : cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')
      }
    >
      {tileEl}
      {wordmark}
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" className={cm.cn('group shrink-0 min-w-0')} aria-label={APP_NAME}>
      {mark}
    </Link>
  )
}
