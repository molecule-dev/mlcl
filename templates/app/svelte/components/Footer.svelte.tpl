<script lang="ts">
  import { APP_NAME } from '$lib/branding.js'
  import { loadContent } from '$lib/config.js'

  import AppFooter from './AppFooter.svelte'
</script>

<!--
  The "About" link points at the in-app /about page (every app ships one), NOT
  at an external URL. WEBSITE_URL in branding.ts is your public/marketing site,
  surfaced on the About page itself — it is not the About link.
-->
<AppFooter appName={APP_NAME} aboutHref="/about" {loadContent} />
