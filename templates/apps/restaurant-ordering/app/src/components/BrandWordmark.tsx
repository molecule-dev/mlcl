import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

/**
 * Hearth's brand mark — the ONLY place the flame tile + wordmark render.
 *
 * Every surface (landing nav, auth panel, mobile chrome, public-page nav,
 * footer) consumes this component so the brand is identical across the app:
 * the filled flame glyph in the primary→tertiary gradient tile and the
 * display-face wordmark, both driven by `branding.ts`. Nothing else may
 * render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs and asserted per page by
 * e2e/brand.spec.ts via [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link.
 * `invert` is for the auth panel's primary→tertiary gradient: a glassy
 * tile with on-primary ink instead of the solid gradient tile.
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
  withTagline?: boolean
  /** on the gradient auth panel: glassy tile + on-primary ink */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tileSize = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8'
  const glyphSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-3xl' : 'text-xl'
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.roundedFull,
          tileSize,
          'shrink-0',
          invert ? 'bg-surface/20 backdrop-blur-md' : 'bg-gradient-to-br from-primary to-tertiary',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined text-on-primary', glyphSize)}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          local_fire_department
        </span>
      </span>
      <span className="flex flex-col min-w-0">
        <span
          className={cm.cn(
            'font-display font-black tracking-tight leading-none truncate',
            textSize,
            invert ? 'text-on-primary' : 'text-tertiary',
          )}
        >
          {APP_NAME}
        </span>
        {withTagline ? (
          <span
            className={cm.cn(
              'hidden sm:block text-[10px] tracking-widest uppercase whitespace-nowrap mt-1',
              invert ? 'text-on-primary/80' : 'text-on-surface-variant',
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
