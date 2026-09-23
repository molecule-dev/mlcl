import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface DeviceListItem {
  id: string
  name: string
  type: 'light' | 'thermostat' | 'lock' | 'sensor' | 'switch' | 'camera' | string
  room: string | null
  status: 'online' | 'offline' | 'alert' | string
  is_on: boolean
  /** Latest power draw in watts (optional). */
  watts?: number | null
  /** Last activity timestamp (ISO). */
  updated_at?: string | null
}

interface DeviceStatusRowProps {
  device: DeviceListItem
  /** Optional toggle handler — when omitted, the row is read-only. */
  onToggle?: (id: string) => void
}

const TYPE_ICON: Record<string, string> = {
  light: 'light',
  thermostat: 'thermostat',
  lock: 'lock',
  sensor: 'sensors',
  switch: 'toggle_on',
  camera: 'videocam',
  default: 'memory',
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso).getTime()
  if (Number.isNaN(d)) return ''
  const diff = Math.max(0, Date.now() - d)
  const s = Math.round(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.round(h / 24)
  return `${days}d ago`
}

/**
 * Editorial device-row — circular tinted icon chip, name + status pill,
 * trailing live wattage. Pill colour keys off online/offline/alert state
 * (DESIGN.md "Status through colour" principle).
 *
 * Translated from personal-finance's ActivityRow + crm's ActivityFeed
 * editorial-row pattern. Click navigates to /devices/:id; an optional
 * `onToggle` can also be wired to the trailing pill.
 */
export function DeviceStatusRow({ device, onToggle }: DeviceStatusRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const icon = TYPE_ICON[device.type] || TYPE_ICON.default
  const statusTone =
    device.status === 'online'
      ? 'bg-success-container text-on-success-container'
      : device.status === 'alert'
        ? 'bg-error-container text-on-error-container'
        : 'bg-surface-container text-on-surface-variant'

  return (
    <Link
      to={`/devices/${device.id}`}
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('p', 4),
        'bg-surface-container-lowest hover:bg-surface-container-low rounded-2xl transition-all group',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
        <div
          className={cm.cn(
            cm.w(12),
            cm.h(12),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            device.is_on
              ? 'bg-primary/10 text-primary'
              : 'bg-surface-container text-on-surface-variant',
            'transition-colors',
          )}
          aria-hidden="true"
        >
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div>
          <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>{device.name}</p>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'mt-0.5')}>
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.roundedFull,
                cm.fontWeight('bold'),
                'text-[10px] py-0.5 uppercase tracking-widest',
                statusTone,
              )}
            >
              {t(`deviceStatusRow.status.${device.status}`, {}, { defaultValue: device.status })}
            </span>
            <span className={cm.cn(cm.fontWeight('medium'), 'text-[10px] text-on-surface-variant')}>
              {t(
                'deviceStatusRow.roomTime',
                {
                  room:
                    device.room ||
                    t('deviceStatusRow.unassigned', {}, { defaultValue: 'Unassigned' }),
                  time: relativeTime(device.updated_at),
                },
                { defaultValue: '{{room}} · {{time}}' },
              )}
            </span>
          </div>
        </div>
      </div>
      {onToggle ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            onToggle(device.id)
          }}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.roundedFull,
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            device.is_on
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
            'min-h-[36px] uppercase tracking-widest transition-all',
          )}
          aria-pressed={device.is_on}
          aria-label={`${device.is_on ? t('deviceStatusRow.turnOff', {}, { defaultValue: 'Turn off' }) : t('deviceStatusRow.turnOn', {}, { defaultValue: 'Turn on' })} ${device.name}`}
        >
          {device.is_on
            ? t('deviceStatusRow.on', {}, { defaultValue: 'On' })
            : t('status.off', {}, { defaultValue: 'Off' })}
        </button>
      ) : (
        <span
          className={cm.cn(cm.fontWeight('bold'), 'font-mono tabular-nums text-on-surface text-sm')}
        >
          {device.watts != null
            ? t('deviceStatusRow.watts', { watts: device.watts }, { defaultValue: '{{watts}} W' })
            : ''}
        </span>
      )}
    </Link>
  )
}
