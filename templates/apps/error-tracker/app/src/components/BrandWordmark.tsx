import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the Faultline lockup renders.
 *
 * Every surface (landing nav, authed shell brand, auth pages' display
 * wordmark) consumes this component so the brand is identical everywhere:
 * the `bug_report` glyph in the BRAND_COLOR tile beside the `font-extrabold
 * tracking-tight` wordmark. Nothing else may render `APP_NAME` as a brand
 * (grep-enforced by scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link by default (`to` is
 * configurable); pass `as="span"` inside chrome that already provides its
 * own link (the shell's `nav-brand` Link). `size="lg"` is the auth pages'
 * display wordmark (tile omitted there, as designed). `invert` is for dark
 * chrome; `footer` for footer lockups (carries brand-wordmark-footer so the
 * per-page "exactly one brand-wordmark" e2e contract stays header-scoped).
 */
export function BrandWordmark({
  as = 'link',
  to = '/',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  to?: string
  size?: 'sm' | 'md' | 'lg'
  /** for dark chrome: light ink on the dark surface */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const textSize = size === 'sm' ? 'lg' : size === 'lg' ? '4xl' : 'xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(
        cm.flex({ align: 'center' }),
        'gap-2 min-w-0',
        cm.textSize(textSize),
        'font-extrabold tracking-tight leading-none',
      )}
      style={{ color: 'var(--color-text)' }}
    >
      {size !== 'lg' ? (
        <span
          aria-hidden="true"
          className={cm.cn('inline-flex h-8 w-8 items-center justify-center rounded-lg shrink-0')}
          style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
        >
          <span className={cm.cn('material-symbols-outlined text-[20px]')}>bug_report</span>
        </span>
      ) : null}
      <span className={cm.cn('truncate', invert ? 'text-surface' : undefined)}>{APP_NAME}</span>
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
