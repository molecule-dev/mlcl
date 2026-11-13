<script lang="ts">
  import type { Snippet } from 'svelte'

  import { getClassMap } from '@molecule/app-ui'

  import Container from './Container.svelte'

  let {
    header = undefined,
    footer = undefined,
    children,
    maxWidth = 'xl',
    class: className = undefined,
    mainClassName = undefined,
    dataMolId = undefined,
  }: {
    /** Slot for the header (typically the app's Header). */
    header?: Snippet
    /** Slot for the footer (typically the app's Footer). */
    footer?: Snippet
    /** Main content. */
    children: Snippet
    /** Container max-width for the main content. */
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | string
    /** Extra classes on the outer wrapper. */
    class?: string
    /**
     * Extra classes on the inner `<main>` element. Apps that need vertical
     * rhythm around the routed content pass it here instead of forking the
     * shell. Omitted by default so the `<main>` carries no padding.
     */
    mainClassName?: string
    /** data-mol-id for AI-agent selectors. */
    dataMolId?: string
  } = $props()

  const cm = getClassMap()
</script>

<div class={cm.cn(cm.page, cm.appLayout, className)} data-mol-id={dataMolId}>
  {#if header}
    {@render header()}
  {/if}
  <main class={mainClassName}>
    <Container {maxWidth}>
      {@render children()}
    </Container>
  </main>
  {#if footer}
    {@render footer()}
  {/if}
</div>
