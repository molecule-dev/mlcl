import { forwardRef, type InputHTMLAttributes, useId } from 'react'

import { getClassMap } from '@molecule/app-ui'

/**
 * Brand-consistent input field — icon prefix + filled-pill background on
 * the surface-container. Matches the centered-card AuthShell.
 *
 * Uses an explicit `<label htmlFor={id}>` association so the input's
 * accessible name is exactly the label text (not "Passwordlock" with the
 * decorative icon character bleeding in via `<label>` textContent).
 */

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: string
  label?: string
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(function AuthInput(
  { icon, label, className, id: idProp, ...props },
  ref,
) {
  const cm = getClassMap()
  const generatedId = useId()
  const id = idProp ?? generatedId
  return (
    <div className={cm.cn('block')}>
      {label ? (
        <label
          htmlFor={id}
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'block uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {label}
        </label>
      ) : null}
      <div className={cm.cn('relative')}>
        {icon ? (
          <span
            aria-hidden="true"
            className={cm.cn(
              'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-xl',
            )}
          >
            {icon}
          </span>
        ) : null}
        <input
          id={id}
          ref={ref}
          className={cm.cn(
            cm.sp('py', 3),
            'w-full text-base font-medium text-on-surface bg-surface-container rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors',
            icon ? 'pl-12 pr-4' : 'px-4',
            className,
          )}
          {...props}
        />
      </div>
    </div>
  )
})
