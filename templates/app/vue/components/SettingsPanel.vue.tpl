<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { UserProfile } from '@molecule/app-auth'
import { getClassMap } from '@molecule/app-ui'
import {
  useAuth,
  useChangePassword,
  useHttpClient,
  usePush,
  useDevice,
  useTranslation,
} from '@molecule/app-vue'
import {
  Button,
  Input,
  Switch,
  Alert,
  Separator,
  Spinner,
  Modal,
  Flex,
} from '@molecule/app-ui-vue'
import Icon from './Icon.vue'
import Footer from './Footer.vue'

const { t } = useTranslation()
const cm = getClassMap()

interface Device {
  id: string
  name: string
  platform: string
  lastSeen?: string
}

const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const { user, logout } = useAuth<UserProfile>()
const http = useHttpClient()
const {
  permission,
  requestPermission,
  register: registerPush,
  unregister: unregisterPush,
} = usePush()
const { deviceInfo } = useDevice()
const {
  status: pwStatus,
  error: pwError,
  changePassword,
  reset: resetPw,
} = useChangePassword()

// Email editing
const email = ref(user.value?.email || '')
const emailSaving = ref(false)
const emailError = ref('')

// Password change
const showPasswordModal = ref(false)
const currentPassword = ref('')
const newPassword = ref('')

// 2FA
const twoFactorEnabled = ref(false)
const twoFactorLoading = ref(false)

// Devices
const devices = ref<Device[]>([])
const devicesLoading = ref(true)

// Plan
const plan = ref('Free')

// Delete account
const showDeleteModal = ref(false)
const deletePassword = ref('')
const deleteLoading = ref(false)
const deleteError = ref('')

// Push notifications
const pushEnabled = ref(permission.value === 'granted')

const isOnline = navigator.onLine

async function loadDevices() {
  try {
    const response = await http.get<{ data: Device[] }>('/devices')
    devices.value = response.data.data || []
  } catch {
    // Devices may not be available
  } finally {
    devicesLoading.value = false
  }
}

onMounted(() => {
  loadDevices()
})

async function handleEmailBlur() {
  if (email.value === user.value?.email || !email.value) return
  emailSaving.value = true
  emailError.value = ''
  try {
    await http.patch(`/users/${user.value?.id}`, { data: { email: email.value } })
  } catch (err) {
    emailError.value = err instanceof Error ? err.message : t('settings.failedToUpdateEmail')
    email.value = user.value?.email || ''
  } finally {
    emailSaving.value = false
  }
}

async function handlePasswordChange() {
  try {
    await changePassword(currentPassword.value, newPassword.value)
    showPasswordModal.value = false
    currentPassword.value = ''
    newPassword.value = ''
    resetPw()
  } catch {
    // Error tracked in hook state
  }
}

async function handleToggle2FA(enabled: boolean) {
  twoFactorLoading.value = true
  try {
    await http.patch(`/users/${user.value?.id}`, { data: { twoFactorEnabled: enabled } })
    twoFactorEnabled.value = enabled
  } catch {
    // Revert on failure
  } finally {
    twoFactorLoading.value = false
  }
}

async function handleTogglePush(enabled: boolean) {
  try {
    if (enabled) {
      await requestPermission()
      await registerPush()
      pushEnabled.value = true
    } else {
      await unregisterPush()
      pushEnabled.value = false
    }
  } catch {
    // Permission may be denied
  }
}

async function handleLogout() {
  await logout()
  emit('close')
  router.push('/login')
}

