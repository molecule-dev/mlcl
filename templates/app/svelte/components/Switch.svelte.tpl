<script lang="ts">
  import type { ColorVariant, Size } from '@molecule/app-ui'
  import { getClassMap } from '@molecule/app-ui'

  let {
    label = undefined,
    checked = false,
    size = 'md',
    color = undefined,
    class: className = undefined,
    disabled = false,
    onchange = undefined,
    ...rest
  }: {
    label?: string
    checked?: boolean
    size?: Size
    color?: ColorVariant
    class?: string
    disabled?: boolean
    onchange?: (event: Event) => void
    [key: string]: unknown
  } = $props()

  const cm = getClassMap()

  let switchState = $derived(checked ? 'checked' : 'unchecked')

  let hiddenInput = $state<HTMLInputElement | null>(null)

  // A hidden, real native checkbox mirrors `checked` — the click handler calls
  // `.click()` on it so the change the caller receives is a GENUINE browser
  // Event with a real `target.checked` (matching the
  // `(e.target as HTMLInputElement).checked` pattern the sections use). The
  // checkbox stays a SIBLING of the visible <label>: both it and the <button>
  // are labelable, and nesting both inside one label would fire a second,
  // redundant click through the browser's label-click forwarding.
  function handleClick(): void {
    hiddenInput?.click()
  }
</script>

<input
  bind:this={hiddenInput}
  type="checkbox"
  checked={!!checked}
  {disabled}
  aria-hidden="true"
  tabindex="-1"
  class={cm.srOnly}
  onchange={(event) => onchange?.(event)}
/>
<label class={cm.cn(cm.controlLabel, disabled ? cm.controlDisabled : '')}>
  <button
    type="button"
    role="switch"
    // role="switch" REQUIRES aria-checked; coerce so an unchecked value still
    // announces "off" instead of omitting the attribute.
    aria-checked={!!checked}
    {disabled}
    data-state={switchState}
    onclick={handleClick}
    class={cm.cn(cm.switchBase({ size, color }), className)}
    {...rest}
  >
    <span data-state={switchState} class={cm.switchThumb({ size })}></span>
  </button>
  {#if label}
    <span class={cm.controlText}>{label}</span>
  {/if}
</label>
