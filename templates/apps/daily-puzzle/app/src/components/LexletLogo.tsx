/**
 * Lexlet wordmark — a 2x2 grid of letter tiles (the game board in miniature)
 * with one green "correct" tile, plus the app name set in the display font.
 * Used in branded auth pages, the game screens, and landing chrome.
 *
 * The tile mark mirrors public/logo.svg — if you recolor the brand, update
 * the three --puzzle-logo-tile-* tokens in theme.css and regenerate icons.
 */
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export type LexletLogoProps = {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'onSurface' | 'onPrimary'
}

const SIZE_TO_TEXT = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-[2rem]',
} as const

const SIZE_TO_MARK = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
} as const

export function LexletLogo({ size = 'md', variant = 'onSurface' }: LexletLogoProps) {
  const cm = getClassMap()
  const onPrimary = variant === 'onPrimary'

  return (
    <span className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
      <span
        className={cm.cn(
          SIZE_TO_MARK[size],
          cm.grid({ cols: 2, gap: 0.5 }),
          'rotate-[-6deg]',
          onPrimary ? 'opacity-90' : '',
        )}
        aria-hidden="true"
      >
        {/* Tile grid: correct, empty, present, absent — one guess at a glance. */}
        <span className="rounded-[4px] bg-[var(--puzzle-logo-tile-a)]" />
        <span className="rounded-[4px] bg-[var(--puzzle-logo-tile-c)] opacity-40" />
        <span className="rounded-[4px] bg-[var(--puzzle-logo-tile-b)]" />
        <span className="rounded-[4px] bg-[var(--puzzle-logo-tile-c)]" />
      </span>
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          SIZE_TO_TEXT[size],
          'tracking-tight',
          onPrimary ? 'text-white' : 'text-on-surface',
        )}
      >
        {APP_NAME.slice(0, -2)}
        <span className={cm.cn('text-primary')}>{APP_NAME.slice(-2)}</span>
      </span>
    </span>
  )
}

export default LexletLogo
