import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the Sigil lockup renders.
 *
 * Every surface (vault top bar, vault sidebar, auth header, landing nav +
 * footer) consumes this component so the brand is identical everywhere:
 * the filled `diamond` glyph beside the `font-extrabold tracking-tighter`
 * wordmark, both in the primary ink, driven by `branding.ts`. Nothing else
 * may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default; pass
 * `as="span"` inside chrome that already provides its own link (the vault
 * chrome links to `/vault`). `footer` renders the footer lockup
 * (on-surface ink) and carries brand-wordmark-footer so the per-page
 * "exactly one brand-wordmark" e2e contract stays header-scoped.
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
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.fontWeight('extrabold'),
        'tracking-tighter leading-none min-w-0',
        footer ? 'text-on-surface' : 'text-primary',
      )}
    >
      <span
        aria-hidden="true"
        className={cm.cn('material-symbols-outlined', 'text-primary shrink-0')}
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        diamond
      </span>
      <span className={cm.cn(textSize, 'truncate min-w-0')}>{APP_NAME}</span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" aria-label={APP_NAME} className={cm.cn('shrink-0')}>
      {mark}
    </Link>
  )
}

export default BrandWordmark
