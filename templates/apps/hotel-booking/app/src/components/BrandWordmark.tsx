import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the wordmark (+ tagline) renders.
 *
 * Every surface (landing nav, landing footer, auth header, authed shell
 * nav) consumes this component so the brand is byte-identical across the
 * app: the serif headline wordmark in primary (weight 400, the display
 * face — not the body bold), driven by `branding.ts` and the brand
 * tokens. Nothing else may render `APP_NAME` as a brand (grep-enforced
 * by scripts/verify-brand-consistency.mjs and asserted per page by e2e
 * via [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link.
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
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn('flex flex-col min-w-0')}
    >
      <span
        className={cm.cn(
          cm.textSize(size === 'sm' ? 'xl' : size === 'lg' ? '3xl' : '2xl'),
          'leading-none truncate',
        )}
        style={{
          fontFamily: 'var(--font-headline)',
          fontWeight: 400,
          color: invert ? 'var(--color-surface)' : 'var(--color-primary)',
        }}
        aria-label={APP_NAME}
      >
        {APP_NAME}
      </span>
      {withTagline ? (
        <span className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t('landing.footer.tagline', {}, { defaultValue: 'Stay somewhere extraordinary.' })}
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
