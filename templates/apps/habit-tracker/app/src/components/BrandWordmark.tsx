import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the flame glyph + wordmark render.
 *
 * Every surface (landing nav, auth header, authed top bar + drawer)
 * consumes this component so the brand is byte-identical across the app:
 * the filled `local_fire_department` glyph in flame, the bold
 * tracking-tight wordmark, both driven by `branding.ts` and the brand
 * tokens. Nothing else may render `APP_NAME` as a brand (grep-enforced
 * by scripts/verify-brand-consistency.mjs and asserted per page by e2e
 * via [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link
 * (the landing nav's `landing-nav-brand` contract and the shell's
 * dashboard Links stay).
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** for dark chrome: glyph + text on the dark surface */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const glyphSize = size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-3xl' : 'text-2xl'
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}
      aria-label={APP_NAME}
    >
      <span
        aria-hidden="true"
        className={cm.cn('material-symbols-outlined shrink-0', glyphSize)}
        style={{ color: 'var(--color-flame)', fontVariationSettings: "'FILL' 1" }}
      >
        local_fire_department
      </span>
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          'tracking-tight leading-none truncate',
          textSize,
          invert ? 'text-surface' : undefined,
        )}
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
