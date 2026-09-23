import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface TemplateDoc {
  id: string
  name: string
  description: string
  category: 'msa' | 'sow' | 'nda' | 'order' | 'employment' | 'other'
  type: string
  content: string
  body_html: string
  version: string
  used_count: number
  updated_at: string
}

const CATEGORIES: TemplateDoc['category'][] = ['msa', 'sow', 'nda', 'order', 'employment', 'other']

const CATEGORY_LABEL: Record<TemplateDoc['category'], string> = {
  msa: 'Master Service Agreement',
  sow: 'Statement of Work',
  nda: 'Non-Disclosure Agreement',
  order: 'Order Form',
  employment: 'Employment',
  other: 'Other',
}

interface FormState {
  name: string
  description: string
  category: TemplateDoc['category']
  content: string
}

const EMPTY: FormState = {
  name: '',
  description: '',
  category: 'msa',
  content: '',
}

export function TemplateEditor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'

  const [tmpl, setTmpl] = useState<TemplateDoc | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    if (isNew) return
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/templates/${id}`)
      .then((res) => {
        if (cancelled) return
        const doc = unwrapSingle<TemplateDoc>(res)
        if (doc) {
          setTmpl(doc)
          setForm({
            name: doc.name,
            description: doc.description ?? '',
            category: doc.category ?? 'msa',
            content: doc.content ?? '',
          })
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(t('templateEditor.loadError', {}, { defaultValue: 'Failed to load template.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, isNew, t])

  const detectedVariables = useMemo(() => {
    const matches = form.content.match(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g) ?? []
    const set = new Set<string>()
    for (const m of matches) {
      const inner = m.replace(/\{\{|\}\}/g, '').trim()
      if (inner) set.add(inner)
    }
    return Array.from(set)
  }, [form.content])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setSaveError(t('auth.signup.nameRequired', {}, { defaultValue: 'Name is required.' }))
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category,
        type: form.category,
        content: form.content,
      }
      if (isNew) {
        const res = await http.post('/api/templates', payload)
        const created = unwrapSingle<TemplateDoc>(res)
        if (created) {
          void track({ name: 'template.created', properties: { templateId: created.id } })
          navigate(`/templates/${created.id}`, { replace: true })
        } else {
          setSavedAt(new Date().toISOString())
        }
      } else {
        const res = await http.patch(`/api/templates/${id}`, { ...payload, bumpVersion: true })
        const updated = unwrapSingle<TemplateDoc>(res)
        if (updated) {
          setTmpl(updated)
          void track({ name: 'template.updated', properties: { templateId: updated.id } })
        }
        setSavedAt(new Date().toISOString())
      }
    } catch (error) {
      logError('templateEditor.save', error)
      setSaveError(t('templateEditor.saveError', {}, { defaultValue: 'Failed to save template.' }))
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (isNew || !id) return
    const ok = window.confirm(
      t('templateEditor.confirmDelete', {}, { defaultValue: 'Delete this template?' }),
    )
    if (!ok) return
    try {
      await http.delete(`/api/templates/${id}`)
      void track({ name: 'template.deleted', properties: { templateId: id } })
      navigate('/templates', { replace: true })
    } catch (error) {
      logError('templateEditor.remove', error)
      setSaveError(
        t('templateEditor.deleteError', {}, { defaultValue: 'Failed to delete template.' }),
      )
    }
  }

  if (loading)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('templateEditor.loading', {}, { defaultValue: 'Loading\u2026' })}
      </div>
    )
  if (error) return <div className={cm.cn(cm.sp('p', 8), 'text-error')}>{error}</div>

  return (
    <form
      onSubmit={save}
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}
      data-testid="template-form"
    >
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <Link
          to="/templates"
          className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}
        >
          ← {t('nav.templates', {}, { defaultValue: 'Templates' })}
        </Link>
        <div className={cm.flex({ gap: 'sm' })}>
          {!isNew ? (
            <button
              type="button"
              id="delete-template"
              onClick={remove}
              disabled={saving}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'rounded-md border border-error text-error hover:bg-error/10',
              )}
            >
              {t('common.delete', {}, { defaultValue: 'Delete' })}
            </button>
          ) : null}
          <button
            type="submit"
            id="save-template"
            disabled={saving}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md disabled:opacity-60',
            )}
          >
            {saving
              ? t('templateEditor.saving', {}, { defaultValue: 'Saving\u2026' })
              : isNew
                ? t('templateEditor.createCta', {}, { defaultValue: 'Create template' })
                : t('templateEditor.saveCta', {}, { defaultValue: 'Save new version' })}
          </button>
        </div>
      </div>

      {saveError ? (
        <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
          {saveError}
        </p>
      ) : null}
      {savedAt && !saveError ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-success')}>
          {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
        </p>
      ) : null}

      <header className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4')}>
        {tmpl ? (
          <p
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-wide',
              'text-on-surface-variant',
              'font-mono',
            )}
          >
            v{tmpl.version} ·{' '}
            {t(
              'templateEditor.usedCount',
              { count: tmpl.used_count },
              { defaultValue: 'Used {{count}}\u00d7' },
            )}
          </p>
        ) : null}

        <label className={'block'}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wide text-on-surface-variant',
            )}
          >
            {t('form.name', {}, { defaultValue: 'Name' })}
          </span>
          <input
            id="tmpl-name"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.sp('mt', 1),
              cm.textSize('lg'),
              'w-full border border-outline-variant rounded-md',
            )}
          />
        </label>

        <label className={'block'}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wide text-on-surface-variant',
            )}
          >
            {t('form.description', {}, { defaultValue: 'Description' })}
          </span>
          <input
            id="tmpl-description"
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.sp('mt', 1),
              'w-full border border-outline-variant rounded-md',
            )}
          />
        </label>

        <label className={'block'}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wide text-on-surface-variant',
            )}
          >
            {t('form.category', {}, { defaultValue: 'Category' })}
          </span>
          <select
            id="tmpl-category"
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value as TemplateDoc['category'] })
            }
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.sp('mt', 1),
              'w-full border border-outline-variant rounded-md',
            )}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABEL[cat]}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-3')}>
        <label className={'block'}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wide text-on-surface-variant',
            )}
          >
            {t('templateEditor.fld.content', {}, { defaultValue: 'Template body' })}
          </span>
          <textarea
            id="tmpl-content"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={20}
            className={cm.cn(
              cm.sp('p', 4),
              cm.sp('mt', 1),
              'w-full border border-outline-variant rounded-md font-mono text-sm',
            )}
            placeholder={t(
              'templateEditor.placeholder',
              {},
              { defaultValue: 'Use {{variableName}} for dynamic fields.' },
            )}
          />
        </label>

        {detectedVariables.length > 0 ? (
          <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap items-center')}>
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t('templateEditor.variables', {}, { defaultValue: 'Detected variables:' })}
            </span>
            {detectedVariables.map((v) => (
              <span
                key={v}
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  cm.roundedFull,
                  'bg-secondary-container text-on-secondary-container font-mono',
                )}
              >
                {`{{${v}}}`}
              </span>
            ))}
          </div>
        ) : null}
      </section>
    </form>
  )
}
