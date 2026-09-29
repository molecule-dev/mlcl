import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The Sigil glyph — the hexagon mark from the brand lockup. Lives here so
 * the brand renders from exactly one file.
 */
function SigilGlyph() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="text-primary shrink-0"
    >
      <path
        d="M16 2 L29 9 V23 L16 30 L3 23 V9 Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="rgba(245,158,11,0.10)"
      />
      <path
        d="M16 8 V16 M16 16 L23 20 M16 16 L9 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="2" fill="currentColor" />
    </svg>
  )
}

/**
 * The app's brand mark — the ONLY place the Bourse lockup renders.
 *
 * Every surface (authed shell top bar, auth split-screen header) consumes
 * this component so the brand is identical everywhere: the hexagon Sigil
 * glyph beside the `font-extrabold tracking-tight` wordmark. Nothing else
 * may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link by default (`to` is
 * configurable — the shell points it at `/dashboard`); pass `as="span"`
 * inside chrome that already provides its own link. `invert` is for dark
 * chrome (the auth split-screen's charcoal panel).
 */
export function BrandWordmark({
  as = 'link',
  to = '/dashboard',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  to?: string
  size?: 'sm' | 'md' | 'lg'
  /** for dark chrome: light ink on the dark panel */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const textSize = size === 'sm' ? 'lg' : size === 'lg' ? '2xl' : 'xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
    >
      <SigilGlyph />
      <span
        className={cm.cn(
          cm.textSize(textSize),
          'font-extrabold tracking-tight leading-none truncate',
          invert ? 'text-stone-50' : 'text-primary',
        )}
      >
        {APP_NAME}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link
      to={to}
      aria-label={APP_NAME}
      className={cm.cn(cm.displayInlineBlock, 'shrink-0 leading-none')}
    >
      {mark}
    </Link>
  )
}
