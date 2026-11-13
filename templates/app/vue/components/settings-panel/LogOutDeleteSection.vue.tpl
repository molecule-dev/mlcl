<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import type { UserProfile } from '@molecule/app-auth'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Modal } from '@molecule/app-ui-vue'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-vue'

import { useSettingsPanelContext } from './context.js'

/**
 * Bottom actions section — Log out + Delete account.
 *
 * Owns the delete-account modal internally (the trigger lives in the
 * same section so the modal lives here too). Reads `onClose` from
 * the `<SettingsContainer>` context to dismiss the panel after either
 * action and navigates to `/login`.
 */
const { t } = useTranslation()
const cm = getClassMap()
const router = useRouter()
const { user, logout } = useAuth<UserProfile>()
const http = useHttpClient()
const { onClose } = useSettingsPanelContext()

const showModal = ref(false)
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogout(): Promise<void> {
  await logout()
  onClose()
  router.push('/login')
}

async function handleDelete(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    await http.delete(`/api/users/${user.value?.id}`, { data: { password: password.value } })
    await logout()
    onClose()
    router.push('/login')
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('settings.failedToDeleteAccount')
  } finally {
    loading.value = false
  }
}

function closeModal(): void {
  showModal.value = false
}
</script>

<template>
  <section :class="cm.stack(3)">
    <Button color="error" :full-width="true" data-mol-id="user-menu-logout" @click="handleLogout">
      {{ t('settings.logOut', undefined, { defaultValue: 'Sign out' }) }}
    </Button>
    <Button
      variant="ghost"
      :full-width="true"
      data-mol-id="user-menu-delete-account"
      @click="showModal = true"
    >
      {{ t('settings.deleteAccount', undefined, { defaultValue: 'Delete account' }) }}
    </Button>
  </section>

  <Modal :open="showModal" :title="t('settings.deleteAccountModal.title')" @close="closeModal">
    <p :class="cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mb', 4))">
      {{ t('settings.deleteAccountModal.warning') }}
    </p>
    <Alert v-if="error" status="error" :class="cm.sp('mb', 4)">
      {{ error }}
    </Alert>
    <form :class="cm.stack(4)" @submit.prevent="handleDelete">
      <div>
        <label for="delete-pw" :class="cm.formLabel">
          {{ t('settings.deleteAccountModal.password') }}
        </label>
        <div :class="cm.inputWrapper">
          <div :class="cm.inputInner">
            <input
              id="delete-pw"
              v-model="password"
              type="password"
              :class="cm.input()"
              aria-invalid="false"
              required
            />
          </div>
        </div>
      </div>
      <Button type="submit" color="error" :full-width="true" :loading="loading">
        {{ loading ? t('settings.deleteAccountModal.deleting') : t('settings.deleteAccount') }}
      </Button>
    </form>
  </Modal>
</template>
