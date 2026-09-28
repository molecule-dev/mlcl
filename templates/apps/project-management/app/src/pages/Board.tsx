import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { AppShell } from '../components/AppShell.js'
import { UserMenu } from '../components/UserMenu.js'
import { getRealtimeConnection } from '../lib/realtime.js'

interface Task {
  id: string
  title: string
  description?: string | null
  status: string
  priority: string
  assignee_name?: string | null
  assignee_id?: string | null
  assignee_avatar?: string | null
  due_date?: string | null
  position?: number | null
  comment_count?: number | null
  attachment_count?: number | null
  subtasks_done?: number | null
  subtasks_total?: number | null
}

interface Project {
  id: string
  name: string
  description?: string | null
  status?: string
  color?: string | null
}

const STATUSES = ['todo', 'in_progress', 'in_review', 'done'] as const
type StatusKey = (typeof STATUSES)[number]

const PRIORITY_STYLES: Record<string, { bg: string; text: string }> = {
  urgent: { bg: 'bg-error-container', text: 'text-error' },
  high: { bg: 'bg-rose-100', text: 'text-error' },
  medium: { bg: 'bg-warning-light', text: 'text-warning' },
  low: { bg: 'bg-success-light', text: 'text-success' },
}

function formatDueDate(date: string): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function isOverdue(date: string | null | undefined, status: string): boolean {
  if (!date || status === 'done') return false
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return false
  return d.getTime() < Date.now()
}

export type BoardPageProps = { projectId?: string }

