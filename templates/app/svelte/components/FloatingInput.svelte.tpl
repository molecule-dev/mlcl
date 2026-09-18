<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'
  import { getInputClasses, cn } from '@molecule/app-ui-svelte'

  let {
    type = 'text',
    value = $bindable(''),
    placeholder = '',
    autocomplete = undefined,
    required = false,
    name = undefined,
    id = undefined,
    autofocus = false,
    ...rest
  }: {
    type?: string
    value?: string
    placeholder?: string
    autocomplete?: string
    required?: boolean
    name?: string
    id?: string
    autofocus?: boolean
    [key: string]: unknown
  } = $props()

  const cm = getClassMap()
</script>

<span class={cm.floatingInputWrapper}>
  <input
    {type}
    bind:value
    {placeholder}
    {autocomplete}
    {required}
    {name}
    {id}
    {autofocus}
    class={cn(getInputClasses({}), cm.floatingInput)}
    {...rest}
  />
  {#if placeholder}
    <span class={cm.floatingLabel}>
      {placeholder}
    </span>
  {/if}
</span>
