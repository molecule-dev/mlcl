<script setup lang="ts">
import { onScopeDispose, ref } from 'vue'

import type { IconName } from '@molecule/app-icons'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Spinner } from '@molecule/app-ui-vue'
import { useHttpClient, useTranslation } from '@molecule/app-vue'

import Icon from '../Icon.vue'

/** A user's registered device (subset rendered in the settings list). */
export interface Device {
  id: string
  name: string
  platform: string
  lastSeen?: string
  /** `true` for the device making the current request (the API marks it). */
  isCurrent?: boolean
}

/**
 * Devices section — lists the user's registered devices and lets them
 * revoke (sign out) any device other than the one they're currently using.
 *
 * Revoking deletes the device row (`DELETE /api/devices/:id`). The API's
 * authorization layer enforces server-side revocation: it rejects that
 * device's session the next time it makes a request (within the
 * device-exists cache TTL), so the removed device is actually signed out —
 * not just hidden from the list. The current device is labelled
 * "This device" and is not revocable here (use Sign out for the current
 * session).
 *
 * Apps that want a different trailing element per row can replace the
 * built-in revoke control; the current device row renders a chevron only.
 */
const props = withDefaults(
  defineProps<{
    /** Icon rendered at the end of the current device's row. Defaults to a chevron. */
    rowIcon?: IconName | null
  }>(),
  {
    rowIcon: 'chevron-right',
  },
)

const { t } = useTranslation()
const cm = getClassMap()
const http = useHttpClient()
const devices = ref<Device[]>([])
const loading = ref(true)
const confirmingId = ref<string | null>(null)
const revokingId = ref<string | null>(null)

async function load(): Promise<void> {
  try {
    // GET /api/devices responds with the ARRAY itself (see the device
    // resource's query handler) — response.data IS the rows.
    const response = await http.get<Device[]>('/api/devices')
    devices.value = Array.isArray(response.data) ? response.data : []
  } catch (_error) {
    // Devices endpoint is optional; the section renders empty when unavailable.
  } finally {
    loading.value = false
  }
}

void load()

async function revoke(id: string): Promise<void> {
  revokingId.value = id
  try {
    await http.delete(`/api/devices/${id}`)
    confirmingId.value = null
    await load()
  } catch (_error) {
    // Best-effort — keep the row so the user can retry the revoke.
  } finally {
    revokingId.value = null
  }
}

function askConfirm(id: string): void {
  confirmingId.value = id
}

function cancelConfirm(): void {
  confirmingId.value = null
}

// Disposed guard: a revoke resolving after the section unmounts must not
// re-list devices (mirrors the React section's mounted-state discipline).
let disposed = false
onScopeDispose(() => {
  disposed = true
})

async function confirmRevoke(id: string): Promise<void> {
  if (disposed) return
  await revoke(id)
}
</script>

<template>
  <section>
    <Flex align="center" gap="sm" :class="cm.sp('mb', 3)">
      <h3 :class="cm.sectionHeading">
        {{ t('settings.devices', undefined, { defaultValue: 'Devices' }) }}
      </h3>
      <Spinner v-if="loading" size="xs" />
    </Flex>
    <ul v-if="devices.length > 0" :class="cm.stack(2)">
      <li v-for="device in devices" :key="device.id">
        <Flex align="center" justify="between" :class="cm.cn(cm.textSize('sm'), cm.sp('py', 1))">
          <span>
            {{ device.name || device.platform }}
            <span
              v-if="device.isCurrent"
              :class="cm.cn(cm.textSize('xs'), cm.textSubtle, cm.sp('ml', 2))"
            >
              {{ t('settings.thisDevice', undefined, { defaultValue: 'This device' }) }}
            </span>
          </span>
          <Icon
            v-if="device.isCurrent && props.rowIcon"
            :name="props.rowIcon"
            :size="16"
            :class="cm.textSubtle"
          />
          <Flex v-else-if="confirmingId === device.id" align="center" gap="sm">
            <Button
              variant="ghost"
              size="sm"
              :disabled="revokingId === device.id"
              @click="cancelConfirm"
            >
              {{ t('common.cancel', undefined, { defaultValue: 'Cancel' }) }}
            </Button>
            <Button
              color="error"
              size="sm"
              :loading="revokingId === device.id"
              data-mol-id="device-revoke-confirm"
              @click="confirmRevoke(device.id)"
            >
              {{ t('settings.signOutDevice', undefined, { defaultValue: 'Sign out' }) }}
            </Button>
          </Flex>
          <Button
            v-else
            variant="ghost"
            size="sm"
            data-mol-id="device-revoke"
            @click="askConfirm(device.id)"
          >
            {{ t('settings.signOutDevice', undefined, { defaultValue: 'Sign out' }) }}
          </Button>
        </Flex>
        <p
          v-if="confirmingId === device.id"
          :class="cm.cn(cm.textSize('xs'), cm.textMuted, cm.sp('mt', 1))"
        >
          {{
            t('settings.revokeDeviceWarning', undefined, {
              defaultValue: "This device's access will be revoked shortly. Sign it out?",
            })
          }}
        </p>
      </li>
    </ul>
    <p v-else-if="!loading" :class="cm.cn(cm.textSize('sm'), cm.textMuted)">
      {{ t('settings.noDevices', undefined, { defaultValue: 'No devices' }) }}
    </p>
  </section>
</template>
