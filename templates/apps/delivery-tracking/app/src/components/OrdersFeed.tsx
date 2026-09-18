import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Shipment {
  id: string
  tracking_number: string
  carrier: string
  status: 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception'
  origin_city: string
  origin_state: string
  destination_city: string
  destination_state: string
  customer: string
  service_level: string
  eta: string
  shipped_at: string
}

interface OrdersFeedProps {
  shipments: Shipment[]
}

const STATUS_TINT: Record<Shipment['status'], { dot: string; pill: string; verb: string }> = {
  pending: {
    dot: 'bg-indigo-500',
    pill: 'bg-indigo-500/10 text-indigo-600',
    verb: 'queued for pickup',
  },
  in_transit: { dot: 'bg-cyan-500', pill: 'bg-cyan-500/10 text-cyan-600', verb: 'en route to' },
  out_for_delivery: {
    dot: 'bg-cyan-400',
    pill: 'bg-cyan-400/10 text-cyan-500',
    verb: 'out for delivery to',
  },
  delivered: {
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-500/10 text-success',
    verb: 'delivered to',
  },
  exception: { dot: 'bg-red-500', pill: 'bg-red-500/10 text-error', verb: 'exception held at' },
}

function fmtEta(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay)
    return `Today, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  if (d.toDateString() === tomorrow.toDateString())
    return `Tomorrow, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Editorial shipment activity feed translated from crm/fleet's
 * VehicleActivityFeed pattern. Avatar disk shows carrier initial,
 * editorial 2-line entry: bold customer + colored verb + bold destination,
 * meta strip with mono tracking number, service level, ETA.
 */
export function OrdersFeed({ shipments }: OrdersFeedProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (shipments.length === 0) {
    return (
      <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant text-sm')}>
        {t('ordersFeed.empty', {}, { defaultValue: 'No active shipments right now.' })}
      </p>
    )
  }

  return (
    <ul className={'space-y-1'}>
      {shipments.map((s) => {
        const tint = STATUS_TINT[s.status]
        const initial = (s.carrier ?? s.customer).charAt(0).toUpperCase()
        return (
          <li key={s.id}>
            <Link
              to={`/shipments/${s.id}`}
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
                  <span className="font-bold">{s.customer}</span>{' '}
                  <span
                    className={cm.cn(
                      'font-medium',
                      s.status === 'exception' ? 'text-error' : 'text-on-surface-variant',
                    )}
                  >
                    {tint.verb}
                  </span>{' '}
                  <span className="font-bold">
                    {s.destination_city}, {s.destination_state}
                  </span>
                </p>
                <div className={'flex items-center gap-2 mt-1 flex-wrap'}>
                  <span className="text-[10px] font-mono text-primary tabular-nums">
                    {s.tracking_number}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">·</span>
                  <span className="text-[10px] font-mono text-on-surface-variant">{s.carrier}</span>
                  <span className="text-[10px] text-on-surface-variant">·</span>
                  <span className="text-[10px] text-on-surface-variant">{s.service_level}</span>
                  {s.status !== 'delivered' && s.status !== 'exception' && (
                    <>
                      <span className="text-[10px] text-on-surface-variant">·</span>
                      <span className="text-[10px] text-on-surface-variant tabular-nums">
                        {t(
                          'ordersFeed.etaLabel',
                          { eta: fmtEta(s.eta) },
                          { defaultValue: 'ETA {{eta}}' },
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
                {s.status.replace(/_/g, ' ')}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
