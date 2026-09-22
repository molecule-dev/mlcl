import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

interface StillpointTopBarProps {
  /** Page title rendered as an h1. */
  title: string
  /** Optional eyebrow above the title (e.g. weekday + "Today" pill). */
  eyebrow?: ReactNode
  /** Optional action slot (date pickers, segmented controls, etc.). */
  actions?: ReactNode
}

/**
 * Page-header bar for Stillpoint's signed-in shell.
 *
 * Sits above the main canvas; renders a title (and optional eyebrow), with
 * the standard ThemeToggle + UserMenu chrome on the right.
 *
 * Translated from calorie-counter's NoshTopBar.tsx.
 */
export function StillpointTopBar({ title, eyebrow, actions }: StillpointTopBarProps) {
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
      {/* self-end right-aligns the action cluster on phones, where the bar
          stacks vertically; md:self-auto restores full-width distribution.
          min-h/w-[40px] pads the shared ThemeToggle to a 40px tap target. */}
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'self-end md:self-auto')}>
        {actions}
        <ThemeToggle className="min-h-[40px] min-w-[40px]" />
        <UserMenu />
      </div>
    </div>
  )
}
