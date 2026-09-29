import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, authed sidebar brand row, mobile top bar)
 * consumes this component so the brand is byte-identical across the app:
 * the filled `eco` glyph on the produce-gradient roundel, the bold
 * headline-font wordmark in primary, both driven by `branding.ts` and
 * the brand tokens. Nothing else may render `APP_NAME` as a brand
 * (grep-enforced by scripts/verify-brand-consistency.mjs and asserted
 * per page by e2e via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link
 * (the shell's shop Links keep their own targets).
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** for dark chrome: tile + text on the dark surface (light glyph/ink) */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tileSize = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-10 h-10' : 'w-9 h-9'
  const glyphSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl'
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          'inline-flex items-center justify-center rounded-full text-white shadow-md shrink-0',
          tileSize,
        )}
        style={{
          background:
            'linear-gradient(135deg, var(--color-gradient-mid), var(--color-gradient-end))',
        }}
      >
        <span
          className={cm.cn('material-symbols-outlined', glyphSize)}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          eco
        </span>
      </span>
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          'tracking-tight leading-none truncate [font-family:var(--font-headline)]',
          textSize,
          invert ? 'text-surface' : 'text-primary',
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
