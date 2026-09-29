import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the wordmark renders.
 *
 * Every surface (landing nav + footer, login brand panel, shell top bar,
 * sidebar, drawer) consumes this component so the brand is byte-identical
 * across the app: the black tracking-tighter wordmark (the landing design's
 * treatment — Shortlist's mark is type only, no tile), driven by
 * `branding.ts` and the brand tokens. Nothing else may render `APP_NAME` as
 * a brand (grep-enforced by scripts/verify-brand-consistency.mjs).
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
  /** for dark chrome (login brand panel): text on the dark surface */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn('inline-flex flex-col min-w-0')}
    >
      <span
        className={cm.cn(
          'font-black tracking-tighter leading-none truncate',
          textSize,
          invert ? 'text-surface' : 'text-on-surface',
        )}
      >
        {APP_NAME}
      </span>
      {withTagline ? (
        <span
          className={cm.cn(
            'text-[10px] tracking-widest uppercase whitespace-nowrap mt-1',
            'text-on-surface-variant',
          )}
        >
          {t('brand.tagline', {}, { defaultValue: 'Applicant tracking' })}
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
