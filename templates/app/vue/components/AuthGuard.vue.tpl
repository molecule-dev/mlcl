<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'

import { useAuth, useTranslation } from '@molecule/app-vue'

const { t } = useTranslation()
const { state } = useAuth()
const router = useRouter()

// `status`, not `initialized`: a stored token AND user make the FIRST render
// 'authenticated' (the client restores synchronously), so a protected page must
// not wait for the background verification. Only 'loading' means no decision.
// Only 'unauthenticated' redirects: 'unavailable' (a retained session candidate
// the server could not confirm) still renders the page and lets the API decide.
watch(
  () => state.value.status,
  (status) => {
    if (status === 'unauthenticated') {
      router.replace({ path: '/login', query: { from: router.currentRoute.value.fullPath } })
    }
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="state.status === 'loading'" data-mol-id="auth-guard-loading">
    {{ t('common.loading', {}, { defaultValue: 'Loading...' }) }}
  </div>
  <RouterView v-else />
</template>
