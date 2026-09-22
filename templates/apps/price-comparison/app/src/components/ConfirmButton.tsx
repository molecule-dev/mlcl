import { type ReactNode, useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface ConfirmButtonProps {
  /** data-test id — KEPT across the idle and armed states so selectors are stable. */
  testId: string
  /** Idle-state label (also the aria-label when no children are rendered). */
  label: string
  /** Armed-state label — the explicit confirmation ask. */
  confirmLabel?: string
  /** Fired on the SECOND click only. */
  onConfirm: () => void | Promise<void>
  /** Styling for the idle state (pass through). */
  className: string
  /** Styling override for the armed state; defaults to an error treatment on top of `className`. */
  armedClassName?: string
  disabled?: boolean
  /** Optional icon content for the idle state. */
  children?: ReactNode
}

/**
 * Two-step destructive-action button: the first click arms it ("Confirm
 * remove?"), the second click commits, and it disarms itself after 4s or on
 * blur. Satisfies the "destructive actions are confirmed inline" UX rule
 * without a modal. The `data-test` id is the same in both states.
 */
export function ConfirmButton({
  testId,
  label,
  confirmLabel,
  onConfirm,
  className,
  armedClassName,
  disabled,
  children,
}: ConfirmButtonProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [armed, setArmed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const arm = () => {
    setArmed(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setArmed(false), 4000)
  }

  const handleClick = () => {
    if (armed) {
      if (timer.current) clearTimeout(timer.current)
      setArmed(false)
      void onConfirm()
    } else {
      arm()
    }
  }

  const resolvedConfirm =
    confirmLabel ?? t('common.confirmRemove', {}, { defaultValue: 'Confirm remove?' })

  return (
    <button
      type="button"
      data-test={testId}
      onClick={handleClick}
      onBlur={() => {
        if (timer.current) clearTimeout(timer.current)
        setArmed(false)
      }}
      disabled={disabled}
      aria-label={armed ? resolvedConfirm : label}
      className={cm.cn(
        className,
        armed &&
          (armedClassName ??
            'bg-error text-on-primary hover:bg-error/90 ring-2 ring-error/40 ring-offset-1'),
      )}
    >
      {armed ? resolvedConfirm : (children ?? label)}
    </button>
  )
}
