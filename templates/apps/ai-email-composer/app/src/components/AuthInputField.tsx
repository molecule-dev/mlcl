import { forwardRef } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface AuthInputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Material symbol icon name shown to the left of the input. */
  icon: string
  /** Visible label rendered above the input. */
  label: string
  /** Optional trailing slot (e.g. show/hide password toggle). */
  trailing?: React.ReactNode
}

/**
 * Borderless-with-edge-accent input used across Signet auth pages.
 *
 * Material 3 surface-tint background, tonal focus ring, optional leading
 * icon + trailing button slot. Design source: §13.6 form-input variant
 * (icon-prefix), translated to the Signet palette.
 */
export const AuthInputField = forwardRef<HTMLInputElement, AuthInputFieldProps>(
  ({ icon, label, trailing, id, className, ...inputProps }, ref) => {
    const cm = getClassMap()
    return (
      <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
        <label
          htmlFor={id}
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            cm.sp('ml', 1),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {label}
        </label>
        <div
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 4),
            'relative bg-surface-container-low rounded-xl py-3.5 border border-outline-variant/40 focus-within:border-primary transition-colors',
          )}
        >
          <span
            className={cm.cn(
              cm.sp('mr', 3),
              cm.textSize('xl'),
              'material-symbols-outlined text-on-surface-variant',
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
          <input
            ref={ref}
            id={id}
            {...inputProps}
            className={cm.cn(
              cm.w('full'),
              cm.fontWeight('medium'),
              'bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-on-surface-variant/60',
              className,
            )}
          />
          {trailing && <div className={cm.sp('ml', 2)}>{trailing}</div>}
        </div>
      </div>
    )
  },
)
AuthInputField.displayName = 'AuthInputField'
