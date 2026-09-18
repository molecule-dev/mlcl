import { useEffect } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

const SIZE_CLASS: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

/**
 * Generic modal dialog. Closes on Escape and on backdrop click.
 *
 * Use for forms (Add SKU, Add Warehouse, Adjust Stock, Create Transfer).
 * Centralised so all modals respect the same backdrop / dismissal /
 * sizing behaviour, and share an a11y baseline.
 */
export function Modal({ open, onClose, title, description, size = 'md', children }: ModalProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return undefined
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = original
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid="modal"
      className={cm.cn(
        'fixed inset-0 z-50',
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 4),
      )}
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cm.cn('absolute inset-0 bg-foreground/50 backdrop-blur-sm')}
      />
      <div
        className={cm.cn(
          'relative w-full',
          SIZE_CLASS[size],
          cm.stack(4),
          cm.sp('p', 6),
          'rounded-2xl border border-outline-variant/60 bg-surface text-on-surface shadow-2xl',
        )}
      >
        <header className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'md' }))}>
          <div className={cm.stack(1)}>
            <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>{title}</h2>
            {description && (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close', {}, { defaultValue: 'Close' })}
            className={cm.cn(
              'h-8 w-8 rounded-full',
              cm.flex({ align: 'center', justify: 'center' }),
              'text-on-surface-variant hover:bg-background-secondary hover:text-on-surface transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')} data-icon="close">
              close
            </span>
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}
