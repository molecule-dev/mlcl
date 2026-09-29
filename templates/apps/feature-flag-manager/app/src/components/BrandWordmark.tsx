import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, authed sidebar + mobile top bar, auth
 * cards) consumes this component so the brand is byte-identical across
 * the app: the triangular pennant glyph on its pole, the extrabold
 * wordmark, both driven by `branding.ts` and the brand tokens. Nothing
 * else may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs and asserted per page by e2e via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link
 * (the sidebar/mobile Links and the auth-card headers keep their own
 * chrome and classes).
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  pulse = false,
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** "live" pulse dot after the wordmark (sidebar header). */
  pulse?: boolean
  /** for light chrome: ink on the light surface */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const textClass = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-3xl' : 'text-xl'
  const flagPx = size === 'sm' ? 14 : size === 'lg' ? 26 : 18
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn('inline-flex items-center gap-2 font-extrabold tracking-tight', textClass)}
      style={{ color: invert ? 'var(--color-surface)' : 'var(--color-text)' }}
      aria-label={APP_NAME}
    >
      <svg
        viewBox="0 0 24 24"
        width={flagPx}
        height={flagPx}
        aria-hidden="true"
        className={cm.cn('shrink-0')}
      >
        <path
          d="M5 3 L5 21"
          stroke="var(--color-primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M5 4 L20 8 L5 12 Z"
          fill="var(--color-primary)"
          stroke="var(--color-primary)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <span>{APP_NAME}</span>
      {pulse ? (
        <span
          className={cm.cn('ml-1 inline-block h-2 w-2 rounded-full animate-pulse')}
          style={{
            backgroundColor: 'var(--color-primary)',
            boxShadow: `0 0 0 3px color-mix(in srgb, var(--color-primary) 25%, transparent)`,
          }}
          aria-hidden="true"
        />
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
