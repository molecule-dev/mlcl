import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import AddTaskFab from '../components/AddTaskFab.js'
import { AppShell } from '../components/AppShell.js'
import TaskFilterBar from '../components/TaskFilterBar.js'
import TaskInProgressSection from '../components/TaskInProgressSection.js'
import TaskListHeader from '../components/TaskListHeader.js'
import TaskReviewSection from '../components/TaskReviewSection.js'
import TodoTaskSection from '../components/TodoTaskSection.js'
import { loadContent } from '../config.js'

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

const LIST_STATUSES = ['todo', 'in_progress', 'in_review', 'done'] as const
type ListStatus = (typeof LIST_STATUSES)[number]

function normalizeTaskStatus(raw: string | null | undefined): ListStatus {
  if (raw == null || raw === '') return 'todo'
  const s = String(raw)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  if (s === 'to_do' || s === 'pending' || s === 'open' || s === 'backlog') return 'todo'
  if (s === 'inprogress' || s === 'in_progress' || s === 'active') return 'in_progress'
  if (s === 'inreview' || s === 'in_review' || s === 'review' || s === 'qa') return 'in_review'
  if (s === 'completed' || s === 'closed' || s === 'resolved' || s === 'done') return 'done'
  if (LIST_STATUSES.includes(s as ListStatus)) return s as ListStatus
  return 'todo'
}

function normalizeTaskRow(task: Task): Task {
  return { ...task, status: normalizeTaskStatus(task.status) }
}

export type TaskListPageProps = { projectId?: string }

export default function TaskList({ projectId: projectIdProp }: TaskListPageProps = {}) {
  const params = useParams<{ projectId: string }>()
  const projectId = projectIdProp ?? params.projectId
  const { t } = useTranslation()
  const http = useHttpClient()
  const cm = getClassMap()
  const navigate = useNavigate()

  const handleAddTask = useCallback(() => {
    // Task creation lives on the project board (modal + per-column add);
    // send the user there rather than to a non-existent create route.
    navigate(projectId ? `/projects/${projectId}/board` : '/')
  }, [navigate, projectId])

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState('position')
  const [sortOrder, setSortOrder] = useState<string>('asc')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = {
        sort: sortField,
        order: sortOrder,
      }
      if (projectId) params.project_id = projectId
      if (filterStatus) params.status = filterStatus
      if (filterPriority) params.priority = filterPriority
      const res = await http.get<Task[] | { data: Task[] }>('/api/tasks', { params })
      const rawList = Array.isArray(res)
        ? res
        : res && typeof res === 'object' && Array.isArray((res as { data?: Task[] }).data)
          ? (res as { data: Task[] }).data
          : []
      setTasks(rawList.map(normalizeTaskRow))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('taskList.loadError', {}, { defaultValue: 'Failed to load tasks' }),
      )
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable (i18n provider never changes reference after init)
  }, [http, projectId, sortField, sortOrder, filterStatus, filterPriority])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const filteredTasks = searchQuery
    ? tasks.filter((task) => task.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : tasks

  const remainingTasks = filteredTasks.filter((task) => task.status !== 'done').length
  const today = new Date()
  const dateString = t(
    'taskList.dateFormat',
    {
      weekday: today.toLocaleDateString(undefined, { weekday: 'long' }),
      month: today.toLocaleDateString(undefined, { month: 'short' }),
      day: today.getDate(),
    },
    { defaultValue: '{{weekday}}, {{month}} {{day}}' },
  )

  const todoTasks = filteredTasks.filter((t) => t.status === 'todo' || t.status === 'backlog')
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in_progress')
  const reviewTasks = filteredTasks.filter((t) => t.status === 'in_review')

  if (loading) {
    return (
      <AppShell footer={<TaskListNavFooter />}>
        <div className={cm.cn(cm.surface, cm.minH('screen'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
              cm.sp('p', 12),
            )}
          >
            <div className={cm.spinner({ size: 'lg' })} />
          </div>
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell footer={<TaskListNavFooter />}>
        <div className={cm.cn(cm.surface, cm.minH('screen'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'md' }),
              cm.sp('p', 12),
            )}
          >
            <p className={cm.cn('text-error')}>{error}</p>
            <button onClick={loadTasks} className={cm.button({ variant: 'solid' })}>
              {t('common.retry', {}, { defaultValue: 'Retry' })}
            </button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell footer={<TaskListNavFooter />}>
      <div className={cm.cn(cm.surface, cm.minH('screen'))}>
        <TaskFilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          projectId={projectId}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterPriority={filterPriority}
          setFilterPriority={setFilterPriority}
          sortField={sortField}
          setSortField={setSortField}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
        />
        <div className={cm.cn(cm.sp('px', 8), cm.mxAuto, 'max-w-7xl', 'pb-20')}>
          <div className={cm.stack(12)}>
            <TaskListHeader dateString={dateString} remainingTasks={remainingTasks} />
            <TodoTaskSection tasks={todoTasks} />
            <TaskInProgressSection tasks={inProgressTasks} />
            <TaskReviewSection tasks={reviewTasks} />
          </div>
        </div>
      </div>
      {projectId ? <AddTaskFab onClick={handleAddTask} /> : null}
    </AppShell>
  )
}

/**
 * Below-nav legal links for the shell footer — the Help route plus the
 * Privacy modal (moved here from the deleted TaskListSideNavBar rail).
 */
function TaskListNavFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { openPrivacy, modals } = useLegalModals({ appName: APP_NAME, loadContent })
  return (
    <>
      <Link
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('py', 2),
          'pl-4.5 text-on-surface-variant dark:text-outline-variant hover:text-primary transition-colors',
        )}
        data-mol-id="nav-help"
        to="/help"
      >
        <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')} data-icon="help">
          help
        </span>
        {t('common.help', {}, { defaultValue: 'Help' })}
      </Link>
      <button
        type="button"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('py', 2),
          'pl-4.5 text-on-surface-variant dark:text-outline-variant hover:text-primary transition-colors',
        )}
        data-mol-id="nav-privacy"
        onClick={openPrivacy}
      >
        <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')} data-icon="shield">
          shield
        </span>
        {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
      </button>
      {modals}
    </>
  )
}
export { TaskList, TaskList as TaskListPage }
