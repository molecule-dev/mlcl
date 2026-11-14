<script lang="ts">
  import { oauthConfig } from '$lib/config.js'

  import { OAuthButtons as MoleculeOAuthButtons } from '@molecule/app-auth-ui-svelte'
</script>

<!--
  Thin wrapper around the shared `OAuthButtons` that injects this app's
  `oauthConfig` (`src/lib/config.ts`). The shared package handles the
  "or continue with" divider, the brand logos, the accessibility labels, and
  the callback half of the flow (`?code&state` on the page it is mounted on).
-->
<MoleculeOAuthButtons {oauthConfig} />
