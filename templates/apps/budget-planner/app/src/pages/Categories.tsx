import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Category {
  id: string
  name: string
  group: string
  archived: boolean
}

export function Categories() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [cats, setCats] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  function reload() {
    setLoading(true)
    setError(null)
    http
      .get('/api/categories')
      .then((res) => setCats(unwrapList<Category>(res)))
      .catch(() =>
        setError(t('categories.loadError', {}, { defaultValue: 'Failed to load categories.' })),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/categories')
      .then((res) => {
        if (!cancelled) setCats(unwrapList<Category>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('categories.loadError', {}, { defaultValue: 'Failed to load categories.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const groups = useMemo(() => {
    const map = new Map<string, Category[]>()
    for (const c of cats) {
      if (c.archived) continue
      const arr = map.get(c.group) ?? []
      arr.push(c)
      map.set(c.group, arr)
    }
    return Array.from(map.entries())
  }, [cats])

  async function archive(id: string) {
    await http.put(`/api/categories/${id}`, { archived: true })
    reload()
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('categories.heading', {}, { defaultValue: 'Categories' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'categories.subheading',
              {},
              {
                defaultValue: 'Group your envelopes and archive what you no longer need.',
              },
            )}
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          type="button"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          {showForm
            ? t('common.cancel', {}, { defaultValue: 'Cancel' })
            : t('categories.addCta', {}, { defaultValue: 'New category' })}
        </button>
      </header>

      {showForm ? (
        <CategoryForm
          onSaved={() => {
            setShowForm(false)
            reload()
          }}
        />
      ) : null}

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : groups.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('categories.empty', {}, { defaultValue: 'No categories yet.' })}
        </p>
      ) : (
        <div className={cm.stack(4)}>
          {groups.map(([group, items]) => (
            <section key={group} className={cm.cn(cm.card(), 'overflow-hidden')}>
              <header
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  'bg-surface-container border-b border-outline-variant',
                )}
              >
                <h2
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-wide',
                  )}
                >
                  {group}
                </h2>
              </header>
              <ul className="divide-y divide-outline-variant">
                {items.map((c) => (
                  <li key={c.id} className={cm.cn(cm.sp('px', 5), cm.sp('py', 3))}>
                    {editingId === c.id ? (
                      <CategoryEditInline
                        cat={c}
                        onCancel={() => setEditingId(null)}
                        onSaved={() => {
                          setEditingId(null)
                          reload()
                        }}
                      />
                    ) : (
                      <div className={cm.flex({ align: 'center', justify: 'between' })}>
                        <span className={cm.fontWeight('medium')}>{c.name}</span>
                        <div className={cm.flex({ gap: 'sm' })}>
                          <button
                            onClick={() => setEditingId(c.id)}
                            type="button"
                            className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}
                          >
                            {t('common.edit', {}, { defaultValue: 'Edit' })}
                          </button>
                          <button
                            onClick={() => {
                              void archive(c.id)
                            }}
                            type="button"
                            className={cm.cn(cm.textSize('sm'), 'text-error hover:underline')}
                          >
                            {t('common.archive', {}, { defaultValue: 'Archive' })}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function CategoryForm({ onSaved }: { onSaved: () => void }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [name, setName] = useState('')
  const [group, setGroup] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError(t('auth.signup.nameRequired', {}, { defaultValue: 'Name is required.' }))
      return
    }
    setSubmitting(true)
    void http
      .post('/api/categories', { name: name.trim(), group_name: group.trim() || undefined })
      .then(() => onSaved())
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        setError(
          msg || t('categories.error.create', {}, { defaultValue: 'Could not create category.' }),
        )
        setSubmitting(false)
      })
  }

  return (
    <form onSubmit={onSubmit} className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('categories.form.heading', {}, { defaultValue: 'New category' })}
      </h2>
      <label className="block">
        <span
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
        >
          {t('form.name', {}, { defaultValue: 'Name' })}
        </span>
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'w-full border border-outline-variant rounded-md',
          )}
        />
      </label>
      <label className="block">
        <span
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
        >
          {t('categories.form.group', {}, { defaultValue: 'Group' })}
        </span>
        <input
          name="group_name"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          placeholder={t('categories.form.groupPlaceholder', {}, { defaultValue: 'Essentials' })}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'w-full border border-outline-variant rounded-md',
          )}
        />
      </label>
      {error ? (
        <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
          {error}
        </p>
      ) : null}
      <div className={cm.flex({ gap: 'sm', justify: 'end' })}>
        <button
          type="submit"
          disabled={submitting}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md disabled:opacity-50',
          )}
        >
          {submitting
            ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
            : t('categories.form.saveCta', {}, { defaultValue: 'Create category' })}
        </button>
      </div>
    </form>
  )
}

function CategoryEditInline({
  cat,
  onCancel,
  onSaved,
}: {
  cat: Category
  onCancel: () => void
  onSaved: () => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [name, setName] = useState(cat.name)
  const [group, setGroup] = useState(cat.group)
  const [saving, setSaving] = useState(false)

  function onSave() {
    setSaving(true)
    void http
      .put(`/api/categories/${cat.id}`, { name, group_name: group })
      .then(() => onSaved())
      .finally(() => setSaving(false))
  }

  return (
    <div className={cm.flex({ gap: 'sm', align: 'center' })}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={cm.cn(
          cm.sp('px', 2),
          cm.sp('py', 1),
          'border border-outline-variant rounded-md',
        )}
      />
      <input
        value={group}
        onChange={(e) => setGroup(e.target.value)}
        className={cm.cn(
          cm.sp('px', 2),
          cm.sp('py', 1),
          'border border-outline-variant rounded-md',
        )}
      />
      <button
        onClick={onSave}
        disabled={saving}
        type="button"
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 1),
          cm.textSize('sm'),
          'bg-primary text-on-primary rounded-md disabled:opacity-50',
        )}
      >
        {saving
          ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
          : t('common.save', {}, { defaultValue: 'Save' })}
      </button>
      <button
        onClick={onCancel}
        type="button"
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 1),
          cm.textSize('sm'),
          'text-on-surface-variant hover:underline',
        )}
      >
        {t('common.cancel', {}, { defaultValue: 'Cancel' })}
      </button>
    </div>
  )
}
