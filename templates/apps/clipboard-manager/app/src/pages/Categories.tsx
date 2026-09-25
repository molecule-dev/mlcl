import { useCallback, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton, LoadErrorBanner } from '@molecule/app-ui-react'

import { PageHeader } from '../components/PageHeader.js'
import { useFetchList } from '../lib/use-fetch.js'

interface ApiCategoryRow {
  id: string
  name: string
  icon: string | null
  color: string | null
  position: number
  created_at: string
  updated_at: string
}

interface CategoryItem {
  id: string
  name: string
  icon: string
  color: string
}

const PRESET_COLORS = ['#2563eb', '#4f46e5', '#0d9488', '#db2777', '#7c3aed', '#f59e0b', '#16a34a']
const PRESET_ICONS = ['code', 'description', 'link', 'image', 'lock', 'star', 'work']

function adapt(row: ApiCategoryRow): CategoryItem {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon || 'category',
    color: row.color || 'var(--color-primary-dark)',
  }
}

export function Categories() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const adaptCb = useCallback(adapt, [])
  const cats = useFetchList<ApiCategoryRow, CategoryItem>('/api/categories', adaptCb)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState(PRESET_ICONS[0])
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)

  const reset = () => {
    setName('')
    setIcon(PRESET_ICONS[0])
    setColor(PRESET_COLORS[0])
    setShowForm(false)
    setEditingId(null)
    setFormError(null)
  }

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!name.trim() || busy) return
      setBusy(true)
      setFormError(null)
      try {
        if (editingId) {
          await http.patch(`/api/categories/${editingId}`, { name: name.trim(), icon, color })
          void track({
            name: 'category.updated',
            properties: { category_id: editingId },
          })
        } else {
          const res = await http.post<{ id?: string }>('/api/categories', {
            name: name.trim(),
            icon,
            color,
          })
          void track({
            name: 'category.created',
            properties: { category_id: res.data?.id ?? null },
          })
        }
        reset()
        await cats.refetch()
      } catch (err) {
        setFormError(
          (err instanceof Error && err.message) ||
            t('categories.saveError', {}, { defaultValue: 'Could not save the category.' }),
        )
      } finally {
        setBusy(false)
      }
    },
    [name, icon, color, editingId, busy, http, cats, t],
  )

  const handleEdit = useCallback((row: CategoryItem) => {
    setEditingId(row.id)
    setName(row.name)
    setIcon(row.icon)
    setColor(row.color)
    setShowForm(true)
    setFormError(null)
  }, [])

  const handleDelete = useCallback(
    async (id: string) => {
      if (busy) return
      // Confirmation is owned by the shared ConfirmButton (arm → confirm,
      // 4s auto-disarm, Escape, aria-live); this handler only commits.
      setBusy(true)
      setRowError(null)
      try {
        await http.delete(`/api/categories/${id}`)
        void track({ name: 'category.deleted', properties: { category_id: id } })
        if (editingId === id) reset()
        await cats.refetch()
      } catch (err) {
        setRowError(
          (err instanceof Error && err.message) ||
            t('categories.deleteError', {}, { defaultValue: 'Could not delete the category.' }),
        )
      } finally {
        setBusy(false)
      }
    },
    [busy, http, cats, editingId, t],
  )

  return (
    <div className={cm.cn('p-4 md:p-8', cm.maxW('5xl'), cm.mxAuto, 'space-y-10')}>
      <PageHeader
        eyebrow={t('nav.library', {}, { defaultValue: 'Library' })}
        heading={t('categories.heading', {}, { defaultValue: 'Categories & tags' })}
        description={t(
          'categories.description',
          {},
          {
            defaultValue:
              'Group clips into reorderable folders. Pick an icon and a color so the sidebar reads at a glance.',
          },
        )}
        actions={
          <button
            onClick={() => setShowForm(true)}
            type="button"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-md text-white hover:opacity-90 transition-opacity',
            )}
            style={{ background: 'var(--color-primary)' }}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              add
            </span>
            {t('categories.newCategory', {}, { defaultValue: 'New category' })}
          </button>
        }
      />

      {showForm && (
        <form
          onSubmit={handleSave}
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'md' }),
            cm.sp('p', 5),
            'rounded-xl bg-surface-container-lowest border border-outline-variant/40',
          )}
        >
          {formError && (
            <p
              role="alert"
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-md bg-error-container/30 text-error border border-error/30 break-words',
              )}
            >
              {formError}
            </p>
          )}
          <div>
            <label
              htmlFor="category-name"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 1),
                'block uppercase tracking-widest text-on-surface-variant font-mono',
              )}
            >
              {t('form.name', {}, { defaultValue: 'Name' })}
            </label>
            <input
              id="category-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t(
                'categories.namePlaceholder',
                {},
                { defaultValue: 'e.g. Work snippets' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-md border border-outline-variant bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
              )}
            />
          </div>

          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2')}>
            <div>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 2),
                  'block uppercase tracking-widest text-on-surface-variant font-mono',
                )}
              >
                {t('categories.iconLabel', {}, { defaultValue: 'Icon' })}
              </span>
              <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }))}>
                {PRESET_ICONS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIcon(i)}
                    aria-pressed={icon === i}
                    aria-label={t(
                      'categories.iconChoice',
                      { icon: i },
                      { defaultValue: `Icon: ${i}` },
                    )}
                    className={cm.cn(
                      'w-9 h-9 rounded-md flex items-center justify-center border transition-colors',
                      icon === i
                        ? 'bg-primary-container border-primary'
                        : 'border-outline-variant hover:bg-surface-container',
                    )}
                  >
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                      {i}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 2),
                  'block uppercase tracking-widest text-on-surface-variant font-mono',
                )}
              >
                {t('categories.colorLabel', {}, { defaultValue: 'Color' })}
              </span>
              <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }))}>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-pressed={color === c}
                    aria-label={t(
                      'categories.colorChoice',
                      { color: c },
                      { defaultValue: `Color: ${c}` },
                    )}
                    className={cm.cn(
                      'w-9 h-9 rounded-full border-2 transition-all',
                      color === c ? 'ring-2 ring-offset-2 ring-primary' : 'border-transparent',
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', justify: 'end' }))}>
            <button
              type="button"
              onClick={reset}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-md hover:bg-surface-container text-on-surface',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-md text-white disabled:opacity-50',
              )}
              style={{ background: 'var(--color-primary)' }}
            >
              {busy
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : editingId
                  ? t('common.saveChanges', {}, { defaultValue: 'Save changes' })
                  : t('categories.create', {}, { defaultValue: 'Create category' })}
            </button>
          </div>
        </form>
      )}

      <section>
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 3),
            'uppercase tracking-widest text-on-surface-variant font-mono',
          )}
        >
          {t('categories.yourCategoriesHeading', {}, { defaultValue: 'Your categories' })}
        </h2>
        {rowError && (
          <p
            role="alert"
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.sp('mb', 3),
              'rounded-md bg-error-container/30 text-error border border-error/30 break-words',
            )}
          >
            {rowError}
          </p>
        )}
        {cats.error && cats.data.length === 0 && (
          <LoadErrorBanner
            message={t(
              'categories.loadError',
              {},
              { defaultValue: 'Categories could not be loaded.' },
            )}
            detail={cats.error}
            onRetry={cats.refetch}
            retryLabel={t('common.retry', {}, { defaultValue: 'Retry' })}
            retryMolId="categories-retry"
          />
        )}
        {cats.loading && cats.data.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('categories.loading', {}, { defaultValue: 'Loading categories…' })}
          </p>
        ) : cats.data.length === 0 && !cats.error ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('py', 4))}>
            {t(
              'categories.empty',
              {},
              { defaultValue: 'No categories yet. Create one to start grouping clips.' },
            )}
          </p>
        ) : (
          <div
            className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
            data-mol-id="categories-list"
          >
            {cats.data.map((row) => {
              return (
                <div
                  key={row.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md' }),
                    cm.sp('p', 4),
                    'rounded-xl bg-surface-container-lowest border border-outline-variant/40 flex-wrap',
                  )}
                >
                  <span
                    className={cm.cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0',
                    )}
                    style={{ background: row.color }}
                  >
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                      {row.icon}
                    </span>
                  </span>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'flex-1 min-w-[120px] text-on-surface break-words',
                    )}
                  >
                    {row.name}
                  </p>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'shrink-0')}>
                    <button
                      type="button"
                      onClick={() => handleEdit(row)}
                      className={cm.cn(
                        cm.sp('px', 3),
                        'min-h-[36px]',
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'rounded-md hover:bg-surface-container text-on-surface',
                      )}
                    >
                      {t('common.edit', {}, { defaultValue: 'Edit' })}
                    </button>
                    <ConfirmButton
                      label={t('common.delete', {}, { defaultValue: 'Delete' })}
                      confirmLabel={t('common.confirmDelete', {}, { defaultValue: 'Confirm?' })}
                      onConfirm={() => void handleDelete(row.id)}
                      data-mol-id="category-delete"
                      disabled={busy}
                      size="sm"
                      color="error"
                      className={cm.touchTargetCompact}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export default Categories
export { Categories as CategoriesPage }
