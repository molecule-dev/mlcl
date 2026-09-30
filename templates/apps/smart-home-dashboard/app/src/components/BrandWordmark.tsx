import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

/**
 * Ember's brand mark — the ONLY place the tile + wordmark render.
 *
 * Every surface (landing nav, authed shell, auth pages, footer) consumes
 * this component so the brand is byte-identical across the app: the flame
 * glyph in the glow tile and the black tracking-tighter wordmark, both
 * driven by `branding.ts` and the light-mode glow tokens. Nothing else may
 * render `APP_NAME` as a brand (grep-enforced by
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
  /** dark chrome: light tile ink + light wordmark */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tileSize = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-9 w-9' : 'h-8 w-8'
  const glyphSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'
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
          'shrink-0 shadow-md',
          invert ? 'bg-lm-glow/20 text-lm-glow' : 'bg-lm-glow text-lm-on-glow',
        )}
      >
        {/* Tile owns the sizing/centering — never the glyph span. */}
        <span className={cm.cn('material-symbols-outlined', glyphSize)}>local_fire_department</span>
      </span>
      <span className="flex flex-col min-w-0">
        <span
          className={cm.cn(
            'font-black tracking-tighter leading-none truncate',
            textSize,
            invert ? 'text-surface' : 'text-on-surface',
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
