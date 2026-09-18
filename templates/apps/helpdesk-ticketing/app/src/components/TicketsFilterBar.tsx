import { useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface AssigneeOption {
  id: string
  name: string
}

interface TicketsFilterBarProps {
  statusFilter: string
  onStatusChange: (val: string) => void
  priorityFilter: string
  onPriorityChange: (val: string) => void
  assigneeId: string
  onAssigneeChange: (val: string) => void
  assigneeOptions: AssigneeOption[]
  onClear: () => void
}

export default function TicketsFilterBar({
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  assigneeId,
  onAssigneeChange,
  assigneeOptions,
  onClear,
}: TicketsFilterBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [demoHint, setDemoHint] = useState<string | null>(null)

  useEffect(() => {
    if (!demoHint) return
    const id = window.setTimeout(() => setDemoHint(null), 4200)
    return () => window.clearTimeout(id)
  }, [demoHint])

  return (
    <div className={cm.stack(3)} data-mol-id="filter-bar">
      {demoHint && (
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('px', 3),
            cm.sp('py', 2),
            'rounded-lg bg-surface-container-high text-on-surface-variant',
          )}
          role="status"
        >
          {demoHint}
        </p>
      )}
      <div className={cm.cn(cm.flex({ align: 'center', wrap: 'wrap', gap: 4 }))}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 3 }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.cursorPointer,
            'bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('ticketsFilterBar.statusLabel', {}, { defaultValue: 'Status:' })}
          </span>
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.cursorPointer,
              'bg-transparent border-none outline-none',
            )}
            aria-label={t(
              'ticketsFilterBar.filterByStatus',
              {},
              { defaultValue: 'Filter by status' },
            )}
          >
            <option value="">
              {t('ticketsFilterBar.allStatuses', {}, { defaultValue: 'All Statuses' })}
            </option>
            <option value="open">{t('common.open', {}, { defaultValue: 'Open' })}</option>
            <option value="pending">{t('status.pending', {}, { defaultValue: 'Pending' })}</option>
            <option value="on_hold">
              {t('common.statusOnHold', {}, { defaultValue: 'On hold' })}
            </option>
            <option value="resolved">
              {t('status.resolved', {}, { defaultValue: 'Resolved' })}
            </option>
            <option value="closed">
              {t('ticketsFilterBar.statusClosed', {}, { defaultValue: 'Closed' })}
            </option>
          </select>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 3 }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.cursorPointer,
            'bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('ticketsFilterBar.priorityLabel', {}, { defaultValue: 'Priority:' })}
          </span>
          <select
            value={priorityFilter}
            onChange={(e) => onPriorityChange(e.target.value)}
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.cursorPointer,
              'bg-transparent border-none outline-none',
            )}
            aria-label={t(
              'ticketsFilterBar.filterByPriority',
              {},
              { defaultValue: 'Filter by priority' },
            )}
          >
            <option value="">
              {t('ticketsFilterBar.allPriorities', {}, { defaultValue: 'All Priorities' })}
            </option>
            <option value="urgent">
              {t('ticketsFilterBar.priorityUrgent', {}, { defaultValue: 'Urgent' })}
            </option>
            <option value="high">
              {t('ticketsFilterBar.priorityHigh', {}, { defaultValue: 'High' })}
            </option>
            <option value="medium">
              {t('ticketsFilterBar.priorityMedium', {}, { defaultValue: 'Medium' })}
            </option>
            <option value="low">
              {t('ticketsFilterBar.priorityLow', {}, { defaultValue: 'Low' })}
            </option>
          </select>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 3 }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            'bg-surface-container-low rounded-lg',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('ticketsFilterBar.assigneeLabel', {}, { defaultValue: 'Assignee:' })}
          </span>
          <select
            value={assigneeId}
            onChange={(e) => onAssigneeChange(e.target.value)}
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.cursorPointer,
              'bg-transparent border-none outline-none max-w-[200px]',
            )}
            aria-label={t(
              'ticketsFilterBar.filterByAssignee',
              {},
              { defaultValue: 'Filter by assignee' },
            )}
          >
            <option value="">
              {t('ticketsFilterBar.allAssignees', {}, { defaultValue: 'All assignees' })}
            </option>
            {assigneeOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 3 }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.cursorPointer,
            'bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors text-left',
          )}
          onClick={() =>
            setDemoHint(
              t(
                'ticketsFilterBar.dateRangeDemoHint',
                {},
                { defaultValue: 'Date range filtering is not enabled in this demo build.' },
              ),
            )
          }
        >
          <span
            className={cm.cn(
              cm.textSize('sm'),
              'material-symbols-outlined text-on-surface-variant',
            )}
          >
            calendar_today
          </span>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
            {t('ticketsFilterBar.lastNDays', { days: 30 }, { defaultValue: 'Last {{days}} Days' })}
          </span>
        </button>
        <button
          type="button"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 1 }),
            cm.textPrimary,
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'ml-auto hover:underline',
          )}
          onClick={onClear}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
            filter_list_off
          </span>
          {t('ticketsFilterBar.clearFilters', {}, { defaultValue: 'Clear Filters' })}
        </button>
      </div>
    </div>
  )
}
export { TicketsFilterBar }
