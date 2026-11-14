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
