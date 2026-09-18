import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  assignLabel,
  deleteTask,
  getTask,
  type Label,
  listLabels,
  listProjects,
  type Priority,
  type Project,
  type Task,
  toggleTaskCompleted,
  unassignLabel,
  updateTask,
} from '../lib/api.js'

const PRIORITY_RING: Record<Priority, string> = {
  1: 'border-error',
  2: 'border-warning',
  3: 'border-primary',
  4: 'border-outline',
}

const PRIORITY_BG: Record<Priority, string> = {
  1: 'bg-error',
  2: 'bg-warning',
  3: 'bg-primary',
  4: 'bg-outline',
}

const PRIORITY_LABEL: Record<Priority, string> = {
  1: 'P1 · High',
  2: 'P2 · Medium',
  3: 'P3 · Low',
  4: 'P4 · None',
}

const PRIORITY_PILL: Record<Priority, string> = {
  1: 'bg-error-light text-error',
  2: 'bg-warning-light text-warning',
  3: 'bg-indigo-50 text-indigo-700',
  4: 'bg-surface-container-high text-on-surface-variant',
}

function fmtFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function TaskDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingTitle, setSavingTitle] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [editingDescription, setEditingDescription] = useState(false)
  const [descDraft, setDescDraft] = useState('')
  const [labelOptions, setLabelOptions] = useState<Label[]>([])
  const [labelMenuOpen, setLabelMenuOpen] = useState(false)
  const [updatingLabel, setUpdatingLabel] = useState(false)
  const [projectOptions, setProjectOptions] = useState<Project[]>([])
  const [editingDue, setEditingDue] = useState(false)
  const [editingProject, setEditingProject] = useState(false)
  const [editingRecurrence, setEditingRecurrence] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    getTask(http, id)
      .then((next) => {
        if (cancelled) return
        setTask(next)
        if (next) {
          setTitleDraft(next.title)
          setDescDraft(next.description ?? '')
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(t('taskDetail.loadError', {}, { defaultValue: 'Failed to load task.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, id])

  useEffect(() => {
    let cancelled = false
    listLabels(http)
      .then((items) => {
        if (!cancelled) setLabelOptions(items)
      })
      .catch(() => {
        /* leave label options empty; UI hides the picker if no labels exist */
      })
    listProjects(http)
      .then((items) => {
        if (!cancelled) setProjectOptions(items)
      })
      .catch(() => {
        /* leave project options empty; UI falls back to "Inbox only" */
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const onChangeDueDate = async (next: string) => {
    if (!task) return
    const value = next || null
    const updated = await updateTask(http, task.id, { due_date: value }).catch(() => null)
    if (updated) setTask(updated)
    setEditingDue(false)
  }

  const onChangeProject = async (nextId: string) => {
    if (!task) return
    const value = nextId || null
    const updated = await updateTask(http, task.id, { project_id: value }).catch(() => null)
    if (updated) setTask(updated)
    setEditingProject(false)
  }

  const onChangeRecurrence = async (rule: string) => {
    if (!task) return
    const value = rule || null
    const updated = await updateTask(http, task.id, { recurrence_rule: value }).catch(() => null)
    if (updated) setTask(updated)
    setEditingRecurrence(false)
  }

  const onToggleLabel = async (label: Label) => {
    if (!task) return
    const has = task.labels.includes(label.name)
    setUpdatingLabel(true)
    try {
      if (has) {
        await unassignLabel(http, task.id, label.id)
        setTask({ ...task, labels: task.labels.filter((name) => name !== label.name) })
      } else {
        await assignLabel(http, task.id, label.id)
        setTask({ ...task, labels: [...task.labels, label.name].sort() })
      }
    } catch (_error) {
      // label toggle failure surfaces as a no-op; the next reload will reconcile state
    } finally {
      setUpdatingLabel(false)
    }
  }

  const onToggle = async () => {
    if (!task) return
    const updated = await toggleTaskCompleted(http, task.id).catch(() => null)
    if (updated) setTask(updated)
  }

  const onSaveTitle = async () => {
    if (!task) return
    const next = titleDraft.trim()
    if (!next || next === task.title) {
      setEditingTitle(false)
      return
    }
    setSavingTitle(true)
    try {
      const updated = await updateTask(http, task.id, { title: next })
      if (updated) setTask(updated)
      setEditingTitle(false)
    } finally {
      setSavingTitle(false)
    }
  }

  const onSaveDescription = async () => {
    if (!task) return
    const next = descDraft.trim()
    if (next === (task.description ?? '').trim()) {
      setEditingDescription(false)
      return
    }
    const updated = await updateTask(http, task.id, { description: next })
    if (updated) setTask(updated)
    setEditingDescription(false)
  }

  const onChangePriority = async (priority: Priority) => {
    if (!task) return
    const updated = await updateTask(http, task.id, { priority })
    if (updated) setTask(updated)
  }

  const onDelete = async () => {
    if (!task) return
    if (!window.confirm(t('taskDetail.deleteConfirm', {}, { defaultValue: 'Delete this task?' })))
      return
    await deleteTask(http, task.id).catch(() => null)
    navigate(task.project ? `/projects/${task.project.id}` : '/inbox')
  }

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }

  if (error || !task) {
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.maxW('2xl'), cm.mxAuto, cm.textCenter)}
      >
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
            search_off
          </span>
        </div>
        <h1 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 1))}>
          {t('taskDetail.notFoundHeading', {}, { defaultValue: 'Task not found' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {error ??
            t(
              'taskDetail.notFound',
              {},
              {
                defaultValue: "We couldn't find that task — it may have been completed or deleted.",
              },
            )}
        </p>
        <Link
          to="/today"
          className={cm.cn(
            cm.sp('mt', 6),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'inline-block bg-primary text-on-primary rounded-md',
          )}
        >
          {t('taskDetail.backToToday', {}, { defaultValue: 'Back to Today' })}
        </Link>
      </div>
    )
  }

  const backTo = task.project ? `/projects/${task.project.id}` : '/inbox'
  const backLabel = task.project ? task.project.name : t('nav.inbox', {}, { defaultValue: 'Inbox' })

  const description = task.description?.trim() ?? ''

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
        <Link
          to={backTo}
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
          {backLabel}
        </Link>
        <button
          type="button"
          onClick={onDelete}
          aria-label={t('taskDetail.deleteAria', {}, { defaultValue: 'Delete this task' })}
          data-mol-id="task-detail-delete"
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'rounded-md border border-outline-variant text-on-surface-variant hover:bg-error/10 hover:text-error hover:border-error',
          )}
        >
          {t('common.delete', {}, { defaultValue: 'Delete' })}
        </button>
      </div>

      <header className={cm.flex({ align: 'start', gap: 'md' })}>
        <button
          type="button"
          role="checkbox"
          aria-checked={task.completed}
          aria-label={
            task.completed
              ? t('taskDetail.uncheckAria', {}, { defaultValue: 'Mark as incomplete' })
              : t('taskDetail.checkAria', {}, { defaultValue: 'Mark as complete' })
          }
          data-mol-id="task-detail-toggle"
          onClick={onToggle}
          className={cm.cn(
            'h-7 w-7 mt-1 rounded-full border-2 grid place-items-center shrink-0',
            PRIORITY_RING[task.priority],
            task.completed ? PRIORITY_BG[task.priority] : '',
          )}
        >
          {task.completed ? (
            <span
              className={cm.cn('material-symbols-outlined text-on-primary')}
              style={{ fontSize: '18px' }}
              aria-hidden="true"
            >
              check
            </span>
          ) : null}
        </button>
        <div className={cm.flex1}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('taskDetail.eyebrow', {}, { defaultValue: 'Task' })}
          </p>
          {editingTitle ? (
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={onSaveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveTitle()
                if (e.key === 'Escape') {
                  setEditingTitle(false)
                  setTitleDraft(task.title)
                }
              }}
              disabled={savingTitle}
              data-mol-id="task-detail-title-input"
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                'tracking-tight w-full bg-transparent border-b-2 border-primary outline-none',
              )}
            />
          ) : (
            <h1
              className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
              data-mol-id="task-detail-title"
            >
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                className={cm.cn(
                  'w-full text-left cursor-text',
                  task.completed ? 'line-through text-on-surface-variant' : '',
                )}
              >
                {task.title}
              </button>
            </h1>
          )}
          <div
            className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap', align: 'center' }), cm.sp('mt', 3))}
          >
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                PRIORITY_PILL[task.priority],
                'uppercase tracking-wider',
              )}
            >
              {PRIORITY_LABEL[task.priority]}
            </span>
            {task.recurring ? (
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'bg-success-light text-success uppercase tracking-wider',
                )}
              >
                🔁{' '}
                {t(
                  'taskDetail.recurring',
                  { cadence: task.recurring },
                  { defaultValue: '{{cadence}}' },
                )}
              </span>
            ) : null}
            {task.completed ? (
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'bg-success-light text-success uppercase tracking-wider',
                )}
              >
                {t('common.completed', {}, { defaultValue: 'Completed' })}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
        <div className={cm.cn('lg:col-span-2 space-y-6')}>
          <div className={cm.cn(cm.card(), cm.sp('p', 6))}>
            <h2
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'uppercase tracking-wide',
                'text-on-surface-variant',
                cm.sp('mb', 3),
              )}
            >
              {t('nav.details', {}, { defaultValue: 'Details' })}
            </h2>
            <dl className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-4')}>
              <div>
                <dt
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-wider text-on-surface-variant',
                    cm.sp('mb', 1),
                  )}
                >
                  {t('form.due', {}, { defaultValue: 'Due' })}
                </dt>
                <dd className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'tabular-nums')}>
                  {editingDue ? (
                    <input
                      type="date"
                      defaultValue={
                        task.due_date ? new Date(task.due_date).toISOString().slice(0, 10) : ''
                      }
                      onBlur={(e) => onChangeDueDate(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onChangeDueDate((e.target as HTMLInputElement).value)
                        if (e.key === 'Escape') setEditingDue(false)
                      }}
                      data-mol-id="task-detail-due-input"
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        'border border-outline-variant rounded-md bg-surface text-sm',
                      )}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingDue(true)}
                      data-mol-id="task-detail-due"
                      className={cm.cn('text-left hover:underline')}
                    >
                      {task.due_date ? (
                        fmtFullDate(task.due_date)
                      ) : (
                        <span className={cm.cn('text-on-surface-variant font-normal')}>
                          {t('taskDetail.noDue', {}, { defaultValue: 'No due date' })}
                        </span>
                      )}
                    </button>
                  )}
                </dd>
              </div>
              <div>
                <dt
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-wider text-on-surface-variant',
                    cm.sp('mb', 1),
                  )}
                >
                  {t('taskDetail.project', {}, { defaultValue: 'Project' })}
                </dt>
                <dd className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                  {editingProject ? (
                    <select
                      defaultValue={task.project?.id ?? ''}
                      onBlur={(e) => onChangeProject(e.target.value)}
                      onChange={(e) => onChangeProject(e.target.value)}
                      data-mol-id="task-detail-project-select"
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        'border border-outline-variant rounded-md bg-surface text-sm',
                      )}
                    >
                      <option value="">{t('nav.inbox', {}, { defaultValue: 'Inbox' })}</option>
                      {projectOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  ) : task.project ? (
                    <button
                      type="button"
                      onClick={() => setEditingProject(true)}
                      data-mol-id="task-detail-project"
                      className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'hover:underline')}
                    >
                      <span
                        className={cm.cn('h-2.5 w-2.5 rounded-full')}
                        style={{ backgroundColor: task.project.color }}
                        aria-hidden="true"
                      />
                      {task.project.name}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingProject(true)}
                      data-mol-id="task-detail-project"
                      className={cm.cn('text-on-surface-variant font-normal hover:underline')}
                    >
                      {t('nav.inbox', {}, { defaultValue: 'Inbox' })}
                    </button>
                  )}
                  {!editingProject && task.project && (
                    <Link
                      to={`/projects/${task.project.id}`}
                      className={cm.cn('ml-2 text-xs text-on-surface-variant hover:underline')}
                      data-mol-id="task-detail-project-open"
                    >
                      {t('taskDetail.openProject', {}, { defaultValue: 'open' })} ↗
                    </Link>
                  )}
                </dd>
              </div>
              <div>
                <dt
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-wider text-on-surface-variant',
                    cm.sp('mb', 1),
                  )}
                >
                  {t('taskDetail.recurrence', {}, { defaultValue: 'Recurrence' })}
                </dt>
                <dd className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                  {editingRecurrence ? (
                    <select
                      defaultValue={task.recurrence_rule ?? ''}
                      onBlur={(e) => onChangeRecurrence(e.target.value)}
                      onChange={(e) => onChangeRecurrence(e.target.value)}
                      data-mol-id="task-detail-recurrence-select"
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        'border border-outline-variant rounded-md bg-surface text-sm',
                      )}
                    >
                      <option value="">
                        {t('taskDetail.noRecurrence', {}, { defaultValue: 'No recurrence' })}
                      </option>
                      <option value="every 1 day">
                        {t('taskDetail.daily', {}, { defaultValue: 'Daily' })}
                      </option>
                      <option value="every 1 week">
                        {t('taskDetail.weekly', {}, { defaultValue: 'Weekly' })}
                      </option>
                      <option value="every 2 weeks">
                        {t('taskDetail.fortnightly', {}, { defaultValue: 'Every 2 weeks' })}
                      </option>
                      <option value="every 1 month">
                        {t('status.monthly', {}, { defaultValue: 'Monthly' })}
                      </option>
                      <option value="every 1 year">
                        {t('taskDetail.yearly', {}, { defaultValue: 'Yearly' })}
                      </option>
                    </select>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingRecurrence(true)}
                      data-mol-id="task-detail-recurrence"
                      className={cm.cn('text-left hover:underline')}
                    >
                      {task.recurring ? (
                        <>🔁 {task.recurring}</>
                      ) : (
                        <span className={cm.cn('text-on-surface-variant font-normal')}>
                          {t('taskDetail.noRecurrence', {}, { defaultValue: 'No recurrence' })}
                        </span>
                      )}
                    </button>
                  )}
                </dd>
              </div>
              <div>
                <dt
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-wider text-on-surface-variant',
                    cm.sp('mb', 1),
                  )}
                >
                  {t('form.priority', {}, { defaultValue: 'Priority' })}
                </dt>
                <dd>
                  <select
                    value={task.priority}
                    onChange={(e) => onChangePriority(Number(e.target.value) as Priority)}
                    data-mol-id="task-detail-priority"
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      cm.textSize('sm'),
                      'border border-outline-variant rounded-md bg-surface',
                    )}
                  >
                    {([1, 2, 3, 4] as Priority[]).map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABEL[p]}
                      </option>
                    ))}
                  </select>
                </dd>
              </div>
              <div className={cm.cn('sm:col-span-2')}>
                <dt
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-wider text-on-surface-variant',
                    cm.sp('mb', 1),
                  )}
                >
                  {t('taskDetail.labels', {}, { defaultValue: 'Labels' })}
                </dt>
                <dd className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap', align: 'center' }))}>
                  {task.labels.length === 0 ? (
                    <span
                      className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant font-normal')}
                    >
                      {t('taskDetail.noLabels', {}, { defaultValue: 'No labels' })}
                    </span>
                  ) : (
                    task.labels.map((label) => {
                      const opt = labelOptions.find((l) => l.name === label)
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => opt && onToggleLabel(opt)}
                          disabled={updatingLabel || !opt}
                          data-mol-id={`task-detail-label-${label}`}
                          aria-label={t(
                            'taskDetail.removeLabelAria',
                            { name: label },
                            { defaultValue: 'Remove label {{name}}' },
                          )}
                          className={cm.cn(
                            cm.sp('px', 2),
                            cm.textSize('xs'),
                            cm.fontWeight('semibold'),
                            cm.roundedFull,
                            'py-0.5 bg-surface-container-high font-mono hover:bg-error-container hover:text-on-error-container disabled:opacity-60',
                          )}
                        >
                          @{label} ×
                        </button>
                      )
                    })
                  )}
                  {labelOptions.length > 0 && (
                    <div className={cm.cn('relative inline-block')}>
                      <button
                        type="button"
                        onClick={() => setLabelMenuOpen((v) => !v)}
                        data-mol-id="task-detail-add-label"
                        aria-haspopup="menu"
                        aria-expanded={labelMenuOpen}
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          cm.roundedFull,
                          'py-0.5 border border-dashed border-outline-variant text-on-surface-variant hover:bg-surface-container-high',
                        )}
                      >
                        + {t('taskDetail.addLabel', {}, { defaultValue: 'Add label' })}
                      </button>
                      {labelMenuOpen && (
                        <div
                          role="menu"
                          data-mol-id="task-detail-label-menu"
                          className={cm.cn(
                            cm.card(),
                            cm.sp('p', 2),
                            'absolute z-10 mt-1 min-w-[12rem] space-y-1 shadow-lg',
                          )}
                        >
                          {labelOptions.map((opt) => {
                            const checked = task.labels.includes(opt.name)
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => onToggleLabel(opt)}
                                disabled={updatingLabel}
                                data-mol-id={`task-detail-label-option-${opt.name}`}
                                className={cm.cn(
                                  cm.sp('px', 2),
                                  cm.sp('py', 1),
                                  cm.textSize('sm'),
                                  'w-full flex items-center gap-2 rounded-md text-left hover:bg-surface-container-high disabled:opacity-60',
                                )}
                              >
                                <span
                                  className={cm.cn('h-2.5 w-2.5 rounded-full shrink-0')}
                                  style={{ backgroundColor: opt.color }}
                                  aria-hidden="true"
                                />
                                <span className={cm.cn('font-mono')}>@{opt.name}</span>
                                <span
                                  className={cm.cn('ml-auto text-on-surface-variant')}
                                  aria-hidden="true"
                                >
                                  {checked ? '✓' : ''}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className={cm.cn(cm.card(), cm.sp('p', 6))}>
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 3))}
            >
              <h2
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-wide',
                  'text-on-surface-variant',
                )}
              >
                {t('form.description', {}, { defaultValue: 'Description' })}
              </h2>
              {!editingDescription && (
                <button
                  type="button"
                  onClick={() => setEditingDescription(true)}
                  data-mol-id="task-detail-edit-description"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    cm.textPrimary,
                    'hover:underline',
                  )}
                >
                  {description
                    ? t('common.edit', {}, { defaultValue: 'Edit' })
                    : t('taskDetail.addDescription', {}, { defaultValue: 'Add description' })}
                </button>
              )}
            </div>
            {editingDescription ? (
              <div className={cm.cn('space-y-2')}>
                <textarea
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  rows={5}
                  data-mol-id="task-detail-description-input"
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'w-full border border-outline-variant rounded-md leading-relaxed',
                  )}
                />
                <div className={cm.cn('flex justify-end gap-2')}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDescription(false)
                      setDescDraft(description)
                    }}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('sm'),
                      'rounded-md text-on-surface-variant hover:bg-surface-container',
                    )}
                  >
                    {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                  </button>
                  <button
                    type="button"
                    onClick={onSaveDescription}
                    data-mol-id="task-detail-save-description"
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'rounded-md bg-primary text-on-primary',
                    )}
                  >
                    {t('common.save', {}, { defaultValue: 'Save' })}
                  </button>
                </div>
              </div>
            ) : description ? (
              <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed whitespace-pre-line')}>
                {description}
              </p>
            ) : (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant italic')}>
                {t(
                  'taskDetail.descriptionEmpty',
                  {},
                  { defaultValue: 'No description yet — add context, links, or success criteria.' },
                )}
              </p>
            )}
          </div>
        </div>

        <aside className={cm.cn('space-y-6')}>
          <div className={cm.cn(cm.card(), cm.sp('p', 6))}>
            <h2
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'uppercase tracking-wide',
                'text-on-surface-variant',
                cm.sp('mb', 3),
              )}
            >
              {t('nav.activity', {}, { defaultValue: 'Activity' })}
            </h2>
            <ol className={cm.cn('space-y-3')}>
              <li className={cm.flex({ align: 'start', gap: 'sm' })}>
                <span
                  className={cm.cn('h-2 w-2 mt-1.5 rounded-full bg-primary shrink-0')}
                  aria-hidden="true"
                />
                <div className={cm.cn('min-w-0')}>
                  <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                    {t('taskDetail.activityCreated', {}, { defaultValue: 'Task created' })}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
                    {fmtDateTime(task.created_at)}
                  </p>
                </div>
              </li>
              {task.due_date && (
                <li className={cm.flex({ align: 'start', gap: 'sm' })}>
                  <span
                    className={cm.cn('h-2 w-2 mt-1.5 rounded-full bg-amber-500 shrink-0')}
                    aria-hidden="true"
                  />
                  <div className={cm.cn('min-w-0')}>
                    <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                      {t('taskDetail.activityDue', {}, { defaultValue: 'Due date set' })}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
                      {fmtFullDate(task.due_date)}
                    </p>
                  </div>
                </li>
              )}
              {task.completed && task.completed_at && (
                <li className={cm.flex({ align: 'start', gap: 'sm' })}>
                  <span
                    className={cm.cn('h-2 w-2 mt-1.5 rounded-full bg-emerald-500 shrink-0')}
                    aria-hidden="true"
                  />
                  <div className={cm.cn('min-w-0')}>
                    <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                      {t('taskDetail.activityCompleted', {}, { defaultValue: 'Marked complete' })}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
                      {fmtDateTime(task.completed_at)}
                    </p>
                  </div>
                </li>
              )}
            </ol>
          </div>
        </aside>
      </section>
    </div>
  )
}
