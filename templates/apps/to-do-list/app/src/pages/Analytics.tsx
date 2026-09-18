import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { listProjects, listTasks, type Priority, type Project, type Task } from '../lib/api.js'

const PRIORITY_LABEL: Record<Priority, string> = {
  1: 'P1 · High',
  2: 'P2 · Medium',
  3: 'P3 · Low',
  4: 'P4 · None',
}

const PRIORITY_BAR: Record<Priority, string> = {
  1: 'bg-red-500',
  2: 'bg-amber-500',
  3: 'bg-indigo-600',
  4: 'bg-border-secondary',
}

interface SummaryCardProps {
  eyebrow: string
  value: string
  helper: string
  tone?: 'primary' | 'success' | 'warning'
}

function SummaryCard({ eyebrow, value, helper, tone = 'primary' }: SummaryCardProps) {
  const cm = getClassMap()
  const accent =
    tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-error' : 'text-primary'
  return (
    <div className={cm.cn(cm.card(), cm.sp('p', 6))}>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest',
          accent,
        )}
      >
        {eyebrow}
      </p>
      <p
        className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tabular-nums', cm.sp('mt', 2))}
      >
        {value}
      </p>
      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}>
        {helper}
      </p>
    </div>
  )
}

export function Analytics() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      listTasks(http).catch(() => [] as Task[]),
      listProjects(http).catch(() => [] as Project[]),
    ])
      .then(([tasks, projects]) => {
        if (cancelled) return
        setTasks(tasks)
        setProjects(projects)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('analytics.loadError', {}, { defaultValue: 'Failed to load analytics.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const stats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter((t) => t.completed).length
    const now = Date.now()
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    // Prefer the actual completion timestamp; fall back to due_date for
    // legacy rows without one.
    const completedThisWeek = tasks.filter((t) => {
      if (!t.completed) return false
      const ts = t.completed_at ?? t.due_date
      return ts && new Date(ts).getTime() >= weekAgo
    }).length
    const overdue = tasks.filter((t) => {
      if (t.completed || !t.due_date) return false
      const due = new Date(t.due_date)
      due.setHours(0, 0, 0, 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return due.getTime() < today.getTime()
    }).length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, completedThisWeek, overdue, completionRate }
  }, [tasks])

  const byPriority = useMemo(() => {
    const counts: Record<Priority, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
    for (const task of tasks) counts[task.priority] += 1
    const max = Math.max(1, ...Object.values(counts))
    return ([1, 2, 3, 4] as Priority[]).map((p) => ({
      priority: p,
      count: counts[p],
      pct: Math.round((counts[p] / max) * 100),
    }))
  }, [tasks])

  const topLabels = useMemo(() => {
    const counts = new Map<string, number>()
    for (const task of tasks) {
      for (const label of task.labels) counts.set(label, (counts.get(label) ?? 0) + 1)
    }
    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    const max = Math.max(1, ...entries.map(([, c]) => c))
    return entries.map(([name, count]) => ({ name, count, pct: Math.round((count / max) * 100) }))
  }, [tasks])

  const topProjects = useMemo(() => {
    const counts = new Map<
      string,
      { name: string; color: string; total: number; completed: number }
    >()
    const projectColor = new Map(projects.map((p) => [p.id, p.color]))
    for (const task of tasks) {
      const proj = task.project
      if (!proj) continue
      const existing = counts.get(proj.id)
      if (existing) {
        existing.total += 1
        if (task.completed) existing.completed += 1
      } else {
        counts.set(proj.id, {
          name: proj.name,
          color: projectColor.get(proj.id) ?? '#4f46e5',
          total: 1,
          completed: task.completed ? 1 : 0,
        })
      }
    }
    const entries = [...counts.values()].sort((a, b) => b.total - a.total).slice(0, 5)
    const max = Math.max(1, ...entries.map((e) => e.total))
    return entries.map((entry) => ({ ...entry, pct: Math.round((entry.total / max) * 100) }))
  }, [tasks, projects])

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }

  if (error) {
    return <div className={cm.cn(cm.sp('p', 8), 'text-error')}>{error}</div>
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-8')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('analytics.eyebrow', {}, { defaultValue: 'Productivity' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.analytics', {}, { defaultValue: 'Analytics' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'analytics.subheading',
            {},
            { defaultValue: 'Completions, streaks, and project velocity at a glance.' },
          )}
        </p>
      </header>

      <section
        className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
      >
        <SummaryCard
          eyebrow={t('nav.total', {}, { defaultValue: 'Total' })}
          value={String(stats.total)}
          helper={t('analytics.summary.totalHelper', {}, { defaultValue: 'Tasks tracked' })}
        />
        <SummaryCard
          eyebrow={t('status.thisWeek', {}, { defaultValue: 'This week' })}
          value={String(stats.completedThisWeek)}
          helper={t(
            'analytics.summary.weekHelper',
            {},
            { defaultValue: 'Completed in the last 7 days' },
          )}
          tone="success"
        />
        <SummaryCard
          eyebrow={t('status.overdue', {}, { defaultValue: 'Overdue' })}
          value={String(stats.overdue)}
          helper={t(
            'analytics.summary.overdueHelper',
            {},
            { defaultValue: 'Need attention today' },
          )}
          tone="warning"
        />
        <SummaryCard
          eyebrow={t('analytics.summary.rateEyebrow', {}, { defaultValue: 'Completion rate' })}
          value={`${stats.completionRate}%`}
          helper={t(
            'analytics.summary.rateHelper',
            { completed: stats.completed, total: stats.total },
            { defaultValue: '{{completed}} of {{total}} all-time' },
          )}
        />
      </section>

      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-2')}>
        <div className={cm.cn(cm.card(), cm.sp('p', 6))}>
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wide',
              'text-on-surface-variant',
              cm.sp('mb', 4),
            )}
          >
            {t('analytics.priorityHeading', {}, { defaultValue: 'By priority' })}
          </h2>
          <ul className={cm.cn('space-y-3')}>
            {byPriority.map((row) => (
              <li key={row.priority}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('mb', 1),
                  )}
                >
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {t(
                      `analytics.priority.p${row.priority}`,
                      {},
                      { defaultValue: PRIORITY_LABEL[row.priority] },
                    )}
                  </span>
                  <span
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}
                  >
                    {row.count}
                  </span>
                </div>
                <div
                  className={cm.cn('h-2 rounded-full bg-surface-container-high overflow-hidden')}
                >
                  <div
                    className={cm.cn('h-full rounded-full', PRIORITY_BAR[row.priority])}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className={cm.cn(cm.card(), cm.sp('p', 6))}>
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wide',
              'text-on-surface-variant',
              cm.sp('mb', 4),
            )}
          >
            {t('analytics.labelsHeading', {}, { defaultValue: 'Top labels' })}
          </h2>
          {topLabels.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant italic')}>
              {t('analytics.labelsEmpty', {}, { defaultValue: 'No labels in use yet.' })}
            </p>
          ) : (
            <ul className={cm.cn('space-y-3')}>
              {topLabels.map((label) => (
                <li key={label.name}>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('mb', 1),
                    )}
                  >
                    <span
                      className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'font-mono')}
                    >
                      @{label.name}
                    </span>
                    <span
                      className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}
                    >
                      {label.count}
                    </span>
                  </div>
                  <div
                    className={cm.cn('h-2 rounded-full bg-surface-container-high overflow-hidden')}
                  >
                    <div
                      className={cm.cn('h-full rounded-full bg-primary')}
                      style={{ width: `${label.pct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <h2
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'uppercase tracking-wide',
            'text-on-surface-variant',
            cm.sp('mb', 4),
          )}
        >
          {t('analytics.projectsHeading', {}, { defaultValue: 'Top projects' })}
        </h2>
        {topProjects.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant italic')}>
            {t('analytics.projectsEmpty', {}, { defaultValue: 'No projects with tasks yet.' })}
          </p>
        ) : (
          <ul className={cm.cn('space-y-4')}>
            {topProjects.map((project) => {
              const pct =
                project.total > 0 ? Math.round((project.completed / project.total) * 100) : 0
              return (
                <li key={project.name}>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('mb', 1),
                    )}
                  >
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span
                        className={cm.cn('h-2.5 w-2.5 rounded-full')}
                        style={{ backgroundColor: project.color }}
                        aria-hidden="true"
                      />
                      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                        {project.name}
                      </span>
                    </div>
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span
                        className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}
                      >
                        {t(
                          'analytics.projectsTotal',
                          { count: project.total },
                          { defaultValue: '{{count}} tasks' },
                        )}
                      </span>
                      <span
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          cm.roundedFull,
                          'py-0.5 bg-success-light text-success tabular-nums',
                        )}
                      >
                        {t('analytics.projectsPct', { pct }, { defaultValue: '{{pct}}% done' })}
                      </span>
                    </div>
                  </div>
                  <div
                    className={cm.cn('h-2 rounded-full bg-surface-container-high overflow-hidden')}
                  >
                    <div
                      className={cm.cn('h-full rounded-full')}
                      style={{ width: `${project.pct}%`, backgroundColor: project.color }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
