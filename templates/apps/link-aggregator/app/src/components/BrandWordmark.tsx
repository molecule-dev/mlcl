import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, sidebar/drawer chrome, auth brand header,
 * footer) consumes this component so the brand is byte-identical across
 * the app: the `terrain` glyph in the primary gradient cairn tile and the
 * heavy tracked-tighter wordmark from the landing design, both driven by
 * `branding.ts` and the brand tokens. Nothing else may render `APP_NAME`
 * as a brand (grep-enforced by scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link
 * (the sidebar brand block links to /feed, the landing nav to /).
 * `invert` is for dark chrome: solid surface tile with the primary glyph.
 * `footer` renders the footer lockup and carries
 * data-mol-id="brand-wordmark-footer" so the per-page "exactly one
 * brand-wordmark" contract stays header-scoped.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** for dark chrome: solid surface tile + primary glyph */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tileSize = size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8'
  const glyphSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg'
  const textSize =
    size === 'sm' ? cm.textSize('lg') : size === 'lg' ? cm.textSize('2xl') : cm.textSize('xl')
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
          cm.roundedFull,
          'shrink-0 text-white',
          invert
            ? 'bg-surface text-primary border border-outline-variant'
            : 'bg-gradient-to-br from-primary to-[var(--color-primary-deep)]',
        )}
      >
        <span className={cm.cn(glyphSize, 'material-symbols-outlined')} aria-hidden="true">
          terrain
        </span>
      </span>
      <span
        className={cm.cn(
          cm.fontWeight('extrabold'),
          'tracking-tighter leading-none truncate',
          textSize,
          invert ? 'text-surface' : 'text-primary',
        )}
      >
        {APP_NAME}
      </span>
      {footer ? (
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant leading-none',
          )}
        >
          {t('brand.tagline', {}, { defaultValue: 'Mark the path' })}
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
