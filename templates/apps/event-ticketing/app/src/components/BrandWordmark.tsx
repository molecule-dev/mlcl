import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the Turnstile lockup renders.
 *
 * Every surface (landing nav + footer, discovery nav, authed layout brand,
 * auth shells' panel + mobile header) consumes this component so the brand
 * is identical everywhere: the filled `confirmation_number` glyph in the
 * primary→secondary gradient tile beside the `font-extrabold
 * tracking-tighter` wordmark. Nothing else may render `APP_NAME` as a brand
 * (grep-enforced by scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link by default (`to` is
 * configurable); pass `as="span"` inside chrome that already provides its
 * own link. `invert` is for dark chrome — the auth panel's frosted-glass
 * tile with the 3xl white wordmark.
 */
export function BrandWordmark({
  as = 'link',
  to = '/',
  size = 'md',
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  to?: string
  size?: 'sm' | 'md' | 'lg'
  /** for dark chrome: frosted-glass tile + light ink */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tileCls =
    size === 'sm'
      ? 'w-8 h-8 rounded-lg'
      : size === 'lg'
        ? 'w-10 h-10 rounded-xl'
        : 'w-9 h-9 rounded-xl'
  const glyphCls = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg'
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.shrink0,
          tileCls,
          invert ? 'bg-surface/15 backdrop-blur-md' : 'text-white shadow-md shadow-primary/30',
        )}
        style={
          invert
            ? undefined
            : {
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              }
        }
      >
        <span
          className={cm.cn(
            glyphCls,
            'material-symbols-outlined',
            invert ? 'text-white' : undefined,
          )}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          confirmation_number
        </span>
      </span>
      <span
        className={cm.cn(
          textSize,
          'font-extrabold tracking-tighter leading-none truncate',
          invert ? 'text-white' : '',
        )}
        style={invert ? undefined : { color: 'var(--color-primary)' }}
      >
        {APP_NAME}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link
      to={to}
      aria-label={APP_NAME}
      className={cm.cn(cm.displayInlineBlock, 'shrink-0 leading-none')}
    >
      {mark}
    </Link>
  )
}
