import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, landing footer, authed sidebar + drawer,
 * mobile top bar, auth-page headers) consumes this component so the brand
 * is byte-identical across the app: the `highlight` glyph in the
 * primary/10 tile and the headline-serif black wordmark (the design's
 * header treatment), both driven by `branding.ts` and the brand tokens.
 * Nothing else may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs — in-slide "APP_NAME / year"
 * credit lines are translated copy, not the brand).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link or
 * inside non-link slots (the shell's brandBlock, TopBar brand, auth
 * header, footer Link). `footer` carries brand-wordmark-footer so the
 * per-page "exactly one brand-wordmark" e2e contract stays
 * header-scoped. `invert` is for dark chrome (light ink); current
 * surfaces are token-themed, so it stays unused.
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
  /** for dark chrome: light wordmark ink */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tileSize = size === 'lg' ? 'w-10 h-10 rounded-xl' : 'w-8 h-8 rounded-lg'
  const iconSize = size === 'sm' ? 'text-lg' : 'text-xl'
  const textSize = size === 'sm' ? cm.textSize('lg') : cm.textSize('xl')
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
          'bg-primary/10 overflow-hidden shrink-0',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined text-primary', iconSize)}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          highlight
        </span>
      </span>
      <span className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}>
        <span
          className={cm.cn(
            'font-black tracking-tighter whitespace-nowrap truncate',
            textSize,
            invert ? 'text-surface' : 'text-on-surface',
          )}
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          {APP_NAME}
        </span>
        {withTagline ? (
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant/70 whitespace-nowrap',
            )}
          >
            {APP_TAGLINE}
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
