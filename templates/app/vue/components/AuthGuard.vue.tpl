<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth, useTranslation } from '@molecule/app-vue'

const { t } = useTranslation()
const { state, isAuthenticated } = useAuth()
const router = useRouter()

watch(
  () => ({ initialized: state.value.initialized, authenticated: isAuthenticated.value }),
  ({ initialized, authenticated }) => {
    if (initialized && !authenticated) {
      router.replace({ path: '/login', query: { from: router.currentRoute.value.fullPath } })
    }
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="!state.initialized">{{ t('common.loading') }}</div>
  <RouterView v-else-if="isAuthenticated" />
</template>
