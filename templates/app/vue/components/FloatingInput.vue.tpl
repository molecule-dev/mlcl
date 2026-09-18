<script setup lang="ts">
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

defineProps<{
  type?: string
  modelValue?: string
  placeholder?: string
  autoComplete?: string
  autoFocus?: boolean
  required?: boolean
  name?: string
  id?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <span :class="cm.floatingInputWrapper">
    <input
      :id="id"
      :type="type || 'text'"
      :value="modelValue"
      :autocomplete="autoComplete"
      :autofocus="autoFocus"
      :required="required"
      :name="name"
      :placeholder="placeholder"
      :class="cm.cn(cm.input(), cm.floatingInput)"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span :class="cm.floatingLabel">{{ placeholder }}</span>
  </span>
</template>