async function handleDeleteAccount() {
  deleteLoading.value = true
  deleteError.value = ''
  try {
    await http.delete(`/users/${user.value?.id}`, { data: { password: deletePassword.value } })
    await logout()
    emit('close')
    router.push('/login')
  } catch (err) {
    deleteError.value = err instanceof Error ? err.message : t('settings.failedToDeleteAccount')
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <div :class="cm.cn(cm.sp('p', 6), cm.stack(6))">
    <!-- Account -->
    <section>
      <Flex align="center" gap="sm" :class="cm.sp('mb', 3)">
        <h3 :class="cm.sectionHeading">
          {{ t('settings.account') }}
        </h3>
        <Spinner v-if="emailSaving" size="xs" />
      </Flex>
      <div>
        <label for="settings-email" :class="cm.formLabelSmall">{{ t('settings.email') }}</label>
        <Input
          id="settings-email"
          v-model="email"
          type="email"
          size="sm"
          @blur="handleEmailBlur"
        />
        <p v-if="emailError" :class="cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))">{{ emailError }}</p>
      </div>
    </section>

    <!-- Authentication — hidden for OAuth users -->
    <section v-if="!(user as unknown as Record<string, unknown>)?.oauthServer">
      <h3 :class="cm.cn(cm.sectionHeading, cm.sp('mb', 3))">
        {{ t('settings.authentication') }}
      </h3>
      <div :class="cm.stack(3)">
        <Button variant="outline" size="sm" @click="showPasswordModal = true">
          {{ t('settings.changePassword') }}
        </Button>
        <Flex align="center" justify="between">
          <span :class="cm.textSize('sm')">{{ t('settings.twoFactor') }}</span>
          <Switch
            :checked="twoFactorEnabled"
            :disabled="twoFactorLoading"
            size="sm"
            @change="handleToggle2FA(($event.target as HTMLInputElement).checked)"
          />
        </Flex>
      </div>
    </section>

    <!-- Notifications -->
    <section>
      <h3 :class="cm.cn(cm.sectionHeading, cm.sp('mb', 3))">
        {{ t('settings.notifications') }}
      </h3>
      <Flex align="center" justify="between">
        <span :class="cm.textSize('sm')">{{ t('settings.pushNotifications') }}</span>
        <Switch
          :checked="pushEnabled"
          size="sm"
          @change="handleTogglePush(($event.target as HTMLInputElement).checked)"
        />
      </Flex>
    </section>

    <!-- Billing -->
    <section>
      <h3 :class="cm.cn(cm.sectionHeading, cm.sp('mb', 3))">
        {{ t('settings.billing') }}
      </h3>
      <Flex align="center" justify="between">
        <span :class="cm.textSize('sm')">{{ t('settings.plan') }}<strong>{{ plan }}</strong></span>
        <Button variant="outline" size="sm">{{ t('settings.upgrade') }}</Button>
      </Flex>
    </section>

    <!-- Devices -->
    <section>
      <Flex align="center" gap="sm" :class="cm.sp('mb', 3)">
        <h3 :class="cm.sectionHeading">
          {{ t('settings.devices') }}
        </h3>
        <Spinner v-if="devicesLoading" size="xs" />
      </Flex>
      <ul v-if="devices.length > 0" :class="cm.stack(2)">
        <li
          v-for="device in devices"
          :key="device.id"
        >
          <Flex align="center" justify="between" :class="cm.cn(cm.textSize('sm'), cm.sp('py', 1))">
            <span>{{ device.name || device.platform }}</span>
            <Icon name="chevron-right" :size="16" :class="cm.textSubtle" />
          </Flex>
        </li>
      </ul>
      <p v-else-if="!devicesLoading" :class="cm.cn(cm.textSize('sm'), cm.textMuted)">{{ t('settings.noDevices') }}</p>
    </section>

    <!-- This Device -->
    <section>
      <h3 :class="cm.cn(cm.sectionHeading, cm.sp('mb', 3))">
        {{ t('settings.thisDevice') }}
      </h3>
      <dl :class="cm.cn(cm.stack(1), cm.textSize('sm'))">
        <Flex justify="between">
          <dt :class="cm.textMuted">{{ t('settings.platform') }}</dt>
          <dd>{{ deviceInfo.os.name || t('settings.unknown') }}</dd>
        </Flex>
        <Flex justify="between">
          <dt :class="cm.textMuted">{{ t('settings.browser') }}</dt>
          <dd>{{ deviceInfo.browser.name || t('settings.unknown') }}</dd>
        </Flex>
        <Flex justify="between">
          <dt :class="cm.textMuted">{{ t('settings.network') }}</dt>
          <dd>{{ isOnline ? t('settings.online') : t('settings.offline') }}</dd>
        </Flex>
      </dl>
    </section>

    <Separator />

    <!-- Actions -->
    <section :class="cm.stack(3)">
      <Button color="error" :full-width="true" @click="handleLogout">
        {{ t('settings.logOut') }}
      </Button>
      <Button variant="ghost" :full-width="true" @click="showDeleteModal = true">
        {{ t('settings.deleteAccount') }}
      </Button>
    </section>

    <Footer />

    <!-- Password Change Modal -->
    <Modal
      :open="showPasswordModal"
      :title="t('settings.changePasswordModal.title')"
      @close="(showPasswordModal = false, resetPw())"
    >
      <Alert v-if="pwError" status="error" :class="cm.sp('mb', 4)">
        {{ pwError.message || t('settings.changePasswordModal.error') }}
      </Alert>
      <form :class="cm.stack(4)" @submit.prevent="handlePasswordChange">
        <div>
          <label for="current-pw" :class="cm.formLabel">{{ t('settings.changePasswordModal.currentPassword') }}</label>
          <Input
            id="current-pw"
            v-model="currentPassword"
            type="password"
            autocomplete="current-password"
            required
          />
        </div>
        <div>
          <label for="new-pw" :class="cm.formLabel">{{ t('settings.changePasswordModal.newPassword') }}</label>
          <Input
            id="new-pw"
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            required
          />
        </div>
        <Button type="submit" :full-width="true" :loading="pwStatus === 'pending'">
          {{ pwStatus === 'pending' ? t('settings.changePasswordModal.changing') : t('settings.changePassword') }}
        </Button>
      </form>
    </Modal>

    <!-- Delete Account Modal -->
    <Modal
      :open="showDeleteModal"
      :title="t('settings.deleteAccountModal.title')"
      @close="showDeleteModal = false"
    >
      <p :class="cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mb', 4))">
        {{ t('settings.deleteAccountModal.warning') }}
      </p>
      <Alert v-if="deleteError" status="error" :class="cm.sp('mb', 4)">
        {{ deleteError }}
      </Alert>
      <form :class="cm.stack(4)" @submit.prevent="handleDeleteAccount">
        <div>
          <label for="delete-pw" :class="cm.formLabel">{{ t('settings.deleteAccountModal.password') }}</label>
          <Input
            id="delete-pw"
            v-model="deletePassword"
            type="password"
            required
          />
        </div>
        <Button type="submit" color="error" :full-width="true" :loading="deleteLoading">
          {{ deleteLoading ? t('settings.deleteAccountModal.deleting') : t('settings.deleteAccount') }}
        </Button>
      </form>
    </Modal>
  </div>
</template>
