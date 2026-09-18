import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SignalStrength } from './DeviceKpiCard.js'

export interface FleetDevice {
  id: string
  name: string
  device_type: string
  serial_number?: string
  firmware_version?: string
  status: 'online' | 'warning' | 'critical' | 'offline'
  last_seen?: string | null
  signal?: 0 | 1 | 2 | 3 | 4
  metric_value?: number
  metric_unit?: string
}

interface DeviceActivityFeedProps {
  devices: FleetDevice[]
}

const STATUS_TINT: Record<FleetDevice['status'], { dot: string; pill: string; verb: string }> = {
  online: { dot: 'bg-success', pill: 'bg-success/10 text-success', verb: 'streaming from' },
  warning: { dot: 'bg-warning', pill: 'bg-warning/10 text-warning', verb: 'flapping at' },
  critical: { dot: 'bg-error', pill: 'bg-error/10 text-error', verb: 'critical at' },
  offline: {
    dot: 'bg-on-surface-variant',
    pill: 'bg-on-surface-variant/10 text-on-surface-variant',
    verb: 'last seen',
  },
}

/**
 * Editorial activity feed translated from fleet-management's
 * VehicleActivityFeed.tsx — colored device-type avatar, two-line entry
 * with bold device name + colored verb + bold serial/site, mono meta
 * line with firmware, signal bars, last metric.
 */
export function DeviceActivityFeed({ devices }: DeviceActivityFeedProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (devices.length === 0) {
    return (
      <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant text-sm')}>
        {t('deviceActivityFeed.empty', {}, { defaultValue: 'No active devices right now.' })}
      </p>
    )
  }

  return (
    <ul className={cm.cn('space-y-1')}>
      {devices.map((d) => {
        const tint = STATUS_TINT[d.status]
        const initial = d.name.charAt(0).toUpperCase()
        return (
          <li key={d.id}>
            <Link
              to={`/devices/${d.id}`}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl hover:bg-surface-container-low transition-colors',
              )}
            >
              <div
                className={cm.cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0',
                  tint.dot,
                )}
                aria-hidden="true"
              >
                {initial}
              </div>
              <div className={cm.cn(cm.flex1, 'min-w-0')}>
                <p className={cm.cn('text-sm text-on-surface line-clamp-1')}>
                  <span className={cm.cn('font-bold')}>{d.name}</span>{' '}
                  <span
                    className={cm.cn(
                      'font-medium',
                      d.status === 'critical'
                        ? 'text-error'
                        : d.status === 'warning'
                          ? 'text-warning'
                          : 'text-on-surface-variant',
                    )}
                  >
                    {t(`deviceActivityFeed.verb.${d.status}`, {}, { defaultValue: tint.verb })}
                  </span>{' '}
                  <span className={cm.cn('font-bold font-mono text-primary')}>
                    {d.serial_number ?? d.id.slice(0, 8)}
                  </span>
                </p>
                <div className={cm.cn('flex items-center gap-2 mt-1')}>
                  {d.firmware_version && (
                    <>
                      <span className={cm.cn('text-[10px] font-mono text-on-surface-variant')}>
                        v{d.firmware_version}
                      </span>
                      <span className={cm.cn('text-[10px] text-on-surface-variant')}>·</span>
                    </>
                  )}
                  {typeof d.metric_value === 'number' && (
                    <>
                      <span
                        className={cm.cn(
                          'text-[10px] font-mono text-on-surface-variant tabular-nums',
                        )}
                      >
                        {d.metric_value}
                        {d.metric_unit ? ` ${d.metric_unit}` : ''}
                      </span>
                      <span className={cm.cn('text-[10px] text-on-surface-variant')}>·</span>
                    </>
                  )}
                  <SignalStrength bars={d.signal ?? 3} color="#0891b2" dim="#cbd5e1" />
                </div>
              </div>
              <span
                className={cm.cn(
                  'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0',
                  tint.pill,
                )}
              >
                {t(`devices.status.${d.status}`, {}, { defaultValue: d.status })}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
