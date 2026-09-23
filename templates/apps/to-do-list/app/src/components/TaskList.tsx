import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { Priority, Task } from '../lib/api.js'

export type { Priority, Task }

interface TaskListProps {
  tasks: Task[]
  showProject?: boolean
  emptyMessage?: string
  /** Called when the user clicks the completion checkbox. */
  onToggle?: (id: string) => void
}

const PRIORITY_RING: Record<Priority, string> = {
  1: 'border-error',
  2: 'border-warning',
  3: 'border-primary',
  4: 'border-outline',
}

const PRIORITY_BG: Record<Priority, string> = {
  1: 'bg-error',
  2: 'bg-warning',
  3: 'bg-primary',
  4: 'bg-outline',
}

function fmtDue(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const targetDay = new Date(date)
  targetDay.setHours(0, 0, 0, 0)
  const diffDays = Math.round((targetDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'tomorrow'
  if (diffDays === -1) return 'yesterday'
  if (diffDays < 0) return `${-diffDays}d ago`
  if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: 'short' })
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function isOverdue(iso?: string | null): boolean {
  if (!iso) return false
  const due = new Date(iso)
  due.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due.getTime() < today.getTime()
}

export function TaskList({ tasks, showProject = false, emptyMessage, onToggle }: TaskListProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (tasks.length === 0) {
    return (
      <p
        className={cm.cn(
          cm.sp('py', 16),
          cm.textCenter,
          'text-on-surface-variant',
          cm.textSize('sm'),
        )}
      >
        {emptyMessage ?? t('taskList.empty', {}, { defaultValue: 'No tasks here. Take a breath.' })}
      </p>
    )
  }

  return (
    <ul className={cm.cn(cm.card(), 'overflow-hidden divide-y divide-outline-variant')}>
      {tasks.map((task) => {
        const overdue = !task.completed && isOverdue(task.due_date)
        return (
          <li
            key={task.id}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.flex({ align: 'start', gap: 'md' }),
              'group hover:bg-surface-container',
            )}
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={task.completed}
              aria-label={
                task.completed
                  ? t(
                      'taskList.uncheckAria',
                      { title: task.title },
                      { defaultValue: 'Mark "{{title}}" as incomplete' },
                    )
                  : t(
                      'taskList.checkAria',
                      { title: task.title },
                      { defaultValue: 'Mark "{{title}}" as complete' },
                    )
              }
              data-mol-id={`task-toggle-${task.id}`}
              onClick={() => onToggle?.(task.id)}
              className={cm.cn(
                // Visual circle stays 20px; the `before` pseudo extends the
                // hit area to a 44px touch target without shifting the row.
                "relative h-5 w-5 mt-0.5 rounded-full border-2 grid place-items-center shrink-0 before:content-[''] before:absolute before:-inset-3 before:rounded-full",
                PRIORITY_RING[task.priority],
                task.completed ? PRIORITY_BG[task.priority] : '',
              )}
            >
              {task.completed ? (
                <span
                  className={cm.cn('material-symbols-outlined text-on-primary')}
                  style={{ fontSize: '14px' }}
                  aria-hidden="true"
                >
                  check
                </span>
              ) : null}
            </button>
            <Link
              to={`/tasks/${task.id}`}
              className={cm.cn('min-w-0 flex-1 -my-3 py-3 -mr-4 pr-4')}
            >
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  task.completed ? cm.cn('line-through', 'text-on-surface-variant') : '',
                )}
              >
                {task.title}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('mt', 1),
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                  'flex-wrap',
                )}
              >
                {showProject && task.project ? (
                  <span className={cm.cn('hover:underline')}>{task.project.name}</span>
                ) : null}
                {task.due_date ? (
                  <span className={overdue ? 'text-error' : ''}>📅 {fmtDue(task.due_date)}</span>
                ) : null}
                {task.recurring ? <span>🔁 {task.recurring}</span> : null}
                {task.labels.map((l) => (
                  <span
                    key={l}
                    className={cm.cn(
                      cm.sp('px', 2),
                      'rounded-full bg-surface-container-high font-mono',
                    )}
                  >
                    @{l}
                  </span>
                ))}
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
