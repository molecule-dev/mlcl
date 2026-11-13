<script lang="ts">
  import { getClient } from '@molecule/app-http'
  import { createPushStores } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { createAppI18nStores } from '../../lib/i18n.js'
  import {
    disablePushOnCurrentDevice,
    enablePushOnCurrentDevice,
    type PushToggleResult,
    readCurrentDevicePushEnabled,
  } from '../../lib/pushToggle.js'
  import Flex from '../Flex.svelte'
  import Switch from '../Switch.svelte'

  // Push-notification toggle section — the full receive-side enable chain:
  // browser permission → runtime VAPID public key
  // (`GET /api/devices/push/public-key`) → `pushManager.subscribe` with
  // `applicationServerKey` → PATCH the subscription onto the current device
  // row (`/api/devices/:id { pushSubscription, hasPushSubscription }`), which
  // is where the api-side push fan-outs look for it.
  //
  // Initial state reflects SERVER truth (the current device row's
  // `hasPushSubscription`), and every failure surfaces as an honest inline
  // message — a dev build without a service worker fails fast instead of
  // hanging the switch.

  const cm = getClassMap()
  const { t } = createAppI18nStores()
  const http = getClient()
  const { requestPermission, register, unregister } = createPushStores()

  let enabled = $state(false)
  let busy = $state(false)
  let error = $state<string | null>(null)

  $effect(() => {
    let cancelled = false
    // Server truth for THIS device; resolves false (never throws) when the
    // devices endpoint is unavailable.
    readCurrentDevicePushEnabled(http).then((serverEnabled) => {
      if (!cancelled && serverEnabled) enabled = true
    })
    return () => {
      cancelled = true
    }
  })

  function failureMessage(result: Extract<PushToggleResult, { ok: false }>): string {
    switch (result.reason) {
      case 'permission-denied':
        return $t('settings.pushPermissionDenied', undefined, {
          defaultValue: 'Notification permission was denied.',
        })
      case 'server-unconfigured':
        return $t('settings.pushServerUnavailable', undefined, {
          defaultValue: 'Push notifications are not configured on this server.',
        })
      case 'register-failed':
        // The push provider throws already-localized messages (not supported /
        // no service worker in a dev build / push-service rejection).
        return (
          result.message ||
          $t('settings.pushUpdateFailed', undefined, {
            defaultValue: 'Could not update push notification settings.',
          })
        )
      case 'persist-failed':
        return $t('settings.pushUpdateFailed', undefined, {
          defaultValue: 'Could not update push notification settings.',
        })
      default:
        return $t('settings.pushUpdateFailed', undefined, {
          defaultValue: 'Could not update push notification settings.',
        })
    }
  }

  async function handleToggle(next: boolean): Promise<void> {
    if (busy) return
    busy = true
    error = null
    try {
      if (next) {
        const result = await enablePushOnCurrentDevice({ http, requestPermission, register })
        if (result.ok) {
          enabled = true
        } else {
          error = failureMessage(result)
        }
      } else {
        const result = await disablePushOnCurrentDevice({ http, unregister })
        // The switch goes off locally either way; a failed server clear is
        // still reported so the user knows sends may continue.
        enabled = false
        if (!result.ok) {
          error = failureMessage(result)
        }
      }
    } finally {
      busy = false
    }
  }
</script>

<section>
  <h3 class={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>{$t('settings.notifications')}</h3>
  <Flex align="center" justify="between">
    <span class={cm.textSize('sm')}>{$t('settings.pushNotifications')}</span>
    <Switch
      checked={enabled}
      disabled={busy}
      // The visible text is a SIBLING span, not the Switch's label — without
      // aria-label the control is announced as just "switch".
      aria-label={$t('settings.pushNotifications')}
      onchange={(event) => handleToggle((event.target as HTMLInputElement).checked)}
      size="sm"
      data-mol-id="settings-push-toggle"
    />
  </Flex>
  {#if error}
    <p
      class={cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))}
      role="alert"
      data-mol-id="settings-push-error"
    >
      {error}
    </p>
  {/if}
</section>
