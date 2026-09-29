import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, CITY_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the brand renders.
 *
 * Every surface (public header, public footer) consumes this component so
 * the brand is byte-identical across the app: the pin-on-grid mark in the
 * primary-container tile with the two-line wordmark (app name over the
 * "{{city}} 311" sub-brand), or the footer's text-only department line —
 * both driven by `branding.ts`. Nothing else may render `APP_NAME` as a
 * brand (grep-enforced by scripts/verify-brand-consistency.mjs).
 *
 * `variant` picks the lockup: `'mark'` (tile + two-line wordmark, the
 * header treatment) or `'line'` (the footer's text-only municipal line).
 * `as` renders the wrapping element: a router Link to `/` by default; pass
 * `as="span"` inside chrome that already provides its own link. `footer`
 * carries brand-wordmark-footer so the per-page "exactly one brand-wordmark"
 * e2e contract stays header-scoped.
 */
export function BrandWordmark({
  as = 'link',
  variant = 'mark',
  footer = false,
}: {
  as?: 'link' | 'span'
  variant?: 'mark' | 'line'
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 shrink-0')}
    >
      {variant === 'mark' ? (
        <span
          aria-hidden="true"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'w-9 h-9 rounded-lg bg-primary-container text-on-primary shadow-sm',
          )}
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </span>
      ) : null}
      {variant === 'mark' ? (
        <span className={cm.cn(cm.flex({ direction: 'col' }), 'leading-none')}>
          <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tracking-tight')}>
            {APP_NAME}
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'font-mono uppercase tracking-widest text-secondary',
            )}
            style={{ fontSize: '10px' }}
          >
            {t('header.subBrand', { city: CITY_NAME }, { defaultValue: '{{city}} 311' })}
          </span>
        </span>
      ) : (
        <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
          {APP_NAME} {CITY_NAME} 311
        </span>
      )}
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 shrink-0')}>
      {mark}
    </Link>
  )
}
