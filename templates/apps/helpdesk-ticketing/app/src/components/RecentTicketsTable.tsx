import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Ticket {
  id: string
  subject: string
  status: string
  priority: string
  category?: string | null
  requester?: string
  created_at: string
  updated_at?: string
}

const PRIORITY_BADGE: Record<
  string,
  { cls: string; style?: { backgroundColor: string; color: string } }
> = {
  critical: { cls: 'bg-error-container text-on-error-container' },
  high: { cls: 'bg-tertiary-fixed text-on-tertiary-fixed-variant' },
  medium: {
    cls: '',
    style: {
      backgroundColor: 'var(--color-priority-medium-bg)',
      color: 'var(--color-priority-medium-text)',
    },
  },
  low: { cls: 'bg-success-light text-success' },
}
const STATUS_BADGE: Record<string, string> = {
  open: 'bg-primary text-on-primary',
  pending: 'bg-primary/20 text-primary',
  on_hold: 'bg-surface-container-high text-on-surface-variant',
  resolved: 'bg-secondary text-on-secondary',
  solved: 'bg-secondary text-on-secondary',
  closed: 'bg-surface-container-high text-on-surface-variant',
}

type TranslateFn = (
  key: string,
  values?: Record<string, string | number | boolean>,
  options?: { defaultValue?: string },
) => string

function formatTimeAgo(dateString: string, t: TranslateFn): string {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return t('recentTicketsTable.timeJustNow', {}, { defaultValue: 'Just now' })
  if (diffMins < 60)
    return t(
      'recentTicketsTable.timeMinutesAgo',
      { count: diffMins },
      { defaultValue: '{{count}}m ago' },
    )
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24)
    return t(
      'recentTicketsTable.timeHoursAgo',
      { count: diffHours },
      { defaultValue: '{{count}}h ago' },
    )
  return t(
    'recentTicketsTable.timeDaysAgo',
    { count: Math.floor(diffHours / 24) },
    { defaultValue: '{{count}}d ago' },
  )
}

function RecentTicketsTable({
  tickets = [],
  loading = false,
}: {
  tickets?: Ticket[]
  loading?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <section
      className={cm.cn(
        cm.stack(4),
        'bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('px', 8),
          cm.sp('pt', 8),
        )}
      >
        <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
          {t('recentTicketsTable.title', {}, { defaultValue: 'Recent Tickets' })}
        </h3>
        <Link to="/tickets" className={cm.cn('text-sm font-bold text-primary hover:underline')}>
          {t('recentTicketsTable.viewAll', {}, { defaultValue: 'View All' })}
        </Link>
      </div>
      <div className={cm.cn('overflow-x-auto')}>
        <table className={cm.cn(cm.w('full'), 'text-left border-collapse')}>
          <thead>
            <tr className={cm.cn('bg-surface-container-low border-b border-outline-variant/10')}>
              <th
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  'text-[10px] font-black text-on-surface-variant uppercase tracking-widest',
                )}
              >
                {t('recentTicketsTable.colTicketId', {}, { defaultValue: 'Ticket #' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 4),
                  'text-[10px] font-black text-on-surface-variant uppercase tracking-widest',
                )}
              >
                {t('recentTicketsTable.colSubject', {}, { defaultValue: 'Subject' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 4),
                  'text-[10px] font-black text-on-surface-variant uppercase tracking-widest',
                )}
              >
                {t('recentTicketsTable.colRequester', {}, { defaultValue: 'Requester' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 4),
                  cm.textCenter,
                  'text-[10px] font-black text-on-surface-variant uppercase tracking-widest',
                )}
              >
                {t('form.priority', {}, { defaultValue: 'Priority' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 4),
                  cm.textCenter,
                  'text-[10px] font-black text-on-surface-variant uppercase tracking-widest',
                )}
              >
                {t('nav.status', {}, { defaultValue: 'Status' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  'text-[10px] font-black text-on-surface-variant uppercase tracking-widest',
                )}
              >
                {t('recentTicketsTable.colUpdated', {}, { defaultValue: 'Updated' })}
              </th>
            </tr>
          </thead>
          <tbody className={cm.cn('divide-y divide-surface-container')}>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} aria-hidden="true">
                  <td colSpan={6} className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                    <div
                      className={cm.cn(cm.h(4), 'bg-surface-container-low rounded animate-pulse')}
                    />
                  </td>
                </tr>
              ))
            ) : tickets.length > 0 ? (
              tickets.map((ticket) => {
                const p = ticket.priority?.toLowerCase() || 'medium'
                const s = ticket.status?.toLowerCase() || 'open'
                const pb = PRIORITY_BADGE[p] || {
                  cls: 'bg-surface-container-high text-on-surface-variant',
                }
                const sc = STATUS_BADGE[s] || 'bg-surface-container-high text-on-surface-variant'
                return (
                  <tr
                    key={ticket.id}
                    className={cm.cn(
                      cm.cursorPointer,
                      'hover:bg-surface-container-low transition-colors group',
                    )}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    <td
                      className={cm.cn(
                        cm.sp('px', 8),
                        cm.sp('py', 5),
                        cm.textSize('sm'),
                        cm.fontWeight('bold'),
                        'text-foreground-tertiary',
                      )}
                    >
                      {t(
                        'recentTicketsTable.ticketId',
                        { id: ticket.id },
                        { defaultValue: '#{{id}}' },
                      )}
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 5))}>
                      <p
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('bold'),
                          'text-on-surface line-clamp-1',
                        )}
                      >
                        {ticket.subject}
                      </p>
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 5),
                        cm.textSize('sm'),
                        'text-on-surface-variant',
                      )}
                    >
                      {ticket.requester || t('common.notAvailable', {}, { defaultValue: '—' })}
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 5), cm.textCenter)}>
                      <span
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.roundedFull,
                          'text-[10px] font-black uppercase',
                          pb.cls,
                        )}
                        style={pb.style}
                      >
                        {t(
                          `common.priority${p.charAt(0).toUpperCase() + p.slice(1)}`,
                          {},
                          { defaultValue: p.charAt(0).toUpperCase() + p.slice(1) },
                        )}
                      </span>
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 5), cm.textCenter)}>
                      <span
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.roundedFull,
                          'text-[10px] font-black uppercase',
                          sc,
                        )}
                      >
                        {s === 'on_hold'
                          ? t('common.statusOnHold', {}, { defaultValue: 'On hold' })
                          : t(
                              `common.status${s.charAt(0).toUpperCase() + s.slice(1)}`,
                              {},
                              { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) },
                            )}
                      </span>
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 8),
                        cm.sp('py', 5),
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                        'text-foreground-secondary',
                      )}
                    >
                      {formatTimeAgo(ticket.updated_at || ticket.created_at, t)}
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 10),
                    cm.textCenter,
                    cm.textSize('sm'),
                    'text-on-surface-variant',
                  )}
                >
                  {t(
                    'recentTicketsTable.empty',
                    {},
                    { defaultValue: 'No recent tickets to show.' },
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default RecentTicketsTable
export { RecentTicketsTable }
