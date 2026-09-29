import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the Verso lockup renders.
 *
 * Every surface (landing nav, auth shell header, shell top bar / sidebar /
 * drawer) consumes this component so the brand is identical everywhere:
 * the design's gradient `menu_book` tile beside the Newsreader headline
 * wordmark (`font-headline font-semibold tracking-tighter`,
 * design-note-taking-landing), driven by `branding.ts`. Nothing else may
 * render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default; pass
 * `as="span"` inside chrome that already provides its own link (the shell
 * links to `/home`). `footer` renders the footer lockup (wordmark only, no
 * tile) and carries brand-wordmark-footer so the per-page "exactly one
 * brand-wordmark" e2e contract stays header-scoped.
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
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
    >
      {footer ? null : (
        <span
          aria-hidden="true"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(8),
            cm.h(8),
            'rounded-xl text-white shadow-md shrink-0',
            'bg-gradient-to-br from-primary to-primary-container',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            menu_book
          </span>
        </span>
      )}
      <span
        className={cm.cn(
          textSize,
          'font-headline font-semibold tracking-tighter leading-none',
          'truncate min-w-0 text-on-surface',
        )}
      >
        {APP_NAME}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" aria-label={APP_NAME} className={cm.cn('rounded', 'shrink-0')}>
      {mark}
    </Link>
  )
}

export default BrandWordmark
