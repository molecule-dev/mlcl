import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the wordmark renders.
 *
 * Every surface (landing nav, landing footer, authed top bar, mobile
 * drawer header) consumes this component so the brand is byte-identical
 * across the app: the black italic headline-font wordmark in primary,
 * driven by `branding.ts` and the brand tokens. Nothing else may render
 * `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs and asserted per page by e2e via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link
 * (the shell's TopBar brand Link keeps its own target/classes).
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
  /** for dark chrome: ink on the dark surface */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const textSize = size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-3xl' : 'text-2xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn('flex flex-col min-w-0')}
    >
      <span
        className={cm.cn(
          'font-black italic tracking-tighter leading-none [font-family:var(--font-headline)]',
          textSize,
          invert ? 'text-surface' : 'text-primary',
        )}
        aria-label={APP_NAME}
      >
        {APP_NAME}
      </span>
      {withTagline ? (
        <span className={cm.cn('text-on-surface-variant text-sm max-w-xs mt-2')}>
          {t('landing.footerTagline', {}, { defaultValue: 'Hot, fresh, fast — at your door.' })}
        </span>
      ) : null}
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" className={cm.cn('group shrink-0')} aria-label={APP_NAME}>
      {mark}
    </Link>
  )
}
