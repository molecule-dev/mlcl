import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface PromptDialogProps {
  /** Whether the dialog is mounted. */
  open: boolean
  /** Dialog heading — also the accessible name of the dialog. */
  title: string
  /** Accessible label for the input. */
  label: string
  /** Pre-filled value (e.g. "Sheet 2"). */
  initialValue?: string
  /** Confirm button text. Defaults to a localized "Add". */
  confirmLabel?: string
  /** Called with the trimmed value on confirm. */
  onConfirm: (value: string) => void
  /** Called on cancel, Escape, or overlay click. */
  onClose: () => void
}

/**
 * Accessible in-page replacement for `window.prompt`.
 *
 * Native `prompt()` is unusable under automation (the molecule e2e-preview
 * client intercepts dialogs so real Playwright runs never see them) and is
 * hostile on touch screens — an in-page dialog keeps the flow visible,
 * focusable, and 44px-tappable on mobile. Focus moves to the input on open;
 * Enter confirms, Escape cancels.
 */
export function PromptDialog({
  open,
  title,
  label,
  initialValue = '',
  confirmLabel,
  onConfirm,
  onClose,
}: PromptDialogProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  // Re-seed the draft each time the dialog opens (the component stays mounted
  // while `open` toggles) and move focus into it.
  useEffect(() => {
    if (open) {
      setValue(initialValue)
      // Wait a frame so the input exists before focus (React commit order).
      const id = window.setTimeout(() => inputRef.current?.focus(), 0)
      return () => window.clearTimeout(id)
    }
  }, [open, initialValue])

  if (!open) return null

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onConfirm(trimmed)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-mol-id="prompt-dialog"
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        'fixed inset-0 z-50 bg-black/40 p-4',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'md' }),
          'w-full max-w-sm bg-surface rounded-2xl shadow-lg border border-outline-variant/40 p-6',
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
          {title}
        </h2>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            {label}
          </span>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
              if (e.key === 'Escape') onClose()
            }}
            data-mol-id="prompt-dialog-input"
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'text-sm bg-surface-container-low border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none min-h-[44px]',
            )}
          />
        </label>
        <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }))}>
          <button
            type="button"
            onClick={onClose}
            data-mol-id="prompt-dialog-cancel"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              'text-sm font-bold text-on-surface-variant rounded-full hover:bg-surface-container transition-colors min-h-[44px]',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </button>
          <button
            type="button"
            onClick={submit}
            data-mol-id="prompt-dialog-confirm"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              'text-sm font-bold text-on-primary rounded-full bg-primary hover:opacity-90 transition-opacity min-h-[44px] disabled:opacity-50',
            )}
            disabled={!value.trim()}
          >
            {confirmLabel ?? t('common.add', {}, { defaultValue: 'Add' })}
          </button>
        </div>
      </div>
    </div>
  )
}
