import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every chrome surface (landing nav, auth header, sidebar brand row)
 * consumes this component so the brand is byte-identical across the app:
 * the coral "R" tile and the weight-800 wordmark, driven by
 * `branding.ts` and the brand tokens. Nothing else may render
 * `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs and asserted per page by e2e via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * (`InvoiceEditor`'s draft-preview letterhead is invoice DOCUMENT
 * content — the issuer block — not chrome; it deliberately does not
 * consume this component.)
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link
 * (the sidebar's dashboard Link keeps its own target/styles).
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** sidebar chrome: wordmark in the sidebar's active-text color */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tilePx = size === 'sm' ? 34 : size === 'lg' ? 40 : 36
  const radius = size === 'sm' ? 10 : 12
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}
    >
      <span
        aria-hidden="true"
        style={{
          width: tilePx,
          height: tilePx,
          borderRadius: radius,
          backgroundColor: 'var(--color-accent)',
          color: 'var(--color-sidebar-text-active)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: 16,
          boxShadow: '0 6px 18px var(--color-accent-shadow)',
        }}
      >
        R
      </span>
      <span
        style={{
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: invert ? 'var(--color-sidebar-text-active)' : 'var(--color-primary-dark)',
        }}
      >
        {APP_NAME}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link
      to="/"
      aria-label={APP_NAME}
      style={{ textDecoration: 'none' }}
      className={cm.cn('group shrink-0')}
    >
      {mark}
    </Link>
  )
}
