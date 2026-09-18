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

export default function TodoTaskSection({
  tasks,
}: {
  tasks: Task[]
  onDeleteTask?: (taskId: string) => void
}) {
  const { t } = useTranslation()
  const cm = getClassMap()
  const { projectId } = useParams<{ projectId: string }>()
  return (
    <section>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('mb', 4),
          'group',
          cm.cursorPointer,
        )}
      >
        <h3
          className={cm.cn(
            cm.textSize('xs'),
            'font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('todoTaskSection.title', {}, { defaultValue: 'To Do' })}
        </h3>
        <span
          className={cm.cn(
            cm.w(6),
            cm.h(6),
            cm.roundedFull,
            'bg-surface-container-high',
            cm.flex({ align: 'center', justify: 'center' }),
            'text-[10px]',
            cm.fontWeight('bold'),
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
              'text-on-surface-variant',
              cm.textSize('sm'),
              cm.sp('py', 4),
              'text-left',
            )}
          >
            {t('todoTaskSection.emptyState', {}, { defaultValue: 'No tasks to do' })}
          </p>
        )}
      </div>
    </section>
  )
}
export { TodoTaskSection }
