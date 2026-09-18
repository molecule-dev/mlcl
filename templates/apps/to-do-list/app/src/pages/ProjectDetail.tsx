import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { TaskList } from '../components/TaskList.js'
import {
  createTask,
  deleteProject,
  getProject,
  listTasks,
  type Project,
  type Task,
  toggleTaskCompleted,
} from '../lib/api.js'

export function ProjectDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [quickAdd, setQuickAdd] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleted, setDeleted] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      getProject(http, id).catch(() => null),
      listTasks(http, { project_id: id }).catch(() => [] as Task[]),
    ])
      .then(([p, t]) => {
        if (cancelled) return
        setProject(p)
        setTasks(t)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('projectDetail.loadError', {}, { defaultValue: 'Failed to load project.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, id])

  const onToggle = async (taskId: string) => {
    const updated = await toggleTaskCompleted(http, taskId).catch(() => null)
    if (!updated) return
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)))
  }

  const onQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = quickAdd.trim()
    if (!title || !id || submitting) return
    setSubmitting(true)
    try {
      const created = await createTask(http, { title, project_id: id, priority: 4 })
      if (created) setTasks((prev) => [...prev, created])
      setQuickAdd('')
    } finally {
      setSubmitting(false)
    }
  }

  const onDeleteProject = async () => {
    if (!id) return
    if (
      !window.confirm(
        t(
          'projectDetail.deleteConfirm',
          { name: project?.name ?? '' },
          { defaultValue: 'Delete project "{{name}}"? Its tasks will move to your inbox.' },
        ),
      )
    )
      return
    await deleteProject(http, id).catch(() => null)
    setDeleted(true)
  }

  if (deleted) {
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.maxW('2xl'), cm.mxAuto, cm.textCenter)}
      >
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
          {t(
            'projectDetail.deleted',
            {},
            { defaultValue: 'Project deleted. Its tasks are now in your inbox.' },
          )}
        </p>
        <Link
          to="/today"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'inline-block bg-primary text-on-primary rounded-md',
          )}
        >
          {t('projectDetail.backToToday', {}, { defaultValue: 'Back to Today' })}
        </Link>
      </div>
    )
  }

  if (loading)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  if (error || !project)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-error')}>
        {error ?? t('projectDetail.notFound', {}, { defaultValue: 'Project not found.' })}
      </div>
    )

  // The current schema doesn't yet model task→section assignment, so
  // every task lives in the "unsectioned" bucket. The section list is
  // surfaced for future expansion but stays empty for now.
  const sections: { section: { id: string; name: string }; tasks: Task[] }[] = []
  const unsectioned = tasks

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto, 'space-y-6')}>
      <Link
        to="/today"
        className={cm.cn(
          cm.textSize('sm'),
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textPrimary,
          'hover:underline group w-fit',
        )}
      >
        <span
          className={cm.cn(
            'material-symbols-outlined text-base group-hover:-translate-x-0.5 transition-transform',
          )}
          aria-hidden="true"
        >
          arrow_back
        </span>
        {t('status.today', {}, { defaultValue: 'Today' })}
      </Link>

      <header className={cm.flex({ align: 'center', gap: 'md' })}>
        <span
          className={cm.cn('h-4 w-4 rounded-full shrink-0')}
          style={{ backgroundColor: project.color }}
        />
        <div className={cm.flex1}>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {project.name}
          </h1>
          {tasks.length > 0
            ? (() => {
                const completed = tasks.filter((t) => t.completed).length
                const remaining = tasks.length - completed
                const pct = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0
                return (
                  <div
                    className={cm.cn(
                      cm.flex({ gap: 'sm', wrap: 'wrap', align: 'center' }),
                      cm.sp('mt', 3),
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        cm.roundedFull,
                        'bg-primary-container text-primary uppercase tracking-wider tabular-nums',
                      )}
                    >
                      {t(
                        'projectDetail.remaining',
                        { count: remaining },
                        { defaultValue: '{{count}} remaining' },
                      )}
                    </span>
                    <span
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        cm.roundedFull,
                        'bg-success-light text-success uppercase tracking-wider tabular-nums',
                      )}
                    >
                      {t('projectDetail.completedPct', { pct }, { defaultValue: '{{pct}}% done' })}
                    </span>
                  </div>
                )
              })()
            : null}
        </div>
        <button
          type="button"
          onClick={onDeleteProject}
          aria-label={t(
            'projectDetail.deleteAria',
            { name: project.name },
            { defaultValue: 'Delete project {{name}}' },
          )}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'rounded-md border border-outline-variant text-on-surface-variant hover:bg-error/10 hover:text-error hover:border-error',
          )}
        >
          {t('projectDetail.delete', {}, { defaultValue: 'Delete project' })}
        </button>
      </header>

      <form
        onSubmit={onQuickAdd}
        className={cm.cn(cm.card(), cm.sp('p', 3), cm.flex({ gap: 'sm', align: 'center' }))}
      >
        <span className={cm.cn(cm.textSize('lg'), cm.textPrimary)}>＋</span>
        <input
          type="text"
          value={quickAdd}
          onChange={(e) => setQuickAdd(e.target.value)}
          placeholder={t(
            'projectDetail.quickAddPlaceholder',
            { project: project.name },
            { defaultValue: 'Add a task to {{project}}…' },
          )}
          aria-label={t(
            'projectDetail.quickAddLabel',
            {},
            { defaultValue: 'Add a task to this project' },
          )}
          data-mol-id="project-quick-add"
          className={cm.cn(
            cm.sp('px', 2),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'flex-1 bg-transparent border-0 outline-none',
          )}
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={submitting || quickAdd.trim().length === 0}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          {submitting
            ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
            : t('common.add', {}, { defaultValue: 'Add' })}
        </button>
      </form>

      {unsectioned.length > 0 ? <TaskList tasks={unsectioned} onToggle={onToggle} /> : null}

      {sections.map((s) => (
        <section key={s.section.id}>
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wide',
              'text-on-surface-variant',
              cm.sp('mb', 2),
            )}
          >
            {s.section.name}
          </h2>
          <TaskList tasks={s.tasks} onToggle={onToggle} emptyMessage="—" />
        </section>
      ))}
    </div>
  )
}
