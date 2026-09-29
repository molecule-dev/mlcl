import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, landing footer) consumes this component so the
 * brand is byte-identical across the app: the filled `construction` glyph on
 * the brand-gradient tile and the bold tracking-tight wordmark, both driven
 * by `branding.ts` and the design tokens. Nothing else may render `APP_NAME`
 * as a brand (grep-enforced by scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default; pass
 * `as="span"` inside chrome that already provides its own link. `invert`
 * adapts the ink for the footer's surface-container-high band (the tile is
 * unchanged). `footer` carries brand-wordmark-footer so the per-page
 * "exactly one brand-wordmark" e2e contract stays header-scoped.
 */
export function BrandWordmark({
  as = 'link',
  withTagline = false,
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  withTagline?: boolean
  /** footer band: wordmark ink tuned to surface-container-high */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'shrink-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          'material-symbols-outlined brand-gradient text-on-primary rounded-lg p-1.5',
        )}
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        construction
      </span>
      <span className={cm.cn(cm.flex({ direction: 'col' }))}>
        <span
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            'tracking-tight',
            invert ? 'text-on-primary-container' : 'text-primary',
          )}
        >
          {APP_NAME}
        </span>
        {withTagline ? (
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'text-on-surface-variant uppercase tracking-widest hidden sm:block',
            )}
            style={{ fontSize: '11px' }}
          >
            {t('landing.brandSub', {}, { defaultValue: 'Jobsite OS' })}
          </span>
        ) : null}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
      {mark}
    </Link>
  )
}
