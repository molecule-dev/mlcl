import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Vehicle {
  id: string
  plate: string
  driver: string | null
  status: 'operational' | 'in_transit' | 'idle' | 'alert' | 'offline'
  location: string
  speed_mph: number
  fuel_pct?: number
}

interface VehicleActivityFeedProps {
  vehicles: Vehicle[]
}

const STATUS_TINT: Record<Vehicle['status'], { dot: string; pill: string; verb: string }> = {
  operational: { dot: 'bg-success', pill: 'bg-success/10 text-success', verb: 'operational' },
  in_transit: { dot: 'bg-info', pill: 'bg-info/10 text-info', verb: 'en route to' },
  idle: { dot: 'bg-warning', pill: 'bg-warning/10 text-warning', verb: 'idling at' },
  alert: { dot: 'bg-error', pill: 'bg-error/10 text-error', verb: 'flagged near' },
  offline: {
    dot: 'bg-on-surface-variant',
    pill: 'bg-on-surface-variant/10 text-on-surface-variant',
    verb: 'offline',
  },
}

/**
 * Editorial activity feed translated from crm's Recent Activities pattern:
 * - Avatar (driver initial) on a colored disk matching status tint
 * - Two-line entry: bold driver name + colored verb + bold location, then meta
 * - Subtle hover row tint, no card wrapper between rows (just row dividers)
 */
export function VehicleActivityFeed({ vehicles }: VehicleActivityFeedProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (vehicles.length === 0) {
    return (
      <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant text-sm')}>
        {t('vehicleActivityFeed.empty', {}, { defaultValue: 'No active vehicles right now.' })}
      </p>
    )
  }

  return (
    <ul className={'space-y-1'}>
      {vehicles.map((v) => {
        const tint = STATUS_TINT[v.status]
        const initial = (v.driver ?? v.plate).charAt(0).toUpperCase()
        return (
          <li key={v.id}>
            <Link
              to={`/vehicles/${v.id}`}
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
                <p className={'text-sm text-on-surface line-clamp-1'}>
                  <span className="font-bold">
                    {v.driver ??
                      t('vehicleActivityFeed.noDriver', {}, { defaultValue: 'No driver' })}
                  </span>{' '}
                  <span
                    className={cm.cn(
                      'font-medium',
                      tint.pill === STATUS_TINT.alert.pill
                        ? 'text-error'
                        : tint.pill === STATUS_TINT.idle.pill
                          ? 'text-warning'
                          : 'text-on-surface-variant',
                    )}
                  >
                    {t(`vehicleActivityFeed.verb.${v.status}`, {}, { defaultValue: tint.verb })}
                  </span>{' '}
                  <span className="font-bold">{v.location}</span>
                </p>
                <div className={'flex items-center gap-2 mt-1'}>
                  <span className="text-[10px] font-mono text-on-surface-variant">{v.plate}</span>
                  <span className="text-[10px] text-on-surface-variant">·</span>
                  <span className="text-[10px] font-mono text-on-surface-variant tabular-nums">
                    {v.speed_mph} mph
                  </span>
                  {typeof v.fuel_pct === 'number' && (
                    <>
                      <span className="text-[10px] text-on-surface-variant">·</span>
                      <span
                        className={cm.cn(
                          'text-[10px] font-mono tabular-nums',
                          v.fuel_pct < 25 ? 'text-error font-bold' : 'text-on-surface-variant',
                        )}
                      >
                        {t(
                          'vehicleActivityFeed.fuelPct',
                          { pct: v.fuel_pct },
                          { defaultValue: '{{pct}}% fuel' },
                        )}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <span
                className={cm.cn(
                  'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0',
                  tint.pill,
                )}
              >
                {t(`vehicles.status.${v.status}`, {}, { defaultValue: v.status.replace('_', ' ') })}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
