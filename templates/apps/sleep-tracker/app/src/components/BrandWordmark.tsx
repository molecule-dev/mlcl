import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Somnia's brand mark — the ONLY place the glyph + wordmark render.
 *
 * Every surface (landing nav, auth shell header, authed mobile chrome,
 * footer) consumes this component so the brand is byte-identical across
 * the app: the filled bedtime glyph in the focus-accent ink and the tight
 * tracking wordmark, both driven by `branding.ts`. Nothing else may render
 * `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs and asserted per page by
 * e2e/brand.spec.ts via [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
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
  const glyphSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl'
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-lg'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn('material-symbols-outlined shrink-0', glyphSize)}
        style={{ color: 'var(--color-border-focus)', fontVariationSettings: "'FILL' 1" }}
      >
        bedtime
      </span>
      <span
        className={cm.cn(cm.fontWeight('extrabold'), 'leading-none truncate', textSize)}
        style={{ letterSpacing: '-0.02em' }}
      >
        {APP_NAME}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link
      to="/"
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        'min-w-0 whitespace-nowrap shrink-0',
      )}
    >
      {mark}
    </Link>
  )
}
