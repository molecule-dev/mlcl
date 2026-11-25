<script lang="ts">
  import type { Snippet } from 'svelte'

  import { AppShellLayout } from '@molecule/app-shell-layout-svelte'

{{#feature footer}}
  import Footer from './Footer.svelte'
{{/feature}}
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
{{#feature footer}}
  {#snippet footer()}
    <Footer />
  {/snippet}
{{/feature}}
  {@render children()}
</AppShellLayout>
