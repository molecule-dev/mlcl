import { useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function TaskCard({
  task,
}: {
  task: {
    id: string
    title: string
    priority: string
    status: string
    project_name?: string | null
    due_date: string | null
    assignee_avatar?: string | null
    assignee_name?: string | null
  }
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const priorityColors: Record<string, string> = {
    urgent: 'bg-error',
    high: 'bg-error',
    medium: 'bg-tertiary-container',
    low: 'bg-yellow-400',
    backlog: 'bg-emerald-400',
  }
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
  const dateLabel = task.due_date
    ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
    : ''
  const http = useHttpClient()
  const [isDone, setIsDone] = useState(task.status === 'done')
  const [updating, setUpdating] = useState(false)

  const handleToggle = async () => {
    const next = !isDone
    setIsDone(next)
    setUpdating(true)
    try {
      await http.patch(`/api/tasks/${task.id}`, { status: next ? 'done' : 'todo' })
    } catch (_error) {
      // Optimistic update failed — revert toggle state.
      setIsDone(!next)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('p', 4),
        'bg-surface-container-lowest rounded-xl hover:translate-x-1 transition-all group shadow-sm border border-outline-variant/5',
      )}
    >
      <input
        className={cm.cn(
          cm.w(5),
          cm.h(5),
          cm.textPrimary,
          'rounded border-outline-variant focus:ring-primary/20',
        )}
        type="checkbox"
        checked={isDone}
        onChange={handleToggle}
        disabled={updating}
      />
      <div className={cm.cn(cm.flex1, 'min-w-0')}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.w(2),
              cm.h(2),
              cm.roundedFull,
              priorityColors[task.priority] || 'bg-gray-400',
            )}
            title={t(
              'taskCard.priorityTooltip',
              { priority: task.priority },
              { defaultValue: '{{priority}} priority' },
            )}
          ></span>
          <h4
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-on-surface truncate',
            )}
          >
            {task.title}
          </h4>
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'xl' }))}>
        <span
          className={cm.cn(
            cm.sp('py', 1),
            cm.fontWeight('bold'),
            'hidden md:inline-block px-2.5 rounded-md bg-secondary-container/20 text-on-secondary-container text-[10px] uppercase tracking-wider',
          )}
        >
          {task.project_name || t('taskCard.unnamedProject', {}, { defaultValue: 'Project' })}
        </span>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            isOverdue ? 'text-error' : 'text-on-surface-variant',
          )}
        >
          <span
            className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}
            data-icon={isOverdue ? 'event_busy' : 'calendar_month'}
          >
            {isOverdue ? 'event_busy' : 'calendar_month'}
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              isOverdue ? cm.fontWeight('bold') : cm.fontWeight('medium'),
            )}
          >
            {isOverdue
              ? t(
                  'taskCard.overdueDate',
                  { date: dateLabel },
                  { defaultValue: '{{date}} (Overdue)' },
                )
              : dateLabel}
          </span>
        </div>
        {task.assignee_avatar ? (
          <img
            alt={task.assignee_name || t('taskCard.assigneeAlt', {}, { defaultValue: 'Assignee' })}
            className={cm.cn(cm.w(7), cm.h(7), cm.roundedFull, 'object-cover grayscale opacity-80')}
            src={task.assignee_avatar}
          />
        ) : (
          <div
            className={cm.cn(
              cm.w(7),
              cm.h(7),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'bg-surface-container-high text-[10px] text-on-surface-variant',
            )}
          >
            {task.assignee_name?.charAt(0) || t('common.unknown', {}, { defaultValue: '?' })}
          </div>
        )}
      </div>
    </div>
  )
}
export default TaskCard
