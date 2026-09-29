import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the Stipend lockup renders.
 *
 * Every surface (landing nav + footer, shell sidebar / drawer / mobile top
 * bar) consumes this component so the brand is identical everywhere:
 * the design's `font-black tracking-tight` primary-ink wordmark
 * (design-payroll-manager-landing); the dark shell chrome takes `invert`,
 * which adds the gradient `receipt_long` roundel and white ink — the same
 * lockup the navy sidebar has always carried. Driven by `branding.ts`.
 * Nothing else may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default; pass
 * `as="span"` inside chrome that already provides its own link (the shell
 * links to `/dashboard`). `footer` carries brand-wordmark-footer so the
 * per-page "exactly one brand-wordmark" e2e contract stays header-scoped.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** for dark shell chrome: gradient receipt_long roundel + white ink */
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
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
    >
      {invert ? (
        <span
          aria-hidden="true"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            size === 'lg' || size === 'md' ? cm.w(8) : cm.w(7),
            size === 'lg' || size === 'md' ? cm.h(8) : cm.h(7),
            cm.roundedFull,
            'bg-gradient-to-br from-primary to-secondary text-white shadow-lg shrink-0',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined', size === 'sm' ? 'text-base' : 'text-lg')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            receipt_long
          </span>
        </span>
      ) : null}
      <span
        className={cm.cn(
          textSize,
          invert ? 'font-extrabold tracking-tight' : 'font-black tracking-tight',
          'leading-none truncate min-w-0',
          'text-primary-dark dark:text-primary',
          invert ? 'text-white dark:text-white' : undefined,
        )}
      >
        {APP_NAME}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" aria-label={APP_NAME} className={cm.cn('min-w-0 whitespace-nowrap shrink-0')}>
      {mark}
    </Link>
  )
}

export default BrandWordmark
