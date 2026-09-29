import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, authed shell sidebar/top bar, auth pages,
 * 404 header, footer) consumes this component so the brand is byte-identical
 * across the app: the rounded tile carrying the cloud_sync glyph plus the
 * heavy tight-tracked wordmark with the colored accent dot, both driven by
 * `branding.ts` and the brand tokens. Nothing else may render `APP_NAME` as
 * a brand (grep-enforced by scripts/verify-brand-consistency.mjs and
 * asserted per page by e2e/brand.spec.ts via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link
 * (the shell sidebar/top-bar brand slots, the footer lockup).
 *
 * `size="lg"` is the auth hero scale — display-weight text-only lockup,
 * no tile, matching the auth panel's oversized brand.
 * `invert` renders the light-on-dark variant for dark chrome.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** for dark chrome: tile + text on the dark surface (light ink) */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(
        'inline-flex items-center min-w-0',
        size === 'lg' ? 'items-baseline' : 'gap-2',
      )}
    >
      {size !== 'lg' ? (
        <span
          aria-hidden="true"
          className={cm.cn(
            'inline-flex shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary',
            size === 'sm' ? 'h-7 w-7' : 'h-8 w-8',
          )}
        >
          <span
            className={cm.cn(
              'material-symbols-outlined',
              size === 'sm' ? 'text-base' : 'text-[20px]',
            )}
          >
            cloud_sync
          </span>
        </span>
      ) : null}
      <span
        className={cm.cn(
          'truncate leading-none',
          size === 'lg'
            ? 'text-4xl font-black tracking-tighter'
            : size === 'sm'
              ? 'text-lg font-extrabold tracking-tight'
              : 'text-xl font-extrabold tracking-tight',
          invert ? 'text-white' : 'text-on-surface',
        )}
      >
        {APP_NAME}
        <span className="text-primary">.</span>
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
