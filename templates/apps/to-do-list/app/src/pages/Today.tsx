import { useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { FocusTimerCard } from '../components/FocusTimerCard.js'
import { ProjectTriad } from '../components/ProjectTriad.js'
import { TasksEditorial } from '../components/TasksEditorial.js'
import { TodayHeroCard } from '../components/TodayHeroCard.js'
import {
  createTask,
  listProjects,
  listTasks,
  type Project,
  type Task,
  toggleTaskCompleted,
} from '../lib/api.js'

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function Today() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [quickAdd, setQuickAdd] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    const [t, p] = await Promise.all([
      listTasks(http).catch(() => [] as Task[]),
      listProjects(http).catch(() => [] as Project[]),
    ])
    setTasks(t)
    setProjects(p)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    refresh()
      .catch(() => {
        if (!cancelled)
          setError(t('today.loadError', {}, { defaultValue: 'Failed to load tasks.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, t])

  const todayTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (!task.due_date) return false
        const d = new Date(task.due_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        d.setHours(0, 0, 0, 0)
        return d.getTime() <= today.getTime()
      }),
    [tasks],
  )

  const completed = todayTasks.filter((t) => t.completed).length
  const overdue = todayTasks.filter((t) => {
    if (t.completed || !t.due_date) return false
    const d = new Date(t.due_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    d.setHours(0, 0, 0, 0)
    return d.getTime() < today.getTime()
  }).length

  // Streak: consecutive days back from today where the user completed
  // at least one task. Backed entirely by the actual `completed_at`
  // timestamps so the number on the hero card means something.
  const streakDays = useMemo(() => {
    const days = new Set<string>()
    for (const task of tasks) {
      if (!task.completed || !task.completed_at) continue
      const d = new Date(task.completed_at)
      d.setHours(0, 0, 0, 0)
      days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
    }
    let count = 0
    const cursor = new Date()
    cursor.setHours(0, 0, 0, 0)
    while (days.has(`${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`)) {
      count += 1
      cursor.setDate(cursor.getDate() - 1)
    }
    return count
  }, [tasks])

  const taskCounts = useMemo(() => {
    const out: Record<string, { total: number; completed: number }> = {}
    for (const task of tasks) {
      const pid = task.project?.id ?? task.project_id
      if (!pid) continue
      if (!out[pid]) out[pid] = { total: 0, completed: 0 }
      out[pid].total += 1
      if (task.completed) out[pid].completed += 1
    }
    return out
  }, [tasks])

  const projectsForTriad = useMemo(
    () =>
      projects.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        description: p.description ?? '',
        sections: p.sections,
      })),
    [projects],
  )

  const onToggle = async (id: string) => {
    const updated = await toggleTaskCompleted(http, id).catch(() => null)
    if (!updated) return
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
    // Fire-and-forget domain analytics (no-ops without VITE_POSTHOG_KEY).
    void track({
      name: updated.completed ? 'task.completed' : 'task.reopened',
      properties: { task_id: updated.id, source: 'today' },
    })
  }

  const onQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = quickAdd.trim()
    if (!title || submitting) return
    setSubmitting(true)
    try {
      const created = await createTask(http, {
        title,
        due_date: todayIso(),
        priority: 4,
      })
      if (created) {
        setTasks((prev) => [...prev, created])
        void track({
          name: 'task.created',
          properties: { task_id: created.id, source: 'today' },
        })
      }
      setQuickAdd('')
    } finally {
      setSubmitting(false)
    }
  }

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const focusTask = todayTasks.find((t) => !t.completed && t.priority < 4) ?? null

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{dateLabel}</p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight mt-1')}>
          {t('status.today', {}, { defaultValue: 'Today' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'today.subheading',
            { completed, total: todayTasks.length },
            { defaultValue: '{{completed}}/{{total}} done · keep the cadence.' },
          )}
        </p>
      </header>

      <TodayHeroCard
        totalTasks={todayTasks.length}
        completedTasks={completed}
        overdueTasks={overdue}
        streakDays={streakDays}
        dateLabel={dateLabel}
      />

      {projectsForTriad.length > 0 && (
        <section className={cm.stack(4)}>
          <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
            <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
              {t('nav.projects', {}, { defaultValue: 'Projects' })}
            </h2>
          </div>
          <ProjectTriad projects={projectsForTriad} taskCounts={taskCounts} />
        </section>
      )}

      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
        <div className={cm.cn('lg:col-span-2 space-y-4')}>
          <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
            <h2 className={cm.cn('text-xl font-bold')}>
              {t('today.tasksHeading', {}, { defaultValue: 'Today + overdue' })}
            </h2>
          </div>

          <form
            onSubmit={onQuickAdd}
            className={cm.cn(
              cm.flex({ gap: 'sm', align: 'center' }),
              'rounded-full bg-surface-container-low border border-outline-variant/40 px-4 py-2.5 focus-within:ring-2 focus-within:ring-primary/30',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-primary text-base')}
              aria-hidden="true"
            >
              add_task
            </span>
            <input
              type="text"
              value={quickAdd}
              onChange={(e) => setQuickAdd(e.target.value)}
              placeholder={t(
                'today.quickAddPlaceholder',
                {},
                { defaultValue: 'Add a task for today…' },
              )}
              aria-label={t('today.quickAddLabel', {}, { defaultValue: 'Add a task for today' })}
              data-mol-id="today-quick-add"
              className={cm.cn('flex-1 bg-transparent border-0 outline-none text-sm')}
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={submitting || quickAdd.trim().length === 0}
              className={cm.cn(
                cm.sp('px', 3),
                // min-h keeps the submit a 36px tap target inside the pill.
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'rounded-full bg-primary text-on-primary min-h-9 disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              {submitting
                ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                : t('common.add', {}, { defaultValue: 'Add' })}
            </button>
          </form>

          {error ? (
            <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
          ) : loading ? (
            <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : (
            <TasksEditorial
              tasks={todayTasks}
              onToggle={onToggle}
              emptyMessage={t(
                'today.empty',
                {},
                { defaultValue: "You're all caught up. Take a breath." },
              )}
            />
          )}
        </div>

        <aside>
          <h2 className={cm.cn('text-xl font-bold mb-4')}>
            {t('today.focusHeading', {}, { defaultValue: 'Focus' })}
          </h2>
          <FocusTimerCard currentTaskTitle={focusTask?.title} />
        </aside>
      </section>
    </div>
  )
}
