import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Arcanum brand mark — `▮ arcanum` rendered in mono extrabold tracking
 * tight with a blinking terminal-cursor caret. Used at the top of every
 * auth card, the 404 page, the sidebar of `SecretsManagerLayout`, and
 * the Landing hero.
 *
 * Translated from database-admin's QuarryBrandMark.tsx (terminal `>`
 * prefix + blinking caret) into Arcanum's brand idiom: the prefix is a
 * solid lock-shield glyph (▮ filled bar) per DESIGN.md
 * "Logo: word-mark in the heading font with a subtle lock glyph kerned
 * before the A".
 */

interface ArcanumBrandMarkProps {
  /** `lg` for auth cards, `md` for sidebar headers, `sm` for footers. */
  size?: 'sm' | 'md' | 'lg'
  /** Hide the blinking caret (e.g. inside compact sidebars). */
  caret?: boolean
  /** Hide the leading lock glyph (e.g. on tight footers). */
  glyph?: boolean
}

const SIZE_CLASS: Record<NonNullable<ArcanumBrandMarkProps['size']>, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
}

const CARET_CLASS: Record<NonNullable<ArcanumBrandMarkProps['size']>, string> = {
  sm: 'w-1.5 h-3',
  md: 'w-2 h-4',
  lg: 'w-2.5 h-5',
}

export function ArcanumBrandMark({
  size = 'lg',
  caret = true,
  glyph = true,
}: ArcanumBrandMarkProps) {
  const cm = getClassMap()
  return (
    <span
      className={cm.cn(
        'inline-flex items-baseline font-mono font-extrabold tracking-tight text-primary',
        SIZE_CLASS[size],
      )}
      data-mol-id="arcanum-brand-mark"
      aria-label={APP_NAME}
    >
      {glyph ? (
        <span aria-hidden="true" className={cm.cn('mr-1.5 text-primary/80')}>
          ▮
        </span>
      ) : null}
      {APP_NAME.toLowerCase()}
      {caret ? (
        <span
          aria-hidden="true"
          className={cm.cn(
            'cursor-blink ml-1 inline-block bg-primary align-middle opacity-80',
            CARET_CLASS[size],
          )}
        />
      ) : null}
    </span>
  )
}
