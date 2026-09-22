import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface ConfirmButtonProps {
  /** Invoked on the SECOND click, while the armed state is live. */
  onConfirm: () => void
  /** Idle button content. */
  children: ReactNode
  /** Content shown while armed (defaults to children). */
  confirmLabel: string
  className?: string
  'data-mol-id'?: string
  'aria-label'?: string
  /** Ms before the armed state auto-resets (default 3000). */
  resetMs?: number
}

/**
 * Two-step inline confirmation for destructive actions (permanent deletes):
 * the first click arms the button (swaps to the confirm label + error
 * styling) and a second click within {@link resetMs} fires {@link onConfirm}.
 * Disarming resets silently — no dialogs, no layout shift.
 */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel,
  className,
  'data-mol-id': dataMolId,
  'aria-label': ariaLabel,
  resetMs = 3000,
}: ConfirmButtonProps) {
  const cm = getClassMap()
  const [armed, setArmed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const click = () => {
    if (armed) {
      if (timer.current) clearTimeout(timer.current)
      setArmed(false)
      onConfirm()
      return
    }
    setArmed(true)
    timer.current = setTimeout(() => setArmed(false), resetMs)
  }

  return (
    <button
      type="button"
      onClick={click}
      data-mol-id={dataMolId}
      aria-label={ariaLabel}
      aria-live="polite"
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.sp('px', 4),
        cm.sp('py', 2),
        cm.fontWeight('semibold'),
        cm.textSize('sm'),
        cm.cursorPointer,
        'rounded-full transition-colors',
        className,
        armed && 'bg-error text-white hover:bg-error/90',
      )}
    >
      <span className="material-symbols-outlined text-base" aria-hidden="true">
        {armed ? 'dangerous' : 'delete'}
      </span>
      {armed ? confirmLabel : children}
    </button>
  )
}
