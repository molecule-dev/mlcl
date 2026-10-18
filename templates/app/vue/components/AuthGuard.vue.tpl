<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth, useTranslation } from '@molecule/app-vue'

const { t } = useTranslation()
const { state, isAuthenticated } = useAuth()
const router = useRouter()

// `status`, not `initialized`: a stored token AND user make the FIRST render
// 'authenticated' (the client restores synchronously), so a protected page must
// not wait for the background verification. Only 'loading' means no decision.
watch(
  () => ({ status: state.value.status, authenticated: isAuthenticated.value }),
  ({ status, authenticated }) => {
    if (status !== 'loading' && !authenticated) {
      router.replace({ path: '/login', query: { from: router.currentRoute.value.fullPath } })
    }
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="state.status === 'loading'">{{ t('common.loading') }}</div>
  <RouterView v-else-if="isAuthenticated" />
</template>
