<script lang="ts">
  import type { Snippet } from 'svelte'

  import { t } from '@molecule/app-i18n'
  import type { InputType, Size } from '@molecule/app-ui'
  import { getClassMap } from '@molecule/app-ui'

  import RenderIcon from './RenderIcon.svelte'

  let {
    type = 'text',
    size = 'md',
    align = undefined,
    label = undefined,
    error = undefined,
    hint = undefined,
    required = false,
    disabled = false,
    value = $bindable(''),
    placeholder = undefined,
    name = undefined,
    id = undefined,
    class: className = undefined,
    leftElement = undefined,
    rightElement = undefined,
    clearable = false,
    onClear = undefined,
    clearLabel = undefined,
    onfocus = undefined,
    onblur = undefined,
    ...rest
  }: {
    type?: InputType | string
    size?: Size
    align?: 'left' | 'center'
    label?: string
    error?: string
    hint?: string
    required?: boolean
    disabled?: boolean
    value?: string
    placeholder?: string
    name?: string
    id?: string
    class?: string
    /** Content rendered before the input inside the field (an icon, a prefix). */
    leftElement?: Snippet
    /** Content rendered after the input inside the field (a unit, an action). */
    rightElement?: Snippet
    clearable?: boolean
    onClear?: () => void
    clearLabel?: string
    onfocus?: (event: FocusEvent) => void
    onblur?: (event: FocusEvent) => void
    [key: string]: unknown
  } = $props()

  const cm = getClassMap()

  // Fall back to a generated id so label `for` / aria-describedby never point
  // at `undefined-error` (which also collides across id-less inputs).
  const generatedId = $props.id()
  let inputId = $derived(id || name || generatedId)

  let inputClasses = $derived(
    cm.cn(
      cm.input({ error: !!error, size, align }),
      leftElement ? cm.inputPadLeft : '',
      rightElement || clearable ? cm.inputPadRight : '',
      className,
    ),
  )
</script>

<div class={cm.inputWrapper}>
  {#if label}
    <label for={inputId} class={cm.cn(cm.label({ required: !!required }), cm.labelBlock)}>
      {label}
    </label>
  {/if}
  <div class={cm.inputInner}>
    {#if leftElement}
      <div class={cm.inputLeftElement}>{@render leftElement()}</div>
    {/if}
    <input
      {type}
      id={inputId}
      {name}
      bind:value
      {placeholder}
      {disabled}
      {required}
      aria-invalid={error ? 'true' : 'false'}
      aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
      class={inputClasses}
      {onfocus}
      {onblur}
      {...rest}
    />
    {#if rightElement || (clearable && value)}
      <div class={cm.inputRightElement}>
        {#if clearable && value}
          <button
            type="button"
            onclick={onClear}
            class={cm.inputClearButton}
            aria-label={clearLabel ?? t('ui.input.clear', undefined, { defaultValue: 'Clear' })}
          >
            <RenderIcon name="x-mark" class={cm.iconSm} />
          </button>
        {:else if rightElement}
          <span class={cm.textMuted}>{@render rightElement()}</span>
        {/if}
      </div>
    {/if}
  </div>
  {#if error}
    <p id={`${inputId}-error`} class={cm.formError}>
      {error}
    </p>
  {/if}
  {#if hint && !error}
    <p id={`${inputId}-hint`} class={cm.formHint}>
      {hint}
    </p>
  {/if}
</div>
