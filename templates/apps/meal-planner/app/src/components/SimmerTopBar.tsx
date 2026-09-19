import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

interface SimmerTopBarProps {
  /** Page title rendered as an h1. */
  title: string
  /** Optional eyebrow above the title (e.g. week range). */
  eyebrow?: ReactNode
  /** Optional action slot (week navigators, buttons, etc.). */
  actions?: ReactNode
}

/**
 * Page-header bar for Simmer's signed-in shell.
 *
 * Sits above the main canvas; renders a title (and optional eyebrow), with
 * the standard ThemeToggle + UserMenu chrome on the right. Actions slot
 * in between for page-specific controls.
 */
export function SimmerTopBar({ title, eyebrow, actions }: SimmerTopBarProps) {
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
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        {actions}
        <ThemeToggle />
        <UserMenu />
      </div>
    </div>
  )
}
