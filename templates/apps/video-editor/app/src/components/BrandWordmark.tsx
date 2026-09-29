/**
 * The app's brand mark — the ONLY place the wordmark renders.
 *
 * Every surface (landing nav, sidebar header, public nav, auth pages,
 * 404, footer bar) consumes this component so the brand is identical
 * everywhere: the bespoke bold-italic, gradient-stroked type logo per
 * Rushes DESIGN.md (Brand Identity / Logo), driven by `branding.ts` and
 * the video palette tokens. Nothing else may render `APP_NAME` as a
 * brand (grep-enforced by scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link or
 * where the wordmark is pure display (auth hero, footer bar). `footer`
 * carries brand-wordmark-footer so the per-page "exactly one
 * brand-wordmark" e2e contract stays header-scoped.
 *
 * Formerly RushesWordmark.tsx — same treatment, fleet-contract API.
 */
import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export function BrandWordmark({
  as = 'link',
  size = 'md',
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const sizeClass: Record<NonNullable<typeof size>, string> = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-5xl',
  }
  const wordmark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(
        sizeClass[size],
        'font-black italic tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-r from-[var(--video-link)] via-[var(--video-cta-from)] to-[var(--video-cta-to)]',
      )}
    >
      {APP_NAME}
    </span>
  )

  if (as === 'span') return wordmark
  return (
    <Link to="/" aria-label={`${APP_NAME} home`} className={cm.cn('group shrink-0')}>
      {wordmark}
    </Link>
  )
}

export default BrandWordmark
