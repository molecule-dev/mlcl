import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  createProject,
  deleteProject,
  listProjects,
  type Project,
  updateProject,
} from '../lib/api.js'

const PRESET_COLORS = [
  '#dc2626',
  '#ea580c',
  '#d97706',
  '#ca8a04',
  '#65a30d',
  '#16a34a',
  '#0d9488',
  '#0891b2',
  '#2563eb',
  '#4f46e5',
  '#7c3aed',
  '#9333ea',
  '#c026d3',
  '#db2777',
  '#e11d48',
  '#475569',
]

interface NewProjectFormProps {
  busy: boolean
  errorMessage: string | null
  onSubmit: (input: { name: string; color: string }) => Promise<void> | void
  onCancel: () => void
}

function NewProjectForm({ busy, errorMessage, onSubmit, onCancel }: NewProjectFormProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[8])
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        const trimmed = name.trim()
        if (!trimmed) return
        await onSubmit({ name: trimmed, color })
      }}
      className={cm.cn(cm.card(), cm.sp('p', 4), 'space-y-3')}
      aria-label={t('projects.newFormLabel', {}, { defaultValue: 'New project form' })}
    >
      <div>
        <label
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'block mb-1 text-on-surface-variant uppercase tracking-wider',
          )}
          htmlFor="project-new-name"
        >
          {t('form.name', {}, { defaultValue: 'Name' })}
        </label>
        <input
          id="project-new-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t(
            'projects.namePlaceholder',
            {},
            { defaultValue: 'Spring Launch, Personal, Side hustle…' },
          )}
          data-mol-id="project-new-input"
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'w-full border border-outline-variant rounded-md text-sm',
          )}
        />
      </div>
      <div>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'mb-2 text-on-surface-variant uppercase tracking-wider',
          )}
        >
          {t('projects.colorLabel', {}, { defaultValue: 'Color' })}
        </p>
        <div className={cm.cn('flex flex-wrap gap-2')}>
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={t(
                'projects.colorAria',
                { color: c },
                { defaultValue: 'Use color {{color}}' },
              )}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className={cm.cn(
                'h-6 w-6 rounded-full ring-2 transition-all',
                color === c ? 'ring-on-surface scale-110' : 'ring-transparent hover:scale-110',
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      {errorMessage && <p className={cm.cn(cm.textSize('xs'), 'text-error')}>{errorMessage}</p>}
      <div className={cm.cn('flex gap-2 justify-end')}>
        <button
          type="button"
          onClick={onCancel}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-md text-on-surface-variant hover:bg-surface-container',
          )}
        >
          {t('common.cancel', {}, { defaultValue: 'Cancel' })}
        </button>
        <button
          type="submit"
          disabled={busy || name.trim().length === 0}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          {busy
            ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
            : t('projects.create', {}, { defaultValue: 'Create project' })}
        </button>
      </div>
    </form>
  )
}

export function Projects() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listProjects(http)
      .then((items) => {
        if (!cancelled) setProjects(items)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('projects.loadError', {}, { defaultValue: 'Failed to load projects.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const onCreate = async (input: { name: string; color: string }) => {
    setCreating(true)
    setCreateError(null)
    try {
      const created = await createProject(http, input)
      if (created) {
        setProjects((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
        setShowForm(false)
        void track({
          name: 'project.created',
          properties: { project_id: created.id },
        })
      } else {
        setCreateError(t('projects.createError', {}, { defaultValue: 'Could not create project.' }))
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setCreateError(
        /already exists/i.test(msg)
          ? t(
              'projects.duplicate',
              { name: input.name },
              { defaultValue: 'A project called "{{name}}" already exists.' },
            )
          : t('projects.createError', {}, { defaultValue: 'Could not create project.' }),
      )
    } finally {
      setCreating(false)
    }
  }

  const onRename = async (id: string) => {
    const next = renameValue.trim()
    if (!next) {
      setRenamingId(null)
      return
    }
    const updated = await updateProject(http, id, { name: next }).catch(() => null)
    if (updated) {
      setProjects((prev) =>
        prev
          .map((p) => (p.id === id ? { ...p, name: updated.name, color: updated.color } : p))
          .sort((a, b) => a.name.localeCompare(b.name)),
      )
    }
    setRenamingId(null)
  }

  const onDelete = async (id: string, name: string) => {
    if (
      !window.confirm(
        t(
          'projects.deleteConfirm',
          { name },
          { defaultValue: 'Delete project "{{name}}"? Its tasks will move to your inbox.' },
        ),
      )
    )
      return
    await deleteProject(http, id).catch(() => null)
    void track({ name: 'project.deleted', properties: { project_id: id } })
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  const totalTasks = projects.reduce((s, p) => s + (p.task_count ?? 0), 0)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('projects.eyebrow', {}, { defaultValue: 'Workstreams' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('nav.projects', {}, { defaultValue: 'Projects' })}
          </h1>
          {!loading && !error && projects.length > 0 ? (
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
                  'projects.totalCount',
                  { count: projects.length },
                  { defaultValue: '{{count}} projects' },
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
                {t(
                  'projects.tasksTotal',
                  { count: totalTasks },
                  { defaultValue: '{{count}} tasks total' },
                )}
              </span>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm(true)
            setCreateError(null)
          }}
          data-mol-id="project-new-cta"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          {t('nav.newProject', {}, { defaultValue: 'New project' })}
        </button>
      </header>

      {showForm && (
        <NewProjectForm
          busy={creating}
          errorMessage={createError}
          onSubmit={onCreate}
          onCancel={() => {
            setShowForm(false)
            setCreateError(null)
          }}
        />
      )}

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : projects.length === 0 && !showForm ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t(
            'projects.empty',
            {},
            { defaultValue: 'No projects yet — group related tasks together with one.' },
          )}
        </p>
      ) : (
        <ul className={cm.cn(cm.card(), 'overflow-hidden divide-y divide-outline-variant')}>
          {projects.map((p) => {
            const total = p.task_count ?? 0
            const completed = p.completed_count ?? 0
            const remaining = total - completed
            return (
              <li
                key={p.id}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-1 min-w-0')}>
                  <span
                    className={cm.cn('h-3 w-3 rounded-full shrink-0')}
                    style={{ backgroundColor: p.color }}
                    aria-hidden="true"
                  />
                  {renamingId === p.id ? (
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => onRename(p.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onRename(p.id)
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.textSize('sm'),
                        'border border-outline-variant rounded-md font-mono',
                      )}
                    />
                  ) : (
                    <Link
                      to={`/projects/${p.id}`}
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'truncate hover:text-primary',
                      )}
                    >
                      {p.name}
                    </Link>
                  )}
                </div>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  <span
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}
                  >
                    {t(
                      'projects.taskCountInline',
                      { remaining, total },
                      { defaultValue: '{{remaining}}/{{total}} open' },
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingId(p.id)
                      setRenameValue(p.name)
                    }}
                    aria-label={t(
                      'projects.renameAria',
                      { name: p.name },
                      { defaultValue: 'Rename project {{name}}' },
                    )}
                    className={cm.cn('text-on-surface-variant hover:text-primary')}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      edit
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(p.id, p.name)}
                    aria-label={t(
                      'projects.deleteAria',
                      { name: p.name },
                      { defaultValue: 'Delete project {{name}}' },
                    )}
                    className={cm.cn('text-on-surface-variant hover:text-error')}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      delete
                    </span>
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
