<script lang="ts">
  import type { Snippet } from 'svelte'

  import { getClassMap } from '@molecule/app-ui'

  let {
    maxWidth = 'lg',
    centered = true,
    class: className = undefined,
    children = undefined,
    ...rest
  }: {
    /** Maximum width — a ClassMap container token, or any width the bond accepts. */
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | string
    centered?: boolean
    class?: string
    children?: Snippet
    [key: string]: unknown
  } = $props()

  const cm = getClassMap()

  // The core prop also accepts a custom width; the ClassMap token set is
  // narrower, so the value is narrowed to it here exactly as the framework
  // package's Container does.
  let classes = $derived(
    cm.cn(
      cm.container({ size: maxWidth as 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' }),
      centered ? cm.mxAuto : '',
      className,
    ),
  )
</script>

<div class={classes} {...rest}>
  {#if children}{@render children()}{/if}
</div>
