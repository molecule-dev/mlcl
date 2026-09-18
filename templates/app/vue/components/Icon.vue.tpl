<script setup lang="ts">
import { computed } from 'vue'
import { getIcon } from '@molecule/app-icons'

const props = withDefaults(defineProps<{
  name: string
  size?: number
}>(), {
  size: 20,
})

const icon = computed(() => getIcon(props.name))
const viewBox = computed(() => icon.value.viewBox || '0 0 20 20')
const isStroked = computed(() => !!icon.value.stroke)
const fillAttr = computed(() =>
  isStroked.value ? 'none' : (icon.value.fill || 'currentColor')
)
</script>

<template>
  <svg
    v-if="icon.svg"
    :width="size"
    :height="size"
    :viewBox="viewBox"
    :fill="icon.fill || 'none'"
    v-html="icon.svg"
  />
  <svg
    v-else
    :width="size"
    :height="size"
    :viewBox="viewBox"
    :fill="fillAttr"
    :stroke="isStroked ? icon.stroke : undefined"
    :stroke-width="isStroked ? icon.strokeWidth : undefined"
    :stroke-linecap="isStroked ? icon.strokeLinecap : undefined"
    :stroke-linejoin="isStroked ? icon.strokeLinejoin : undefined"
  >
    <path
      v-for="(p, i) in icon.paths"
      :key="i"
      :d="p.d"
      :fill="p.fill || undefined"
      :fill-rule="p.fillRule || undefined"
      :clip-rule="p.clipRule || undefined"
      :opacity="p.opacity !== undefined ? p.opacity : undefined"
    />
  </svg>
</template>
