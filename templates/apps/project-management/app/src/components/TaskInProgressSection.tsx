import { Link, useParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import TaskCard from './TaskCard.js'

interface Task {
  id: string
  title: string
  status: string
  priority: string
  assignee_name: string | null
  assignee_id: string | null
  assignee_avatar?: string | null
  due_date: string | null
  project_name?: string | null
}

export default function TaskInProgressSection({
  tasks,
}: {
  tasks: Task[]
  onDeleteTask?: (taskId: string) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { projectId } = useParams<{ projectId: string }>()
  return (
    <section>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 4), 'group')}>
        <h3
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('taskInProgressSection.heading', {}, { defaultValue: 'In Progress' })}
        </h3>
        <span
          className={cm.cn(
            cm.w(6),
            cm.h(6),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            cm.fontWeight('bold'),
            cm.textPrimary,
            'bg-primary/10 text-[10px]',
          )}
        >
          {tasks.length}
        </span>
      </div>
      <div className={cm.stack(3)}>
        {tasks.map((task) => (
          <Link
            key={task.id}
            to={`/projects/${projectId}/tasks/${task.id}`}
            className={cm.cn('contents')}
            onClick={(e) => e.stopPropagation()}
          >
            <TaskCard task={task} />
          </Link>
        ))}
        {tasks.length === 0 && (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('py', 4),
              'text-left',
              'text-on-surface-variant',
            )}
          >
            {t('taskInProgressSection.emptyState', {}, { defaultValue: 'No tasks in progress' })}
          </p>
        )}
      </div>
    </section>
  )
}
export { TaskInProgressSection }
