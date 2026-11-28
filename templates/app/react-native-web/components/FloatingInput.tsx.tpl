import type { ComponentProps } from 'react'
import { getClassMap } from '@molecule/app-ui'
import { TextField } from '@molecule/app-ui-react-native'

type FloatingInputProps = Omit<ComponentProps<typeof TextField>, 'as' | 'min' | 'max' | 'step'>

/**
 * An input with a floating label.
 *
 * Shows the placeholder text as a small uppercase label always visible at
 * the top of the input. On focus the label turns primary-colored.
 */
export function FloatingInput({ placeholder, className, ...props }: FloatingInputProps) {
  const cm = getClassMap()
  return (
    <span className={cm.floatingInputWrapper}>
      <TextField
        {...props}
        as="input"
        aria-label={props['aria-label'] ?? placeholder}
        placeholder={placeholder}
        className={cm.cn(cm.input(), cm.floatingInput, className)}
      />
      {placeholder && <span className={cm.floatingLabel}>{placeholder}</span>}
    </span>
  )
}
