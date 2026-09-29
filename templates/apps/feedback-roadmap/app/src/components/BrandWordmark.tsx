import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, auth shell header, 404 sign-off) consumes this
 * component so the brand is byte-identical across the app: the
 * `all_inclusive` glyph on the primary tile and the semibold tracking-tight
 * wordmark, both driven by `branding.ts` and the design tokens. Nothing else
 * may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default; pass
 * `as="span"` inside chrome that already provides its own link. `footer`
 * carries brand-wordmark-footer so the per-page "exactly one brand-wordmark"
 * e2e contract stays header-scoped.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  withTagline = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  withTagline?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tileSize = size === 'sm' ? 'w-6 h-6 rounded-md shadow-xs' : 'w-7 h-7 rounded-lg shadow-sm'
  const iconSize = size === 'sm' ? 'text-[16px]' : 'text-[18px]'
  const textSize = size === 'sm' ? cm.textSize('base') : cm.textSize('lg')
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'bg-primary text-on-primary shrink-0',
          tileSize,
        )}
      >
        <span className={cm.cn('material-symbols-outlined', iconSize)}>all_inclusive</span>
      </span>
      <span className={cm.cn(cm.flex({ direction: 'col' }), 'whitespace-nowrap')}>
        <span
          className={cm.cn(
            textSize,
            cm.fontWeight('semibold'),
            'text-on-surface tracking-tight leading-none',
          )}
        >
          {APP_NAME}
        </span>
        {withTagline ? (
          <span
            className={cm.cn(
              cm.fontWeight('medium'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
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
    <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'shrink-0')}>
      {mark}
    </Link>
  )
}
