<script lang="ts">
  import type { Snippet } from 'svelte'

  import type { ButtonVariant, ColorVariant, Size } from '@molecule/app-ui'
  import { getClassMap } from '@molecule/app-ui'

  import Spinner from './Spinner.svelte'

  let {
    variant = 'solid',
    color = 'primary',
    size = 'md',
    loading = false,
    loadingText = undefined,
    fullWidth = false,
    leftIcon = undefined,
    rightIcon = undefined,
    class: className = undefined,
    type = 'button',
    disabled = false,
    onclick = undefined,
    children = undefined,
    ...rest
  }: {
    variant?: ButtonVariant
    color?: ColorVariant
    size?: Size
    /** While true the button is disabled and marked busy. */
    loading?: boolean
    loadingText?: string
    fullWidth?: boolean
    leftIcon?: Snippet
    rightIcon?: Snippet
    class?: string
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    onclick?: (event: MouseEvent) => void
    children?: Snippet
    [key: string]: unknown
  } = $props()

  const cm = getClassMap()

  let classes = $derived(cm.cn(cm.button({ variant, color, size, fullWidth }), className))
</script>

<button
  {type}
  class={classes}
  disabled={disabled || loading}
  {onclick}
  aria-busy={loading}
  {...rest}
>
  {#if loading}
    <Spinner size="sm" class={cm.buttonIconLeft} />
  {:else if leftIcon}
    <span class={cm.buttonIconLeft}>{@render leftIcon()}</span>
  {/if}
  {#if loading && loadingText}
    {loadingText}
  {:else}
    {#if children}{@render children()}{/if}
  {/if}
  {#if !loading && rightIcon}
    <span class={cm.buttonIconRight}>{@render rightIcon()}</span>
  {/if}
</button>
