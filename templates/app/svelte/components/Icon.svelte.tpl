<script lang="ts">
  import { getIcon, type IconData, type IconName } from '@molecule/app-icons'

  let {
    name,
    size = 20,
    class: className = undefined,
    ...rest
  }: {
    /** Name of the glyph to look up in the bonded icon set. */
    name: IconName
    /** Width and height of the rendered SVG in pixels. */
    size?: number
    /** Class forwarded to the root `<svg>`. */
    class?: string
    /** Any other attribute (`data-mol-id`, `aria-*`, …) forwarded to the root `<svg>`. */
    [key: string]: unknown
  } = $props()

  // Decorative by default: with no caller-provided accessible name or role the
  // SVG is announced as a stray "image" by some screen-reader combos, so it is
  // marked aria-hidden. Passing any of those props opts it into the a11y tree.
  let decorative = $derived(
    rest['aria-label'] == null && rest['aria-labelledby'] == null && rest.role == null,
  )

  // Graceful degradation: an icon name missing from the bonded set (icon-set
  // version skew, a custom set with a smaller catalog) must NOT crash the
  // whole app — a dead icon name is a placeholder, not a white screen.
  let resolved = $derived.by(() => {
    try {
      return { icon: getIcon(name) as IconData, missing: false }
    } catch (error) {
      console.warn(`Icon: no bonded glyph for "${String(name)}" — rendering a placeholder.`, error)
      return { icon: null, missing: true }
    }
  })

  let viewBox = $derived(resolved.icon?.viewBox || '0 0 20 20')
  let isStroked = $derived(!!resolved.icon?.stroke)
  let fillAttr = $derived(isStroked ? 'none' : resolved.icon?.fill || 'currentColor')
</script>

{#if resolved.missing}
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    class={className}
    aria-hidden={decorative ? 'true' : undefined}
    focusable="false"
    {...rest}
  >
    <circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.15" />
  </svg>
{:else if resolved.icon?.svg}
  <!-- The icon-set bond is the trust boundary: it renders its own SVG strings,
       exactly where React injects them with dangerouslySetInnerHTML. -->
  <svg
    width={size}
    height={size}
    {viewBox}
    fill={resolved.icon.fill || 'none'}
    class={className}
    aria-hidden={decorative ? 'true' : undefined}
    focusable={decorative ? 'false' : undefined}
    {...rest}>{@html resolved.icon.svg}</svg
  >
{:else}
  <svg
    width={size}
    height={size}
    {viewBox}
    fill={fillAttr}
    stroke={isStroked ? resolved.icon?.stroke : undefined}
    stroke-width={isStroked ? resolved.icon?.strokeWidth : undefined}
    stroke-linecap={isStroked ? resolved.icon?.strokeLinecap : undefined}
    stroke-linejoin={isStroked ? resolved.icon?.strokeLinejoin : undefined}
    class={className}
    aria-hidden={decorative ? 'true' : undefined}
    focusable={decorative ? 'false' : undefined}
    {...rest}
  >
    {#each resolved.icon?.paths ?? [] as p, i (i)}
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
