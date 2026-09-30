import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (public top nav, landing nav, mobile shell header + drawer,
 * auth hero, footer) consumes this component so the brand is byte-identical
 * across the app: the `auto_awesome` glyph in the primary gradient tile and
 * the `font-headline` wordmark, both driven by `branding.ts`. Nothing else
 * may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `layout="stacked"` is the auth-hero shape (tile above the wordmark,
 * centered); the default row lockup serves every nav/header/footer.
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  layout = 'row',
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  layout?: 'row' | 'stacked'
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tile =
    size === 'sm'
      ? cm.cn(cm.w(7), cm.h(7))
      : size === 'md'
        ? cm.cn(cm.w(8), cm.h(8))
        : size === 'lg'
          ? cm.cn(cm.w(10), cm.h(10))
          : cm.cn(cm.w(14), cm.h(14))
  const glyph =
    size === 'sm'
      ? cm.textSize('sm')
      : size === 'md'
        ? cm.textSize('base')
        : size === 'lg'
          ? cm.textSize('xl')
          : cm.textSize('2xl')
  const textSize =
    size === 'sm'
      ? cm.textSize('sm')
      : size === 'md'
        ? cm.textSize('lg')
        : size === 'lg'
          ? cm.textSize('xl')
          : cm.textSize('3xl')
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={
        layout === 'stacked'
          ? cm.flex({ direction: 'col', align: 'center', gap: 3 })
          : cm.cn(cm.flex({ align: 'center', gap: 2 }), 'min-w-0')
      }
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.roundedFull,
          tile,
          'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-sm shrink-0',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined', glyph)}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          auto_awesome
        </span>
      </span>
      <span
        className={cm.cn(
          'font-headline font-bold tracking-tight text-primary leading-none truncate',
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
