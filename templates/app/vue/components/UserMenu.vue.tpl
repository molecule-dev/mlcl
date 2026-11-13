<script setup lang="ts">
import { defineAsyncComponent, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { getClassMap } from '@molecule/app-ui'
import { Button, Modal } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import Icon from './Icon.vue'

// The settings panel is split out of the entry: it mounts only when the user
// opens the drawer, and it is the heaviest thing the app shell can pull in
// (account, auth, billing, devices and notifications sections plus their
// translation bundles). A static import here ships all of that on every page.
const SettingsPanel = defineAsyncComponent(() => import('./SettingsPanel.vue'))

const { t } = useTranslation()
const cm = getClassMap()
const open = ref(false)
const route = useRoute()

// Close the drawer whenever the route changes. vue-router updates the route
// on both in-app navigation and browser back/forward (popstate), so a single
// watcher covers both — without it the drawer stays mounted over the next
// page and blocks clicks underneath.
watch(
  () => [route.path, route.query],
  () => {
    open.value = false
  },
)
</script>

<template>
  <Button
    variant="ghost"
    size="sm"
    data-mol-id="user-menu"
    :aria-label="t('userMenu.open', {}, { defaultValue: 'Open user menu' })"
    :class="cm.cn(cm.minH(10), cm.minW(10))"
    @click="open = true"
  >
    <Icon name="user" :size="20" />
  </Button>
  <Modal
    :open="open"
    :class="cm.drawer"
    :aria-label="t('userMenu.panelLabel', {}, { defaultValue: 'Account menu' })"
    @close="open = false"
  >
    <!-- The drawer has no `title`, so without an explicit label the dialog is
        announced as an unnamed "dialog" — give it a name. -->
    <SettingsPanel @close="open = false" />
  </Modal>
</template>
