import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

/**
 * Vivid's brand mark — the ONLY place the tile + wordmark render.
 *
 * Every surface (landing nav, authed shell, footer) consumes this component
 * so the brand is byte-identical across the app: the filled bolt glyph in
 * the pink→vivid gradient tile and the extrabold tracking-tight wordmark,
 * both driven by `branding.ts` and the landing gradient tokens. Nothing
 * else may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs and asserted per page by
 * e2e/brand.spec.ts via [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
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
  /** dark chrome: light wordmark */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tileSize = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-9 h-9' : 'w-8 h-8'
  const glyphSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-[18px]'
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          'inline-flex rounded-full items-center justify-center shrink-0',
          tileSize,
          'landing-vivid-gradient text-white shadow',
        )}
      >
        {/* Tile owns the sizing/centering — never the glyph span. */}
        <span
          className={cm.cn('material-symbols-outlined', glyphSize)}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          bolt
        </span>
      </span>
      <span className="flex flex-col min-w-0">
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
        {withTagline ? (
          <span
            className={cm.cn(
              'hidden sm:block text-[10px] tracking-widest uppercase whitespace-nowrap mt-1',
              invert ? 'text-surface/80' : 'text-on-surface-variant',
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
