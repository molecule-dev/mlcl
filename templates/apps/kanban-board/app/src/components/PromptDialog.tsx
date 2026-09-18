import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * PromptDialog — a tiny accessible modal that asks the user for a single
 * required text value (board name, list name, card title, comment body…).
 *
 * Renders nothing while `open` is false. When open it traps focus inside
 * the textbox, closes on `Esc`, and forwards the trimmed value to
 * `onSubmit`. Used by the create-flows on Boards / BoardDetail / Backlog
 * so every primary CTA wires to a real working modal.
 */
export interface PromptDialogProps {
  open: boolean
  title: string
  label: string
  placeholder?: string
  submitLabel?: string
  initialValue?: string
  multiline?: boolean
  busy?: boolean
  error?: string | null
  onSubmit: (value: string) => void | Promise<void>
  onCancel: () => void
}

export function PromptDialog({
  open,
  title,
  label,
  placeholder,
  submitLabel,
  initialValue = '',
  multiline = false,
  busy = false,
  error = null,
  onSubmit,
  onCancel,
}: PromptDialogProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (open) {
      setValue(initialValue)
      const id = window.setTimeout(() => inputRef.current?.focus(), 30)
      return () => window.clearTimeout(id)
    }
  }, [open, initialValue])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || busy) return
    void onSubmit(trimmed)
  }

  return (
    <div
      role="presentation"
      className={cm.cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm',
      )}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div role="dialog" aria-modal="true" aria-label={title} className={cm.cn('w-full max-w-md')}>
        <form
          onSubmit={handleSubmit}
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col' }),
            cm.stack(4),
            'w-full rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xl',
          )}
        >
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight text-on-surface')}>
            {title}
          </h2>
          <label className={cm.cn(cm.flex({ direction: 'col' }), 'gap-1.5 text-on-surface')}>
            <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
              {label}
            </span>
            {multiline ? (
              <textarea
                ref={(el) => {
                  inputRef.current = el
                }}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                rows={4}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'w-full rounded-xl text-sm font-medium bg-surface-container-low/40',
                  'border border-outline-variant text-on-surface placeholder:text-on-surface-variant/60',
                  'transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest',
                )}
              />
            ) : (
              <input
                type="text"
                ref={(el) => {
                  inputRef.current = el
                }}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                className={cm.cn(
                  cm.sp('px', 4),
                  'w-full h-12 rounded-xl text-sm font-medium bg-surface-container-low/40',
                  'border border-outline-variant text-on-surface placeholder:text-on-surface-variant/60',
                  'transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest',
                )}
              />
            )}
          </label>
          {error ? <p className="text-sm font-semibold text-error">{error}</p> : null}
          <div className={cm.cn('flex items-center justify-end gap-2')}>
            <button
              type="button"
              onClick={onCancel}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container-low transition-colors',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="submit"
              disabled={busy || value.trim().length === 0}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                'rounded-xl text-sm font-bold text-white shadow-md',
                'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity disabled:opacity-50',
              )}
            >
              {busy
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : (submitLabel ?? t('common.save', {}, { defaultValue: 'Save' }))}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PromptDialog
