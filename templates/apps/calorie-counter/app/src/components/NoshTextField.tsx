import { forwardRef, type InputHTMLAttributes, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface NoshTextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** When true, render a show/hide toggle on the right (password fields). */
  withPasswordToggle?: boolean
}

/**
 * Brand-consistent labeled input for Nosh's auth flows.
 *
 * Stacks a small uppercase label above a focusable input with the teal
 * focus ring + border. Optional show/hide eye toggle for password fields.
 */
export const NoshTextField = forwardRef<HTMLInputElement, NoshTextFieldProps>(
  function NoshTextField(
    { label, withPasswordToggle, type = 'text', className, id, ...props },
    ref,
  ) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const [revealed, setRevealed] = useState(false)
    const inputType = withPasswordToggle ? (revealed ? 'text' : 'password') : type
    const fieldId = id ?? `nosh-field-${label.replace(/\s+/g, '-').toLowerCase()}`
    return (
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
        <label
          htmlFor={fieldId}
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
        >
          {label}
        </label>
        <div className={cm.cn('relative')}>
          <input
            ref={ref}
            id={fieldId}
            type={inputType}
            className={cm.cn(
              cm.sp('px', 4),
              'w-full h-[44px] rounded-lg border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-on-surface bg-surface tabular-nums',
              withPasswordToggle ? 'pr-12' : '',
              className,
            )}
            {...props}
          />
          {withPasswordToggle ? (
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              aria-label={
                revealed
                  ? t('auth.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('auth.showPassword', {}, { defaultValue: 'Show password' })
              }
              className={cm.cn(
                'absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface focus:outline-none p-1',
              )}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-xl')}>
                {revealed ? 'visibility' : 'visibility_off'}
              </span>
            </button>
          ) : null}
        </div>
      </div>
    )
  },
)
