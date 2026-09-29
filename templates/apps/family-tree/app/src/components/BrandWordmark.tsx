import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, landing footer, authed TopBar, mobile Drawer)
 * consumes this component so the brand is byte-identical across the app: the
 * filled `park` glyph on the forest tile, the headline-font wordmark, both
 * driven by `branding.ts` and the design tokens. Nothing else may render
 * `APP_NAME` as a brand (grep-enforced by scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default; pass
 * `as="span"` inside chrome that already provides its own link (the authed
 * TopBar links to `/tree`). `footer` carries brand-wordmark-footer so the
 * per-page "exactly one brand-wordmark" e2e contract stays header-scoped.
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
  const tileSize = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-9 h-9' : 'w-8 h-8'
  const iconSize = size === 'sm' ? 'text-sm' : 'text-base'
  const textSize =
    size === 'sm' ? cm.textSize('base') : size === 'lg' ? cm.textSize('lg') : cm.textSize('xl')
  const filled = { fontVariationSettings: "'FILL' 1" } as const
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'shrink-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          tileSize,
          'rounded-md shadow-sm shrink-0 text-white',
        )}
        style={{ backgroundColor: 'var(--color-forest)' }}
      >
        <span className={cm.cn('material-symbols-outlined', iconSize)} style={filled}>
          park
        </span>
      </span>
      <span className={cm.cn(cm.flex({ direction: 'col' }), 'whitespace-nowrap')}>
        <span
          className={cm.cn(textSize, cm.fontWeight('semibold'), 'leading-none tracking-tight')}
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          {APP_NAME}
        </span>
        {withTagline ? (
          <span
            className={cm.cn(cm.textSize('xs'), 'tracking-widest uppercase mt-0.5')}
            style={{ color: 'var(--color-forest-hover)' }}
          >
            {t('landing.footer.tagline', {}, { defaultValue: 'Your family, connected' })}
          </span>
        ) : null}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'shrink-0')}>
      {mark}
    </Link>
  )
}
