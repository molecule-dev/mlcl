<script lang="ts">
  import type { Snippet } from 'svelte'

  import AppShellLayout from './AppShellLayout.svelte'
  import Footer from './Footer.svelte'
  import Header from './Header.svelte'

  let { children }: { children: Snippet } = $props()
</script>

<!--
  Used as the protected shell around the routed page: render `children` where
  the page belongs. The shell keeps rendering while the route content swaps,
  so the header and footer never remount between pages.
-->
<AppShellLayout>
  {#snippet header()}
    <Header />
  {/snippet}
  {#snippet footer()}
    <Footer />
  {/snippet}
  {@render children()}
</AppShellLayout>
