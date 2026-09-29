import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, landing footer, authed layout brand, auth
 * panel, public survey bar) consumes this component so the brand is
 * byte-identical across the app: the `graphic_eq` glyph on the primary→
 * secondary gradient round tile and the design's font-black tracking-tighter
 * wordmark. Nothing else may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default; pass
 * `as="span"` inside chrome that already provides its own link (the auth
 * panel's Link, the layout's brand Link). `invert` adapts the lockup for the
 * auth panel's gradient chrome (light ink, translucent tile). `footer`
 * carries brand-wordmark-footer so the per-page "exactly one brand-wordmark"
 * e2e contract stays header-scoped.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** dark/gradient chrome (auth panel): light ink + translucent tile */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tileSize = size === 'sm' ? cm.w(8) + ' ' + cm.h(8) : cm.w(10) + ' ' + cm.h(10)
  const glyphSize = size === 'sm' ? 16 : 20
  const textSize =
    size === 'sm' ? cm.textSize('lg') : size === 'lg' ? cm.textSize('3xl') : cm.textSize('2xl')
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.roundedFull,
          tileSize,
          invert
            ? 'bg-surface/20 backdrop-blur-md text-white shrink-0'
            : 'bg-gradient-to-br from-primary to-secondary text-white shrink-0',
        )}
      >
        <span className="material-symbols-outlined" style={{ fontSize: glyphSize }}>
          graphic_eq
        </span>
      </span>
      <span
        className={cm.cn(
          'font-black tracking-tighter truncate leading-none',
          textSize,
          invert ? 'text-white' : 'text-primary',
        )}
      >
        {APP_NAME}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" className={cm.cn('shrink-0')} aria-label={APP_NAME}>
      {mark}
    </Link>
  )
}
