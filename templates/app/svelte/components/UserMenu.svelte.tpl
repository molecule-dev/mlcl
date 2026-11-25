{{#feature settings}}
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
{{/feature}}
{{^feature settings}}
<script lang="ts">
  import { useAuth, useTranslation } from '@molecule/app-svelte'
  import { Button } from '@molecule/app-ui-svelte'

  const { isAuthenticated, logout } = useAuth()
  const { t } = useTranslation()
</script>

<!--
  The signed-in user's log-out button. A settings page and drawer come with the settings panel
  package (`npx mlcl add @molecule/app-settings-panel-svelte --inject`).
-->
{#if $isAuthenticated}
  <Button variant="ghost" size="sm" data-mol-id="log-out" onClick={() => void logout()}>
    {t('userMenu.logOut', undefined, { defaultValue: 'Log out' })}
  </Button>
{/if}
{{/feature}}
