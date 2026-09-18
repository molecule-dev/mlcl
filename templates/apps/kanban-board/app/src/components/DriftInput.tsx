import { forwardRef, useId } from 'react'

import { getClassMap } from '@molecule/app-ui'

/**
 * Driftboard auth/form input — visible rounded border, comfortable padding,
 * primary-colored focus ring, and a stable above-input label.
 *
 * Used by Login / Signup / ForgotPassword / ResetPassword instead of
 * FloatingInput (whose floating label collides with the placeholder when
 * the field is empty, giving the auth pages a "silly" look).
 */
export interface DriftInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

export const DriftInput = forwardRef<HTMLInputElement, DriftInputProps>(function DriftInput(
  { label, hint, id: idProp, className, ...rest },
  ref,
) {
  const cm = getClassMap()
  const generated = useId()
  const id = idProp ?? generated
  return (
    <label htmlFor={id} className={cm.cn(cm.flex({ direction: 'col' }), 'gap-1.5 text-on-surface')}>
      <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
        {label}
      </span>
      <input
        id={id}
        ref={ref}
        {...rest}
        className={cm.cn(
          cm.sp('px', 4),
          'w-full h-12 rounded-xl text-sm font-medium bg-surface-container-low/40',
          'border border-outline-variant text-on-surface placeholder:text-on-surface-variant/60',
          'transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest',
          className,
        )}
      />
      {hint ? <span className="text-[11px] text-on-surface-variant">{hint}</span> : null}
    </label>
  )
})

export default DriftInput
