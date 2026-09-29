import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo glyph + wordmark render.
 *
 * Every surface (landing nav + footer, sidebar brand, auth pane, onboarding)
 * consumes this component so the brand is byte-identical across the app:
 * the filled restaurant glyph beside the bold tracking-tight wordmark,
 * driven by `branding.ts` and the brand tokens. Nothing else may render
 * `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link.
 * `xl` extends the standard size set — the auth pane's hero-scale lockup.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  withTagline = false,
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  withTagline?: boolean
  /** for dark chrome (auth brand pane): light glyph/ink on the dark surface */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const glyphSize = size === 'sm' ? 20 : size === 'xl' ? 40 : size === 'lg' ? 30 : 24
  const textSize =
    size === 'sm' ? 'text-lg' : size === 'xl' ? 'text-5xl' : size === 'lg' ? 'text-3xl' : 'text-2xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn('material-symbols-outlined shrink-0')}
        style={{
          fontSize: glyphSize,
          fontVariationSettings: "'FILL' 1",
          color: invert ? 'var(--color-on-primary-fixed)' : 'var(--color-primary)',
        }}
      >
        restaurant
      </span>
      <span className={cm.cn('flex flex-col min-w-0')}>
        <span
          className={cm.cn(
            'font-bold tracking-tight leading-none truncate',
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
              'text-primary/70 font-medium tracking-wide uppercase mt-1 whitespace-nowrap',
            )}
          >
            {t('brand.tagline', {}, { defaultValue: 'Friendly tracking' })}
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
