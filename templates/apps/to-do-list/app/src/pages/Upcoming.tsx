import { useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { TaskList } from '../components/TaskList.js'
import { listTasks, type Task, toggleTaskCompleted } from '../lib/api.js'

function dayKey(d: Date): string {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

function fmtDay(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

export function Upcoming() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listTasks(http, { filter: 'upcoming' })
      .then((items) => {
        if (!cancelled) setTasks(items)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('upcoming.loadError', {}, { defaultValue: 'Failed to load upcoming.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const onToggle = async (id: string) => {
    const updated = await toggleTaskCompleted(http, id).catch(() => null)
    if (!updated) return
    // Once completed, the task disappears from the upcoming filter.
    if (updated.completed) {
      setTasks((prev) => prev.filter((t) => t.id !== id))
    } else {
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
    }
    void track({
      name: updated.completed ? 'task.completed' : 'task.reopened',
      properties: { task_id: updated.id, source: 'upcoming' },
    })
  }

  const days = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const result: { date: Date; tasks: Task[] }[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      result.push({ date: d, tasks: [] })
    }
    for (const t of tasks) {
      if (!t.due_date) continue
      const dk = dayKey(new Date(t.due_date))
      const slot = result.find((r) => dayKey(r.date) === dk)
      if (slot) slot.tasks.push(t)
    }
    return result
  }, [tasks])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto, 'space-y-6')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('upcoming.eyebrow', {}, { defaultValue: 'Week ahead' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('status.upcoming', {}, { defaultValue: 'Upcoming' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t('upcoming.subheading', {}, { defaultValue: 'Next 7 days, grouped by day.' })}
        </p>
        {!loading && !error && tasks.length > 0 ? (
          <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }), cm.sp('mt', 4))}>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'bg-primary-container text-primary uppercase tracking-wider',
              )}
            >
              {t(
                'upcoming.totalCount',
                { count: tasks.length },
                { defaultValue: '{{count}} scheduled' },
              )}
            </span>
          </div>
        ) : null}
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <div className={cm.cn('space-y-6')}>
          {days.filter((d) => d.tasks.length > 0).length === 0 ? (
            <div
              className={cm.cn(
                cm.sp('py', 12),
                cm.textCenter,
                'rounded-2xl bg-surface-container-low',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-5xl text-on-surface-variant/40')}
                aria-hidden="true"
              >
                event_available
              </span>
              <p className={cm.cn('text-sm text-on-surface-variant mt-3')}>
                {t(
                  'upcoming.emptyWeek',
                  {},
                  { defaultValue: 'Nothing scheduled this week — enjoy the open runway.' },
                )}
              </p>
            </div>
          ) : (
            days
              .filter((d) => d.tasks.length > 0)
              .map((d) => (
                <section key={dayKey(d.date)}>
                  <h2
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'uppercase tracking-wide',
                      'text-on-surface-variant',
                      cm.sp('mb', 2),
                    )}
                  >
                    {fmtDay(d.date.toISOString())}
                  </h2>
                  <TaskList tasks={d.tasks} showProject onToggle={onToggle} />
                </section>
              ))
          )}
        </div>
      )}
    </div>
  )
}
