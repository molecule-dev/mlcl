<script setup lang="ts">
import { onScopeDispose, ref } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Flex, Switch } from '@molecule/app-ui-vue'
import { useHttpClient, usePush, useTranslation } from '@molecule/app-vue'

import type { PushToggleResult } from './pushToggle.js'
import {
  disablePushOnCurrentDevice,
  enablePushOnCurrentDevice,
  readCurrentDevicePushEnabled,
} from './pushToggle.js'

/**
 * Push-notification toggle section — the full receive-side enable chain:
 * browser permission → runtime VAPID public key
 * (`GET /api/devices/push/public-key`) → `pushManager.subscribe` with
 * `applicationServerKey` → PATCH the subscription onto the current device
 * row (`/api/devices/:id { pushSubscription, hasPushSubscription }`), which
 * is where the api-side push fan-outs look for it.
 *
 * Initial state reflects SERVER truth (the current device row's
 * `hasPushSubscription`), and every failure surfaces as an honest inline
 * message — a dev build without a service worker fails fast instead of
 * hanging the switch.
 */
const { t } = useTranslation()
const cm = getClassMap()
const http = useHttpClient()
const { requestPermission, register, unregister } = usePush()
const enabled = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)

// Server truth for THIS device; resolves false (never throws) when the
// devices endpoint is unavailable. Runs once on mount, like the React
// section's `[http]` effect; the disposed flag mirrors its cancelled guard.
let statusCancelled = false
onScopeDispose(() => {
  statusCancelled = true
})
void readCurrentDevicePushEnabled(http).then((serverEnabled) => {
  if (!statusCancelled && serverEnabled) enabled.value = true
})

function failureMessage(result: Extract<PushToggleResult, { ok: false }>): string {
  switch (result.reason) {
    case 'permission-denied':
      return t('settings.pushPermissionDenied', undefined, {
        defaultValue: 'Notification permission was denied.',
      })
    case 'server-unconfigured':
      return t('settings.pushServerUnavailable', undefined, {
        defaultValue: 'Push notifications are not configured on this server.',
      })
    case 'register-failed':
      // The push provider throws already-localized messages (not supported /
      // no service worker in a dev build / push-service rejection).
      return (
        result.message ||
        t('settings.pushUpdateFailed', undefined, {
          defaultValue: 'Could not update push notification settings.',
        })
      )
    case 'persist-failed':
      return t('settings.pushUpdateFailed', undefined, {
        defaultValue: 'Could not update push notification settings.',
      })
  }
}

async function handleToggle(next: boolean): Promise<void> {
  if (busy.value) return
  busy.value = true
  error.value = null
  try {
    if (next) {
      const result = await enablePushOnCurrentDevice({ http, requestPermission, register })
      if (result.ok) {
        enabled.value = true
      } else {
        error.value = failureMessage(result)
      }
    } else {
      const result = await disablePushOnCurrentDevice({ http, unregister })
      // The switch goes off locally either way; a failed server clear is
      // still reported so the user knows sends may continue.
      enabled.value = false
      if (!result.ok) {
        error.value = failureMessage(result)
      }
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section>
    <h3 :class="cm.cn(cm.sectionHeading, cm.sp('mb', 3))">{{ t('settings.notifications') }}</h3>
    <Flex align="center" justify="between">
      <span :class="cm.textSize('sm')">{{ t('settings.pushNotifications') }}</span>
      <Switch
        v-model="enabled"
        :disabled="busy"
        size="sm"
        data-mol-id="settings-push-toggle"
        :aria-label="t('settings.pushNotifications')"
        @update:model-value="handleToggle"
      />
    </Flex>
    <p
      v-if="error"
      :class="cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))"
      role="alert"
      data-mol-id="settings-push-error"
    >
      {{ error }}
    </p>
  </section>
</template>
