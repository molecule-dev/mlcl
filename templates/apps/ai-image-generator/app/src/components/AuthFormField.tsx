import { forwardRef, useId } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface AuthFormFieldProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
> {
  label: string
  /** Material symbol glyph displayed on the left of the input. */
  icon: string
  /** Field name (also used as `id` if not provided). */
  name: string
  /** Visual variant — html input type. */
  type?: 'text' | 'email' | 'password' | 'tel'
}

/**
 * Branded floating-label input — pill background, leading icon, focus glow.
 * Used by Login, Signup, Forgot/Reset password forms.
 */
export const AuthFormField = forwardRef<HTMLInputElement, AuthFormFieldProps>(
  function AuthFormField({ label, icon, name, type = 'text', id, ...rest }, ref) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const reactId = useId()
    const fieldId = id ?? `${name}-${reactId}`

    return (
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
        <label
          htmlFor={fieldId}
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t(`auth.fields.${name}`, {}, { defaultValue: label })}
        </label>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 4),
            'h-12 rounded-xl bg-surface-container-low border border-outline-variant/20 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 transition-all',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-on-surface-variant')}
            style={{ fontSize: 18 }}
            aria-hidden="true"
          >
            {icon}
          </span>
          <input
            ref={ref}
            id={fieldId}
            name={name}
            type={type}
            {...rest}
            className={cm.cn(
              cm.w('full'),
              cm.fontWeight('medium'),
              cm.textSize('base'),
              'bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-on-surface-variant/60',
            )}
          />
        </div>
      </div>
    )
  },
)
