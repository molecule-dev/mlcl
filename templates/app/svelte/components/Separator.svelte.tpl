<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  let {
    orientation = 'horizontal',
    decorative = true,
    class: className = undefined,
  }: {
    orientation?: 'horizontal' | 'vertical'
    decorative?: boolean
    class?: string
  } = $props()

  const cm = getClassMap()

  let classes = $derived(cm.cn(cm.separator({ orientation }), className))
</script>

<div
  role={decorative ? 'none' : 'separator'}
  aria-orientation={decorative ? undefined : orientation}
  class={classes}
></div>
