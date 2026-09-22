import { useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { EmailTemplate, TemplateCategory } from '../components/TemplateLibraryGrid.js'
import { TemplateLibraryGrid } from '../components/TemplateLibraryGrid.js'

interface TemplateRow {
  id: string
  name: string
  description: string
  subject: string
  body: string
  category: string
  variables?: unknown
  created_at?: string
  updated_at?: string
}

const CATEGORIES: ReadonlyArray<{ key: 'all' | TemplateCategory; defaultLabel: string }> = [
  { key: 'all', defaultLabel: 'All templates' },
  { key: 'sales', defaultLabel: 'Sales' },
  { key: 'recruiting', defaultLabel: 'Recruiting' },
  { key: 'executive', defaultLabel: 'Executive' },
  { key: 'follow_up', defaultLabel: 'Follow-ups' },
  { key: 'apology', defaultLabel: 'Apologies' },
  { key: 'announcement', defaultLabel: 'Announcements' },
]

const ACCENT_FOR_CATEGORY: Record<string, 'primary' | 'secondary' | 'tertiary'> = {
  sales: 'primary',
  recruiting: 'secondary',
  executive: 'tertiary',
  follow_up: 'primary',
  apology: 'tertiary',
  announcement: 'secondary',
  general: 'primary',
}

function rowToCard(row: TemplateRow): EmailTemplate {
  const category = (row.category as TemplateCategory) ?? 'sales'
  return {
    id: row.id,
    name: row.name,
    category,
    preview: row.description || row.subject || '',
    usage_count: 0,
    accent: ACCENT_FOR_CATEGORY[row.category] ?? 'primary',
  }
}

interface TemplateFormValues {
  name: string
  category: TemplateCategory
  description: string
  subject: string
  body: string
}

const EMPTY_FORM: TemplateFormValues = {
  name: '',
  category: 'sales',
  description: '',
  subject: '',
  body: '',
}

export function Templates() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [activeCategory, setActiveCategory] = useState<'all' | TemplateCategory>('all')
  const [query, setQuery] = useState('')

  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TemplateFormValues>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const response = await http.get<TemplateRow[] | { data: TemplateRow[] }>('/templates')
      const rows = Array.isArray(response.data) ? response.data : (response.data.data ?? [])
      setTemplates(rows)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load templates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const filtered = useMemo(() => {
    return templates.filter((tmpl) => {
      if (activeCategory !== 'all' && tmpl.category !== activeCategory) return false
      if (query) {
        const q = query.toLowerCase()
        const haystack = `${tmpl.name} ${tmpl.description} ${tmpl.subject}`.toLowerCase()
        return haystack.includes(q)
      }
      return true
    })
  }, [activeCategory, query, templates])

  const cards = useMemo(() => filtered.map(rowToCard), [filtered])

  const openNewForm = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setSaveError(null)
    setFormOpen(true)
  }

  const openEditForm = (template: EmailTemplate) => {
    const row = templates.find((t) => t.id === template.id)
    if (!row) return
    setEditingId(row.id)
    setForm({
      name: row.name,
      category: (row.category as TemplateCategory) ?? 'sales',
      description: row.description ?? '',
      subject: row.subject ?? '',
      body: row.body ?? '',
    })
    setSaveError(null)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setSaveError(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setSaveError(t('templates.nameRequired', {}, { defaultValue: 'Template name is required.' }))
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      if (editingId) {
        await http.put(`/templates/${editingId}`, {
          name: form.name,
          category: form.category,
          description: form.description,
          subject: form.subject,
          body: form.body,
        })
        void track({
          name: 'template.updated',
          properties: { template_id: editingId, category: form.category },
        })
      } else {
        await http.post('/templates', {
          name: form.name,
          category: form.category,
          description: form.description,
          subject: form.subject,
          body: form.body,
        })
        void track({
          name: 'template.created',
          properties: { category: form.category },
        })
      }
      closeForm()
      await refresh()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setSaving(true)
    try {
      await http.delete(`/templates/${id}`)
      void track({ name: 'template.deleted', properties: { template_id: id } })
      setDeleteConfirmId(null)
      closeForm()
      await refresh()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      data-mol-id="templates-page"
      className={cm.cn('px-4 py-6 md:px-8 md:py-8', cm.maxW('7xl'), 'mx-auto', cm.stack(8))}
    >
      <header className={cm.flex({ align: 'start', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tighter')}>
            {t('templates.heading', {}, { defaultValue: 'Template library' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'templates.subheading',
              {},
              { defaultValue: 'Battle-tested patterns for the messages that matter.' },
            )}
          </p>
        </div>
        <button
          type="button"
          data-mol-id="templates-new"
          onClick={openNewForm}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-xl text-white transition-all hover:shadow-md',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #a78bfa))',
          }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            add
          </span>
          {t('templates.newTemplate', {}, { defaultValue: 'New template' })}
        </button>
      </header>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
          cm.sp('p', 4),
          'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', wrap: 'wrap', gap: 'xs' }))}>
          {CATEGORIES.map((cat) => {
            const active = cat.key === activeCategory
            return (
              <button
                key={cat.key}
                type="button"
                data-mol-id={`templates-filter-${cat.key}`}
                onClick={() => setActiveCategory(cat.key)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.roundedFull,
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest transition-colors',
                  active
                    ? 'bg-primary text-white'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                )}
              >
                {t(`templates.category.${cat.key}`, {}, { defaultValue: cat.defaultLabel })}
              </button>
            )
          })}
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            'min-w-[260px] flex-1 max-w-md',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-on-surface-variant')}
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            data-mol-id="templates-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('templates.search', {}, { defaultValue: 'Search templates' })}
            className={cm.cn(
              cm.sp('px', 2),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'flex-1 bg-transparent border-none outline-none focus:ring-0',
            )}
          />
        </div>
      </div>

      {loading ? (
        <p
          data-mol-id="templates-loading"
          className={cm.cn(cm.textCenter, cm.sp('py', 6), 'text-on-surface-variant')}
        >
          {t('nav.loadingTemplates', {}, { defaultValue: 'Loading templates…' })}
        </p>
      ) : loadError ? (
        <p
          data-mol-id="templates-error"
          role="alert"
          className={cm.cn(cm.textCenter, cm.sp('py', 6), 'text-on-error')}
        >
          {loadError}
        </p>
      ) : cards.length === 0 ? (
        <div
          data-mol-id="templates-empty"
          className={cm.cn(
            cm.sp('p', 8),
            cm.textCenter,
            'rounded-2xl border-2 border-dashed border-outline-variant/60 text-on-surface-variant',
          )}
        >
          <p className={cm.cn(cm.textSize('sm'))}>
            {query || activeCategory !== 'all'
              ? t('templates.noResults', {}, { defaultValue: 'No templates match your filters.' })
              : t(
                  'templates.emptyAll',
                  {},
                  { defaultValue: 'No templates yet — create your first to start your library.' },
                )}
          </p>
        </div>
      ) : (
        <TemplateLibraryGrid templates={cards} onSelect={openEditForm} />
      )}

      {formOpen && (
        <div
          data-mol-id="templates-modal"
          className={cm.cn(
            'fixed inset-0 z-50 flex items-center justify-center',
            'bg-foreground/40 backdrop-blur-sm',
          )}
          role="dialog"
          aria-modal="true"
        >
          <form
            data-mol-id="templates-form"
            onSubmit={handleSave}
            className={cm.cn(
              cm.sp('p', 6),
              'w-full max-w-xl mx-4 max-h-[92vh] overflow-y-auto bg-surface rounded-2xl shadow-xl border border-outline-variant/40',
              cm.flex({ direction: 'col', gap: 'md' }),
            )}
          >
            <header className={cm.flex({ align: 'center', justify: 'between' })}>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
                {editingId
                  ? t('templates.editHeading', {}, { defaultValue: 'Edit template' })
                  : t('templates.createHeading', {}, { defaultValue: 'New template' })}
              </h2>
              <button
                type="button"
                data-mol-id="templates-form-close"
                onClick={closeForm}
                aria-label={t('common.close', {}, { defaultValue: 'Close' })}
                className={cm.cn('text-on-surface-variant hover:text-on-surface')}
              >
                <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                  close
                </span>
              </button>
            </header>

            <label className={cm.cn(cm.textSize('xs'), 'font-bold uppercase tracking-widest')}>
              {t('form.name', {}, { defaultValue: 'Name' })}
              <input
                type="text"
                data-mol-id="templates-form-name"
                name="name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.sp('mt', 1),
                  cm.w('full'),
                  cm.textSize('base'),
                  cm.fontWeight('normal'),
                  'rounded-lg border border-outline-variant bg-surface-container-low outline-none focus:border-primary normal-case tracking-normal',
                )}
              />
            </label>

            <label className={cm.cn(cm.textSize('xs'), 'font-bold uppercase tracking-widest')}>
              {t('form.category', {}, { defaultValue: 'Category' })}
              <select
                data-mol-id="templates-form-category"
                name="category"
                value={form.category}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, category: e.target.value as TemplateCategory }))
                }
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.sp('mt', 1),
                  cm.w('full'),
                  cm.textSize('base'),
                  cm.fontWeight('normal'),
                  'rounded-lg border border-outline-variant bg-surface-container-low outline-none focus:border-primary normal-case tracking-normal',
                )}
              >
                {CATEGORIES.filter((c) => c.key !== 'all').map((c) => (
                  <option key={c.key} value={c.key}>
                    {t(`templates.category.${c.key}`, {}, { defaultValue: c.defaultLabel })}
                  </option>
                ))}
              </select>
            </label>

            <label className={cm.cn(cm.textSize('xs'), 'font-bold uppercase tracking-widest')}>
              {t('templates.field.description', {}, { defaultValue: 'Description' })}
              <input
                type="text"
                data-mol-id="templates-form-description"
                name="description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.sp('mt', 1),
                  cm.w('full'),
                  cm.textSize('base'),
                  cm.fontWeight('normal'),
                  'rounded-lg border border-outline-variant bg-surface-container-low outline-none focus:border-primary normal-case tracking-normal',
                )}
              />
            </label>

            <label className={cm.cn(cm.textSize('xs'), 'font-bold uppercase tracking-widest')}>
              {t('templates.field.subject', {}, { defaultValue: 'Subject' })}
              <input
                type="text"
                data-mol-id="templates-form-subject"
                name="subject"
                value={form.subject}
                onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.sp('mt', 1),
                  cm.w('full'),
                  cm.textSize('base'),
                  cm.fontWeight('normal'),
                  'rounded-lg border border-outline-variant bg-surface-container-low outline-none focus:border-primary normal-case tracking-normal',
                )}
              />
            </label>

            <label className={cm.cn(cm.textSize('xs'), 'font-bold uppercase tracking-widest')}>
              {t('templates.field.body', {}, { defaultValue: 'Body' })}
              <textarea
                data-mol-id="templates-form-body"
                name="body"
                value={form.body}
                onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                rows={6}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.sp('mt', 1),
                  cm.w('full'),
                  cm.textSize('base'),
                  cm.fontWeight('normal'),
                  'rounded-lg border border-outline-variant bg-surface-container-low outline-none focus:border-primary normal-case tracking-normal',
                )}
              />
            </label>

            {saveError && (
              <p
                data-mol-id="templates-form-error"
                role="alert"
                className={cm.cn(cm.textSize('sm'), 'text-on-error')}
              >
                {saveError}
              </p>
            )}

            <footer className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}>
              <div className={cm.flex({ gap: 'sm' })}>
                <button
                  type="submit"
                  data-mol-id="templates-form-save"
                  disabled={saving}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'rounded-lg text-white transition-all hover:shadow-md disabled:opacity-50',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #a78bfa))',
                  }}
                >
                  {saving
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('templates.save', {}, { defaultValue: 'Save template' })}
                </button>
                <button
                  type="button"
                  data-mol-id="templates-form-cancel"
                  onClick={closeForm}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'rounded-lg border border-outline hover:bg-surface-container-low transition-colors',
                  )}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
              </div>
              {editingId && (
                <button
                  type="button"
                  data-mol-id="templates-form-delete"
                  onClick={() => setDeleteConfirmId(editingId)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'rounded-lg text-on-error hover:bg-error-container/40',
                  )}
                >
                  {t('common.delete', {}, { defaultValue: 'Delete' })}
                </button>
              )}
            </footer>
          </form>
        </div>
      )}

      {deleteConfirmId && (
        <div
          data-mol-id="templates-delete-confirm"
          className={cm.cn(
            'fixed inset-0 z-[60] flex items-center justify-center',
            'bg-foreground/50 backdrop-blur-sm',
          )}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'w-full max-w-sm mx-4 bg-surface rounded-2xl shadow-xl',
              cm.flex({ direction: 'col', gap: 'md' }),
            )}
          >
            <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {t('templates.confirmDelete', {}, { defaultValue: 'Delete this template?' })}
            </h3>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('templates.confirmDeleteBody', {}, { defaultValue: 'This cannot be undone.' })}
            </p>
            <div className={cm.flex({ gap: 'sm', justify: 'end' })}>
              <button
                type="button"
                data-mol-id="templates-delete-cancel"
                onClick={() => setDeleteConfirmId(null)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-lg border border-outline hover:bg-surface-container-low transition-colors',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="button"
                data-mol-id="templates-delete-confirm-button"
                onClick={() => void handleDelete(deleteConfirmId)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-lg bg-error text-on-error',
                )}
              >
                {t('common.delete', {}, { defaultValue: 'Delete' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Templates
export { Templates as TemplatesPage }
