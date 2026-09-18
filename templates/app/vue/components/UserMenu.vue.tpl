<script setup lang="ts">
import { ref } from 'vue'
import { useTranslation } from '@molecule/app-vue'
import { getClassMap } from '@molecule/app-ui'
import { Button, Modal } from '@molecule/app-ui-vue'
import Icon from './Icon.vue'
import SettingsPanel from './SettingsPanel.vue'

const { t } = useTranslation()
const cm = getClassMap()
const open = ref(false)
</script>

<template>
  <Button
    variant="ghost"
    size="sm"
    :aria-label="t('userMenu.open')"
    @click="open = true"
  >
    <Icon name="user" :size="20" />
  </Button>
  <Modal
    :open="open"
    :class="cm.drawer"
    @close="open = false"
  >
    <SettingsPanel @close="open = false" />
  </Modal>
</template>
