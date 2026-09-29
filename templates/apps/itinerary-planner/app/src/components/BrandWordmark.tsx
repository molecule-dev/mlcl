import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the glyph + wordmark render.
 *
 * Every surface (public top nav, public footer, auth shell, authed top
 * bar + drawer) consumes this component so the brand is byte-identical
 * across the app: the filled `explore` glyph in primary, the extrabold
 * headline-font wordmark in primary, both driven by `branding.ts` and
 * the brand tokens. Nothing else may render `APP_NAME` as a brand
 * (grep-enforced by scripts/verify-brand-consistency.mjs and asserted
 * per page by e2e via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link
 * (the `public-nav-brand` contract and the dashboard Links stay).
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
  /** for dark chrome: glyph + ink on the dark surface */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const glyphSize = size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-4xl' : 'text-3xl'
  const textSize = size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-3xl' : 'text-2xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn('material-symbols-outlined shrink-0', glyphSize)}
        style={{
          fontVariationSettings: "'FILL' 1",
          color: invert ? 'var(--color-surface)' : 'var(--color-primary)',
        }}
      >
        explore
      </span>
      <span className={cm.cn('flex flex-col min-w-0')}>
        <span
          className={cm.cn(
            cm.fontWeight('extrabold'),
            'tracking-tight leading-none truncate [font-family:var(--font-headline)]',
            textSize,
            invert ? 'text-surface' : 'text-primary',
          )}
        >
          {APP_NAME}
        </span>
        {withTagline ? (
          <span className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'landing.footer.tagline',
              { tagline: APP_TAGLINE },
              { defaultValue: '{{tagline}}.' },
            )}
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
