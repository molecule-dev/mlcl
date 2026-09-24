import { useCallback, useEffect, useState } from 'react'

import { useDevice, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { unpackListPayload } from '../utils/httpUnpack.js'

/** A user's registered device (subset rendered in the settings list). */
interface Device {
  id: string
  name?: string
  pushPlatform?: string
  hasPushSubscription?: boolean
  /** `true` for the device making the current request (the API marks it). */
  isCurrent?: boolean
}

/**
 * Devices section — "This device" detail strip (OS / browser / network
 * via @molecule/app-device) plus the user's registered devices
 * (GET /api/devices). Mirrors the shared settings-panel
 * Devices/ThisDevice sections, themed with this app's ClassMap cards.
 */
function SettingsDevicesCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { deviceInfo, isOnline } = useDevice()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await http.get('/api/devices')
      setDevices(unpackListPayload(res) as Device[])
    } catch (_error) {
      // Devices endpoint is optional; the section renders empty when unavailable.
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    load()
  }, [load])

  // Revoke (sign out) a device: deleting the row server-side rejects that
  // device's session on its next request, so it is actually signed out — not
  // just hidden. Refetch on success so the list reflects the change. Errors
  // are best-effort — the row stays so the user can retry the revoke.
  const revoke = async (id: string) => {
    try {
      await http.delete(`/api/devices/${id}`)
      await load()
    } catch (_error) {
      // Keep the row so the user can retry the revoke.
    }
  }

  return (
    <section
      className={cm.cn(cm.sp('p', 6), cm.stack(6), 'bg-surface rounded-xl shadow-sm')}
      data-mol-id="section-devices"
      id="devices"
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mb', 2))}>
        <span className={cm.cn('material-symbols-outlined text-success')}>devices</span>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {t('settingsDevices.title', {}, { defaultValue: 'Devices' })}
        </h2>
      </div>

      {/* This device */}
      <div className={cm.stack(3)}>
        <h3
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'text-foreground-secondary uppercase tracking-wider',
          )}
        >
          {t('settingsDevices.thisDevice', {}, { defaultValue: 'This Device' })}
        </h3>
        <dl className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <dt className={cm.textMuted}>
              {t('settingsDevices.platform', {}, { defaultValue: 'Platform' })}
            </dt>
            <dd>
              {deviceInfo.os.name || t('settingsDevices.unknown', {}, { defaultValue: 'Unknown' })}
            </dd>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <dt className={cm.textMuted}>
              {t('settingsDevices.browser', {}, { defaultValue: 'Browser' })}
            </dt>
            <dd>
              {deviceInfo.browser.name ||
                t('settingsDevices.unknown', {}, { defaultValue: 'Unknown' })}
            </dd>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <dt className={cm.textMuted}>
              {t('settingsDevices.network', {}, { defaultValue: 'Network' })}
            </dt>
            <dd>
              {isOnline()
                ? t('settingsDevices.online', {}, { defaultValue: 'Online' })
                : t('settingsDevices.offline', {}, { defaultValue: 'Offline' })}
            </dd>
          </div>
        </dl>
      </div>

      {/* Registered devices */}
      <div className={cm.stack(3)}>
        <h3
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'text-foreground-secondary uppercase tracking-wider',
          )}
        >
          {t('settingsDevices.registeredDevices', {}, { defaultValue: 'Registered Devices' })}
        </h3>
        {devices.length > 0 ? (
          <ul className={cm.stack(2)}>
            {devices.map((device) => (
              <li key={device.id}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 3 }),
                    cm.textSize('sm'),
                    cm.sp('py', 1),
                  )}
                >
                  <span>
                    {device.name ||
                      t('settingsDevices.unnamedDevice', {}, { defaultValue: 'Device' })}
                    {device.isCurrent && (
                      <span className={cm.cn(cm.textSize('xs'), cm.textMuted, cm.sp('ml', 2))}>
                        {t('settingsDevices.thisDeviceLabel', {}, { defaultValue: 'This device' })}
                      </span>
                    )}
                  </span>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
                    {device.hasPushSubscription && (
                      <span className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
                        {t('settingsDevices.pushEnabled', {}, { defaultValue: 'Notifications on' })}
                      </span>
                    )}
                    {!device.isCurrent && (
                      <ConfirmButton
                        label={t('settingsDevices.signOut', {}, { defaultValue: 'Sign out' })}
                        confirmLabel={t(
                          'settingsDevices.signOutConfirm',
                          {},
                          { defaultValue: 'Confirm sign out?' },
                        )}
                        pendingLabel={t(
                          'settingsDevices.signingOut',
                          {},
                          { defaultValue: 'Signing out…' },
                        )}
                        onConfirm={() => revoke(device.id)}
                        disarmSeconds={6}
                        testId="device-revoke"
                      />
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          !loading && (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t('settingsDevices.noDevices', {}, { defaultValue: 'No other devices registered.' })}
            </p>
          )
        )}
      </div>
    </section>
  )
}

export default SettingsDevicesCard
export { SettingsDevicesCard }
