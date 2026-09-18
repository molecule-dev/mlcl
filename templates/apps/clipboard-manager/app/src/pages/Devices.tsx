import { useCallback } from 'react'

import { t } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ACCENT_COLOR } from '../branding.js'
import { PageHeader } from '../components/PageHeader.js'
import { useFetchList } from '../lib/use-fetch.js'

interface ApiDeviceRow {
  id: string
  userId: string
  name: string | null
  pushPlatform: string | null
  hasPushSubscription: boolean | null
  isCurrent?: boolean
  createdAt: string
  updatedAt: string
}

interface DeviceItem {
  id: string
  name: string
  os: string
  icon: string
  lastActive: string
  status: 'online' | 'offline' | 'syncing'
  current: boolean
}

const STATUS_TINT: Record<DeviceItem['status'], { bg: string; fg: string; label: string }> = {
  online: {
    bg: 'var(--color-device-online-bg)',
    fg: 'var(--color-device-online-fg)',
    label: 'Online',
  },
  syncing: {
    bg: 'var(--color-device-syncing-bg)',
    fg: 'var(--color-device-syncing-fg)',
    label: 'Syncing',
  },
  offline: {
    bg: 'var(--color-device-offline-bg)',
    fg: 'var(--color-device-offline-fg)',
    label: 'Offline',
  },
}

function adapt(row: ApiDeviceRow): DeviceItem {
  const updated = new Date(row.updatedAt).getTime()
  const ageMin = Math.max(0, (Date.now() - updated) / 60000)
  const status: DeviceItem['status'] = ageMin < 5 ? 'online' : ageMin < 60 ? 'syncing' : 'offline'
  const lastActive = row.isCurrent
    ? t('time.activeNow', {}, { defaultValue: 'Active now' })
    : ageMin < 1
      ? t('time.justNow', {}, { defaultValue: 'Just now' })
      : ageMin < 60
        ? t(
            'devices.syncedMinutesAgo',
            { count: Math.round(ageMin) },
            { defaultValue: 'Synced {{count}}m ago' },
          )
        : ageMin < 1440
          ? t(
              'devices.syncedHoursAgo',
              { count: Math.round(ageMin / 60) },
              { defaultValue: 'Synced {{count}}h ago' },
            )
          : t(
              'devices.lastSeen',
              { date: new Date(row.updatedAt).toLocaleDateString() },
              { defaultValue: 'Last seen {{date}}' },
            )

  const platform = (row.pushPlatform || '').toLowerCase()
  const icon =
    platform.includes('ios') || platform.includes('iphone')
      ? 'smartphone'
      : platform.includes('android')
        ? 'phone_android'
        : platform.includes('windows')
          ? 'desktop_windows'
          : platform.includes('mac')
            ? 'laptop_mac'
            : 'web'

  return {
    id: row.id,
    name: row.name || t('devices.unknownDevice', {}, { defaultValue: 'Unknown device' }),
    os: row.pushPlatform || 'Web',
    icon,
    lastActive,
    status,
    current: !!row.isCurrent,
  }
}

export function Devices() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const adaptCb = useCallback(adapt, [])
  const devices = useFetchList<ApiDeviceRow, DeviceItem>('/api/devices', adaptCb)

  const handleRevoke = useCallback(
    async (id: string) => {
      try {
        await http.delete(`/api/devices/${id}`)
        await devices.refetch()
      } catch (_error) {
        /* error swallowed - user retried list */
      }
    },
    [http, devices],
  )

  const total = devices.data.length

  return (
    <div className={cm.cn(cm.sp('p', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-8')}>
      <PageHeader
        eyebrow={t('devices.eyebrow', {}, { defaultValue: 'Sync' })}
        heading={t('devices.heading', {}, { defaultValue: 'Connected devices' })}
        description={t(
          'devices.description',
          {},
          {
            defaultValue:
              'Every device signed into your account, with sync status and last activity. Sign out a device to revoke its session.',
          },
        )}
      />

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'md' }),
          cm.sp('p', 4),
          'rounded-xl bg-surface-container-low border border-outline-variant/40',
        )}
      >
        <span
          aria-hidden="true"
          className={cm.cn('material-symbols-outlined text-2xl')}
          style={{ color: ACCENT_COLOR }}
        >
          cloud_done
        </span>
        <div className={cm.cn('flex-1')}>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
            {t('devices.statusHeading', {}, { defaultValue: 'Sync status' })}
          </p>
          <p
            className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
            data-mol-id="devices-summary"
          >
            {t(
              'devices.statusBody',
              { count: total },
              {
                defaultValue: '{{count}} active device(s)',
              },
            )}
          </p>
        </div>
      </div>

      {devices.loading && devices.data.length === 0 && (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('devices.loading', {}, { defaultValue: 'Loading devices…' })}
        </p>
      )}

      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))} data-mol-id="devices-list">
        {devices.data.map((device) => {
          const tint = STATUS_TINT[device.status]
          return (
            <div
              key={device.id}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md' }),
                cm.sp('p', 4),
                'rounded-xl bg-surface-container-lowest border border-outline-variant/40 hover:border-primary/40 transition-colors',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn(
                  'material-symbols-outlined text-3xl text-on-surface-variant flex-shrink-0',
                )}
              >
                {device.icon}
              </span>
              <div className={cm.cn('flex-1 min-w-0')}>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-on-surface truncate',
                    )}
                  >
                    {device.name}
                  </p>
                  {device.current && (
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        cm.sp('px', 2),
                        'rounded-full uppercase tracking-widest font-mono',
                      )}
                      style={{
                        backgroundColor: 'var(--color-primary-fixed)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      {t('devices.thisDevice', {}, { defaultValue: 'This device' })}
                    </span>
                  )}
                </div>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant font-mono mt-0.5')}>
                  {device.os}
                </p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant mt-1')}>
                  {device.lastActive}
                </p>
              </div>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-shrink-0')}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    'rounded-full uppercase tracking-widest font-mono',
                  )}
                  style={{ backgroundColor: tint.bg, color: tint.fg }}
                >
                  {t(`devices.status.${device.status}`, {}, { defaultValue: tint.label })}
                </span>
                {!device.current && (
                  <button
                    onClick={() => handleRevoke(device.id)}
                    type="button"
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      'rounded-md text-error hover:bg-error-container/30 transition-colors',
                    )}
                  >
                    {t('devices.revoke', {}, { defaultValue: 'Sign out' })}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Devices
export { Devices as DevicesPage }
