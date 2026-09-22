import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface DeviceWattageItem {
  id: string
  name: string
  /** Free-form device kind — drives the icon. */
  type: 'hvac' | 'lighting' | 'kitchen' | 'ev' | 'pool' | 'solar' | 'battery' | 'meter' | string
  /** Optional location/circuit (e.g. "Garage"). */
  location?: string | null
  /** Online/offline state of the meter. */
  status: 'online' | 'offline' | 'alert' | string
  /** Live wattage. Negative = producing/exporting. */
  watts: number
  /** Today's kWh through this circuit. */
  todayKwh?: number | null
  /** Last activity timestamp (ISO). */
  updatedAt?: string | null
}

interface DeviceWattageRowProps {
  device: DeviceWattageItem
}

const TYPE_ICON: Record<string, string> = {
  hvac: 'mode_fan',
  lighting: 'lightbulb',
  kitchen: 'kitchen',
  ev: 'ev_station',
  pool: 'pool',
  solar: 'solar_power',
  battery: 'battery_charging_full',
  meter: 'electric_meter',
  default: 'bolt',
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
 * Editorial circuit-row — circular tinted icon chip, name + status pill,
 * trailing live wattage in mono. Status pill colour keys off
 * online/offline/alert state and the wattage flips sign for solar/export.
 *
 * Translated from smart-home-dashboard's DeviceStatusRow + personal-finance's
 * ActivityRow — circular icon chip, headline, status badge, trailing
 * tabular value. Reshaped to render kWh + relative time inline.
 */
export function DeviceWattageRow({ device }: DeviceWattageRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const icon = TYPE_ICON[device.type] || TYPE_ICON.default
  const isProducing = device.watts < 0
  const tone =
    device.status === 'alert'
      ? 'bg-error-container text-on-error-container'
      : device.status === 'offline'
        ? 'bg-surface-container text-on-surface-variant'
        : isProducing
          ? 'bg-warning-container text-on-warning-container'
          : 'bg-success-container text-on-success-container'
  const valueClass = isProducing ? 'text-warning' : 'text-on-surface'

  return (
    <Link
      to={`/devices/${device.id}`}
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
        cm.sp('p', 4),
        'bg-surface-container-lowest hover:bg-surface-container-low rounded-2xl transition-all group',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'min-w-0 flex-1')}>
        <div
          className={cm.cn(
            cm.w(12),
            cm.h(12),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            isProducing
              ? 'bg-warning/10 text-warning'
              : device.status === 'online'
                ? 'bg-primary/10 text-primary'
                : 'bg-surface-container text-on-surface-variant',
            'transition-colors shrink-0',
          )}
          aria-hidden="true"
        >
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div className={cm.cn('min-w-0')}>
          <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'truncate')}>
            {device.name}
          </p>
          <div
            className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'mt-0.5 min-w-0 flex-wrap')}
          >
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.roundedFull,
                cm.fontWeight('bold'),
                'text-[10px] py-0.5 uppercase tracking-widest shrink-0',
                tone,
              )}
            >
              {t(
                `deviceWattageRow.status.${isProducing ? 'producing' : device.status}`,
                {},
                { defaultValue: isProducing ? 'producing' : device.status },
              )}
            </span>
            <span
              className={cm.cn(
                cm.fontWeight('medium'),
                'text-[10px] text-on-surface-variant truncate',
              )}
            >
              {t(
                'deviceWattageRow.locationTime',
                {
                  location:
                    device.location || t('status.unassigned', {}, { defaultValue: 'Unassigned' }),
                  time: relativeTime(device.updatedAt),
                },
                { defaultValue: '{{location}} · {{time}}' },
              )}
            </span>
          </div>
        </div>
      </div>
      <div className={cm.cn(cm.flex({ direction: 'col', align: 'end' }), 'shrink-0 text-right')}>
        <span
          className={cm.cn(cm.fontWeight('bold'), 'font-mono tabular-nums text-base', valueClass)}
        >
          {t(
            'deviceWattageRow.watts',
            { watts: Math.abs(device.watts).toLocaleString() },
            { defaultValue: '{{watts}} W' },
          )}
        </span>
        {device.todayKwh != null ? (
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
            {t(
              'deviceWattageRow.todayKwh',
              { kwh: device.todayKwh.toFixed(1) },
              { defaultValue: '{{kwh}} kWh today' },
            )}
          </span>
        ) : null}
      </div>
    </Link>
  )
}
