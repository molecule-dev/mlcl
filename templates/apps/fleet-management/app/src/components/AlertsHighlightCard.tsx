import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Alert {
  id: string
  vehicle_id: string
  vehicle_plate: string
  driver?: string
  type: string
  message: string
  severity: 'low' | 'medium' | 'high'
  created_at: string
}

interface AlertsHighlightCardProps {
  alerts: Alert[]
}

const SEVERITY_PILL: Record<Alert['severity'], string> = {
  low: 'bg-info-container text-on-info-container',
  medium: 'bg-warning-container text-on-warning-container',
  high: 'bg-error-container text-on-error-container',
}

/**
 * Gradient highlight card translated from crm's "AI Insight" pattern.
 * Uses the alert/warning palette instead of CRM's purple/blue.
 * Lists the top alerts inline with severity pills + per-alert link.
 */
export function AlertsHighlightCard({ alerts }: AlertsHighlightCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const top = alerts.slice(0, 3)

  return (
    <div
      className={'relative overflow-hidden rounded-2xl p-6 text-white shadow-xl shadow-error/10'}
      style={{
        background: 'linear-gradient(135deg, var(--color-danger) 0%, #f97316 100%)',
      }}
    >
      <div className="relative z-10">
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-90">
            {t('alertsHighlightCard.title', {}, { defaultValue: 'Active alerts' })}
          </p>
          <span
            className={
              'px-2 py-0.5 rounded-full text-[10px] font-black bg-surface/20 backdrop-blur-md tabular-nums'
            }
          >
            {alerts.length}
          </span>
        </div>

        {top.length === 0 ? (
          <div className={'mt-4'}>
            <p className={'text-lg font-bold'}>
              {t(
                'alertsHighlightCard.allClear',
                {},
                { defaultValue: 'All clear · no active alerts' },
              )}
            </p>
          </div>
        ) : (
          <ul className={'mt-4 space-y-2'}>
            {top.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/vehicles/${a.vehicle_id}`}
                  className={
                    'block bg-surface/15 backdrop-blur-md rounded-xl px-3 py-2 hover:bg-surface/25 transition-colors'
                  }
                >
                  <div className={'flex items-center gap-2'}>
                    <span className="text-[10px] font-mono opacity-80">{a.vehicle_plate}</span>
                    <span
                      className={cm.cn(
                        'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest',
                        SEVERITY_PILL[a.severity],
                      )}
                    >
                      {t(`alerts.severity.${a.severity}`, {}, { defaultValue: a.severity })}
                    </span>
                  </div>
                  <p className={'text-sm font-semibold mt-1 line-clamp-1'}>{a.message}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Link
          to="/alerts"
          className={
            'mt-5 inline-flex items-center gap-1 px-4 py-2 rounded-full text-xs font-bold bg-surface/20 backdrop-blur-md hover:bg-surface/30 transition-colors'
          }
        >
          {t('alertsHighlightCard.viewAll', {}, { defaultValue: 'View all alerts' })}
          <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
            arrow_forward
          </span>
        </Link>
      </div>

      <div
        className={'absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-surface/10 blur-3xl'}
        aria-hidden="true"
      />
      <div
        className={'absolute right-8 top-8 w-12 h-12 rounded-full bg-surface/15 blur-xl'}
        aria-hidden="true"
      />
    </div>
  )
}
