<script lang="ts">
  import { UserMenu as MoleculeUserMenu } from '@molecule/app-ui-svelte'

  import SettingsPanel from './SettingsPanel.svelte'
</script>

<!--
  The settings panel mounts only when the user opens the drawer (the drawer
  Modal renders its content only while open), and it is the heaviest thing the
  app shell can pull in — account, auth, billing, devices and notifications
  sections plus their translation bundles. That gating is the Svelte port of
  the React scaffold's one interaction-only split (the lazy()-loaded panel):
  no settings code reaches a page until the drawer needs it.
-->
<MoleculeUserMenu>
  <SettingsPanel />
</MoleculeUserMenu>
