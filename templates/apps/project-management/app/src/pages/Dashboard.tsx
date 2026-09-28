import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { AppShell } from '../components/AppShell.js'
import { UserMenu } from '../components/UserMenu.js'

interface Project {
  id: string
  name: string
  description?: string | null
  status: string
  color?: string | null
  due_date?: string | null
  created_at: string
  updated_at: string
}

interface Task {
  id: string
  title: string
  project_id: string
  status: string
  priority: string
  due_date?: string | null
}

interface ProfileResponse {
  id: string
  name: string
  email: string
  planKey: string
}

const PROJECT_COLORS = ['#5b67d8', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0891b2']

function pickColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length]
}

function formatDate(date: string | null | undefined): string | null {
  if (!date) return null
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function isOverdue(date: string | null | undefined, status: string): boolean {
  if (!date || status === 'done') return false
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return false
  return d.getTime() < Date.now()
}

function isDueToday(date: string | null | undefined): boolean {
  if (!date) return false
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return false
  const today = new Date()
  return (
    d.getUTCFullYear() === today.getUTCFullYear() &&
    d.getUTCMonth() === today.getUTCMonth() &&
    d.getUTCDate() === today.getUTCDate()
  )
}

function progressFor(
  projectId: string,
  tasks: Task[],
): { pct: number; total: number; done: number } {
  const own = tasks.filter((t) => t.project_id === projectId)
  const done = own.filter((t) => t.status === 'done').length
  const pct = own.length === 0 ? 0 : Math.round((done / own.length) * 100)
  return { pct, total: own.length, done }
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const { user } = useAuth<{ id: string; name?: string; email?: string }>()

  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)

  // Escape closes the new-project modal (keyboard equivalent of the
  // pointer-only backdrop click).
  useEffect(() => {
    if (!showNewProject) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowNewProject(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showNewProject])
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [profRes, projRes, taskRes] = await Promise.all([
        http.get<ProfileResponse>('/api/profile/me').catch(() => null),
        http.get<Project[]>('/api/projects'),
        http.get<Task[]>('/api/tasks'),
      ])
      const profData = profRes
        ? ((profRes as unknown as { data?: ProfileResponse }).data ??
          (profRes as unknown as ProfileResponse))
        : null
      const projList =
        (projRes as unknown as { data?: Project[] }).data ?? (projRes as unknown as Project[])
      const taskList =
        (taskRes as unknown as { data?: Task[] }).data ?? (taskRes as unknown as Task[])
      setProfile(profData)
      setProjects(Array.isArray(projList) ? projList : [])
      setTasks(Array.isArray(taskList) ? taskList : [])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('dashboard.loadError', {}, { defaultValue: 'Failed to load dashboard' }),
      )
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleCreateProject = useCallback(async () => {
    const name = newProjectName.trim()
    if (!name) return
    setCreating(true)
    try {
      const res = await http.post<Project>('/api/projects', {
        name,
        description: newProjectDescription.trim() || undefined,
        color: pickColor(name),
      })
      const created = (res as unknown as { data?: Project }).data ?? (res as unknown as Project)
      if (created?.id) {
        track({
          name: 'project.created',
          properties: { projectId: created.id, name: created.name },
        })
        setProjects((prev) => [created, ...prev])
        setNewProjectName('')
        setNewProjectDescription('')
        setShowNewProject(false)
        navigate(`/projects/${created.id}/board`)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('dashboard.createError', {}, { defaultValue: 'Failed to create project' }),
      )
    } finally {
      setCreating(false)
    }
  }, [http, newProjectName, newProjectDescription, navigate, t])

  const handleToggleTask = useCallback(
    async (task: Task) => {
      const next = task.status === 'done' ? 'todo' : 'done'
      setTasks((prev) => prev.map((row) => (row.id === task.id ? { ...row, status: next } : row)))
      try {
        await http.patch(`/api/tasks/${task.id}`, { status: next })
        track({
          name: 'task.status_changed',
          properties: { taskId: task.id, to: next, surface: 'dashboard' },
        })
      } catch (_error) {
        // Reload to recover from failure.
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
        // Optimistic delete failed — reload to recover dashboard state.
        loadAll()
      }
    },
    [http, loadAll],
  )

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return tasks
    return tasks.filter((task) => task.title.toLowerCase().includes(q))
  }, [tasks, searchQuery])

  const projectsById = useMemo(() => {
    const map = new Map<string, Project>()
    for (const p of projects) map.set(p.id, p)
    return map
  }, [projects])

  const visibleTasks = useMemo(() => filteredTasks.slice(0, 8), [filteredTasks])

  const tasksDueToday = useMemo(
    () => tasks.filter((task) => task.status !== 'done' && isDueToday(task.due_date)).length,
    [tasks],
  )
  const overdueTasks = useMemo(
    () => tasks.filter((task) => isOverdue(task.due_date, task.status)).length,
    [tasks],
  )
  const openTasks = useMemo(() => tasks.filter((task) => task.status !== 'done').length, [tasks])

  const greetingName =
    profile?.name?.trim() ||
    user?.name?.trim() ||
    (profile?.email ? profile.email.split('@')[0] : '') ||
    (user?.email ? user.email.split('@')[0] : '') ||
    t('dashboard.fallbackName', {}, { defaultValue: 'there' })

  // design-project-management-dashboard.html opens with a time-of-day
  // greeting ("Good morning, Mike").
  const hour = new Date().getHours()
  const greetingKey =
    hour < 12
      ? 'dashboard.greetingMorning'
      : hour < 18
        ? 'dashboard.greetingAfternoon'
        : 'dashboard.greetingEvening'
  const greetingDefault =
    hour < 12
      ? 'Good morning, {{name}}'
      : hour < 18
        ? 'Good afternoon, {{name}}'
        : 'Good evening, {{name}}'

  return (
    <AppShell
      footer={
        <button
          type="button"
          data-testid="dashboard-new-project"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w('full'),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl gap-2 shadow-lg active:scale-[0.98] transition-transform',
          )}
          onClick={() => setShowNewProject(true)}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>add</span>
          {t('common.newProject', {}, { defaultValue: 'New Project' })}
        </button>
      }
    >
      <div
        className={cm.cn(
          cm.flex1,
          cm.flex({ direction: 'col' }),
          'bg-surface text-on-surface antialiased',
        )}
      >
        <header
          className={cm.cn(
            cm.flex({ justify: 'between', align: 'center' }),
            cm.sp('px', 8),
            cm.sp('py', 4),
            cm.w('full'),
            "sticky top-14 md:top-0 z-40 bg-surface/80 backdrop-blur-xl shadow-sm dark:shadow-none font-['Inter']",
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center' }), cm.flex1, cm.maxW('xl'))}>
            <div className={cm.cn(cm.w('full'), 'relative')}>
              <span
                className={cm.cn(
                  'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50',
                )}
              >
                search
              </span>
              <input
                aria-label={t('search.aria', {}, { defaultValue: 'Search tasks' })}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('pl', 10),
                  cm.sp('pr', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-amber-500/20 transition-all',
                )}
                placeholder={t('search.placeholder', {}, { defaultValue: 'Search tasks...' })}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
            <div className={cm.textRight}>
              <p
                className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}
                data-testid="dashboard-greeting-name"
              >
                {greetingName}
              </p>
              <p
                className={cm.cn(
                  cm.fontWeight('medium'),
                  'text-[10px] text-on-surface-variant uppercase tracking-wider',
                )}
                data-testid="dashboard-plan-label"
              >
                {profile?.planKey ?? 'free'}
              </p>
            </div>
            <UserMenu />
          </div>
        </header>

        <div className={cm.cn(cm.sp('p', 8), cm.stack(8), 'max-w-[1440px]')}>
          <section className={cm.flex({ justify: 'between', align: 'end' })}>
            <div className={cm.stack(2)}>
              <h1
                className={cm.cn(
                  cm.textSize('4xl'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
                data-testid="dashboard-greeting"
              >
                {t(greetingKey, { name: greetingName }, { defaultValue: greetingDefault })}
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant/80',
                )}
              >
                {t('dashboard.subtitle', {}, { defaultValue: "Here's your project overview." })}
              </p>
            </div>
          </section>

          {error && (
            <div
              role="alert"
              className={cm.cn(cm.sp('p', 4), 'rounded-xl bg-error-light text-error')}
            >
              {error}
            </div>
          )}

          <section
            className={cm.cn(cm.grid({ cols: 2, gap: 'xl' }), 'md:grid-cols-4')}
            aria-label={t('dashboard.kpis', {}, { defaultValue: 'Key metrics' })}
          >
            <KpiTile
              cm={cm}
              icon="folder_open"
              accentClass="border-primary"
              label={t('nav.projects', {}, { defaultValue: 'Projects' })}
              value={projects.length}
              hint={t('dashboard.kpi.projectsHint', {}, { defaultValue: 'In flight' })}
              hintClass="text-primary"
              testId="kpi-projects"
            />
            <KpiTile
              cm={cm}
              icon="event"
              accentClass="border-primary"
              label={t('kpi.tasksDueLabel', {}, { defaultValue: 'Due Today' })}
              value={tasksDueToday}
              hint={t('dashboard.kpi.dueHint', {}, { defaultValue: 'Priority focus' })}
              hintClass="text-primary"
              testId="kpi-due-today"
            />
            <KpiTile
              cm={cm}
              icon="error"
              accentClass="border-error"
              label={t('status.overdue', {}, { defaultValue: 'Overdue' })}
              value={overdueTasks}
              valueClass="text-error"
              hint={t('dashboard.kpi.overdueHint', {}, { defaultValue: 'Needs action' })}
              hintClass="text-error"
              testId="kpi-overdue"
            />
            <KpiTile
              cm={cm}
              icon="checklist"
              accentClass="border-primary"
              label={t('kpi.openTasksLabel', {}, { defaultValue: 'Open Tasks' })}
              value={openTasks}
              hint={t('dashboard.kpi.openHint', {}, { defaultValue: 'Still open' })}
              hintClass="text-on-surface-variant"
              testId="kpi-open"
            />
          </section>

          <div className={cm.cn(cm.grid({ cols: 12, gap: 'xl' }), 'items-start')}>
            <div className={cm.cn(cm.stack(8), 'col-span-12 md:col-span-8')}>
              <div className={cm.cn('bg-surface-container-lowest rounded-xl p-8 shadow-sm')}>
                <div className={cm.cn('flex justify-between items-center mb-6')}>
                  <h2 className={cm.cn('text-2xl font-bold tracking-tight')}>
                    {t('dashboard.myTasksTitle', {}, { defaultValue: 'My Tasks' })}{' '}
                    <span
                      className={cm.cn('text-on-surface-variant text-base font-normal')}
                      data-testid="dashboard-task-count"
                    >
                      ({tasks.length})
                    </span>
                  </h2>
                  <Link
                    className={cm.cn('text-primary text-sm font-bold hover:underline')}
                    to="/my-tasks"
                  >
                    {t('common.viewAll', {}, { defaultValue: 'View all' })}
                  </Link>
                </div>

                {loading ? (
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                    data-testid="dashboard-tasks-loading"
                  >
                    {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                  </p>
                ) : visibleTasks.length === 0 ? (
                  <div
                    className={cm.cn(cm.stack(2), cm.sp('py', 6), 'text-on-surface-variant')}
                    data-testid="dashboard-tasks-empty"
                  >
                    <p className={cm.cn(cm.textSize('sm'))}>
                      {projects.length === 0
                        ? t(
                            'dashboard.tasksEmptyNoProject',
                            {},
                            { defaultValue: 'Create a project to start adding tasks.' },
                          )
                        : t(
                            'dashboard.tasksEmpty',
                            {},
                            { defaultValue: 'No tasks yet. Visit a project board to add one.' },
                          )}
                    </p>
                  </div>
                ) : (
                  <ul className={cm.cn(cm.stack(1))} data-testid="dashboard-tasks">
                    {visibleTasks.map((task) => {
                      const project = projectsById.get(task.project_id)
                      const date = formatDate(task.due_date)
                      const overdue = isOverdue(task.due_date, task.status)
                      const completed = task.status === 'done'
                      return (
                        <li
                          key={task.id}
                          className={cm.cn(
                            'flex items-center justify-between py-3 px-2 hover:bg-surface-container-low transition-colors rounded-lg',
                          )}
                          data-testid="dashboard-task-row"
                          data-task-id={task.id}
                          data-task-status={task.status}
                        >
                          <div className={cm.cn('flex items-center gap-4 flex-1 min-w-0')}>
                            <button
                              type="button"
                              aria-label={
                                completed
                                  ? t('task.markUndone', {}, { defaultValue: 'Mark as not done' })
                                  : t('task.markDone', {}, { defaultValue: 'Mark as done' })
                              }
                              onClick={() => handleToggleTask(task)}
                              className={cm.cn(
                                'w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-colors',
                                completed
                                  ? 'bg-primary-container text-on-primary-container'
                                  : 'border-2 border-outline-variant hover:border-primary',
                              )}
                              data-testid="dashboard-task-toggle"
                            >
                              {completed && (
                                <span className={cm.cn('material-symbols-outlined text-[14px]')}>
                                  check
                                </span>
                              )}
                            </button>
                            <div className="min-w-0">
                              <p
                                className={cm.cn(
                                  'font-bold text-on-surface truncate',
                                  completed && 'line-through text-on-surface-variant',
                                )}
                                data-testid="dashboard-task-title"
                              >
                                {task.title}
                              </p>
                              <p className={cm.cn('text-xs text-on-surface-variant truncate')}>
                                {project?.name ??
                                  t('status.unassigned', {}, { defaultValue: 'Unassigned' })}
                              </p>
                            </div>
                          </div>
                          <div className={cm.cn('flex items-center gap-4')}>
                            {date && (
                              <div className={cm.cn('flex items-center gap-2')}>
                                <span
                                  className={cm.cn(
                                    'w-2 h-2 rounded-full',
                                    overdue
                                      ? 'bg-red-500'
                                      : completed
                                        ? 'bg-emerald-500'
                                        : 'bg-amber-400',
                                  )}
                                />
                                <span
                                  className={cm.cn('text-xs font-medium text-on-surface-variant')}
                                  data-testid="dashboard-task-date"
                                >
                                  {date}
                                </span>
                              </div>
                            )}
                            <ConfirmButton
                              label={
                                <span
                                  className="material-symbols-outlined text-[20px]"
                                  aria-hidden="true"
                                >
                                  delete
                                </span>
                              }
                              confirmLabel={t(
                                'dashboard.confirmDeleteTask',
                                {},
                                { defaultValue: 'Delete this task?' },
                              )}
                              aria-label={t('common.delete', {}, { defaultValue: 'Delete' })}
                              onConfirm={() => handleDeleteTask(task.id)}
                              data-mol-id="dashboard-task-delete"
                              size="sm"
                              color="error"
                              variant="ghost"
                              disarmSeconds={6}
                            />
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <div className={cm.cn('bg-surface-container-lowest rounded-xl p-8 shadow-sm')}>
                <div className={cm.cn('flex justify-between items-center mb-6')}>
                  <h2 className={cm.cn('text-2xl font-bold tracking-tight')}>
                    {t('nav.projects', {}, { defaultValue: 'Projects' })}{' '}
                    <span
                      className={cm.cn('text-on-surface-variant text-base font-normal')}
                      data-testid="dashboard-project-count"
                    >
                      ({projects.length})
                    </span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowNewProject(true)}
                    data-testid="dashboard-new-project-secondary"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      'text-sm font-bold rounded-lg bg-primary-container/30 hover:bg-primary-container/50 text-primary',
                    )}
                  >
                    {t('common.newProject', {}, { defaultValue: 'New Project' })}
                  </button>
                </div>
                {loading ? (
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                    data-testid="dashboard-projects-loading"
                  >
                    {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                  </p>
                ) : projects.length === 0 ? (
                  <div
                    className={cm.cn(
                      cm.stack(4),
                      cm.sp('py', 8),
                      'text-center text-on-surface-variant',
                    )}
                    data-testid="dashboard-projects-empty"
                  >
                    <p className={cm.cn(cm.textSize('sm'))}>
                      {t(
                        'dashboard.projectsEmpty',
                        {},
                        { defaultValue: 'You have no projects yet.' },
                      )}
                    </p>
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowNewProject(true)}
                        data-testid="dashboard-projects-empty-cta"
                        className={cm.cn(
                          cm.sp('px', 5),
                          cm.sp('py', 2.5),
                          'text-sm font-bold rounded-xl text-on-primary bg-gradient-to-br from-primary to-primary-container',
                        )}
                      >
                        {t(
                          'dashboard.createFirstProject',
                          {},
                          { defaultValue: 'Create your first project' },
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <ul
                    className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-3')}
                    data-testid="dashboard-projects"
                  >
                    {projects.map((project) => {
                      const { pct, total, done } = progressFor(project.id, tasks)
                      const color = project.color || pickColor(project.name)
                      return (
                        <li
                          key={project.id}
                          data-testid="dashboard-project-row"
                          data-project-id={project.id}
                          className={cm.cn(
                            cm.sp('p', 5),
                            'rounded-xl bg-surface-container-low border-l-4 border-primary',
                          )}
                          style={{ borderLeftColor: color }}
                        >
                          <Link
                            to={`/projects/${project.id}/board`}
                            className={cm.cn(
                              cm.flex({ direction: 'col', gap: 'sm' }),
                              'no-underline',
                            )}
                            data-testid="dashboard-project-link"
                          >
                            <div className={cm.flex({ justify: 'between', align: 'start' })}>
                              <p
                                className={cm.cn('font-bold text-on-surface truncate')}
                                data-testid="dashboard-project-name"
                              >
                                {project.name}
                              </p>
                              <span
                                className={cm.cn('text-sm font-bold text-primary')}
                                data-testid="dashboard-project-pct"
                              >
                                {pct}%
                              </span>
                            </div>
                            <p
                              className={cm.cn('text-xs text-on-surface-variant')}
                              data-testid="dashboard-project-counts"
                            >
                              {t(
                                'dashboard.projectCounts',
                                { done, total },
                                { defaultValue: '{{done}} of {{total}} tasks done' },
                              )}
                            </p>
                            <div
                              className={cm.cn(
                                'w-full h-2 bg-surface-container-high rounded-full overflow-hidden mt-2',
                              )}
                            >
                              <div
                                className={cm.cn('h-full rounded-full bg-primary')}
                                style={{ width: `${pct}%`, backgroundColor: color }}
                              />
                            </div>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className={cm.cn('col-span-12 md:col-span-4')}>
              <div className={cm.cn('bg-surface-container-lowest rounded-xl p-8 shadow-sm')}>
                <h2 className={cm.cn('text-2xl font-bold tracking-tight mb-6')}>
                  {t('dashboard.upcomingTitle', {}, { defaultValue: 'Upcoming Deadlines' })}
                </h2>
                {(() => {
                  const upcoming = tasks
                    .filter((task) => task.status !== 'done' && task.due_date)
                    .sort((a, b) => {
                      const da = a.due_date ? new Date(a.due_date).getTime() : Infinity
                      const db = b.due_date ? new Date(b.due_date).getTime() : Infinity
                      return da - db
                    })
                    .slice(0, 5)
                  if (loading) {
                    return (
                      <p
                        className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                        data-testid="dashboard-upcoming-loading"
                      >
                        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                      </p>
                    )
                  }
                  if (upcoming.length === 0) {
                    return (
                      <p
                        className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                        data-testid="dashboard-upcoming-empty"
                      >
                        {t(
                          'dashboard.upcomingEmpty',
                          {},
                          { defaultValue: 'No upcoming deadlines.' },
                        )}
                      </p>
                    )
                  }
                  return (
                    <ul className={cm.cn(cm.stack(4))} data-testid="dashboard-upcoming">
                      {upcoming.map((task) => {
                        const date = formatDate(task.due_date)
                        const project = projectsById.get(task.project_id)
                        return (
                          <li
                            key={task.id}
                            className={cm.cn(cm.flex({ align: 'start', gap: 'md' }))}
                            data-testid="dashboard-upcoming-row"
                          >
                            <div
                              className={cm.cn(
                                'mt-1 w-9 h-9 rounded-full flex items-center justify-center bg-primary-fixed text-primary',
                              )}
                            >
                              <span className={cm.cn('material-symbols-outlined text-[18px]')}>
                                event
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cm.cn('text-sm font-bold text-on-surface truncate')}>
                                {task.title}
                              </p>
                              <p
                                className={cm.cn(
                                  'text-[11px] uppercase tracking-wider text-on-surface-variant font-medium mt-1',
                                )}
                              >
                                {project?.name ??
                                  t('status.unassigned', {}, { defaultValue: 'Unassigned' })}
                                {date ? ` · ${date}` : ''}
                              </p>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showNewProject && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-project-title"
          data-testid="new-project-modal"
          className={cm.cn('fixed inset-0 z-50 flex items-center justify-center p-4')}
        >
          <div
            aria-hidden="true"
            onClick={() => setShowNewProject(false)}
            className={cm.cn('absolute inset-0 bg-foreground/40')}
          />
          <div
            className={cm.cn(
              cm.sp('p', 8),
              'relative w-full max-w-md rounded-2xl bg-surface shadow-xl',
            )}
          >
            <h3 id="new-project-title" className={cm.cn(cm.textSize('xl'), 'font-bold mb-6')}>
              {t('dashboard.newProjectTitle', {}, { defaultValue: 'New Project' })}
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleCreateProject()
              }}
              className={cm.stack(4)}
            >
              <div className={cm.stack(2)}>
                <label
                  htmlFor="new-project-name"
                  className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface-variant')}
                >
                  {t('form.name', {}, { defaultValue: 'Name' })}
                </label>
                <input
                  id="new-project-name"
                  data-testid="new-project-name"
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className={cm.cn(
                    cm.w('full'),
                    cm.h(11),
                    cm.sp('px', 4),
                    'rounded-lg bg-surface-container-low border border-outline-variant/40 outline-none focus:ring-2 focus:ring-primary',
                  )}
                />
              </div>
              <div className={cm.stack(2)}>
                <label
                  htmlFor="new-project-description"
                  className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface-variant')}
                >
                  {t('form.description', {}, { defaultValue: 'Description' })}
                </label>
                <textarea
                  id="new-project-description"
                  data-testid="new-project-description"
                  rows={3}
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('p', 4),
                    'rounded-lg bg-surface-container-low border border-outline-variant/40 outline-none focus:ring-2 focus:ring-primary resize-none',
                  )}
                />
              </div>
              <div className={cm.cn(cm.flex({ justify: 'end', gap: 'md' }), cm.sp('pt', 2))}>
                <button
                  type="button"
                  onClick={() => setShowNewProject(false)}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2.5),
                    'text-sm font-bold rounded-lg text-on-surface-variant hover:bg-surface-container-low',
                  )}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="submit"
                  data-testid="new-project-submit"
                  disabled={creating || !newProjectName.trim()}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2.5),
                    'text-sm font-bold rounded-lg text-on-primary bg-primary disabled:opacity-50',
                  )}
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

interface KpiTileProps {
  cm: ReturnType<typeof getClassMap>
  icon: string
  accentClass: string
  label: string
  value: number
  valueClass?: string
  /** Small bold hint in the tile's top-right (design: "+2 this week"). */
  hint?: string
  hintClass?: string
  testId?: string
}

function KpiTile({
  cm,
  icon,
  accentClass,
  label,
  value,
  valueClass,
  hint,
  hintClass,
  testId,
}: KpiTileProps) {
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-xl border-t-4 shadow-sm hover:-translate-y-0.5 transition-transform duration-300',
        accentClass,
      )}
      data-testid={testId}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
        <span
          className={cm.cn(
            cm.sp('p', 2),
            'material-symbols-outlined text-primary bg-primary-fixed rounded-lg',
          )}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
        {hint && (
          <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), hintClass)}>{hint}</span>
        )}
      </div>
      <p
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          cm.sp('mb', 1),
          'text-on-surface-variant',
        )}
      >
        {label}
      </p>
      <p
        className={cm.cn(cm.textSize('4xl'), 'font-extrabold text-on-surface', valueClass)}
        data-testid={testId ? `${testId}-value` : undefined}
      >
        {value}
      </p>
    </div>
  )
}

export default Dashboard
export { Dashboard as DashboardPage }
