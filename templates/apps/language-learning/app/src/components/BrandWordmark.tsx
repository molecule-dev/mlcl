import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, mobile chrome, footers) consumes this
 * component so the brand is byte-identical across the app: the `translate`
 * glyph in the primary square tile (the auth header's canonical chip) and
 * the heavy tracked-tight wordmark from the landing design, both driven by
 * `branding.ts` and the brand tokens. Nothing else may render `APP_NAME`
 * as a brand (grep-enforced by scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link
 * (the mobile top bar's logoTo link, the nav drawer's header).
 * `footer` renders the footer lockup (tile + wordmark + tagline, centered)
 * and carries data-mol-id="brand-wordmark-footer" so the per-page
 * "exactly one brand-wordmark" contract stays header-scoped.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** for dark chrome: tile + text on the dark surface (light glyph/ink) */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tileSize = size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-9 w-9' : 'h-7 w-7'
  const glyphSize = size === 'sm' ? 'text-sm' : 'text-lg'
  const textSize =
    size === 'sm' ? cm.textSize('lg') : size === 'lg' ? cm.textSize('2xl') : cm.textSize('xl')
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(
        cm.flex({
          align: 'center',
          direction: footer ? 'col' : 'row',
          gap: 'sm',
        }),
        'min-w-0',
      )}
    >
      <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}>
        <span
          aria-hidden="true"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            tileSize,
            'rounded-lg shrink-0 shadow-sm',
            invert
              ? 'bg-surface text-primary border border-outline-variant'
              : 'bg-primary text-on-primary',
          )}
        >
          <span className={cm.cn(glyphSize, 'material-symbols-outlined')} aria-hidden="true">
            translate
          </span>
        </span>
        <span
          className={cm.cn(
            cm.fontWeight('extrabold'),
            'tracking-tight leading-none truncate',
            textSize,
            invert ? 'text-surface' : 'text-primary',
          )}
        >
          {APP_NAME}
        </span>
      </span>
      {footer ? (
        <span
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'text-on-surface-variant leading-none',
          )}
        >
          {t('brand.tagline', {}, { defaultValue: 'Speak the world fluently' })}
        </span>
      ) : null}
    </span>
  )
  if (footer || as === 'span') return mark
  return (
    <Link to="/" className={cm.cn('group shrink-0 rounded')} aria-label={APP_NAME}>
      {mark}
    </Link>
  )
}

export default BrandWordmark
