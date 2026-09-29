import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav + footer, auth shell panel + mobile lockup,
 * vendor-onboarding header) consumes this component so the brand is
 * byte-identical across the app: the `storefront` glyph in the primary
 * tile and the headline-font black wordmark, both driven by
 * `branding.ts` tokens. Nothing else may render `APP_NAME` as a brand
 * (grep-enforced by scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
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
  const tile = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'
  const glyph = size === 'sm' ? 'text-base' : 'text-lg'
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
          tile,
          'rounded-xl bg-primary text-on-primary shrink-0',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined', glyph)}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          storefront
        </span>
      </span>
      <span
        className={cm.cn(
          '[font-family:var(--font-headline)] font-black tracking-tight text-primary leading-none truncate',
          textSize,
        )}
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
