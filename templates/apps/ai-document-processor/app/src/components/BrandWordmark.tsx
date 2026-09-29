import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_GRADIENT } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, mobile drawer, framework chrome) consumes this
 * component so the brand is byte-identical across the app: the document
 * glyph in the brand-gradient tile, the extrabold tracking-tighter wordmark,
 * both driven by `branding.ts` and the brand tokens. Nothing else may render
 * `APP_NAME` as a brand (grep-enforced by scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link.
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
  /** for dark chrome: tile + text on the dark surface (light glyph/ink) */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tileSize = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-9 w-9' : 'h-8 w-8'
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
          tileSize,
          'rounded-lg text-white shrink-0',
        )}
        style={{ background: BRAND_GRADIENT }}
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
        >
          description
        </span>
      </span>
      <span className={cm.cn('flex flex-col min-w-0')}>
        <span
          className={cm.cn(
            'font-extrabold tracking-tighter leading-none truncate',
            textSize,
            invert ? 'text-surface' : 'text-primary',
          )}
        >
          {APP_NAME}
        </span>
        {withTagline ? (
          <span
            className={cm.cn(
              'text-[10px] tracking-widest uppercase font-medium whitespace-nowrap mt-1',
              'text-on-surface-variant',
            )}
          >
            {t('brand.tagline', {}, { defaultValue: 'Process your documents with AI' })}
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
