import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav + footer, authed shell brand, the public
 * booking page header) consumes this component so the brand is
 * byte-identical across the app: the filled `schedule` glyph in the
 * primary gradient tile and the heavy tracked-tighter wordmark, both
 * driven by `branding.ts` and the brand tokens. Nothing else may render
 * `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link
 * (the shell brand links to /dashboard, the booking header to /).
 * `invert` is for dark chrome. `footer` carries
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
  /** for dark chrome: tile + text on the dark surface (light glyph/ink) */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tileSize = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-9 w-9' : 'h-8 w-8'
  const glyphSize = 'text-base'
  const textSize =
    size === 'sm' ? cm.textSize('lg') : size === 'lg' ? 'text-3xl' : cm.textSize('2xl')
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.roundedFull,
          tileSize,
          'shrink-0',
          invert ? 'bg-surface text-primary border border-outline-variant' : 'text-white',
        )}
        style={
          invert
            ? undefined
            : {
                background:
                  'linear-gradient(135deg, var(--color-primary), var(--color-primary-gradient-to))',
              }
        }
      >
        <span
          className={cm.cn('material-symbols-outlined', glyphSize)}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          schedule
        </span>
      </span>
      <span
        className={cm.cn(
          'font-extrabold tracking-tighter leading-none truncate',
          textSize,
          invert ? 'text-surface' : 'text-on-surface',
        )}
      >
        {APP_NAME}
      </span>
    </span>
  )
  if (footer || as === 'span') return mark
  return (
    <Link to="/" className={cm.cn('shrink-0 rounded')} aria-label={APP_NAME}>
      {mark}
    </Link>
  )
}

export default BrandWordmark
