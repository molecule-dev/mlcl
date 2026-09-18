import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface KbdBadgeProps {
  children: ReactNode
  /** Subtle key-cap depth (extra shadow line). Default true. */
  depth?: boolean
  className?: string
}

/**
 * Mini keyboard-shortcut badge. Pasted next to actions to advertise the
 * shortcut. Uses monospace + 1px bottom-shadow to evoke a key-cap feel.
 */
export function KbdBadge({ children, depth = true, className }: KbdBadgeProps) {
  const cm = getClassMap()
  return (
    <kbd
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('px', 2),
        cm.sp('py', 1),
        cm.textSize('xs'),
        cm.fontWeight('medium'),
        'inline-flex font-mono leading-none rounded-md border border-outline-variant bg-surface-container text-on-surface-variant min-w-[20px]',
        className,
      )}
      style={depth ? { boxShadow: '0 1px 0 0 rgba(0, 0, 0, 0.08)' } : undefined}
    >
      {children}
    </kbd>
  )
}

export default KbdBadge
