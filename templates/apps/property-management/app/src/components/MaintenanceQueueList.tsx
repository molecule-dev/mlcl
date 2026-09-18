import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Editorial list of recent open work-order tickets — left status
 * accent, priority pill, monospace unit number, hover lift. The
 * Hearthstone equivalent of a transaction-feed component.
 *
 * Translated from personal-finance/AccountRecentTransactions.tsx
 * and crm/ActivityFeed-style rows; priority palette from DESIGN.md
 * (high → error, medium → accent, low → secondary).
 */
export interface MaintenanceTicket {
  id: string
  title: string
  unit_number: string
  property_name: string
  priority: 'high' | 'medium' | 'low'
  status: 'open' | 'in_progress' | 'completed'
  submitted_at: string
}

const PRIORITY_STYLES: Record<
  MaintenanceTicket['priority'],
  { border: string; pill: string; icon: string }
> = {
  high: { border: 'border-l-red-500', pill: 'bg-error-light text-error', icon: 'priority_high' },
  medium: { border: 'border-l-amber-500', pill: 'bg-warning-light text-warning', icon: 'flag' },
  low: {
    border: 'border-l-slate-400',
    pill: 'bg-surface-secondary text-foreground',
    icon: 'low_priority',
  },
}

const STATUS_STYLES: Record<MaintenanceTicket['status'], { label: string; pill: string }> = {
  open: { label: 'Open', pill: 'bg-warning-container text-on-warning-container' },
  in_progress: { label: 'In Progress', pill: 'bg-info-container text-on-info-container' },
  completed: { label: 'Completed', pill: 'bg-success-light text-success' },
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function MaintenanceQueueList({
  tickets,
  viewAllHref = '/maintenance',
  emptyHint,
}: {
  tickets: ReadonlyArray<MaintenanceTicket>
  viewAllHref?: string
  emptyHint?: string
}) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section
      className={cm.cn(cm.sp('p', 8), 'bg-surface-container-lowest rounded-[2rem]')}
      data-mol-id="maintenance-queue-list"
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}>
        <div>
          <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('maintenanceQueueList.title', {}, { defaultValue: 'Maintenance Queue' })}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'maintenanceQueueList.subtitle',
              { count: tickets.length },
              { defaultValue: '{{count}} open work orders, ordered by priority' },
            )}
          </p>
        </div>
        <Link
          to={viewAllHref}
          className={cm.cn(cm.textSize('sm'), 'font-bold text-primary hover:underline')}
        >
          {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
        </Link>
      </div>

      {tickets.length === 0 ? (
        <p
          className={cm.cn(
            cm.sp('py', 12),
            cm.textCenter,
            cm.textSize('sm'),
            'text-on-surface-variant',
          )}
        >
          {emptyHint ??
            t('maintenanceQueueList.empty', {}, { defaultValue: 'No open maintenance requests.' })}
        </p>
      ) : (
        <ul className={cm.stack(3)}>
          {tickets.map((ticket) => {
            const p = PRIORITY_STYLES[ticket.priority]
            const s = STATUS_STYLES[ticket.status]
            return (
              <li key={ticket.id}>
                <Link
                  to={`/maintenance/${ticket.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                    cm.sp('p', 4),
                    `bg-surface-container-low rounded-xl border-l-4 ${p.border} hover:-translate-y-0.5 hover:shadow-md transition-all`,
                  )}
                >
                  <div
                    className={cm.cn(cm.flex({ align: 'start', gap: 'md' }), cm.flex1, 'min-w-0')}
                  >
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.w(10),
                        cm.h(10),
                        'rounded-lg shrink-0',
                        p.pill,
                      )}
                      aria-hidden="true"
                    >
                      <span className="material-symbols-outlined">{p.icon}</span>
                    </span>
                    <div className={cm.cn('min-w-0', cm.flex1)}>
                      <p
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('bold'),
                          'text-on-surface line-clamp-1',
                        )}
                      >
                        {ticket.title}
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(
                          'maintenanceQueueList.meta',
                          {
                            property: ticket.property_name,
                            unit: ticket.unit_number,
                            date: fmtDate(ticket.submitted_at),
                          },
                          { defaultValue: '{{property}} · Unit {{unit}} · {{date}}' },
                        )}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.roundedFull,
                      'text-[10px] font-black uppercase tracking-widest shrink-0',
                      s.pill,
                    )}
                  >
                    {t(
                      `maintenanceQueueList.status.${ticket.status}`,
                      {},
                      { defaultValue: s.label },
                    )}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default MaintenanceQueueList
