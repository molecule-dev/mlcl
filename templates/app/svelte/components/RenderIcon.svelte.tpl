<script lang="ts">
  import { getIcon, type IconName } from '@molecule/app-icons'

  let {
    name,
    class: className = undefined,
  }: {
    /** Name of the glyph to look up in the bonded icon set. */
    name: IconName
    /** CSS class for sizing. */
    class?: string
  } = $props()

  // Decorative chrome (close X, chevrons, status glyphs): the accessible name
  // comes from the surrounding control's aria-label, so the SVG is marked
  // aria-hidden + focusable="false" exactly as the framework package's
  // renderIcon does.
  let icon = $derived(getIcon(name))
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  aria-hidden="true"
  focusable="false"
  class={className}
  viewBox={icon.viewBox || '0 0 20 20'}
  fill={icon.fill || 'currentColor'}
  stroke={icon.stroke}
  stroke-width={icon.strokeWidth}
  stroke-linecap={icon.strokeLinecap}
  stroke-linejoin={icon.strokeLinejoin}
>
  {#each icon.paths as p, i (i)}
    <path d={p.d} fill-rule={p.fillRule} clip-rule={p.clipRule} />
  {/each}
</svg>
