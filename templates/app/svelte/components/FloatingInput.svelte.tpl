<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'

  import { getClassMap } from '@molecule/app-ui'

  let {
    type = 'text',
    value = $bindable(''),
    placeholder = '',
    autocomplete = undefined,
    required = false,
    name = undefined,
    id = undefined,
    class: className = undefined,
    ...rest
  }: {
    type?: string
    value?: string
    placeholder?: string
    autocomplete?: HTMLInputAttributes['autocomplete']
    required?: boolean
    name?: string
    id?: string
    class?: string
    [key: string]: unknown
  } = $props()

  const cm = getClassMap()

  // Fall back to a generated instance id when the caller passes none, so the
  // floating <label for> always associates with THIS input — the accessible
  // name comes from the label, not from the placeholder (which some
  // AT/browser combos strip once the field has a value).
  const generatedId = $props.id()
  let inputId = $derived(id || generatedId)
</script>

<span class={cm.floatingInputWrapper}>
  <input
    {type}
    id={inputId}
    {...rest}
    {placeholder}
    class={cm.cn(cm.input(), cm.floatingInput, className)}
    bind:value
    {autocomplete}
    {required}
    {name}
  />
  {#if placeholder}
    <label for={inputId} class={cm.floatingLabel}>
      {placeholder}
    </label>
  {/if}
</span>
