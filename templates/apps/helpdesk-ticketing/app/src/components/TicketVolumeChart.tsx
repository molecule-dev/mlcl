import { useMemo } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface VolumeTicket {
  status?: string
  created_at?: string
  updated_at?: string | null
}

interface TicketVolumeChartProps {
  tickets?: VolumeTicket[]
  loading?: boolean
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
type DayKey = (typeof DAY_KEYS)[number]

interface DayBucket {
  key: DayKey
  date: Date
  incoming: number
  resolved: number
}

function buildBuckets(tickets: VolumeTicket[]): DayBucket[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const buckets: DayBucket[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    buckets.push({ key: DAY_KEYS[d.getDay()], date: d, incoming: 0, resolved: 0 })
  }
  for (const tk of tickets) {
    if (tk.created_at) {
      const c = new Date(tk.created_at)
      c.setHours(0, 0, 0, 0)
      const slot = buckets.find((b) => b.date.getTime() === c.getTime())
      if (slot) slot.incoming += 1
    }
    const isResolved = tk.status === 'resolved' || tk.status === 'solved' || tk.status === 'closed'
    if (isResolved && tk.updated_at) {
      const u = new Date(tk.updated_at)
      u.setHours(0, 0, 0, 0)
      const slot = buckets.find((b) => b.date.getTime() === u.getTime())
      if (slot) slot.resolved += 1
    }
  }
  return buckets
}

function TicketVolumeChart({ tickets = [], loading = false }: TicketVolumeChartProps) {
  const { t } = useTranslation()
  const cm = getClassMap()

  const buckets = useMemo(() => buildBuckets(tickets), [tickets])
  const max = useMemo(
    () => Math.max(1, ...buckets.flatMap((b) => [b.incoming, b.resolved])),
    [buckets],
  )

  return (
    <section
      className={cm.cn(cm.sp('p', 8), 'bg-surface-container-lowest rounded-xl editorial-shadow')}
      data-mol-id="ticket-volume-chart"
    >
      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center', wrap: 'wrap', gap: 4 }),
          cm.sp('mb', 8),
        )}
      >
        <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
          {t('ticketVolumeChart.title', {}, { defaultValue: 'Ticket Volume' })}
        </h3>
        <div className={cm.flex({ align: 'center', wrap: 'wrap', gap: 4 })}>
          <div className={cm.flex({ align: 'center', gap: 2 })}>
            <div className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-primary')}></div>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'text-foreground-secondary',
              )}
            >
              {t('ticketVolumeChart.incoming', {}, { defaultValue: 'Incoming' })}
            </span>
          </div>
          <div className={cm.flex({ align: 'center', gap: 2 })}>
            <div
              className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-secondary-container')}
            ></div>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'text-foreground-secondary',
              )}
            >
              {t('status.resolved', {}, { defaultValue: 'Resolved' })}
            </span>
          </div>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.h(48),
          cm.flex({ align: 'end', justify: 'between', gap: 4 }),
          cm.sp('px', 2),
        )}
        data-mol-id="ticket-volume-bars"
      >
        {buckets.map((bucket, idx) => {
          const incomingPct = Math.round((bucket.incoming / max) * 100)
          const resolvedPct = Math.round((bucket.resolved / max) * 100)
          return (
            <div
              key={idx}
              className={cm.cn(cm.flex1, cm.flex({ direction: 'col', align: 'center', gap: 2 }))}
              data-mol-id="ticket-volume-bar"
              data-day={bucket.key}
              data-incoming={bucket.incoming}
              data-resolved={bucket.resolved}
            >
              <div
                className={cm.cn(
                  cm.w('full'),
                  cm.h(32),
                  'bg-surface-container-low rounded-t-lg relative overflow-hidden',
                )}
                title={t(
                  'ticketVolumeChart.barTooltip',
                  {
                    incoming: bucket.incoming,
                    resolved: bucket.resolved,
                  },
                  {
                    defaultValue: '{{incoming}} incoming · {{resolved}} resolved',
                  },
                )}
              >
                <div
                  className={cm.cn(cm.w('full'), 'absolute bottom-0 bg-primary')}
                  style={{ height: `${incomingPct}%` }}
                ></div>
                <div
                  className={cm.cn(cm.w('full'), 'absolute bottom-0 bg-secondary-container/60')}
                  style={{ height: `${resolvedPct}%` }}
                ></div>
              </div>
              <span
                className={cm.cn(cm.fontWeight('bold'), 'text-[10px] text-foreground-tertiary')}
              >
                {t(`common.${bucket.key}`, {}, { defaultValue: bucket.key.toUpperCase() })}
              </span>
            </div>
          )
        })}
      </div>
      {loading ? (
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('mt', 6),
            'text-on-surface-variant text-center',
          )}
          data-mol-id="ticket-volume-loading"
        >
          {t('common.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : null}
    </section>
  )
}

export default TicketVolumeChart
export { TicketVolumeChart }
