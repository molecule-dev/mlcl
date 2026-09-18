<script setup lang="ts">
import { useTheme, useTranslation } from '@molecule/app-vue'
import { getClassMap } from '@molecule/app-ui'
import Icon from './Icon.vue'

const { t } = useTranslation()
const cm = getClassMap()
const { mode, toggleTheme } = useTheme()
</script>

<template>
  <button type="button" :aria-label="t('theme.toggle')" :class="cm.themeToggleButton" @click="toggleTheme">
    <Icon v-if="mode === 'dark'" name="moon" :size="20" />
    <Icon v-else name="sun" :size="20" />
  </button>
</template>
