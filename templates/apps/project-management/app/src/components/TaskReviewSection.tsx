import { useState } from 'react'
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

function TaskReviewSection({ tasks }: { tasks: Task[]; onDeleteTask?: (taskId: string) => void }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { projectId } = useParams<{ projectId: string }>()
  const [isExpanded, setIsExpanded] = useState(true)
  return (
    <section>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('mb', 4),
          cm.cursorPointer,
          'group',
        )}
        onClick={() => setIsExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsExpanded((v) => !v)
          }
        }}
      >
        <h3
          className={cm.cn(
            cm.textSize('xs'),
            'font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('taskReviewSection.heading', {}, { defaultValue: 'In Review' })}
        </h3>
        <span
          className={cm.cn(
            cm.w(6),
            cm.h(6),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            cm.fontWeight('bold'),
            'bg-surface-container-high text-[10px]',
          )}
        >
          {tasks.length}
        </span>
      </div>
      {isExpanded && (
        <div className={cm.cn(cm.stack(3))}>
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
              {t('taskReviewSection.emptyState', {}, { defaultValue: 'No tasks in review' })}
            </p>
          )}
        </div>
      )}
    </section>
  )
}

export default TaskReviewSection
export { TaskReviewSection }
