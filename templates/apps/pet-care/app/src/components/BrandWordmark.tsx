import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the Nuzzle lockup renders.
 *
 * Every surface (landing nav + footer, shell top bar / sidebar / drawer)
 * consumes this component so the brand is identical everywhere: the
 * `pets` glyph in the primary→secondary gradient roundel beside the
 * `font-headline font-bold tracking-tight` primary-ink wordmark
 * (design-pet-care-landing), driven by `branding.ts`. Nothing else may
 * render `APP_NAME` as a brand (grep-enforced by
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
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
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
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.w(8),
          cm.h(8),
          cm.roundedFull,
          cm.flex({ align: 'center', justify: 'center' }),
          'shrink-0',
        )}
        style={{
          background:
            'linear-gradient(135deg, var(--mol-color-primary), var(--mol-color-secondary))',
        }}
      >
        <span
          className={cm.cn('material-symbols-outlined text-white text-base')}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          pets
        </span>
      </span>
      <span
        className={cm.cn(
          textSize,
          cm.fontWeight('bold'),
          'tracking-tight leading-none truncate min-w-0 font-headline text-primary',
        )}
      >
        {APP_NAME}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" aria-label={APP_NAME} className={cm.cn('shrink-0')}>
      {mark}
    </Link>
  )
}

export default BrandWordmark
