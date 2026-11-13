<script setup lang="ts">
import { getClassMap } from '@molecule/app-ui'

import { provideSettingsPanelContext } from './context.js'

const props = defineProps<{
  /** Dismisses the enclosing drawer; published to the sections below. */
  onClose: () => void
}>()

const cm = getClassMap()

provideSettingsPanelContext({ onClose: () => props.onClose() })
</script>

<template>
  <!-- Outer settings-panel layout: padded vertical stack that hosts the
      section sub-components. -->
  <div :class="cm.cn(cm.sp('p', 6), cm.stack(6))">
    <slot />
  </div>
</template>
