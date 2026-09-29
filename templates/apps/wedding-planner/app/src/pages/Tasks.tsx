import { useCallback, useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

interface Task {
  id: string
  title: string
  category: string
  due_date: string | null
  done: boolean
}

interface TasksResponse {
  tasks: Task[]
  total: number
  done: number
}

/** Formats a date-only `YYYY-MM-DD` calendar date. Rendered with
 *  `timeZone: 'UTC'` so west-of-UTC browsers don't shift the day back. */
function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** A task is overdue once its calendar day has fully passed in the
 *  VIEWER'S timezone — string-comparing YYYY-MM-DD avoids both the
 *  due-today-flagged-overdue bug and UTC-parsing shifts. */
function isOverdue(task: Task): boolean {
  if (task.done || !task.due_date) return false
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return task.due_date < today
}

const EMPTY_FORM = {
  title: '',
  category: 'planning',
  due_date: '',
}

export function Tasks() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [data, setData] = useState<TasksResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get('/api/tasks')
      setData(res.data as TasksResponse)
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    load()
  }, [load])

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await http.post('/api/tasks', {
        title: form.title.trim(),
        category: form.category.trim() || 'planning',
        due_date: form.due_date || null,
      })
      void track({
        name: 'task.created',
        properties: { category: form.category.trim() || 'planning' },
      })
      setForm(EMPTY_FORM)
      await load()
    } catch (e) {
      setError((e as Error).message ?? 'Could not add the task')
    } finally {
      setSaving(false)
    }
  }

  async function toggleTask(task: Task) {
    // Optimistic checkbox — feels instant, reconciled by the reload.
    setData((d) =>
      d
        ? {
            ...d,
            tasks: d.tasks.map((x) => (x.id === task.id ? { ...x, done: !x.done } : x)),
            done: d.done + (task.done ? -1 : 1),
          }
        : d,
    )
    try {
      await http.put(`/api/tasks/${task.id}/toggle`, {})
      if (!task.done) {
        void track({ name: 'task.completed', properties: { task_id: task.id } })
      }
    } catch (e) {
      setError((e as Error).message ?? 'Could not update the task')
      await load()
    }
  }

  async function removeTask(id: string) {
    try {
      await http.delete(`/api/tasks/${id}`)
      await load()
    } catch (e) {
      setError((e as Error).message ?? 'Could not delete the task')
    }
  }

  const inputCls = cm.cn(
    'w-full rounded-xl border border-outline-variant/60 bg-input-background px-3 py-2',
    'focus:outline-none focus:ring-2 focus:ring-primary/40',
  )

  const tasks = data?.tasks ?? []
  const visible =
    filter === 'all' ? tasks : tasks.filter((x) => (filter === 'done' ? x.done : !x.done))
  const pct = data && data.total > 0 ? Math.round((data.done / data.total) * 100) : 0

  // Triage buckets for the design's three planning sections. Open tasks only;
  // each bucket renders as a summary panel above the full checklist below.
  const inSevenDays = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()
  const openTasks = tasks.filter((x) => !x.done)
  const attention = openTasks.filter((x) => isOverdue(x))
  const thisWeek = openTasks.filter(
    (x) => !isOverdue(x) && x.due_date != null && x.due_date <= inSevenDays,
  )
  const upcoming = openTasks.filter((x) => !attention.includes(x) && !thisWeek.includes(x))

  return (
    <div
      className={cm.cn(cm.sp('p', 6), cm.sp('px', 8), 'max-w-4xl w-full mx-auto')}
      data-mol-id="page-tasks"
    >
      <header>
        <p
          className={cm.cn('text-xs font-black uppercase tracking-widest')}
          style={{ color: 'var(--color-accent)' }}
        >
          {t('tasks.eyebrow', {}, { defaultValue: 'Timeline' })}
        </p>
        <h1 className={cm.cn('text-4xl font-extrabold tracking-tight')}>
          {t('tasks.title', {}, { defaultValue: 'Tasks & master timeline' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'mt-2 text-on-surface-variant max-w-xl')}>
          {t(
            'tasks.subtitle',
            {},
            { defaultValue: 'The dated countdown of everything left to do.' },
          )}
        </p>
      </header>

      {error ? (
        <p
          className={cm.cn(
            cm.sp('p', 3),
            'mt-4 rounded-xl bg-error-light text-error font-bold text-sm',
          )}
          data-mol-id="tasks-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {/* Progress */}
      <section
        className={cm.cn(
          cm.sp('p', 6),
          'mt-6 rounded-2xl bg-surface border border-outline-variant/40 shadow-sm',
        )}
        data-mol-id="tasks-progress"
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <p className={cm.cn('text-lg font-bold')}>
            {t(
              'tasks.progress',
              { done: data?.done ?? 0, total: data?.total ?? 0 },
              { defaultValue: '{{done}} of {{total}} complete' },
            )}
          </p>
          <p className={cm.cn('text-2xl font-extrabold tabular-nums')} data-mol-id="tasks-pct">
            {pct}%
          </p>
        </div>
        <div
          className={cm.cn('mt-3 h-2.5 w-full rounded-full overflow-hidden')}
          style={{ background: 'var(--color-toggle-off)' }}
          role="progressbar"
          aria-label={t('tasks.progressAria', {}, { defaultValue: 'Checklist progress' })}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cm.cn('h-full rounded-full')}
            style={{ width: `${pct}%`, background: 'var(--color-primary)' }}
          />
        </div>
      </section>

      {/* Add form */}
      <form
        onSubmit={addTask}
        data-mol-id="tasks-add-form"
        className={cm.cn(
          cm.sp('p', 6),
          'mt-6 rounded-2xl bg-surface border border-outline-variant/40 shadow-sm',
          'grid gap-4 sm:grid-cols-[1fr_auto_auto_auto]',
        )}
      >
        <label className={cm.cn(cm.stack(1))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('tasks.form.title', {}, { defaultValue: 'Task' })}
          </span>
          <input
            type="text"
            required
            maxLength={300}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            data-mol-id="tasks-form-title"
            className={inputCls}
          />
        </label>
        <label className={cm.cn(cm.stack(1))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('tasks.form.category', {}, { defaultValue: 'Category' })}
          </span>
          <input
            type="text"
            maxLength={60}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            data-mol-id="tasks-form-category"
            className={inputCls}
          />
        </label>
        <label className={cm.cn(cm.stack(1))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('tasks.form.due', {}, { defaultValue: 'Due' })}
          </span>
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            data-mol-id="tasks-form-due"
            className={inputCls}
          />
        </label>
        <div className={cm.cn(cm.flex({ align: 'end' }))}>
          <button
            type="submit"
            disabled={saving || !form.title.trim()}
            data-mol-id="tasks-form-submit"
            className={cm.cn(
              'px-5 py-2.5 rounded-xl font-bold text-white disabled:opacity-50 whitespace-nowrap',
            )}
            style={{ background: 'var(--color-primary)' }}
          >
            {saving
              ? t('tasks.form.saving', {}, { defaultValue: 'Adding…' })
              : t('tasks.form.submit', {}, { defaultValue: 'Add task' })}
          </button>
        </div>
      </form>

      {/* Filters */}
      <div
        className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'mt-6')}
        data-mol-id="tasks-filters"
      >
        {(['all', 'open', 'done'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            data-mol-id={`tasks-filter-${key}`}
            aria-pressed={filter === key}
            className={cm.cn(
              'px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wide',
              filter === key ? 'text-white' : 'text-on-surface-variant bg-surface-container',
            )}
            style={filter === key ? { background: 'var(--color-primary)' } : undefined}
          >
            {t(`tasks.filter.${key}`, {}, { defaultValue: key })}
          </button>
        ))}
      </div>

      {/* Design triage sections — attention / this week / milestones */}
      <div className={cm.cn('mt-6 grid gap-4 lg:grid-cols-2')} data-mol-id="tasks-triage">
        <section
          className={cm.cn(
            cm.sp('p', 5),
            'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm',
          )}
          data-mol-id="tasks-attention"
        >
          <h2 className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'text-lg font-bold')}>
            <span
              className="material-symbols-outlined text-xl"
              style={{ color: 'var(--color-error)' }}
              aria-hidden="true"
            >
              priority_high
            </span>
            {t('tasks.attentionTitle', {}, { defaultValue: 'Needs immediate attention' })}
          </h2>
          {attention.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-2')}>
              {t(
                'tasks.attentionEmpty',
                {},
                { defaultValue: 'Nothing overdue — the timeline is calm.' },
              )}
            </p>
          ) : (
            <ul className={cm.cn(cm.stack(2), 'mt-3')}>
              {attention.map((task) => (
                <li
                  key={task.id}
                  data-mol-id={`tasks-attention-${task.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                    'px-3 py-2 rounded-lg bg-surface-container',
                  )}
                  style={{ borderInlineStart: '3px solid var(--color-error)' }}
                >
                  <span className={cm.cn(cm.textSize('sm'), 'font-medium truncate')}>
                    {task.title}
                  </span>
                  <span
                    className={cm.cn(cm.textSize('xs'), 'shrink-0 font-bold')}
                    style={{ color: 'var(--color-error)' }}
                  >
                    {formatDate(task.due_date)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section
          className={cm.cn(
            cm.sp('p', 5),
            'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm',
          )}
          data-mol-id="tasks-week"
        >
          <h2 className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'text-lg font-bold')}>
            <span
              className="material-symbols-outlined text-xl"
              style={{ color: 'var(--color-accent)' }}
              aria-hidden="true"
            >
              event_upcoming
            </span>
            {t('tasks.weekTitle', {}, { defaultValue: "This week's focus" })}
          </h2>
          {thisWeek.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-2')}>
              {t('tasks.weekEmpty', {}, { defaultValue: 'Nothing due in the next seven days.' })}
            </p>
          ) : (
            <ul className={cm.cn(cm.stack(2), 'mt-3')}>
              {thisWeek.map((task) => (
                <li
                  key={task.id}
                  data-mol-id={`tasks-week-${task.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                    'px-3 py-2 rounded-lg bg-surface-container',
                  )}
                >
                  <span className={cm.cn(cm.textSize('sm'), 'font-medium truncate')}>
                    {task.title}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'shrink-0 text-on-surface-variant')}>
                    {formatDate(task.due_date)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Later milestones */}
        <section
          className={cm.cn(
            cm.sp('p', 5),
            'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm lg:col-span-2',
          )}
          data-mol-id="tasks-milestones"
        >
          <h2 className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'text-lg font-bold')}>
            <span
              className="material-symbols-outlined text-xl"
              style={{ color: 'var(--color-secondary)' }}
              aria-hidden="true"
            >
              flag
            </span>
            {t('tasks.milestonesTitle', {}, { defaultValue: 'Upcoming milestones' })}
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(
                'tasks.milestonesCount',
                { count: upcoming.length },
                { defaultValue: '{{count}} scheduled' },
              )}
            </span>
          </h2>
          {upcoming.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-2')}>
              {t(
                'tasks.milestonesEmpty',
                {},
                { defaultValue: 'Nothing scheduled further out yet.' },
              )}
            </p>
          ) : (
            <ul className={cm.cn('mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3')}>
              {upcoming.slice(0, 6).map((task) => (
                <li
                  key={task.id}
                  data-mol-id={`tasks-milestone-${task.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                    'px-3 py-2 rounded-lg bg-surface-container',
                  )}
                >
                  <span className={cm.cn(cm.textSize('sm'), 'font-medium truncate')}>
                    {task.title}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'shrink-0 text-on-surface-variant')}>
                    {formatDate(task.due_date)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* List */}
      <ul className={cm.cn(cm.stack(2), 'mt-4')} data-mol-id="tasks-list">
        {loading ? (
          <li className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loading', {}, { defaultValue: 'Loading…' })}
          </li>
        ) : visible.length === 0 ? (
          <li className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'tasks.empty',
              {},
              { defaultValue: 'Nothing here — add the next thing to do above.' },
            )}
          </li>
        ) : (
          visible.map((task) => {
            const overdue = isOverdue(task)
            return (
              <li
                key={task.id}
                data-mol-id={`task-row-${task.id}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  'px-4 py-3 rounded-xl bg-surface border border-outline-variant/40',
                )}
                style={overdue ? { borderColor: 'var(--color-error)' } : undefined}
              >
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleTask(task)}
                  aria-label={t(
                    'tasks.toggleAria',
                    { title: task.title },
                    { defaultValue: 'Mark “{{title}}” done' },
                  )}
                  data-mol-id={`task-toggle-${task.id}`}
                  className={cm.cn('w-5 h-5 rounded accent-current')}
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                <div className={cm.cn('min-w-0 flex-1')}>
                  <p
                    className={cm.cn(
                      'font-bold truncate',
                      task.done && 'line-through text-on-surface-variant',
                    )}
                  >
                    {task.title}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {task.category}
                    {task.due_date ? ` · ${formatDate(task.due_date)}` : ''}
                  </p>
                </div>
                {overdue ? (
                  <span
                    className={cm.cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest',
                    )}
                    style={{
                      background: 'var(--color-budget-over-bg)',
                      color: 'var(--color-budget-over)',
                    }}
                  >
                    {t('tasks.overdue', {}, { defaultValue: 'Overdue' })}
                  </span>
                ) : null}
                <ConfirmButton
                  label={
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                      delete
                    </span>
                  }
                  confirmLabel={t(
                    'tasks.deleteConfirm',
                    { title: task.title },
                    { defaultValue: `Delete “${task.title}”?` },
                  )}
                  aria-label={t(
                    'tasks.removeAria',
                    { title: task.title },
                    { defaultValue: 'Delete “{{title}}”' },
                  )}
                  onConfirm={() => removeTask(task.id)}
                  data-mol-id={`task-remove-${task.id}`}
                  disarmSeconds={5}
                  size="sm"
                  color="error"
                  variant="ghost"
                />
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}

export default Tasks
