import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the wordmark (+ tagline) renders.
 *
 * Every surface (landing header, auth shell, sidebar brand row, mobile
 * top bar, the 404 sign-off) consumes this component so the brand is
 * byte-identical across the app: the bold tracking-tight wordmark in the
 * mol primary over the tiny uppercase tagline, driven by `branding.ts`
 * and the brand tokens. Nothing else may render `APP_NAME` as a brand
 * (grep-enforced by scripts/verify-brand-consistency.mjs and asserted
 * per page by e2e via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link
 * (the landing/auth/sidebar Links and the TopBar brand slot keep their
 * own targets).
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  withTagline = false,
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  withTagline?: boolean
  /** for dark chrome: ink on the dark surface */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}
    >
      <span
        className={cm.cn(cm.fontWeight('bold'), 'tracking-tight leading-none', textSize)}
        style={{
          color: invert
            ? 'var(--color-surface)'
            : 'var(--mol-color-primary, var(--color-priority-normal))',
        }}
        aria-label={APP_NAME}
      >
        {APP_NAME}
      </span>
      {withTagline ? (
        <span
          className={cm.cn(
            cm.fontWeight('medium'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant mt-0.5 whitespace-nowrap',
          )}
        >
          {APP_TAGLINE}
        </span>
      ) : null}
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" className={cm.cn('group shrink-0')} aria-label={APP_NAME}>
      {mark}
    </Link>
  )
}
