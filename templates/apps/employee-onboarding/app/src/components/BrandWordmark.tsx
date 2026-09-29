import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the Embark lockup renders.
 *
 * Every surface (landing nav, authed sidebar, auth shells' panel + mobile
 * header) consumes this component so the brand is identical everywhere:
 * the filled `rocket_launch` glyph in the primary→secondary gradient tile
 * beside the `font-bold tracking-tight` wordmark. Nothing else may render
 * `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link by default (`to` is
 * configurable); pass `as="span"` inside chrome that already provides its
 * own link. `invert` is for dark chrome — the auth panel's frosted-glass
 * tile with light ink.
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
  /** for dark chrome: frosted-glass tile + light ink on the dark panel */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tilePx = size === 'sm' ? 32 : size === 'lg' ? 40 : 36
  const glyphPx = size === 'sm' ? 18 : size === 'lg' ? 24 : 20
  const textSize = size === 'lg' ? 'lg' : 'base'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.shrink0, 'rounded-xl')}
        style={
          invert
            ? {
                width: `${tilePx}px`,
                height: `${tilePx}px`,
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.22)',
                backdropFilter: 'blur(12px)',
              }
            : {
                width: `${tilePx}px`,
                height: `${tilePx}px`,
                background:
                  'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-secondary) 100%)',
                color: 'var(--mol-color-surface)',
              }
        }
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: `${glyphPx}px`,
            fontVariationSettings: "'FILL' 1",
            color: invert ? 'var(--mol-color-surface)' : undefined,
          }}
        >
          rocket_launch
        </span>
      </span>
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          `text-${textSize}`,
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
