import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, authed shell top bar/drawer, auth panel hero,
 * public RSVP nav) consumes this component so the brand is byte-identical
 * across the app: the design's italic headline-serif wordmark with its
 * primary-container dot, driven by `branding.ts` and the brand tokens.
 * Nothing else may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default; pass
 * `as="span"` inside chrome that already provides its own link. `invert`
 * drops the default ink color for dark chrome (the auth panel hero), where
 * the surrounding surface already paints the wordmark light.
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
  /** for dark chrome: inherit the panel's light ink instead of text-on-surface */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const textSize =
    size === 'sm' ? cm.textSize('xl') : size === 'lg' ? cm.textSize('3xl') : cm.textSize('2xl')
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'shrink-0 min-w-0')}
    >
      <span className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}>
        <span
          className={cm.cn(
            'font-headline italic tracking-tight leading-none whitespace-nowrap',
            textSize,
            invert ? '' : 'text-on-surface',
          )}
        >
          {APP_NAME}
          <span
            className="w-1.5 h-1.5 rounded-full bg-primary-container inline-block ml-1.5 mb-1"
            aria-hidden="true"
          />
        </span>
        {withTagline ? (
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'tracking-widest uppercase whitespace-nowrap mt-1',
              invert ? 'text-white/70' : 'text-on-surface-variant',
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
    <Link to="/" className={cm.cn(cm.flex({ align: 'center' }), 'shrink-0')} aria-label={APP_NAME}>
      {mark}
    </Link>
  )
}
