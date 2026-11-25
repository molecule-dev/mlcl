<script lang="ts">
  import { APP_NAME, LOGO_SIZE } from '#lib/branding.js'

  import { AppHeader } from '@molecule/app-header-svelte'

  import UserMenu from './UserMenu.svelte'
</script>

<!-- The logo <img>, brand link and fixed positioning all render inside the
     shared AppHeader; this wrapper only injects the app's branding and the
     user menu. -->
<AppHeader appName={APP_NAME} logoSize={LOGO_SIZE}>
  {#snippet userMenu()}
    <UserMenu />
  {/snippet}
</AppHeader>
