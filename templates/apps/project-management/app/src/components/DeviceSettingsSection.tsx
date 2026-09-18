import { useCallback, useEffect, useRef, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Device {
  id: string
  name?: string
  platform?: string
  lastSeen?: string
  updatedAt?: string
  createdAt?: string
  // `true` for the device making the current request (the API marks it).
  isCurrent?: boolean
}

export default function DeviceSettingsSection() {
  const cm = getClassMap()
  const http = useHttpClient()
  const { t } = useTranslation()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  // Store http in a ref so the loader always uses the latest client without
  // re-running on every render (useHttpClient() may return a new reference each
  // render, which would otherwise cause an infinite GET loop).
  const httpRef = useRef(http)
  httpRef.current = http

  const load = useCallback(async () => {
    try {
      const res = await httpRef.current.get<{ data: Device[] }>('/api/devices')
      const body = res.data as unknown as { data?: Device[] } | Device[]
      const list = Array.isArray(body) ? body : (body?.data ?? [])
      setDevices(list)
    } catch (_error) {
      // Devices endpoint is optional; the section renders an empty state when unavailable.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Revoke (sign out) a device by deleting its row. The API's authorization
  // layer enforces server-side revocation, so the removed device is actually
  // signed out — not just hidden. Refetch the list on success.
  const revoke = async (id: string) => {
    setRevokingId(id)
    try {
      await httpRef.current.delete(`/api/devices/${id}`)
      setConfirmingId(null)
      await load()
    } catch (_error) {
      // Best-effort — keep the row so the user can retry the revoke.
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <section
      className={cm.cn(cm.sp('p', 10), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
      data-testid="device-settings"
    >
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xl' }), 'md:flex-row')}>
        <div className={cm.cn(cm.w('full'), cm.stack(2), 'md:w-1/3')}>
          <h3
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'text-on-background tracking-tight',
            )}
          >
            {t('settings.devices', {}, { defaultValue: 'Devices' })}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'deviceSettings.description',
              {},
              { defaultValue: 'Devices currently signed in to your account.' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.w('full'), cm.stack(2), 'md:w-2/3')}>
          {loading ? (
            <p
              className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
              role="status"
              data-testid="device-loading"
            >
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : devices.length > 0 ? (
            <ul className={cm.stack(2)}>
              {devices.map((device) => (
                <li
                  key={device.id}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'rounded-xl bg-surface-container-low',
                  )}
                >
                  <div
                    className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }))}
                  >
                    <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                      <span
                        className={cm.cn(
                          cm.textSize('xl'),
                          'material-symbols-outlined text-on-surface-variant',
                        )}
                      >
                        devices
                      </span>
                      <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-background')}>
                        {device.name ||
                          device.platform ||
                          t('deviceSettings.unknownDevice', {}, { defaultValue: 'Unknown device' })}
                      </span>
                      {device.isCurrent && (
                        <span
                          className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
                          data-testid="device-current"
                        >
                          {t('settings.thisDevice', {}, { defaultValue: 'This device' })}
                        </span>
                      )}
                    </span>
                    <span className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
                      {device.platform && (
                        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {device.platform}
                        </span>
                      )}
                      {!device.isCurrent &&
                        (confirmingId === device.id ? (
                          <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                            <button
                              type="button"
                              data-testid="device-revoke-cancel"
                              disabled={revokingId === device.id}
                              onClick={() => setConfirmingId(null)}
                              className={cm.cn(
                                cm.sp('px', 4),
                                cm.sp('py', 1.5),
                                cm.textSize('sm'),
                                cm.fontWeight('semibold'),
                                'rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50',
                              )}
                            >
                              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                            </button>
                            <button
                              type="button"
                              data-mol-id="device-revoke-confirm"
                              data-testid="device-revoke-confirm"
                              disabled={revokingId === device.id}
                              onClick={() => revoke(device.id)}
                              className={cm.cn(
                                cm.sp('px', 4),
                                cm.sp('py', 1.5),
                                cm.textSize('sm'),
                                cm.fontWeight('semibold'),
                                'rounded-lg bg-error text-on-error hover:bg-error/90 transition-colors disabled:opacity-50',
                              )}
                            >
                              {revokingId === device.id
                                ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
                                : t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            data-mol-id="device-revoke"
                            data-testid="device-revoke"
                            onClick={() => setConfirmingId(device.id)}
                            className={cm.cn(
                              cm.sp('px', 4),
                              cm.sp('py', 1.5),
                              cm.textSize('sm'),
                              cm.fontWeight('semibold'),
                              'rounded-lg text-error hover:bg-error-container/40 transition-colors',
                            )}
                          >
                            {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                          </button>
                        ))}
                    </span>
                  </div>
                  {confirmingId === device.id && !device.isCurrent && (
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.sp('mt', 2),
                        'text-on-surface-variant',
                      )}
                      data-testid="device-revoke-warning"
                    >
                      {t(
                        'settings.revokeDeviceWarning',
                        {},
                        {
                          defaultValue:
                            "This device's access will be revoked shortly. Sign it out?",
                        },
                      )}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p
              className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
              data-testid="device-empty"
            >
              {t('settings.noDevices', {}, { defaultValue: 'No devices found.' })}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
export { DeviceSettingsSection }
