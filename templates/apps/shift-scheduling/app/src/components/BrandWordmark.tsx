import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

/**
 * Shiftly's brand mark — the ONLY place the tile + wordmark render.
 *
 * Every surface (landing nav, authed shell, auth brand panel, footer)
 * consumes this component so the brand is byte-identical across the app:
 * the schedule glyph in the primary tile and the display-face bold
 * wordmark, both driven by `branding.ts`. Nothing else may render
 * `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs and asserted per page by
 * e2e/brand.spec.ts via [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link.
 * `invert` is for the auth panel's primary gradient: on-primary ink with
 * a frosted tile instead of the solid primary tile.
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
  /** on the gradient auth panel: frosted tile + on-primary ink */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tileSize =
    size === 'sm'
      ? 'h-7 w-7 rounded-lg'
      : size === 'lg'
        ? 'h-9 w-9 rounded-xl'
        : 'h-8 w-8 rounded-xl'
  const glyphSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-[20px]' : 'text-[18px]'
  const textSize = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg'
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
          'shrink-0',
          invert ? 'bg-on-primary/15' : 'bg-primary text-on-primary shadow-sm shadow-primary/25',
        )}
      >
        <span className={cm.cn('material-symbols-outlined', glyphSize)}>schedule</span>
      </span>
      <span className="flex flex-col min-w-0">
        <span
          className={cm.cn(
            'font-display tracking-tight leading-none truncate',
            textSize,
            invert ? 'font-black tracking-tighter text-on-primary' : 'font-bold text-primary',
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
