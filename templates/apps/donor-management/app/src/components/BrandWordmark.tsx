import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, landing footer) consumes this component so
 * the brand is byte-identical across the app: the filled `favorite` glyph
 * on the primary tile, the headline-serif wordmark in primary, both driven
 * by `branding.ts` and the brand tokens. Nothing else may render `APP_NAME`
 * as a brand (grep-enforced by scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tileSize = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-10 h-10' : 'w-9 h-9'
  const tileRadius = size === 'sm' ? 'rounded-md' : 'rounded-lg'
  const glyphSize =
    size === 'sm' ? cm.textSize('sm') : size === 'lg' ? cm.textSize('2xl') : cm.textSize('xl')
  const textSize =
    size === 'sm' ? cm.textSize('sm') : size === 'lg' ? cm.textSize('xl') : cm.textSize('lg')
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'shrink-0 min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          tileSize,
          tileRadius,
          'bg-primary text-on-primary shadow-sm shrink-0',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined', glyphSize)}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          favorite
        </span>
      </span>
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          'text-primary tracking-tight leading-none',
          textSize,
        )}
        style={{ fontFamily: 'var(--font-headline)' }}
      >
        {APP_NAME}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))} aria-label={APP_NAME}>
      {mark}
    </Link>
  )
}
