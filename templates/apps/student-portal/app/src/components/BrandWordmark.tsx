import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, landing footer, authed sidebar/mobile TopBar/
 * Drawer) consumes this component so the brand is byte-identical across the
 * app: the `menu_book` glyph on the translucent primary round tile and the
 * design's headline wordmark (font-black tracking-tighter, primary ink).
 * Nothing else may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default; pass
 * `as="span"` inside chrome that already provides its own link (the shell's
 * NavLink, the landing nav's Link). `footer` carries brand-wordmark-footer
 * so the per-page "exactly one brand-wordmark" e2e contract stays
 * header-scoped.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tileSize = size === 'sm' ? cm.w(8) + ' ' + cm.h(8) : cm.w(10) + ' ' + cm.h(10)
  const textSize =
    size === 'sm' ? cm.textSize('xl') : size === 'lg' ? cm.textSize('3xl') : cm.textSize('2xl')
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
          'bg-primary/10 text-primary shrink-0',
        )}
      >
        <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
          menu_book
        </span>
      </span>
      <span
        className={cm.cn(
          'font-headline font-black tracking-tighter text-primary truncate leading-none',
          textSize,
        )}
      >
        {APP_NAME}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" className={cm.cn('shrink-0')} aria-label={APP_NAME}>
      {mark}
    </Link>
  )
}
