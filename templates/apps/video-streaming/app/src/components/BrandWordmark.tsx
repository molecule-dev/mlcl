import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, sidebar, mobile top bar, drawer, footer)
 * consumes this component so the brand is identical everywhere: the
 * filled `play_arrow` glyph in the round CTA-gradient tile + the design's
 * black italic tight-tracked wordmark, driven by `branding.ts` and the
 * Spool palette tokens. Nothing else may render `APP_NAME` as a brand
 * (grep-enforced by scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link
 * (the shell brands link to /home).
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** for dark chrome: light ink on the dark surface */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tileSize = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-9 h-9' : 'w-8 h-8'
  const glyphSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl'
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
          'shadow shrink-0 bg-gradient-to-r from-[var(--spool-cta-from)] to-[var(--spool-cta-to)]',
          invert ? 'opacity-90' : '',
        )}
      >
        <span
          className={cm.cn(glyphSize, 'material-symbols-outlined text-white')}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          play_arrow
        </span>
      </span>
      <span
        className={cm.cn(
          'font-black italic tracking-tighter leading-none truncate min-w-0',
          textSize,
          invert ? 'text-surface' : 'text-on-surface',
        )}
      >
        {APP_NAME}
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
