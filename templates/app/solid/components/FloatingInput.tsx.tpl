import type { JSX } from 'solid-js'
import { createSignal, createUniqueId, Show, splitProps } from 'solid-js'
import { getClassMap } from '@molecule/app-ui'

/**
 * Props accepted by the {@link FloatingInput} component.
 *
 * `defaultValue` is included explicitly: it seeds the uncontrolled value the
 * way React's prop of the same name does, while the framework's input
 * attributes stop at `value`.
 */
type FloatingInputProps = JSX.InputHTMLAttributes<HTMLInputElement> & {
  /** Initial value for an uncontrolled input (ignored when `value` is set). */
  defaultValue?: string | number
  /** Class composed onto the input, after the ClassMap tokens. */
  className?: string
}

/**
 * An input with a floating label.
 *
 * Shows the placeholder text as a small uppercase label always visible at
 * the top of the input. On focus the label turns primary-colored.
 *
 * Works as both a controlled and an uncontrolled input: when `value` is
 * omitted, the component tracks its own state seeded from `defaultValue`
 * and still forwards every `onChange` event to the caller.
 *
 * The floating text is a real `<label for>` (not a bare `<span>`), so it is
 * the input's programmatic accessible name via label association — the
 * accessible name is not only `placeholder` (stripped by some AT/browser
 * combos once the field has a value), and clicking the floating text focuses
 * the input. `id` falls back to a generated id when the caller doesn't pass
 * one, mirroring Input/Select/Textarea's id-collision fix.
 *
 * `onChange` keeps the React template's contract: it fires on every `input`
 * event (Solid's native `onChange` fires only on commit), and a controlled
 * input restores the prop value when the caller does not adopt the typed one.
 *
 * @param props - Input attributes plus the floating-label placeholder.
 * @returns The wrapper span with the input and its associated label.
 */
export function FloatingInput(props: FloatingInputProps) {
  const cm = getClassMap()
  const [local, rest] = splitProps(props, [
    'className',
    'class',
    'defaultValue',
    'id',
    'onChange',
    'placeholder',
    'value',
  ])
  const [internalValue, setInternalValue] = createSignal(String(local.defaultValue ?? ''))
  const isControlled = (): boolean => local.value !== undefined
  const value = (): string => (isControlled() ? String(local.value) : internalValue())
  const generatedId = createUniqueId()
  const inputId = (): string => local.id || generatedId

  const handleInput = (event: Event & { currentTarget: HTMLInputElement }): void => {
    if (!isControlled()) {
      setInternalValue(event.currentTarget.value)
    }
    const onChange = local.onChange as ((event: Event) => void) | undefined
    onChange?.(event)
    if (isControlled()) event.currentTarget.value = value()
  }

  return (
    <span class={cm.floatingInputWrapper}>
      <input
        {...rest}
        ref={(element) => {
          // React renders a controlled input's initial value as the `value`
          // ATTRIBUTE at mount (later changes set the property only); mirror
          // that so the mounted DOM matches.
          element.setAttribute('value', value())
        }}
        id={inputId()}
        placeholder={local.placeholder}
        class={cm.cn(cm.input(), cm.floatingInput, local.className ?? local.class)}
        value={value()}
        onInput={handleInput}
      />
      <Show when={local.placeholder}>
        <label for={inputId()} class={cm.floatingLabel}>
          {local.placeholder}
        </label>
      </Show>
    </span>
  )
}
