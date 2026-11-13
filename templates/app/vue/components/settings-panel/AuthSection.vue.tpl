<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue'

import type { UserProfile } from '@molecule/app-auth'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Flex, Modal } from '@molecule/app-ui-vue'
import { useAuth, useChangePassword, useHttpClient, useTranslation } from '@molecule/app-vue'

interface TwoFactorSetup {
  QRImageUrl?: string
  keyUrl?: string
  secret?: string
}

/**
 * Authentication section — change password (modal) + two-factor (TOTP) setup.
 *
 * Two-factor uses the real enrollment flow against the user resource's
 * `POST /users/:id/verify-two-factor` endpoint (`@molecule/api-two-factor`):
 * - Enable → `{action:'setup'}` returns a QR code + secret to scan into an
 *   authenticator app → user enters the 6-digit code → `{action:'enable', token}`.
 * - Disable → user enters a current code → `{action:'disable', token}`.
 * The current status is read from `/users/me`. (This replaces the previous
 * boolean toggle, which PATCHed `twoFactorEnabled` — a field the update
 * handler deliberately ignores — so it never actually enrolled 2FA.)
 *
 * Auto-hides for OAuth-only users (`user.oauthServer` truthy) since
 * password / 2FA wouldn't apply. If the app's API has no two-factor
 * provider bonded, setup fails gracefully with an inline message.
 */
const { t } = useTranslation()
const cm = getClassMap()
const { user } = useAuth<UserProfile>()
const http = useHttpClient()
const { status, error, changePassword, reset } = useChangePassword()

const showModal = ref(false)
const currentPassword = ref('')
const newPassword = ref('')

const userId = computed(() => (user.value as { id?: string } | null)?.id)
const twoFactorEnabled = ref(false)
const tfModal = ref<null | 'enable' | 'disable'>(null)
const tfSetup = ref<TwoFactorSetup | null>(null)
const tfToken = ref('')
const tfLoading = ref(false)
const tfError = ref('')

// OAuth users skip this section entirely.
const isOAuthUser = computed(() => !!(user.value as Record<string, unknown> | null)?.oauthServer)

// Read the persisted 2FA status from /users/me on mount. The disposed flag
// mirrors the React section's `cancelled` effect guard.
let tfStatusCancelled = false
onScopeDispose(() => {
  tfStatusCancelled = true
})
http
  .get<{ props?: { twoFactorEnabled?: boolean }; twoFactorEnabled?: boolean }>('/api/users/me')
  .then((res) => {
    if (tfStatusCancelled) return
    const body = (res as { data?: Record<string, unknown> }).data ?? res
    const u = ((body as { props?: Record<string, unknown> }).props ?? body) as {
      twoFactorEnabled?: boolean
    }
    twoFactorEnabled.value = Boolean(u?.twoFactorEnabled)
  })
  .catch((_error) => {
    /* status read is best-effort; defaults to disabled */
  })

function closeTf(): void {
  tfModal.value = null
  tfSetup.value = null
  tfToken.value = ''
  tfError.value = ''
}

async function startEnable(): Promise<void> {
  tfError.value = ''
  tfLoading.value = true
  tfModal.value = 'enable'
  try {
    const res = await http.post<TwoFactorSetup>(`/api/users/${userId.value}/verify-two-factor`, {
      action: 'setup',
    })
    const data = ((res as { data?: TwoFactorSetup }).data ?? res) as TwoFactorSetup
    tfSetup.value = data
  } catch (err) {
    tfError.value =
      err instanceof Error
        ? err.message
        : t('settings.twoFactorUnavailable', undefined, {
            defaultValue: 'Two-factor authentication is not available for this app.',
          })
  } finally {
    tfLoading.value = false
  }
}

async function submitTf(action: 'enable' | 'disable'): Promise<void> {
  tfError.value = ''
  tfLoading.value = true
  try {
    await http.post(`/api/users/${userId.value}/verify-two-factor`, {
      action,
      token: tfToken.value,
    })
    twoFactorEnabled.value = action === 'enable'
    closeTf()
  } catch (err) {
    tfError.value =
      err instanceof Error
        ? err.message
        : t('settings.twoFactorInvalidCode', undefined, { defaultValue: 'Invalid code' })
  } finally {
    tfLoading.value = false
  }
}

async function handleChangePassword(): Promise<void> {
  try {
    await changePassword(currentPassword.value, newPassword.value)
    showModal.value = false
    currentPassword.value = ''
    newPassword.value = ''
    reset()
  } catch (_error) {
    // Error tracked in hook state — useChangePassword surfaces it via `error`.
  }
}
</script>

