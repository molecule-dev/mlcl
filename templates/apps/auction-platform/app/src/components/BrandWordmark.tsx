import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing/about/help nav, authed mobile shell header +
 * drawer, auth pages' panel and mobile lockups, footer) consumes this
 * component so the brand is byte-identical across the app: the `gavel`
 * glyph in the primary gradient tile and the extrabold tight-tracked
 * wordmark, both driven by `branding.ts` tokens. Nothing else may render
 * `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `invert` is the dark-panel treatment (translucent tile, light ink) for
 * the auth brand panel.
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** for dark chrome (the auth brand panel): translucent tile, light ink */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tile =
    size === 'sm'
      ? 'w-7 h-7'
      : size === 'md'
        ? 'w-8 h-8'
        : size === 'lg'
          ? 'w-9 h-9'
          : 'w-10 h-10'
  const glyph =
    size === 'sm'
      ? cm.textSize('base')
      : size === 'md'
        ? cm.textSize('lg')
        : size === 'lg'
          ? cm.textSize('xl')
          : cm.textSize('2xl')
  const textSize =
    size === 'sm'
      ? cm.textSize('lg')
      : size === 'md'
        ? cm.textSize('xl')
        : size === 'lg'
          ? cm.textSize('2xl')
          : cm.textSize('3xl')
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          tile,
          'rounded-lg shrink-0',
          invert ? 'bg-surface/15 backdrop-blur-md' : 'text-white',
        )}
        style={
          invert
            ? undefined
            : {
                background:
                  'linear-gradient(135deg, var(--mol-color-primary), var(--color-primary-gradient-end))',
              }
        }
      >
        <span
          className={cm.cn('material-symbols-outlined', invert ? 'text-white' : '', glyph)}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          gavel
        </span>
      </span>
      <span
        className={cm.cn('font-extrabold tracking-tighter leading-none truncate', textSize)}
        style={invert ? undefined : { color: 'var(--mol-color-primary)' }}
      >
        {APP_NAME}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" className={cm.cn('group shrink-0 min-w-0')} aria-label={APP_NAME}>
      {mark}
    </Link>
  )
}
