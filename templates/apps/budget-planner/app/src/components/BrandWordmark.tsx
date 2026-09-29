import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (auth split pane + mobile fallback, landing nav + footer,
 * shell top bar + drawer) consumes this component so the brand is
 * byte-identical across the app: the savings glyph in the primary roundel,
 * the extrabold tracking-tight wordmark, both driven by `branding.ts` and
 * the brand tokens. Nothing else may render `APP_NAME` as a brand
 * (grep-enforced by scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link.
 * `onGradient` renders the frosted-tile variant used on the auth brand pane.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  withTagline = false,
  invert = false,
  footer = false,
  onGradient = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  withTagline?: boolean
  /** for dark chrome: text on the dark surface (light ink) */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" contract stays header-scoped */
  footer?: boolean
  /** auth brand pane sits on the primary gradient: frosted tile + light ink */
  onGradient?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tileSize = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8'
  const glyphSize = size === 'sm' ? 18 : size === 'lg' ? 24 : 20
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.roundedFull,
          cm.flex({ align: 'center', justify: 'center' }),
          tileSize,
          'shrink-0',
          onGradient ? 'bg-surface/15 backdrop-blur-md text-white' : 'bg-primary text-white',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          style={{ fontSize: glyphSize, fontVariationSettings: "'FILL' 1" }}
        >
          savings
        </span>
      </span>
      <span className={cm.cn('flex flex-col min-w-0')}>
        <span
          className={cm.cn(
            'font-extrabold tracking-tight leading-none truncate',
            textSize,
            onGradient || invert ? 'text-white' : 'text-primary',
          )}
        >
          {APP_NAME}
        </span>
        {withTagline ? (
          <span
            className={cm.cn(
              'text-[10px] tracking-widest uppercase whitespace-nowrap mt-1',
              'text-on-surface-variant',
            )}
          >
            {t('brand.tagline', {}, { defaultValue: 'Budget planning' })}
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
