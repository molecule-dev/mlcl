import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, landing footer, authed sidebar, mobile top
 * bar, drawer) consumes this component so the brand is byte-identical
 * across the app: the filled `call_split` glyph on the primary tile and the
 * extrabold tracking-tight wordmark, both driven by `branding.ts` and the
 * design tokens. Nothing else may render `APP_NAME` as a brand
 * (grep-enforced by scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default; pass
 * `as="span"` inside chrome that already provides its own link (the shell's
 * `sidebar-brand` / `mobile-brand` NavLinks). `footer` carries
 * brand-wordmark-footer so the per-page "exactly one brand-wordmark" e2e
 * contract stays header-scoped.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  withTagline = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  withTagline?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tileShape = size === 'lg' ? 'h-10 w-10 rounded-xl shadow-md' : 'h-8 w-8 rounded-lg'
  const iconSize = size === 'lg' ? 'text-2xl' : 'text-lg'
  const textSize =
    size === 'sm' ? cm.textSize('base') : size === 'lg' ? cm.textSize('xl') : cm.textSize('lg')
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'bg-primary text-on-primary shrink-0 transition-transform',
          tileShape,
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined', iconSize)}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          call_split
        </span>
      </span>
      <span className={cm.cn(cm.flex({ direction: 'col' }), 'whitespace-nowrap')}>
        <span
          className={cm.cn(
            textSize,
            cm.fontWeight('bold'),
            'tracking-tight font-extrabold text-on-surface',
          )}
        >
          {APP_NAME}
        </span>
        {withTagline ? (
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('app.tagline', {}, { defaultValue: APP_TAGLINE })}
          </span>
        ) : null}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'shrink-0')}>
      {mark}
    </Link>
  )
}
