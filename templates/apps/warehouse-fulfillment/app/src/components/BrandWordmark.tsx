import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, authed shell sidebar/top bar, auth pages,
 * footer) consumes this component so the brand is byte-identical across
 * the app: the gradient tile carrying the local_shipping glyph plus the
 * heavy tight-tracked wordmark, both driven by `branding.ts` and the brand
 * tokens. Nothing else may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs and asserted per page by
 * e2e/brand.spec.ts via [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link
 * (the shell sidebar/top-bar brand slots, the footer lockup).
 *
 * `invert` renders the light wordmark ink for dark chrome (the auth
 * panel and the navy sidebar); the tile's gradient works on both.
 * `subtitle` stacks the "Fulfillment Console" kicker under the wordmark
 * where a surface carries it (shell sidebar, mobile top bar, auth panel) —
 * pass it through `t()` from the caller.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  footer = false,
  subtitle,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** for dark chrome: light wordmark ink (tile gradient unchanged) */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
  /** optional kicker stacked under the wordmark (already-translated copy) */
  subtitle?: string
}) {
  const cm = getClassMap()
  const tileSize =
    size === 'sm'
      ? 'h-8 w-8 rounded-lg'
      : size === 'lg'
        ? 'h-11 w-11 rounded-xl shadow-lg shadow-primary/40'
        : 'h-10 w-10 rounded-xl shadow shadow-primary/30'
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-lg'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'shrink-0 bg-gradient-to-br from-primary to-secondary text-on-primary',
          tileSize,
        )}
      >
        <span className="material-symbols-outlined" data-icon="local_shipping">
          local_shipping
        </span>
      </span>
      <span className={cm.cn('flex flex-col min-w-0')}>
        <span
          className={cm.cn(
            'truncate font-black tracking-tighter leading-none',
            textSize,
            footer ? 'text-[var(--wf-footer-fg)]' : invert ? 'text-white' : 'text-primary',
          )}
        >
          {APP_NAME}
        </span>
        {subtitle ? (
          <span
            className={cm.cn(
              'mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.18em]',
              invert ? 'text-white/50' : 'text-on-surface-variant',
            )}
          >
            {subtitle}
          </span>
        ) : null}
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
