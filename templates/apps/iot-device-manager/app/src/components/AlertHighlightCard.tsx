import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface FleetAlert {
  id: string
  device_id: string
  device_name: string
  type: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  created_at: string
}

interface AlertHighlightCardProps {
  alerts: FleetAlert[]
}

const SEVERITY_PILL: Record<FleetAlert['severity'], string> = {
  info: 'bg-info-container text-on-info-container',
  warning: 'bg-warning-container text-on-warning-container',
  critical: 'bg-error-container text-on-error-container',
}

/**
 * Gradient highlight card translated from fleet-management's
 * AlertsHighlightCard.tsx — IoT amber→red gradient, frosted-glass alert
 * tiles, link to /alerts page. Used in the Dashboard right rail.
 */
export function AlertHighlightCard({ alerts }: AlertHighlightCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const top = alerts.slice(0, 3)

  return (
    <div
      className={cm.cn(
        'relative overflow-hidden rounded-2xl p-6 text-white shadow-xl shadow-error/10',
      )}
      style={{
        background: 'linear-gradient(135deg, var(--color-danger) 0%, var(--color-warning) 100%)',
      }}
    >
      <div className={cm.cn('relative z-10')}>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <p className={cm.cn('text-[10px] font-bold uppercase tracking-widest opacity-90')}>
            {t('alertHighlightCard.title', {}, { defaultValue: 'Active alerts' })}
          </p>
          <span
            className={cm.cn(
              'px-2 py-0.5 rounded-full text-[10px] font-black bg-surface/20 backdrop-blur-md tabular-nums font-mono',
            )}
          >
            {alerts.length}
          </span>
        </div>

        {top.length === 0 ? (
          <div className={cm.cn('mt-4')}>
            <p className={cm.cn('text-lg font-bold')}>
              {t(
                'alertHighlightCard.allClear',
                {},
                { defaultValue: 'All systems nominal · no active alerts' },
              )}
            </p>
          </div>
        ) : (
          <ul className={cm.cn('mt-4 space-y-2')}>
            {top.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/devices/${a.device_id}`}
                  className={cm.cn(
                    'block bg-surface/15 backdrop-blur-md rounded-xl px-3 py-2 hover:bg-surface/25 transition-colors',
                  )}
                >
                  <div className={cm.cn('flex items-center gap-2')}>
                    <span className={cm.cn('text-[10px] font-mono opacity-80')}>
                      {a.device_name}
                    </span>
                    <span
                      className={cm.cn(
                        'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest',
                        SEVERITY_PILL[a.severity],
                      )}
                    >
                      {t(`alerts.filter.${a.severity}`, {}, { defaultValue: a.severity })}
                    </span>
                  </div>
                  <p className={cm.cn('text-sm font-semibold mt-1 line-clamp-1')}>{a.message}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Link
          to="/alerts"
          className={cm.cn(
            'mt-5 inline-flex items-center gap-1 px-4 py-2 rounded-full text-xs font-bold bg-surface/20 backdrop-blur-md hover:bg-surface/30 transition-colors',
          )}
        >
          {t('alertHighlightCard.viewAll', {}, { defaultValue: 'View all alerts' })}
          <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
            arrow_forward
          </span>
        </Link>
      </div>

      <div
        className={cm.cn(
          'absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-surface/10 blur-3xl pointer-events-none',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn('absolute right-8 top-8 w-12 h-12 rounded-full bg-surface/15 blur-xl')}
        aria-hidden="true"
      />
    </div>
  )
}
