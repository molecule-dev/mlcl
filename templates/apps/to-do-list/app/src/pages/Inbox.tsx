import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { TaskList } from '../components/TaskList.js'
import { createTask, listTasks, type Task, toggleTaskCompleted } from '../lib/api.js'

export function Inbox() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tasks, setTasks] = useState<Task[]>([])
  const [quickAdd, setQuickAdd] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listTasks(http, { filter: 'inbox' })
      .then((items) => {
        if (!cancelled) setTasks(items)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('inbox.loadError', {}, { defaultValue: 'Failed to load inbox.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const onQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = quickAdd.trim()
    if (!title || submitting) return
    setSubmitting(true)
    try {
      const created = await createTask(http, { title, project_id: null, priority: 4 })
      if (created) setTasks((prev) => [...prev, created])
      setQuickAdd('')
    } finally {
      setSubmitting(false)
    }
  }

  const onToggle = async (id: string) => {
    const updated = await toggleTaskCompleted(http, id).catch(() => null)
    if (!updated) return
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
  }

  const inboxTasks = tasks

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
          {t('inbox.eyebrow', {}, { defaultValue: 'Quick capture' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.inbox', {}, { defaultValue: 'Inbox' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t('inbox.subheading', {}, { defaultValue: 'Capture first. Sort later.' })}
        </p>
        {!loading && !error && inboxTasks.length > 0 ? (
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
                'inbox.countLabel',
                { count: inboxTasks.length },
                { defaultValue: '{{count}} to triage' },
              )}
            </span>
          </div>
        ) : null}
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
          placeholder={t('inbox.quickAddPlaceholder', {}, { defaultValue: 'Add a task to inbox…' })}
          aria-label={t('inbox.quickAddLabel', {}, { defaultValue: 'Add a task to inbox' })}
          data-mol-id="inbox-quick-add"
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

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <TaskList
          tasks={inboxTasks}
          onToggle={onToggle}
          emptyMessage={t('inbox.empty', {}, { defaultValue: 'Inbox zero. Beautiful.' })}
        />
      )}
    </div>
  )
}
