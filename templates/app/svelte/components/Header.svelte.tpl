<script lang="ts">
  import { APP_NAME, LOGO_SIZE } from '$lib/branding.js'

  import AppHeader from './AppHeader.svelte'
  import SettingsPanel from './SettingsPanel.svelte'
  import UserMenu from './UserMenu.svelte'
</script>

<!--
  The settings panel mounts only when the user opens the drawer (the drawer
  Modal renders its content only while open), and it is the heaviest thing the
  app shell can pull in — so the React scaffold's one interaction-only split is
  preserved here by the drawer's own gating rather than a second import map.
  Rendered inside UserMenu's drawer, the panel reads the drawer's close
  callback via the panel-close context (no onClose prop-threading).
-->
<AppHeader appName={APP_NAME} logoSize={LOGO_SIZE}>
  {#snippet userMenu()}
    <UserMenu>
      <SettingsPanel />
    </UserMenu>
  {/snippet}
</AppHeader>
