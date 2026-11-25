{{#feature settings}}
<script setup lang="ts">
import { defineAsyncComponent, defineComponent, h } from 'vue'

import { usePanelClose, UserMenu as MoleculeUserMenu } from '@molecule/app-ui-vue'

// The settings panel is split out of the entry: it mounts only when the user
// opens the drawer, and it is the heaviest thing the app shell can pull in
// (account, auth, billing, devices and notifications sections plus their
// translation bundles). A static import here ships all of that on every page.
const SettingsPanel = defineAsyncComponent(() => import('./SettingsPanel.vue'))

// Rendered inside MoleculeUserMenu's drawer, so it can read the drawer's close
// callback via usePanelClose() (no onClose prop-threading from the trigger).
// Vue's defineAsyncComponent holds its own chunk-loading fallback, so there is
// no Suspense wrapper around it here.
const UserMenuPanel = defineComponent({
  name: 'UserMenuPanel',
  setup() {
    const onClose = usePanelClose()
    return () => h(SettingsPanel, { onClose })
  },
})
</script>

<template>
  <MoleculeUserMenu>
    <UserMenuPanel />
  </MoleculeUserMenu>
</template>
{{/feature}}
{{^feature settings}}
<script setup lang="ts">
import { Button } from '@molecule/app-ui-vue'
import { useAuth, useTranslation } from '@molecule/app-vue'

// The signed-in user's log-out button. A settings page and drawer come with the settings panel
// package (`npx mlcl add @molecule/app-settings-panel-vue --inject`).
const { isAuthenticated, logout } = useAuth()
const { t } = useTranslation()
</script>

<template>
  <Button v-if="isAuthenticated" variant="ghost" size="sm" data-mol-id="log-out" @click="logout()">
    {{ t('userMenu.logOut', undefined, { defaultValue: 'Log out' }) }}
  </Button>
</template>
{{/feature}}
