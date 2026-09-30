import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

interface ForjaTopBarProps {
  /** Page title rendered as an h1. */
  title: string
  /** Optional eyebrow above the title (e.g. weekday + "Today" pill). */
  eyebrow?: ReactNode
  /** Optional action slot (date pickers, segmented controls, etc.). */
  actions?: ReactNode
}

/**
 * Page-header bar for Forja's signed-in shell.
 *
 * Sits above the main canvas; renders a title (and optional eyebrow), with
 * the standard ThemeToggle + UserMenu chrome on the right. Actions slot
 * in between for page-specific controls.
 *
 * Translated from calorie-counter's NoshTopBar.tsx.
 */
export function ForjaTopBar({ title, eyebrow, actions }: ForjaTopBarProps) {
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
              'text-on-surface-variant font-semibold uppercase tracking-[0.18em]',
            )}
          >
            {eyebrow}
          </div>
        ) : null}
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-3xl md:text-4xl text-on-surface tracking-tight',
          )}
        >
          {title}
        </h1>
      </div>
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        {actions}
        {/* Theme + account chrome — styled so they don't render as bare
            browser controls on the page-header bar. */}
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            'border-l border-outline-variant/40 pl-3',
          )}
        >
          <div className="text-on-surface-variant hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container">
            <ThemeToggle />
          </div>
          <div className="text-on-surface-variant hover:text-on-surface transition-colors">
            <UserMenu />
          </div>
        </div>
      </div>
    </div>
  )
}
