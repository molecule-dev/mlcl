import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Quarry brand mark — `> quarry` rendered in mono extrabold italic with a
 * blinking terminal-cursor caret. Used at the top of every auth card and
 * inside the sidebar of `DatabaseAdminLayout`.
 *
 * Translated from the design baseline (`> quarry█`) into a reusable
 * primitive so swap-in alternative names / sizes propagate to all
 * surfaces. Per DESIGN.md the brand is always rendered in primary green.
 */

interface QuarryBrandMarkProps {
  /** `lg` for auth cards, `md` for sidebar headers, `sm` for footers. */
  size?: 'sm' | 'md' | 'lg'
  /** Hide the blinking caret (e.g. inside compact sidebars). */
  caret?: boolean
}

const SIZE_CLASS: Record<NonNullable<QuarryBrandMarkProps['size']>, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
}

const CARET_CLASS: Record<NonNullable<QuarryBrandMarkProps['size']>, string> = {
  sm: 'w-2 h-3',
  md: 'w-2.5 h-4',
  lg: 'w-3 h-5',
}

export function QuarryBrandMark({ size = 'lg', caret = true }: QuarryBrandMarkProps) {
  const cm = getClassMap()
  return (
    <span
      className={cm.cn(
        'inline-flex items-baseline font-mono font-extrabold italic tracking-tight text-primary',
        SIZE_CLASS[size],
      )}
      data-mol-id="quarry-brand-mark"
      aria-label={APP_NAME}
    >
      <span aria-hidden="true">&gt;&nbsp;</span>
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