<template>
  <!-- OAuth users skip this section entirely — including its modals. -->
  <template v-if="!isOAuthUser">
    <section>
      <h3 :class="cm.cn(cm.sectionHeading, cm.sp('mb', 3))">{{ t('settings.authentication') }}</h3>
      <div :class="cm.stack(3)">
        <Button variant="outline" size="sm" @click="showModal = true">
          {{ t('settings.changePassword') }}
        </Button>
        <Flex align="center" justify="between">
          <span :class="cm.textSize('sm')">
            {{ t('settings.twoFactor') }}
            <span
              v-if="twoFactorEnabled"
              :class="cm.cn(cm.textSize('xs'), cm.textSubtle, cm.sp('ml', 2))"
            >
              {{ t('settings.twoFactorOn', undefined, { defaultValue: 'On' }) }}
            </span>
          </span>
          <Button
            v-if="twoFactorEnabled"
            variant="outline"
            size="sm"
            data-mol-id="two-factor-disable"
            @click="
              () => {
                tfError = ''
                tfToken = ''
                tfModal = 'disable'
              }
            "
          >
            {{ t('settings.twoFactorDisable', undefined, { defaultValue: 'Disable' }) }}
          </Button>
          <Button
            v-else
            variant="outline"
            size="sm"
            data-mol-id="two-factor-enable"
            @click="startEnable"
          >
            {{ t('settings.twoFactorEnable', undefined, { defaultValue: 'Enable' }) }}
          </Button>
        </Flex>
      </div>
    </section>

    <Modal
      :open="showModal"
      :title="t('settings.changePasswordModal.title')"
      @close="
        () => {
          showModal = false
          reset()
        }
      "
    >
      <Alert v-if="error" status="error" :class="cm.sp('mb', 4)">
        {{ error.message || t('settings.changePasswordModal.error') }}
      </Alert>
      <form :class="cm.stack(4)" @submit.prevent="handleChangePassword">
        <div>
          <label for="current-pw" :class="cm.formLabel">
            {{ t('settings.changePasswordModal.currentPassword') }}
          </label>
          <!-- The wrapper/input markup of `@molecule/app-ui-react`'s <Input>, inlined:
            the installed ui-vue Input neither forwards `autocomplete` to the native
            element nor accepts it as a prop (its fallthrough attrs land on the
            outer <div>), and browser autofill reads it from the input itself. -->
          <div :class="cm.inputWrapper">
            <div :class="cm.inputInner">
              <input
                id="current-pw"
                v-model="currentPassword"
                type="password"
                :class="cm.input()"
                autocomplete="current-password"
                aria-invalid="false"
                required
              />
            </div>
          </div>
        </div>
        <div>
          <label for="new-pw" :class="cm.formLabel">
            {{ t('settings.changePasswordModal.newPassword') }}
          </label>
          <div :class="cm.inputWrapper">
            <div :class="cm.inputInner">
              <input
                id="new-pw"
                v-model="newPassword"
                type="password"
                :class="cm.input()"
                autocomplete="new-password"
                aria-invalid="false"
                required
              />
            </div>
          </div>
        </div>
        <Button type="submit" :full-width="true" :loading="status === 'pending'">
          {{
            status === 'pending'
              ? t('settings.changePasswordModal.changing')
              : t('settings.changePassword')
          }}
        </Button>
      </form>
    </Modal>

    <Modal
      :open="tfModal !== null"
      :title="
        tfModal === 'disable'
          ? t('settings.twoFactorDisableTitle', undefined, {
              defaultValue: 'Disable two-factor authentication',
            })
          : t('settings.twoFactorEnableTitle', undefined, {
              defaultValue: 'Enable two-factor authentication',
            })
      "
      @close="closeTf"
    >
      <Alert v-if="tfError" status="error" :class="cm.sp('mb', 4)">
        {{ tfError }}
      </Alert>
      <div
        v-if="tfModal === 'enable' && tfSetup?.QRImageUrl"
        :class="cm.cn(cm.stack(3), cm.sp('mb', 4))"
      >
        <p :class="cm.cn(cm.textSize('sm'), cm.textMuted)">
          {{
            t('settings.twoFactorScan', undefined, {
              defaultValue:
                'Scan this QR code with your authenticator app, then enter the 6-digit code.',
            })
          }}
        </p>
        <img
          :src="tfSetup.QRImageUrl"
          :alt="t('settings.twoFactorQrAlt', undefined, { defaultValue: 'Two-factor QR code' })"
          :class="cm.cn(cm.mxAuto, cm.maxW('xs'))"
        />
        <p
          v-if="tfSetup.secret"
          :class="cm.cn(cm.textSize('xs'), cm.textSubtle, cm.settingsPanelTwoFactorSecret)"
        >
          {{ tfSetup.secret }}
        </p>
      </div>
      <form
        v-if="tfModal === 'disable' || tfSetup"
        :class="cm.stack(4)"
        @submit.prevent="submitTf(tfModal === 'disable' ? 'disable' : 'enable')"
      >
        <div>
          <label for="tf-token" :class="cm.formLabel">
            {{ t('settings.twoFactorCode', undefined, { defaultValue: 'Authentication code' }) }}
          </label>
          <div :class="cm.inputWrapper">
            <div :class="cm.inputInner">
              <input
                id="tf-token"
                v-model="tfToken"
                type="text"
                :class="cm.input()"
                autocomplete="one-time-code"
                aria-invalid="false"
                required
              />
            </div>
          </div>
        </div>
        <Button
          type="submit"
          :color="tfModal === 'disable' ? 'error' : undefined"
          :full-width="true"
          :loading="tfLoading"
        >
          {{
            tfModal === 'disable'
              ? t('settings.twoFactorDisable', undefined, { defaultValue: 'Disable' })
              : t('settings.twoFactorVerify', undefined, { defaultValue: 'Verify & enable' })
          }}
        </Button>
      </form>
    </Modal>
  </template>
</template>
