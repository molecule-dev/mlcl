import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { Priority, Task } from '../lib/api.js'

interface TasksEditorialProps {
  tasks: Task[]
  onToggle?: (id: string) => void
  /** Empty-state message. */
  emptyMessage?: string
}

const PRIORITY_TINT: Record<Priority, { bg: string; ring: string; flag: string }> = {
  1: { bg: 'bg-red-500', ring: 'ring-red-500', flag: 'text-error' },
  2: { bg: 'bg-amber-500', ring: 'ring-amber-500', flag: 'text-warning' },
  3: { bg: 'bg-sky-500', ring: 'ring-sky-500', flag: 'text-sky-500' },
  4: { bg: 'bg-border-secondary', ring: 'ring-border-secondary', flag: 'text-foreground-tertiary' },
}

const LABEL_TINT = [
  'bg-indigo-500/10 text-indigo-600',
  'bg-emerald-500/10 text-success',
  'bg-amber-500/10 text-warning',
  'bg-pink-500/10 text-pink-600',
  'bg-cyan-500/10 text-cyan-600',
]

function fmtDue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(d)
  due.setHours(0, 0, 0, 0)
  const sameDay = due.getTime() === today.getTime()
  if (sameDay) return 'Today'
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (due.getTime() === tomorrow.getTime()) return 'Tomorrow'
  if (due.getTime() < today.getTime())
    return `Overdue · ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Editorial task list — checkbox circle (priority-tinted ring), bold title,
 * project chip + label chips + recurring icon + due date in mono. Hover row
 * lift, group dividers. Translated from project-management's TaskListRow
 * pattern.
 */
export function TasksEditorial({ tasks, onToggle, emptyMessage }: TasksEditorialProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (tasks.length === 0) {
    return (
      <div
        className={cm.cn(cm.sp('py', 12), cm.textCenter, 'rounded-2xl bg-surface-container-low')}
      >
        <span
          className={cm.cn('material-symbols-outlined text-5xl text-on-surface-variant/40')}
          aria-hidden="true"
        >
          task_alt
        </span>
        <p className={cm.cn('text-sm text-on-surface-variant mt-3')}>
          {emptyMessage ??
            t('tasksEditorial.empty', {}, { defaultValue: "You're all caught up — beautiful." })}
        </p>
      </div>
    )
  }

  return (
    <ul
      className={cm.cn(
        'divide-y divide-outline-variant/40 bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm',
      )}
    >
      {tasks.map((task) => {
        const tint = PRIORITY_TINT[task.priority]
        const overdue =
          !task.completed &&
          task.due_date &&
          (() => {
            const due = new Date(task.due_date)
            due.setHours(0, 0, 0, 0)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            return due.getTime() < today.getTime()
          })()
        return (
          <li
            key={task.id}
            className={cm.cn('group hover:bg-surface-container-low transition-colors')}
          >
            <div className={cm.cn(cm.flex({ align: 'start', gap: 'md' }), 'px-5 py-3.5')}>
              <button
                type="button"
                onClick={() => onToggle?.(task.id)}
                aria-pressed={task.completed}
                aria-label={
                  task.completed
                    ? t(
                        'tasksEditorial.unmarkAria',
                        { title: task.title },
                        { defaultValue: 'Mark "{{title}}" as incomplete' },
                      )
                    : t(
                        'tasksEditorial.markAria',
                        { title: task.title },
                        { defaultValue: 'Mark "{{title}}" as complete' },
                      )
                }
                data-mol-id={`task-toggle-editorial-${task.id}`}
                className={cm.cn(
                  // Visual circle stays 20px; the `before` pseudo extends the
                  // hit area to a 44px touch target without shifting the row.
                  "relative mt-0.5 w-5 h-5 rounded-full ring-2 ring-offset-1 ring-offset-surface-container-lowest flex items-center justify-center shrink-0 transition-colors before:content-[''] before:absolute before:-inset-3 before:rounded-full",
                  task.completed
                    ? cm.cn('bg-success ring-success', 'text-white')
                    : cm.cn(tint.ring, 'bg-transparent hover:bg-surface-container-low'),
                )}
              >
                {task.completed && (
                  <span
                    className={cm.cn('material-symbols-outlined text-[12px]')}
                    aria-hidden="true"
                  >
                    check
                  </span>
                )}
              </button>

              <Link to={`/tasks/${task.id}`} className={cm.cn(cm.flex1, 'min-w-0 -my-3.5 py-3.5')}>
                <div className={cm.cn('flex items-baseline gap-2 flex-wrap')}>
                  {task.priority < 4 && (
                    <span
                      className={cm.cn('material-symbols-outlined text-[14px]', tint.flag)}
                      aria-hidden="true"
                      title={`P${task.priority}`}
                    >
                      flag
                    </span>
                  )}
                  <p
                    className={cm.cn(
                      'text-sm',
                      task.completed
                        ? 'text-on-surface-variant line-through'
                        : 'font-bold text-on-surface',
                    )}
                  >
                    {task.title}
                  </p>
                </div>

                <div className={cm.cn('flex items-center gap-2 mt-1.5 flex-wrap')}>
                  {task.project && (
                    <span
                      className={cm.cn(
                        'inline-flex items-center gap-1 text-[10px] font-bold text-on-surface-variant',
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-[10px]')}
                        aria-hidden="true"
                      >
                        folder
                      </span>
                      {task.project.name}
                    </span>
                  )}
                  {task.recurring && (
                    <span
                      className={cm.cn(
                        'inline-flex items-center gap-0.5 text-[10px] font-bold text-on-surface-variant',
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-[10px]')}
                        aria-hidden="true"
                      >
                        refresh
                      </span>
                      {task.recurring}
                    </span>
                  )}
                  {task.labels.map((label, i) => (
                    <span
                      key={label}
                      className={cm.cn(
                        'px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest',
                        LABEL_TINT[i % LABEL_TINT.length],
                      )}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </Link>

              {task.due_date && (
                <span
                  className={cm.cn(
                    'shrink-0 text-[11px] font-mono tabular-nums',
                    overdue
                      ? 'text-error font-bold'
                      : task.completed
                        ? 'text-on-surface-variant line-through'
                        : 'text-on-surface-variant',
                  )}
                >
                  {fmtDue(task.due_date)}
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
