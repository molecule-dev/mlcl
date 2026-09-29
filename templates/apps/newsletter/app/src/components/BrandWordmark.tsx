import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { SafeLink } from './SafeLink.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, the public issue masthead, footers) consumes
 * this component so the brand is byte-identical across the app: the
 * `mark_email_read` glyph on the primary-container tile, the Newsreader
 * wordmark, both driven by `branding.ts` and the brand tokens. Nothing else
 * may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router SafeLink to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link.
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
  const tileSize = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-9 h-9' : 'w-7 h-7'
  const tileText = size === 'sm' ? cm.textSize('sm') : size === 'lg' ? cm.textSize('lg') : ''
  const textSize =
    size === 'sm' ? cm.textSize('base') : size === 'lg' ? cm.textSize('2xl') : cm.textSize('xl')
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'group shrink-0 min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          tileSize,
          tileText,
          'rounded-sm bg-primary-container text-on-primary-container shadow-sm',
          'transition-transform group-hover:scale-95 duration-150 shrink-0',
        )}
      >
        <span className={cm.fv5b245ffa} aria-hidden>
          mark_email_read
        </span>
      </span>
      <span
        className={cm.cn(
          'font-headline font-medium tracking-tight leading-none truncate',
          textSize,
          'text-on-surface',
        )}
      >
        {APP_NAME}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <SafeLink to="/" className={cm.cn(cm.flex({ align: 'center' }), 'shrink-0')}>
      {mark}
    </SafeLink>
  )
}
