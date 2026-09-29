import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, landing footer, authed mobile top bar +
 * drawer) consumes this component so the brand is byte-identical across
 * the app: the primary→secondary gradient camera tile and the editorial
 * italic-serif wordmark (the design's Newsreader headline treatment),
 * both driven by `branding.ts` and the brand tokens. Nothing else may
 * render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link (the
 * shell's `layout-brand` Link). `footer` carries brand-wordmark-footer so
 * the per-page "exactly one brand-wordmark" e2e contract stays
 * header-scoped. `invert` is for dark chrome (light ink) — every current
 * surface is light, so it stays unused.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** for dark chrome: light wordmark ink */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tileSize = size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-8 w-8' : 'h-7 w-7'
  const iconSize = size === 'sm' ? 'text-sm' : 'text-base'
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'
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
          'rounded-lg shadow-md shrink-0 text-white',
        )}
        style={{
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
        }}
      >
        <span className={cm.cn('material-symbols-outlined', iconSize)}>camera</span>
      </span>
      <span
        className={cm.cn(
          'italic font-light tracking-tight whitespace-nowrap',
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
