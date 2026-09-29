import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, side nav, auth pages, footer) consumes this
 * component so the brand is identical everywhere: the filled
 * `cast_for_education` glyph in the gradient primary tile + the bold
 * primary wordmark (with the tagline stacked beneath where the surface
 * has room), driven by `branding.ts`. Nothing else may render `APP_NAME`
 * as a brand (grep-enforced by scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link
 * (the side-nav brand links to /dashboard).
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  withTagline = false,
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** stack the tagline under the wordmark (nav + side nav) */
  withTagline?: boolean
  /** for dark chrome: light ink on the dark surface */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tileSize = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-10 w-10' : 'h-9 w-9'
  const glyphSize = size === 'sm' ? 'text-base' : 'text-[20px]'
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-lg'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          tileSize,
          'rounded-xl shrink-0 bg-gradient-to-br from-primary to-primary-dark shadow-md shadow-primary/30',
        )}
      >
        <span
          className={cm.cn(glyphSize, 'material-symbols-outlined text-on-primary')}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          cast_for_education
        </span>
      </span>
      <span className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'leading-none tracking-tight truncate min-w-0',
            textSize,
            invert ? 'text-surface' : 'text-primary',
          )}
        >
          {APP_NAME}
        </span>
        {withTagline ? (
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'leading-none mt-1 truncate min-w-0',
              'text-on-surface-variant',
            )}
          >
            {t('brand.tagline', {}, { defaultValue: APP_TAGLINE })}
          </span>
        ) : null}
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
