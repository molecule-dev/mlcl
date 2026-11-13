<script setup lang="ts">
import { computed, useAttrs } from 'vue'

import { getIcon, type IconName } from '@molecule/app-icons'

const props = withDefaults(
  defineProps<{
    name: IconName
    size?: number
  }>(),
  {
    size: 20,
  },
)

// Extra attributes (aria-*, role, class, data-*) fall through to the single
// rendered <svg>; the decorative defaults below read them so an explicit
// caller aria-label / aria-labelledby / role always wins.
const attrs = useAttrs()

// Graceful degradation: an icon name missing from the bonded set (icon-set
// version skew, a custom-set with a smaller catalog) must NOT crash the
// whole app — multi-vendor-marketplace shipped a dead app over this. Warn
// and render a neutral placeholder circle instead.
const icon = computed(() => {
  try {
    return getIcon(props.name)
  } catch (error) {
    console.warn(`Icon: no bonded glyph for "${props.name}" — rendering a placeholder.`, error)
    return null
  }
})
const viewBox = computed(() => icon.value?.viewBox || '0 0 20 20')
const isStroked = computed(() => !!icon.value?.stroke)
const fillAttr = computed(() => (isStroked.value ? 'none' : icon.value?.fill || 'currentColor'))
// Decorative by default: when the caller passes no `aria-label` /
// `aria-labelledby` / `role`, the svg is rendered `aria-hidden` +
// `focusable="false"` so screen readers skip it (an unnamed inline svg is
// announced as a stray "image" by some combos). Passing any of those
// attributes opts the icon into the accessibility tree.
const decorative = computed(
  () => attrs['aria-label'] == null && attrs['aria-labelledby'] == null && attrs.role == null,
)
</script>

<template>
  <svg
    v-if="icon && icon.svg"
    :width="size"
    :height="size"
    :viewBox="viewBox"
    :fill="icon.fill || 'none'"
    :aria-hidden="decorative ? true : undefined"
    :focusable="decorative ? 'false' : undefined"
    v-html="icon.svg"
  />
  <svg
    v-else-if="icon"
    :width="size"
    :height="size"
    :viewBox="viewBox"
    :fill="fillAttr"
    :stroke="isStroked ? icon?.stroke : undefined"
    :stroke-width="isStroked ? icon?.strokeWidth : undefined"
    :stroke-linecap="isStroked ? icon?.strokeLinecap : undefined"
    :stroke-linejoin="isStroked ? icon?.strokeLinejoin : undefined"
    :aria-hidden="decorative ? true : undefined"
    :focusable="decorative ? 'false' : undefined"
  >
    <path
      v-for="(p, i) in icon?.paths ?? []"
      :key="i"
      :d="p.d"
      :fill="p.fill || undefined"
      :fill-rule="p.fillRule || undefined"
      :clip-rule="p.clipRule || undefined"
      :opacity="p.opacity !== undefined ? p.opacity : undefined"
    />
  </svg>
  <svg
    v-else
    :width="size"
    :height="size"
    viewBox="0 0 20 20"
    fill="none"
    :aria-hidden="decorative ? true : undefined"
    :focusable="decorative ? 'false' : undefined"
  >
    <circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.15" />
  </svg>
</template>
