import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

interface NoshTopBarProps {
  /** Page title rendered as an h1. */
  title: string
  /** Optional eyebrow above the title (e.g. weekday + "Today" pill). */
  eyebrow?: ReactNode
  /** Optional action slot (date pickers, segmented controls, etc.). */
  actions?: ReactNode
}

/**
 * Page-header bar for Nosh's signed-in shell.
 *
 * Sits above the main canvas; renders a title (and optional eyebrow), with
 * the standard ThemeToggle + UserMenu chrome on the right. Actions slot
 * in between for page-specific controls.
 */
export function NoshTopBar({ title, eyebrow, actions }: NoshTopBarProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'sm' }),
        'md:flex-row md:items-end md:justify-between',
      )}
    >
      <div>
        {eyebrow ? (
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('mb', 2),
              cm.textSize('sm'),
              'text-on-surface-variant font-semibold',
            )}
          >
            {eyebrow}
          </div>
        ) : null}
        <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl text-on-surface tracking-tight')}>
          {title}
        </h1>
      </div>
      {/* flex-wrap: wide action groups (meal/period pill rows) push the
          chrome to its own line on phones instead of overflowing off-screen. */}
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap min-w-0')}>
        {actions}
        <ThemeToggle />
        <UserMenu />
      </div>
    </div>
  )
}
