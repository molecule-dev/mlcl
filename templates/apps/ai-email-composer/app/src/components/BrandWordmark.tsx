import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

const SIZE_MAP: Record<'sm' | 'md' | 'lg', { text: string; dot: string }> = {
  sm: { text: 'text-lg', dot: 'w-1.5 h-1.5' },
  md: { text: 'text-2xl', dot: 'w-2 h-2' },
  lg: { text: 'text-4xl', dot: 'w-2.5 h-2.5' },
}

/**
 * The app's brand mark — the ONLY place the wordmark renders.
 *
 * Every surface (landing nav, authed sidebar/top bar + mobile drawer,
 * footer, auth pages) consumes this component so the brand is
 * byte-identical across the app: the heavy-tracked indigo "Signet" with
 * the gold signet-dot punctuation glyph, both driven by `branding.ts`
 * tokens. Nothing else may render `APP_NAME` as a brand (grep-enforced
 * by scripts/verify-brand-consistency.mjs via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link
 * (the shell's /dashboard links, the footer column).
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
  const sz = SIZE_MAP[size]
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}
    >
      <span
        className={cm.cn(sz.text, 'font-extrabold tracking-tighter leading-none truncate')}
        style={{ color: 'var(--mol-color-primary, var(--color-primary))' }}
      >
        {APP_NAME}
      </span>
      <span
        className={cm.cn(sz.dot, cm.roundedFull, 'inline-block shrink-0')}
        style={{ background: 'var(--mol-color-secondary, var(--color-secondary))' }}
        aria-hidden="true"
      />
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" className={cm.cn('group inline-block shrink-0 min-w-0')} aria-label={APP_NAME}>
      {mark}
    </Link>
  )
}
