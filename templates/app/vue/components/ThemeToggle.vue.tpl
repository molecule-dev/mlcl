<script setup lang="ts">
import { getClassMap } from '@molecule/app-ui'
import { useTheme, useTranslation } from '@molecule/app-vue'

import Icon from './Icon.vue'

const { t } = useTranslation()
const cm = getClassMap()
const { mode, toggleTheme } = useTheme()
</script>

<template>
  <button
    type="button"
    data-mol-id="theme-toggle"
    :data-mode="mode"
    :aria-pressed="mode === 'dark'"
    :aria-label="t('theme.toggle', {}, { defaultValue: 'Toggle theme' })"
    :class="cm.themeToggleButton"
    @click="toggleTheme"
  >
    <Icon v-if="mode === 'dark'" name="moon" :size="20" />
    <Icon v-else name="sun" :size="20" />
  </button>
</template>
