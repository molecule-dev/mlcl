<script lang="ts">
  import type { Snippet } from 'svelte'

  import type { Size } from '@molecule/app-ui'
  import { getClassMap } from '@molecule/app-ui'

  let {
    direction = 'row',
    justify = undefined,
    align = undefined,
    wrap = undefined,
    gap = undefined,
    class: className = undefined,
    children = undefined,
    ...rest
  }: {
    direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
    justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'
    align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch'
    wrap?: 'wrap' | 'nowrap' | 'wrap-reverse'
    gap?: Size
    class?: string
    children?: Snippet
    [key: string]: unknown
  } = $props()

  const cm = getClassMap()

  // Map direction names to the ClassMap API ('column' -> 'col'), as the
  // framework package's Flex does.
  const DIRECTIONS = {
    row: 'row',
    column: 'col',
    'row-reverse': 'row-reverse',
    'column-reverse': 'col-reverse',
  } as const

  let classes = $derived(
    cm.cn(
      cm.flex({
        direction: DIRECTIONS[direction],
        align,
        justify,
        wrap,
        gap,
      }),
      className,
    ),
  )
</script>

<div class={classes} {...rest}>
  {#if children}{@render children()}{/if}
</div>
