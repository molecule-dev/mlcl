import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the glyph + wordmark render.
 *
 * Every surface (landing nav, authed shell top bar / sidebar / drawer,
 * auth brand panel) consumes this component so the brand is
 * byte-identical across the app: the `stack` glyph in primary, the
 * extrabold tracking-tight wordmark, both driven by `branding.ts` and
 * the brand tokens. Nothing else may render `APP_NAME` as a brand
 * (grep-enforced by scripts/verify-brand-consistency.mjs and asserted
 * per page by e2e via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link
 * (the shell's `mobile-brand` contract and /home Links stay).
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
  /** for dark chrome (the auth brand panel): glyph + ink on the dark surface */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const glyphSize = size === 'sm' ? '1.5rem' : size === 'lg' ? '2.5rem' : '1.75rem'
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-5xl' : 'text-xl md:text-2xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          'material-symbols-outlined shrink-0',
          invert ? 'text-surface' : 'text-primary',
        )}
        style={{ fontSize: glyphSize }}
      >
        stack
      </span>
      <span className={cm.cn('flex flex-col min-w-0')}>
        <span
          className={cm.cn(
            cm.fontWeight('extrabold'),
            'tracking-tight leading-none truncate',
            textSize,
            invert ? 'text-surface' : 'text-on-surface',
          )}
        >
          {APP_NAME}
        </span>
        {withTagline ? (
          <span
            className={cm.cn(
              cm.sp('mt', 3),
              cm.textSize('xl'),
              invert ? 'text-surface' : 'text-on-surface-variant',
            )}
          >
            {t('brand.tagline', {}, { defaultValue: `${APP_TAGLINE}.` })}
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