function Board({ projectId: projectIdProp }: BoardPageProps = {}) {
  const cm = getClassMap()
  const params = useParams<{ projectId: string }>()
  const projectId = projectIdProp ?? params.projectId
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [tasks, setTasks] = useState<Task[]>([])
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<StatusKey | null>(null)
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)

  // Escape closes the add-task modal (keyboard equivalent of the pointer-only
  // backdrop click).
  useEffect(() => {
    if (!showAddTaskModal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAddTaskModal(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showAddTaskModal])
  const [addTaskColumn, setAddTaskColumn] = useState<StatusKey>('todo')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>(
    'medium',
  )
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [creating, setCreating] = useState(false)

  const STATUS_LABELS: Record<StatusKey, string> = useMemo(
    () => ({
      todo: t('status.todo', {}, { defaultValue: 'To Do' }),
      in_progress: t('status.inProgress', {}, { defaultValue: 'In Progress' }),
      in_review: t('status.inReview', {}, { defaultValue: 'In Review' }),
      done: t('status.done', {}, { defaultValue: 'Done' }),
    }),
    [t],
  )

  const STATUS_COLORS: Record<
    StatusKey,
    { headerText: string; countBg: string; countText: string }
  > = {
    todo: {
      headerText: 'text-foreground',
      countBg: 'bg-border',
      countText: 'text-foreground',
    },
    in_progress: {
      headerText: 'text-cyan-700 dark:text-cyan-400',
      countBg: 'bg-cyan-100 dark:bg-cyan-900/30',
      countText: 'text-cyan-700 dark:text-cyan-300',
    },
    in_review: {
      headerText: 'text-warning',
      countBg: 'bg-warning-light',
      countText: 'text-warning',
    },
    done: {
      headerText: 'text-success',
      countBg: 'bg-success-light',
      countText: 'text-success',
    },
  }

  const loadAll = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!projectId) return
      // A live-event refresh is `silent` — don't flash the full-board spinner on
      // every task another collaborator adds/moves; only the first load shows it.
      if (!opts?.silent) setLoading(true)
      setError(null)
      try {
        const [projRes, taskRes] = await Promise.all([
          http.get<Project>(`/api/projects/${projectId}`),
          http.get<Task[]>(`/api/tasks`, { params: { project_id: projectId } }),
        ])
        const proj =
          (projRes as unknown as { data?: Project }).data ?? (projRes as unknown as Project)
        const list =
          (taskRes as unknown as { data?: Task[] }).data ?? (taskRes as unknown as Task[])
        setProject(proj ?? null)
        setTasks(Array.isArray(list) ? list : [])
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t('board.loadError', {}, { defaultValue: 'Failed to load board' }),
        )
      } finally {
        setLoading(false)
      }
    },
    [http, projectId, t],
  )

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Live board — the API broadcasts task changes to the per-project room named by
  // the bare projectId (api/src/handlers/tasks.ts). Join it and silently re-fetch
  // on each event so a collaborator's add/move/delete appears without a reload.
  // Room + event names MUST match the server exactly — a mismatch is a silent
  // no-op. The room is membership-guarded, so the socket carries the auth token
  // (see lib/realtime.ts). Realtime is an enhancement: if the socket can't
  // connect, the board still works from the initial fetch + optimistic updates.
  useEffect(() => {
    if (!projectId) return
    let active = true
    let connection: RealtimeConnection | null = null
    const onTaskEvent = () => {
      void loadAll({ silent: true })
    }
    getRealtimeConnection()
      .then((conn) => {
        if (!active) return
        connection = conn
        conn.on('task:created', onTaskEvent)
        conn.on('task:updated', onTaskEvent)
        conn.on('task:deleted', onTaskEvent)
        return conn.joinRoom(projectId)
      })
      .catch(() => {
        // Socket unavailable — the board still works from the initial fetch.
      })
    return () => {
      active = false
      if (connection) {
        connection.off('task:created', onTaskEvent)
        connection.off('task:updated', onTaskEvent)
        connection.off('task:deleted', onTaskEvent)
        connection.leaveRoom(projectId).catch(() => {})
      }
    }
  }, [projectId, loadAll])

  const tasksByStatus = useMemo(() => {
    const grouped: Record<StatusKey, Task[]> = {
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
    }
    for (const task of tasks) {
      const key = (STATUSES.includes(task.status as StatusKey) ? task.status : 'todo') as StatusKey
      grouped[key].push(task)
    }
    return grouped
  }, [tasks])

  const handleDragStart = (taskId: string) => () => setDragging(taskId)
  const handleDragOver = (col: StatusKey) => (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverColumn(col)
  }
  const handleDragLeave = () => setDragOverColumn(null)
  const handleDrop = (toStatus: StatusKey) => async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverColumn(null)
    if (!dragging) return
    const task = tasks.find((row) => row.id === dragging)
    if (!task || task.status === toStatus) {
      setDragging(null)
      return
    }
    setTasks((prev) =>
      prev.map((row) => (row.id === dragging ? { ...row, status: toStatus } : row)),
    )
    setDragging(null)
    try {
      await http.patch(`/api/tasks/${task.id}`, { status: toStatus })
      track({
        name: 'task.status_changed',
        properties: { taskId: task.id, from: task.status, to: toStatus, surface: 'board' },
      })
    } catch (_error) {
      // Optimistic update failed — reload to recover board state.
      loadAll()
    }
  }

  const handleToggleStatus = useCallback(
    async (task: Task) => {
      const next = task.status === 'done' ? 'todo' : 'done'
      setTasks((prev) => prev.map((row) => (row.id === task.id ? { ...row, status: next } : row)))
      try {
        await http.patch(`/api/tasks/${task.id}`, { status: next })
        track({
          name: 'task.status_changed',
          properties: { taskId: task.id, to: next, surface: 'board' },
        })
      } catch (_error) {
        // Optimistic update failed — reload to recover board state.
        loadAll()
      }
    },
    [http, loadAll],
  )

  // Confirmation is handled inline by the two-step ConfirmButton (arm →
  // confirm) — no blocking window.confirm dialog.
  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      setTasks((prev) => prev.filter((row) => row.id !== taskId))
      try {
        await http.delete(`/api/tasks/${taskId}`)
        track({ name: 'task.deleted', properties: { taskId } })
      } catch (_error) {
        // Optimistic delete failed — reload to recover board state.
        loadAll()
      }
    },
    [http, loadAll],
  )

  const openAddTask = (col: StatusKey) => {
    setAddTaskColumn(col)
    setNewTaskTitle('')
    setNewTaskPriority('medium')
    setNewTaskDueDate('')
    setShowAddTaskModal(true)
  }

  const handleCreateTask = useCallback(async () => {
    const title = newTaskTitle.trim()
    if (!title || !projectId) return
    setCreating(true)
    try {
      const res = await http.post<Task>('/api/tasks', {
        title,
        project_id: projectId,
        status: addTaskColumn,
        priority: newTaskPriority,
        ...(newTaskDueDate ? { due_date: new Date(newTaskDueDate).toISOString() } : {}),
      })
      const created = (res as unknown as { data?: Task }).data ?? (res as unknown as Task)
      if (created?.id) {
        track({
          name: 'task.created',
          properties: {
            taskId: created.id,
            projectId,
            status: addTaskColumn,
            priority: newTaskPriority,
          },
        })
        setTasks((prev) => [...prev, created])
        setShowAddTaskModal(false)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('board.createTaskError', {}, { defaultValue: 'Failed to create task' }),
      )
    } finally {
      setCreating(false)
    }
  }, [http, newTaskTitle, newTaskPriority, newTaskDueDate, projectId, addTaskColumn, t])

  return (
    <AppShell
      footer={
        <button
          type="button"
          data-testid="board-back-to-dashboard"
          onClick={() => navigate('/dashboard')}
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 2.5),
            'rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high/40 transition-colors',
          )}
        >
          {t('board.backToDashboard', {}, { defaultValue: '← Back to dashboard' })}
        </button>
      }
    >
      <div
        className={cm.cn(cm.flex1, cm.flex({ direction: 'col' }), 'min-w-0')}
        data-testid="board-page"
      >
        <header
          className={cm.cn(
            cm.flex({ justify: 'between', align: 'center' }),
            cm.sp('px', 8),
            cm.sp('py', 5),
            'sticky top-14 md:top-0 z-30 bg-surface/80 backdrop-blur-xl shadow-sm',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col' }))}>
            <h2
              className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight')}
              data-testid="board-project-name"
            >
              {project?.name ?? t('board.untitled', {}, { defaultValue: 'Project' })}
            </h2>
            <nav className={cm.cn(cm.flex({ gap: 'md' }), cm.sp('mt', 1), 'text-sm')}>
              <Link
                className={cm.cn('font-bold text-primary border-b-2 border-primary pb-1')}
                to={`/projects/${projectId}/board`}
              >
                {t('board.tabBoard', {}, { defaultValue: 'Board' })}
              </Link>
              <Link
                className={cm.cn('text-on-surface-variant hover:text-on-surface')}
                to={`/projects/${projectId}/tasks`}
              >
                {t('board.tabList', {}, { defaultValue: 'List' })}
              </Link>
              <Link
                className={cm.cn('text-on-surface-variant hover:text-on-surface')}
                to={`/projects/${projectId}/timeline`}
              >
                {t('board.tabTimeline', {}, { defaultValue: 'Timeline' })}
              </Link>
            </nav>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <button
              type="button"
              data-testid="board-add-task"
              onClick={() => openAddTask('todo')}
              className={cm.cn(
                'flex items-center gap-2 px-5 py-2 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-lg shadow-sm hover:opacity-90 active:scale-95 transition-all text-sm font-semibold',
              )}
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              {t('board.addTask', {}, { defaultValue: 'Add Task' })}
            </button>
            <UserMenu />
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('mx', 8),
              cm.sp('mt', 4),
              cm.sp('p', 4),
              'rounded-xl bg-error-light text-error text-sm',
            )}
            data-testid="board-error"
          >
            {error}
          </div>
        )}

        {/* min-w-0 lets the kanban rail scroll INSIDE this wrapper instead of
            stretching the page: flex items default to min-width:auto, which
            would otherwise push the board columns out past the viewport. */}
        <div className={cm.cn(cm.flex1, cm.sp('p', 8), 'min-w-0 overflow-x-auto')}>
          {loading ? (
            <p className="text-sm text-on-surface-variant" data-testid="board-loading">
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : (
            <div className={cm.cn(cm.flex({ gap: 'lg' }), 'min-w-max items-start')}>
              {STATUSES.map((status) => {
                const colTasks = tasksByStatus[status]
                const colors = STATUS_COLORS[status]
                const isDropTarget = dragOverColumn === status
                return (
                  <section
                    key={status}
                    className={cm.cn('w-80 flex flex-col gap-4')}
                    data-testid={`board-column-${status}`}
                    data-column-status={status}
                    onDragOver={handleDragOver(status)}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop(status)}
                  >
                    <div
                      className={cm.cn(
                        cm.flex({ justify: 'between', align: 'center' }),
                        cm.sp('px', 2),
                      )}
                    >
                      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                        <h3
                          className={cm.cn(
                            colors.headerText,
                            'font-bold uppercase text-xs tracking-widest',
                          )}
                          data-testid={`board-column-title-${status}`}
                        >
                          {STATUS_LABELS[status]}
                        </h3>
                        <span
                          className={cm.cn(
                            colors.countBg,
                            colors.countText,
                            'px-2 py-0.5 rounded-full text-[10px] font-bold',
                          )}
                          data-testid={`board-column-count-${status}`}
                        >
                          {colTasks.length}
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label={t(
                          'board.addTaskToColumn',
                          { column: STATUS_LABELS[status] },
                          { defaultValue: 'Add task to {{column}}' },
                        )}
                        data-testid={`board-add-task-${status}`}
                        onClick={() => openAddTask(status)}
                        className={cm.cn(
                          'p-1 rounded-md hover:bg-surface-container-high transition-colors',
                        )}
                      >
                        <span className="material-symbols-outlined text-lg">add</span>
                      </button>
                    </div>
                    <div
                      className={cm.cn(
                        'rounded-xl p-3 min-h-[200px] transition-colors',
                        isDropTarget
                          ? 'bg-primary/10 outline outline-2 outline-dashed outline-primary/40'
                          : 'bg-surface-container-high/30',
                      )}
                      data-testid={`board-dropzone-${status}`}
                    >
                      <div className={cm.cn(cm.stack(2))}>
                        {colTasks.map((task) => {
                          const overdue = isOverdue(task.due_date, task.status)
                          const completed = task.status === 'done'
                          const date = task.due_date ? formatDueDate(task.due_date) : null
                          const prio = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.medium
                          return (
                            <article
                              key={task.id}
                              draggable
                              onDragStart={handleDragStart(task.id)}
                              data-testid="board-task-card"
                              data-task-id={task.id}
                              data-task-status={task.status}
                              data-task-priority={task.priority}
                              className={cm.cn(
                                cm.sp('p', 4),
                                'bg-surface-container-lowest rounded-xl shadow-sm cursor-grab active:cursor-grabbing select-none transition-transform hover:-translate-y-0.5',
                                cm.accentCard({ tone: 'custom' }),
                                completed && 'opacity-70',
                              )}
                              style={{
                                ['--mol-accent' as string]:
                                  status === 'done'
                                    ? 'var(--color-status-done)'
                                    : status === 'in_progress'
                                      ? 'var(--color-secondary-hover)'
                                      : status === 'in_review'
                                        ? 'var(--mol-color-warning)'
                                        : 'var(--color-status-todo)',
                              }}
                            >
                              <header
                                className={cm.cn(
                                  cm.flex({ justify: 'between', align: 'start' }),
                                  cm.sp('mb', 3),
                                )}
                              >
                                <span
                                  className={cm.cn(
                                    prio.bg,
                                    prio.text,
                                    'px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider',
                                  )}
                                  data-testid="board-task-priority"
                                >
                                  {task.priority}
                                </span>
                                <ConfirmButton
                                  label={
                                    <span
                                      className="material-symbols-outlined text-[18px]"
                                      aria-hidden="true"
                                    >
                                      delete
                                    </span>
                                  }
                                  confirmLabel={t(
                                    'board.confirmDeleteTask',
                                    {},
                                    { defaultValue: 'Delete this task?' },
                                  )}
                                  aria-label={t('common.delete', {}, { defaultValue: 'Delete' })}
                                  onConfirm={() => handleDeleteTask(task.id)}
                                  data-mol-id="board-task-delete"
                                  size="sm"
                                  color="error"
                                  variant="ghost"
                                  disarmSeconds={6}
                                />
                              </header>
                              <h4
                                className={cm.cn(
                                  'font-bold leading-tight',
                                  completed && 'line-through text-on-surface-variant',
                                )}
                                data-testid="board-task-title"
                              >
                                {task.title}
                              </h4>
                              <footer
                                className={cm.cn(
                                  cm.flex({ justify: 'between', align: 'center' }),
                                  cm.sp('mt', 4),
                                  'pt-3 border-t border-outline-variant/10',
                                )}
                              >
                                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                                  <button
                                    type="button"
                                    data-testid="board-task-toggle"
                                    aria-label={
                                      completed
                                        ? t(
                                            'task.markUndone',
                                            {},
                                            { defaultValue: 'Mark as not done' },
                                          )
                                        : t('task.markDone', {}, { defaultValue: 'Mark as done' })
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleToggleStatus(task)
                                    }}
                                    className={cm.cn(
                                      'w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-colors',
                                      completed
                                        ? 'bg-success text-inverse-surface'
                                        : 'border-2 border-outline-variant hover:border-primary',
                                    )}
                                  >
                                    {completed && (
                                      <span className="material-symbols-outlined text-[14px]">
                                        check
                                      </span>
                                    )}
                                  </button>
                                  {date && (
                                    <span
                                      className={cm.cn(
                                        overdue
                                          ? 'text-error font-bold'
                                          : 'text-on-surface-variant',
                                        'text-[11px]',
                                      )}
                                      data-testid="board-task-date"
                                    >
                                      {date}
                                      {overdue && ' (Overdue)'}
                                    </span>
                                  )}
                                </div>
                                {task.assignee_name ? (
                                  <span
                                    className={cm.cn(
                                      cm.w(6),
                                      cm.h(6),
                                      cm.roundedFull,
                                      cm.flex({ align: 'center', justify: 'center' }),
                                      'bg-primary-container/40 text-[10px] font-bold text-primary',
                                    )}
                                    data-testid="board-task-assignee"
                                    title={task.assignee_name}
                                  >
                                    {task.assignee_name.charAt(0).toUpperCase()}
                                  </span>
                                ) : null}
                              </footer>
                            </article>
                          )
                        })}
                        {colTasks.length === 0 && (
                          <p
                            className="text-xs text-on-surface-variant/70 italic px-2 py-4"
                            data-testid={`board-column-empty-${status}`}
                          >
                            {t('board.columnEmpty', {}, { defaultValue: 'Drop tasks here' })}
                          </p>
                        )}
                      </div>
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showAddTaskModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-task-title"
          data-testid="board-add-task-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            aria-hidden="true"
            onClick={() => setShowAddTaskModal(false)}
            className="absolute inset-0 bg-foreground/40"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-surface shadow-xl p-8">
            <h3 id="add-task-title" className={cm.cn(cm.textSize('xl'), 'font-bold mb-6')}>
              {t('board.newTaskTitle', {}, { defaultValue: 'New Task' })}{' '}
              <span className="text-on-surface-variant text-sm font-normal">
                · {STATUS_LABELS[addTaskColumn]}
              </span>
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleCreateTask()
              }}
              className={cm.stack(4)}
            >
              <div className={cm.stack(2)}>
                <label
                  htmlFor="board-new-task-title"
                  className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface-variant')}
                >
                  {t('form.title', {}, { defaultValue: 'Title' })}
                </label>
                <input
                  id="board-new-task-title"
                  data-testid="board-new-task-title"
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full h-11 px-4 rounded-lg bg-surface-container-low border border-outline-variant/40 outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
                <div className={cm.stack(2)}>
                  <label
                    htmlFor="board-new-task-priority"
                    className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface-variant')}
                  >
                    {t('form.priority', {}, { defaultValue: 'Priority' })}
                  </label>
                  <select
                    id="board-new-task-priority"
                    data-testid="board-new-task-priority"
                    value={newTaskPriority}
                    onChange={(e) =>
                      setNewTaskPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')
                    }
                    className="w-full h-11 px-3 rounded-lg bg-surface-container-low border border-outline-variant/40 outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="low">{t('priority.low', {}, { defaultValue: 'Low' })}</option>
                    <option value="medium">
                      {t('priority.medium', {}, { defaultValue: 'Medium' })}
                    </option>
                    <option value="high">{t('priority.high', {}, { defaultValue: 'High' })}</option>
                    <option value="urgent">
                      {t('priority.urgent', {}, { defaultValue: 'Urgent' })}
                    </option>
                  </select>
                </div>
                <div className={cm.stack(2)}>
                  <label
                    htmlFor="board-new-task-due"
                    className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface-variant')}
                  >
                    {t('board.dueDate', {}, { defaultValue: 'Due Date' })}
                  </label>
                  <input
                    id="board-new-task-due"
                    data-testid="board-new-task-due"
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg bg-surface-container-low border border-outline-variant/40 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }), cm.sp('pt', 2))}>
                <button
                  type="button"
                  data-testid="board-new-task-cancel"
                  onClick={() => setShowAddTaskModal(false)}
                  className="px-4 h-10 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="submit"
                  data-testid="board-new-task-submit"
                  disabled={creating || !newTaskTitle.trim()}
                  className="px-5 h-10 rounded-lg text-sm font-semibold text-on-primary bg-gradient-to-br from-primary to-primary-container disabled:opacity-50"
                >
                  {creating
                    ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                    : t('common.create', {}, { defaultValue: 'Create' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  )
}

export default Board
export { Board, Board as BoardPage, Board as BoardRoute }
