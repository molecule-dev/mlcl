import { forwardRef } from 'react'
import { getClassMap } from '@molecule/app-ui'

type FloatingInputProps = React.InputHTMLAttributes<HTMLInputElement>

/**
 * An input with a floating label.
 *
 * Shows the placeholder text as a small uppercase label always visible at
 * the top of the input. On focus the label turns primary-colored.
 */
export const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ placeholder, className, ...props }, ref) => {
    const cm = getClassMap()
    return (
      <span className={cm.floatingInputWrapper}>
        <input
          ref={ref}
          {...props}
          placeholder={placeholder}
          className={cm.cn(cm.input(), cm.floatingInput, className)}
        />
        {placeholder && (
          <span className={cm.floatingLabel}>
            {placeholder}
          </span>
        )}
      </span>
    )
  },
)
FloatingInput.displayName = 'FloatingInput'
