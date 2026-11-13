<script lang="ts">
  import { t } from '@molecule/app-i18n'
  import type { ColorVariant, Size } from '@molecule/app-ui'
  import { getClassMap } from '@molecule/app-ui'

  let {
    size = 'md',
    color = undefined,
    label = undefined,
    class: className = undefined,
    style = undefined,
    ...rest
  }: {
    size?: Size
    color?: ColorVariant | string
    label?: string
    class?: string
    style?: string
    [key: string]: unknown
  } = $props()

  const cm = getClassMap()

  let classes = $derived(cm.cn(cm.spinner({ size }), className))

  // Standard variants are colored by the class layer; only a custom color
  // string needs the inline override (the one property ClassMap cannot
  // parameterize).
  const STANDARD_COLORS = ['primary', 'secondary', 'success', 'warning', 'error', 'info']
  let colorStyle = $derived.by(() => {
    if (!color || typeof color !== 'string' || STANDARD_COLORS.includes(color)) return undefined
    return `border-color: ${color}; border-top-color: transparent;`
  })
</script>

<div
  role="status"
  aria-label={label || t('ui.spinner.loading', undefined, { defaultValue: 'Loading' })}
  class={classes}
  style={colorStyle ?? style}
  {...rest}
>
  {#if label}<span class={cm.srOnly}>{label}</span>{/if}
</div>
