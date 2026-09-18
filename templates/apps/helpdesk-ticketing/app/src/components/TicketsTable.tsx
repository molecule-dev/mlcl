import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import TicketsTableHeader from './TicketsTableHeader.js'

interface Ticket {
  id: string
  subject: string
  status: string
  priority: string
  category?: string | null
  created_at: string
  updated_at?: string
  requester_name?: string
  assignee_name?: string
  assignee_avatar?: string
  sla?: string
}

type TranslateFn = (
  key: string,
  values?: Record<string, string | number | boolean>,
  options?: { defaultValue?: string },
) => string

function timeAgo(dateStr: string, t: TranslateFn): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return t('common.justNow', {}, { defaultValue: 'just now' })
  if (m < 60)
    return t('common.timeAgo.minutes', { minutes: m }, { defaultValue: '{{minutes}}m ago' })
  const h = Math.floor(m / 60)
  if (h < 24) return t('common.timeAgo.hours', { hours: h }, { defaultValue: '{{hours}}h ago' })
  return t('common.timeAgo.days', { days: Math.floor(h / 24) }, { defaultValue: '{{days}}d ago' })
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'w-2.5 h-2.5 rounded-full bg-error inline-block ring-4 ring-error-container/30',
  high: 'w-2.5 h-2.5 rounded-full bg-error inline-block',
  medium: 'w-2.5 h-2.5 rounded-full bg-primary inline-block',
  low: 'w-2.5 h-2.5 rounded-full bg-outline-variant inline-block',
}

const STATUS_BADGE: Record<string, string> = {
  open: 'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-primary-fixed text-on-primary-fixed',
  pending:
    'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-surface-container-highest text-on-surface-variant',
  on_hold:
    'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-primary-fixed/25 text-primary',
  resolved:
    'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-tertiary-container text-on-tertiary-container',
  closed:
    'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-surface-container-highest text-on-surface-variant',
}

interface TicketsTableProps {
  tickets: Ticket[]
  loading: boolean
  onRowClick?: (ticket: Ticket) => void
}

function TicketsTable({ tickets, loading, onRowClick }: TicketsTableProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  return (
    <div
      className={cm.cn('bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden')}
      data-mol-id="ticket-table"
    >
      <table className={cm.cn(cm.w('full'), 'text-left border-collapse')}>
        <TicketsTableHeader />
        <tbody className={cm.cn('divide-y divide-surface-container-low')}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} aria-hidden="true">
                  <td colSpan={8} className={cm.cn(cm.sp('px', 6), cm.sp('py', 5))}>
                    <div
                      className={cm.cn(cm.h(4), 'rounded bg-surface-container-high animate-pulse')}
                    />
                  </td>
                </tr>
              ))
            : tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className={cm.cn(
                    cm.cursorPointer,
                    'hover:bg-primary-fixed/20 transition-colors group',
                  )}
                  onClick={() => onRowClick?.(ticket)}
                >
                  <td className={cm.cn(cm.sp('px', 6), cm.sp('py', 5))}>
                    <input
                      className={cm.cn('rounded', cm.textPrimary)}
                      type="checkbox"
                      aria-label={t(
                        'ticketsTable.selectRow',
                        { id: ticket.id },
                        { defaultValue: 'Select ticket {{id}}' },
                      )}
                      checked={selectedIds.has(ticket.id)}
                      onChange={(e) => {
                        e.stopPropagation()
                        setSelectedIds((prev) => {
                          const next = new Set(prev)
                          if (e.target.checked) {
                            next.add(ticket.id)
                          } else {
                            next.delete(ticket.id)
                          }
                          return next
                        })
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 5))}>
                    <span
                      className={
                        PRIORITY_DOT[ticket.priority] ??
                        'w-2.5 h-2.5 rounded-full bg-outline-variant inline-block'
                      }
                    />
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 5))}>
                    <div className={cm.flex({ direction: 'col' })}>
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('bold'),
                          'text-on-surface leading-tight group-hover:text-primary transition-colors',
                        )}
                      >
                        {ticket.subject}
                      </span>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.sp('mt', 1),
                          'text-on-surface-variant',
                        )}
                      >
                        {t(
                          'ticketsTable.ticketMeta',
                          { id: ticket.id, category: ticket.category ?? '' },
                          { defaultValue: '#{{id}} • {{category}}' },
                        )}
                      </span>
                    </div>
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 5),
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                    )}
                  >
                    {ticket.requester_name ?? t('common.notAvailable', {}, { defaultValue: '—' })}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 5))}>
                    <span className={STATUS_BADGE[ticket.status] ?? STATUS_BADGE.open}>
                      {ticket.status === 'on_hold'
                        ? t('common.statusOnHold', {}, { defaultValue: 'On hold' })
                        : ticket.status}
                    </span>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 5))}>
                    {ticket.assignee_name ? (
                      <div className={cm.flex({ align: 'center', gap: 2 })}>
                        {ticket.assignee_avatar ? (
                          <img
                            alt={t(
                              'ticketsTable.assigneeAvatarAlt',
                              {},
                              { defaultValue: 'Avatar' },
                            )}
                            className={cm.cn(cm.w(6), cm.h(6), cm.roundedFull, 'object-cover')}
                            src={ticket.assignee_avatar}
                          />
                        ) : (
                          <div
                            className={cm.cn(
                              cm.w(6),
                              cm.h(6),
                              cm.roundedFull,
                              cm.flex({ align: 'center', justify: 'center' }),
                              cm.textSize('xs'),
                              cm.fontWeight('bold'),
                              'bg-primary text-on-primary',
                            )}
                          >
                            {ticket.assignee_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'))}>
                          {ticket.assignee_name}
                        </span>
                      </div>
                    ) : (
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t('common.notAvailable', {}, { defaultValue: '—' })}
                      </span>
                    )}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 5),
                      cm.textSize('xs'),
                      cm.textRight,
                      'text-on-surface-variant',
                    )}
                  >
                    {timeAgo(ticket.updated_at || ticket.created_at, t)}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 5),
                      cm.textRight,
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                    )}
                  >
                    {ticket.sla === 'expired' ? (
                      <span className={cm.cn('text-error')}>
                        {t('ticketsTable.sla.expired', {}, { defaultValue: 'EXPIRED' })}
                      </span>
                    ) : ticket.sla === 'on_track' ? (
                      <span className={cm.cn('text-success')}>
                        {t('ticketsTable.sla.onTime', {}, { defaultValue: 'On time' })}
                      </span>
                    ) : (
                      <span className={cm.cn('text-on-surface')}>
                        {ticket.sla ?? t('common.notAvailable', {}, { defaultValue: '—' })}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  )
}

export default TicketsTable
export { TicketsTable }
