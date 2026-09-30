import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing nav, sidebar, mobile top bar, auth brand panel,
 * lobby, footer) consumes this component so the brand is identical
 * everywhere: the filled `videocam` glyph in the gradient primary→secondary
 * tile + the headline-font extra-bold wordmark, driven by `branding.ts`.
 * Nothing else may render `APP_NAME` as a brand (grep-enforced by
 * scripts/verify-brand-consistency.mjs).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link
 * (the sidebar brand links to /dashboard, the mobile shell likewise).
 * `invert` is for the forced-dark chrome (auth brand panel, pre-join
 * lobby): frosted tile, light ink. `heading` renders the wordmark as the
 * page's h1 (pre-join lobby) so the document outline keeps its level.
 * `subline` renders a small caption under the wordmark (the workspace
 * name in the desktop sidebar).
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  invert = false,
  heading = false,
  subline,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  /** for forced-dark chrome: frosted tile + light glyph/ink */
  invert?: boolean
  /** render the wordmark as the page's h1 (keeps the outline's level) */
  heading?: boolean
  /** small caption under the wordmark (sidebar: workspace name) */
  subline?: ReactNode
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const tile =
    size === 'sm'
      ? 'w-8 h-8 rounded-lg shadow-md shadow-primary/30'
      : size === 'lg'
        ? 'w-12 h-12 rounded-2xl shadow-lg shadow-primary/30'
        : 'w-10 h-10 rounded-xl shadow-lg shadow-primary/30'
  const glyphSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl'
  const Wordmark = heading ? 'h1' : 'span'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 3 }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          tile,
          'shrink-0',
          invert ? 'bg-surface/20 backdrop-blur-md' : 'bg-gradient-to-br from-primary to-secondary',
        )}
      >
        <span className={cm.cn(glyphSize, 'material-symbols-outlined text-on-primary')}>
          videocam
        </span>
      </span>
      <span className={cm.cn('flex flex-col min-w-0')}>
        <Wordmark
          className={cm.cn(
            'font-headline font-extrabold tracking-tight leading-none truncate min-w-0',
            textSize,
            invert ? 'text-white' : 'text-on-surface',
          )}
        >
          {APP_NAME}
        </Wordmark>
        {subline ? (
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.sp('mt', 1),
              'text-[10px] uppercase tracking-widest text-on-surface-variant truncate',
            )}
          >
            {subline}
          </span>
        ) : null}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" className={cm.cn('group shrink-0')} aria-label={APP_NAME}>
      {mark}
    </Link>
  )
}
