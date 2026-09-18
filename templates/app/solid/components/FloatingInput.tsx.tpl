import type { JSX } from 'solid-js'
import { getClassMap } from '@molecule/app-ui'

interface FloatingInputProps {
  type?: string
  value?: string
  onInput?: JSX.EventHandlerUnion<HTMLInputElement, InputEvent>
  placeholder?: string
  autocomplete?: string
  autofocus?: boolean
  required?: boolean
  name?: string
  id?: string
  class?: string
}

export function FloatingInput(props: FloatingInputProps) {
  const cm = getClassMap()

  return (
    <span class={cm.floatingInputWrapper}>
      <input
        type={props.type}
        value={props.value}
        onInput={props.onInput}
        autocomplete={props.autocomplete}
        autofocus={props.autofocus}
        required={props.required}
        name={props.name}
        id={props.id}
        placeholder=" "
        class={cm.cn(cm.floatingInput, cm.input(), props.class)}
      />
      <span class={cm.floatingLabel}>
        {props.placeholder}
      </span>
    </span>
  )
}
