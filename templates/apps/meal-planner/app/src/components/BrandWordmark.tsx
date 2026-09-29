import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { SafeLink } from './SafeLink.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, landing footer, authed sidebar/drawer/top bar,
 * auth panel, onboarding header) consumes this component so the brand is
 * byte-identical across the app: the filled `soup_kitchen` glyph on the
 * primary round tile and the tracking-tight wordmark, both driven by
 * `branding.ts` and the design tokens. Nothing else may render `APP_NAME` as
 * a brand (grep-enforced by scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a SafeLink to `/` by default; pass
 * `as="span"` inside chrome that already provides its own link (the shells'
 * brand anchors, the auth panel's Link). `invert` adapts the lockup for the
 * auth gradient panel's dark chrome (light ink, translucent tile). `footer`
 * carries brand-wordmark-footer so the per-page "exactly one brand-wordmark"
 * e2e contract stays header-scoped.
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
  /** dark chrome (auth gradient panel): light ink + translucent tile */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tileSize = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8'
  const iconSize = size === 'sm' ? 'text-[16px]' : size === 'lg' ? 'text-[22px]' : 'text-[18px]'
  const textSize =
    size === 'sm'
      ? 'text-xl font-bold'
      : size === 'lg'
        ? 'text-4xl font-black'
        : 'text-2xl font-bold'
  const taglineSize =
    size === 'sm' ? cm.textSize('xs') : size === 'lg' ? cm.textSize('xl') : cm.textSize('sm')
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'min-w-0')}
    >
      <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
        <span
          aria-hidden="true"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-full shrink-0',
            invert ? 'bg-white/15 text-white' : 'bg-primary text-on-primary',
            tileSize,
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined', iconSize)}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            soup_kitchen
          </span>
        </span>
        <span
          className={cm.cn(
            textSize,
            'tracking-tight leading-none',
            invert ? 'text-white' : 'text-primary',
          )}
        >
          {APP_NAME}
        </span>
      </span>
      {withTagline ? (
        <span
          className={cm.cn(
            taglineSize,
            cm.fontWeight('medium'),
            invert ? 'text-white/90' : 'text-on-surface-variant',
          )}
        >
          {t('simmer.auth.tagline', {}, { defaultValue: APP_TAGLINE })}
        </span>
      ) : null}
    </span>
  )
  if (as === 'span') return mark
  return (
    <SafeLink to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'shrink-0')}>
      {mark}
    </SafeLink>
  )
}
