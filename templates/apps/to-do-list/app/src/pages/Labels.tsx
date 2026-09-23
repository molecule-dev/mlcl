import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { createLabel, deleteLabel, type Label, listLabels, updateLabel } from '../lib/api.js'

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

interface NewLabelFormProps {
  busy: boolean
  errorMessage: string | null
  onSubmit: (input: { name: string; color: string }) => Promise<void> | void
  onCancel: () => void
}

function NewLabelForm({ busy, errorMessage, onSubmit, onCancel }: NewLabelFormProps) {
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
      aria-label={t('labels.newFormLabel', {}, { defaultValue: 'New label form' })}
    >
      <div>
        <label
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'block mb-1 text-on-surface-variant uppercase tracking-wider',
          )}
          htmlFor="label-new-name"
        >
          {t('form.name', {}, { defaultValue: 'Name' })}
        </label>
        <input
          id="label-new-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t(
            'labels.namePlaceholder',
            {},
            { defaultValue: 'urgent, errands, weekend…' },
          )}
          data-mol-id="label-new-input"
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
          {t('labels.colorLabel', {}, { defaultValue: 'Color' })}
        </p>
        <div className={cm.cn('flex flex-wrap gap-2')}>
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={t(
                'labels.colorAria',
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
            : t('labels.create', {}, { defaultValue: 'Create label' })}
        </button>
      </div>
    </form>
  )
}

export function Labels() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [labels, setLabels] = useState<Label[]>([])
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
    listLabels(http)
      .then((items) => {
        if (!cancelled) setLabels(items)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('labels.loadError', {}, { defaultValue: 'Failed to load labels.' }))
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
      const created = await createLabel(http, input)
      if (created) {
        setLabels((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
        setShowForm(false)
        void track({ name: 'label.created', properties: { label_id: created.id } })
      } else {
        setCreateError(t('labels.createError', {}, { defaultValue: 'Could not create label.' }))
      }
    } catch (err) {
      // Surface 409 duplicate-name nicely.
      const msg = err instanceof Error ? err.message : ''
      setCreateError(
        /already exists/i.test(msg)
          ? t(
              'labels.duplicate',
              { name: input.name },
              { defaultValue: 'A label called "{{name}}" already exists.' },
            )
          : t('labels.createError', {}, { defaultValue: 'Could not create label.' }),
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
    const updated = await updateLabel(http, id, { name: next }).catch(() => null)
    if (updated) {
      setLabels((prev) =>
        prev
          .map((l) => (l.id === id ? { ...l, name: updated.name, color: updated.color } : l))
          .sort((a, b) => a.name.localeCompare(b.name)),
      )
    }
    setRenamingId(null)
  }

  const onDelete = async (id: string, name: string) => {
    if (
      !window.confirm(
        t(
          'labels.deleteConfirm',
          { name },
          { defaultValue: 'Delete label "{{name}}"? It will be removed from all tasks.' },
        ),
      )
    )
      return
    await deleteLabel(http, id).catch(() => null)
    void track({ name: 'label.deleted', properties: { label_id: id } })
    setLabels((prev) => prev.filter((l) => l.id !== id))
  }

  const totalTagged = labels.reduce((s, x) => s + (x.task_count ?? 0), 0)

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
            {t('labels.eyebrow', {}, { defaultValue: 'Tags & filters' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('labels.heading', {}, { defaultValue: 'Labels' })}
          </h1>
          {!loading && !error && labels.length > 0 ? (
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
                  'labels.totalCount',
                  { count: labels.length },
                  { defaultValue: '{{count}} labels' },
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
                  'labels.tasksTotal',
                  { count: totalTagged },
                  { defaultValue: '{{count}} tagged tasks' },
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
          data-mol-id="label-new-cta"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          {t('labels.newCta', {}, { defaultValue: 'New label' })}
        </button>
      </header>

      {showForm && (
        <NewLabelForm
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
      ) : labels.length === 0 && !showForm ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('labels.empty', {}, { defaultValue: 'No labels yet — add one to filter your tasks.' })}
        </p>
      ) : (
        <ul className={cm.cn(cm.card(), 'overflow-hidden divide-y divide-outline-variant')}>
          {labels.map((l) => (
            <li
              key={l.id}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-1 min-w-0')}>
                <span
                  className={cm.cn('h-3 w-3 rounded-full shrink-0')}
                  style={{ backgroundColor: l.color }}
                  aria-hidden="true"
                />
                {renamingId === l.id ? (
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => onRename(l.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onRename(l.id)
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
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingId(l.id)
                      setRenameValue(l.name)
                    }}
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      cm.roundedFull,
                      'bg-surface-container-high font-mono hover:bg-surface-container-highest',
                    )}
                  >
                    @{l.name}
                  </button>
                )}
              </div>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                <span
                  className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'tabular-nums')}
                >
                  {t(
                    'labels.taskCountInline',
                    { count: l.task_count },
                    { defaultValue: '{{count}} tasks' },
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => onDelete(l.id, l.name)}
                  aria-label={t(
                    'labels.deleteAria',
                    { name: l.name },
                    { defaultValue: 'Delete label {{name}}' },
                  )}
                  className={cm.cn('text-on-surface-variant hover:text-error')}
                >
                  <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                    delete
                  </span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
