<script lang="ts">
  import { getIcon } from '@molecule/app-icons'

  export let name: string
  export let size: number = 20
  let className: string = ''
  export { className as class }

  $: icon = getIcon(name)
  $: viewBox = icon.viewBox || '0 0 20 20'
  $: isStroked = !!icon.stroke
  $: fillAttr = isStroked ? 'none' : (icon.fill || 'currentColor')
</script>

{#if icon.svg}
  <svg
    width={size}
    height={size}
    viewBox={viewBox}
    fill={icon.fill || 'none'}
    class={className}
  >{@html icon.svg}</svg>
{:else}
  <svg
    width={size}
    height={size}
    viewBox={viewBox}
    fill={fillAttr}
    stroke={isStroked ? icon.stroke : undefined}
    stroke-width={isStroked ? icon.strokeWidth : undefined}
    stroke-linecap={isStroked ? icon.strokeLinecap : undefined}
    stroke-linejoin={isStroked ? icon.strokeLinejoin : undefined}
    class={className}
  >
    {#each icon.paths as p}
      <path
        d={p.d}
        fill={p.fill || undefined}
        fill-rule={p.fillRule || undefined}
        clip-rule={p.clipRule || undefined}
        opacity={p.opacity !== undefined ? p.opacity : undefined}
      />
    {/each}
  </svg>
{/if}
