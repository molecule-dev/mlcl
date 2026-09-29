import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the wordmark renders.
 *
 * Every surface (landing nav, sidebar header, auth shell, share preview,
 * 404) consumes this component so the brand is byte-identical across the
 * app: the italic gradient-stroked wordmark, bespoke per Vivace DESIGN.md,
 * driven by `branding.ts` and the brand tokens. Nothing else may render
 * `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs; asserted per page via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link.
 * `xl` extends the standard size set — the auth shell's hero-scale lockup.
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  withTagline = false,
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  withTagline?: boolean
  /** for dark chrome: gradient reads on dark surfaces as-is; invert lightens the ink */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const sizeClass =
    size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : size === 'xl' ? 'text-5xl' : 'text-2xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn('inline-flex flex-col min-w-0')}
    >
      <span
        className={cm.cn(
          sizeClass,
          'font-black italic tracking-tighter leading-none truncate text-transparent bg-clip-text bg-gradient-to-r from-[var(--anim-primary)] via-[var(--anim-primary)] to-[var(--anim-secondary)]',
        )}
      >
        {APP_NAME}
      </span>
      {withTagline ? (
        <span
          className={cm.cn(
            'text-[10px] tracking-widest uppercase whitespace-nowrap mt-1',
            invert ? 'text-surface' : 'text-on-surface-variant',
          )}
        >
          {t('brand.tagline', {}, { defaultValue: 'Animation tool' })}
        </span>
      ) : null}
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" className={cm.cn('group shrink-0')} aria-label={`${APP_NAME} home`}>
      {mark}
    </Link>
  )
}
