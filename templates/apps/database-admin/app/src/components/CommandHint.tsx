import { getClassMap } from '@molecule/app-ui'

/**
 * Keyboard shortcut chip — `⌘K`-style mono tag with subtle border.
 * Used inside the command palette button, toolbar buttons, status bar,
 * and the auth-page meta footer.
 *
 * Translated from DESIGN.md "Keyboard Shortcut Hints" — `rgba(110,118,129,0.4)`
 * background, 1px border-secondary, mono 11px.
 */

interface CommandHintProps {
  children: React.ReactNode
  /** Visual emphasis for inline-with-text vs standalone. */
  variant?: 'subtle' | 'solid'
  /** Compact 10px size for tight nav strips. */
  size?: 'xs' | 'sm'
}

export function CommandHint({ children, variant = 'subtle', size = 'sm' }: CommandHintProps) {
  const cm = getClassMap()
  return (
    <kbd
      data-mol-id="command-hint"
      className={cm.cn(
        'inline-flex items-center justify-center font-mono font-medium leading-none rounded',
        size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-0.5',
        variant === 'solid'
          ? 'bg-surface2 text-text border border-border'
          : 'border border-border/70 text-muted bg-transparent',
      )}
    >
      {children}
    </kbd>
  )
}
