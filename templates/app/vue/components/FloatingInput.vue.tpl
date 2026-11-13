<script setup lang="ts">
import { computed, useId } from 'vue'

import { getClassMap } from '@molecule/app-ui'

const props = defineProps<{
  type?: string
  modelValue?: string
  placeholder?: string
  autoComplete?: string
  required?: boolean
  name?: string
  id?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const cm = getClassMap()

// The floating text is a real `<label for>` (not a bare span), so it is the
// input's programmatic accessible name via label association — previously the
// accessible name came only from `placeholder` (stripped by some AT/browser
// combos once the field has a value), and clicking the floating text did
// nothing because it wasn't associated with anything. `id` falls back to
// Vue's useId() when the caller doesn't pass one, mirroring
// Input/Select/Textarea's id-collision fix.
const generatedId = useId()
const inputId = computed(() => props.id || generatedId)
</script>

<template>
  <span :class="cm.floatingInputWrapper">
    <input
      :id="inputId"
      :type="type || 'text'"
      :value="modelValue"
      :autocomplete="autoComplete"
      :required="required"
      :name="name"
      :placeholder="placeholder"
      :class="cm.cn(cm.input(), cm.floatingInput)"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <label v-if="placeholder" :for="inputId" :class="cm.floatingLabel">{{ placeholder }}</label>
  </span>
</template>
