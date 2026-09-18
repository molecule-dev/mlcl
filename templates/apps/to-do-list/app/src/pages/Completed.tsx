import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { TaskList } from '../components/TaskList.js'
import { listTasks, type Task, toggleTaskCompleted } from '../lib/api.js'

function weekBucket(iso: string): { key: string; label: string; sortKey: number } {
  const date = new Date(iso)
  const day = date.getDay()
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  start.setDate(date.getDate() - day)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return {
    key: start.toISOString().slice(0, 10),
    label: `${fmt(start)} – ${fmt(end)}`,
    sortKey: start.getTime(),
  }
}

export function Completed() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listTasks(http, { completed: true })
      .then((items) => {
        if (!cancelled) setTasks(items)
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('completed.loadError', {}, { defaultValue: 'Failed to load completed tasks.' }),
          )
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
    if (updated.completed) {
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
    } else {
      // Un-completing makes the task disappear from the Completed view.
      setTasks((prev) => prev.filter((t) => t.id !== id))
    }
  }

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; sortKey: number; tasks: Task[] }>()
    const undated: Task[] = []
    for (const task of tasks) {
      const ts = task.completed_at ?? task.due_date
      if (!ts) {
        undated.push(task)
        continue
      }
      const bucket = weekBucket(ts)
      const existing = map.get(bucket.key)
      if (existing) {
        existing.tasks.push(task)
      } else {
        map.set(bucket.key, { label: bucket.label, sortKey: bucket.sortKey, tasks: [task] })
      }
    }
    const sorted = [...map.values()].sort((a, b) => b.sortKey - a.sortKey)
    if (undated.length > 0) {
      sorted.push({
        label: t('completed.undatedGroup', {}, { defaultValue: 'No completion date' }),
        sortKey: -1,
        tasks: undated,
      })
    }
    return sorted
  }, [tasks, t])

  const last7Days = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    return tasks.filter((task) => {
      const ts = task.completed_at ?? task.due_date
      return ts && new Date(ts).getTime() >= cutoff
    }).length
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
          {t('completed.eyebrow', {}, { defaultValue: 'Done & dusted' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('common.completed', {}, { defaultValue: 'Completed' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'completed.subheading',
            {},
            { defaultValue: "Everything you've checked off, grouped by week." },
          )}
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
                'bg-primary-container text-primary uppercase tracking-wider tabular-nums',
              )}
            >
              {t(
                'completed.totalCount',
                { count: tasks.length },
                { defaultValue: '{{count}} completed' },
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
              {t('completed.last7', { count: last7Days }, { defaultValue: '{{count}} this week' })}
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
      ) : tasks.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.maxW('lg'), cm.mxAuto)}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              cm.sp('mb', 4),
              'h-16 w-16 mx-auto bg-primary-container/40',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-3xl text-primary')}
              aria-hidden="true"
            >
              task_alt
            </span>
          </div>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 1))}>
            {t('completed.emptyHeading', {}, { defaultValue: 'Nothing finished yet' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'completed.empty',
              {},
              { defaultValue: 'Check off a task and watch the streak begin.' },
            )}
          </p>
        </div>
      ) : (
        <div className={cm.cn('space-y-6')}>
          {groups.map((group) => (
            <section key={group.label}>
              <div
                className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 2))}
              >
                <h2
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-wide',
                    'text-on-surface-variant',
                  )}
                >
                  {group.label}
                </h2>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'text-on-surface-variant tabular-nums',
                  )}
                >
                  {t(
                    'completed.weekCount',
                    { count: group.tasks.length },
                    { defaultValue: '{{count}}' },
                  )}
                </span>
              </div>
              <TaskList tasks={group.tasks} showProject onToggle={onToggle} emptyMessage="—" />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
