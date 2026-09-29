import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the wordmark + brand dot render.
 *
 * Every surface (landing nav, landing footer, authed sidebar brand via
 * the SidebarLayout header) consumes this component so the brand is
 * byte-identical across the app: the black uppercase wordmark with the
 * brand-cyan dot, driven by `branding.ts` and the ops tokens. Nothing
 * else may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs and asserted per page by e2e via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link
 * (the sidebar's `nav-brand` Link and the footer keep their own chrome).
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** for light chrome: ink on the light surface */
  invert?: boolean
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
        'inline-flex items-baseline gap-1.5 font-black tracking-tighter uppercase leading-none',
        textSize,
        invert ? 'text-on-surface' : 'text-white',
      )}
      aria-label={APP_NAME}
    >
      {APP_NAME}
      <span
        className={'w-1.5 h-1.5 rounded-full bg-[var(--color-brand-cyan-bright)]'}
        aria-hidden="true"
      />
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" className={cm.cn('group shrink-0')} aria-label={APP_NAME}>
      {mark}
    </Link>
  )
}
