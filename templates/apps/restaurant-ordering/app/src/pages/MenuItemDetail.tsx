import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton, Switch } from '@molecule/app-ui-react'

import { unwrapSingle } from '../lib/unwrap.js'

const DIETARY_OPTIONS = ['vegetarian', 'vegan', 'gluten_free', 'spicy', 'allergen'] as const

type DietaryTag = (typeof DIETARY_OPTIONS)[number]

interface ApiMenuItem {
  id: string
  name: string
  description?: string
  price: number
  category?: string
  image_url?: string | null
  dietary_tags?: string[]
  available?: boolean
  sort_order?: number
}

interface FormState {
  name: string
  description: string
  priceDollars: string
  category: string
  dietary: ReadonlyArray<string>
  available: boolean
}

const formFromItem = (item: ApiMenuItem): FormState => ({
  name: item.name ?? '',
  description: item.description ?? '',
  priceDollars: Number(item.price ?? 0).toFixed(2),
  category: item.category ?? '',
  dietary: item.dietary_tags ?? [],
  available: item.available !== false,
})

export function MenuItemDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/menu/${id}`)
      .then((res) => {
        if (cancelled) return
        const item = unwrapSingle<ApiMenuItem>(res)
        if (item && item.id) {
          setForm(formFromItem(item))
        } else {
          setError(t('menuItemDetail.notFound', {}, { defaultValue: 'Menu item not found.' }))
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(t('menuItemDetail.loadError', {}, { defaultValue: 'Could not load menu item.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }, [])

  const toggleDietary = useCallback((tag: DietaryTag) => {
    setForm((prev) => {
      if (!prev) return prev
      const set = new Set(prev.dietary)
      if (set.has(tag)) set.delete(tag)
      else set.add(tag)
      return { ...prev, dietary: Array.from(set) }
    })
  }, [])

  const handleSave = useCallback(async () => {
    if (!id || !form) return
    setSaving(true)
    setError(null)
    setStatusMessage(null)
    try {
      const priceDollars = Number(form.priceDollars.replace(/[^0-9.]/g, ''))
      const payload = {
        name: form.name.trim(),
        description: form.description,
        price: Number.isFinite(priceDollars) ? priceDollars : 0,
        category: form.category.trim() || 'Mains',
        dietary_tags: form.dietary,
        available: form.available,
      }
      await http.put(`/api/menu/${id}`, payload)
      void track({ name: 'menu_item.updated', properties: { itemId: id } })
      setStatusMessage(t('common.savedPeriod', {}, { defaultValue: 'Saved.' }))
    } catch (error) {
      logError('menuItemDetail.save', error)
      setError(t('menuItemDetail.saveError', {}, { defaultValue: 'Save failed. Try again.' }))
    } finally {
      setSaving(false)
    }
  }, [http, id, form, t])

  const handleDelete = useCallback(async () => {
    if (!id) return
    setSaving(true)
    setError(null)
    try {
      await http.delete(`/api/menu/${id}`)
      void track({ name: 'menu_item.deleted', properties: { itemId: id } })
      navigate('/menu')
    } catch (error) {
      logError('menuItemDetail.delete', error)
      setError(t('menuItemDetail.deleteError', {}, { defaultValue: 'Delete failed. Try again.' }))
      setSaving(false)
    }
  }, [http, id, navigate, t])

  if (loading) {
    return (
      <div
        className={cm.cn(
          cm.sp('px', 8),
          cm.sp('py', 16),
          cm.maxW('5xl'),
          cm.mxAuto,
          cm.textCenter,
          'text-on-surface-variant',
        )}
      >
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }

  if (error && !form) {
    return (
      <div
        className={cm.cn(
          cm.sp('px', 8),
          cm.sp('py', 16),
          cm.maxW('5xl'),
          cm.mxAuto,
          cm.textCenter,
          cm.stack(4),
        )}
      >
        <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-error')}>{error}</p>
        <Link to="/menu" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          {t('menuItemDetail.backToMenu', {}, { defaultValue: 'Back to menu' })}
        </Link>
      </div>
    )
  }

  if (!form) return null

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.stack(2)}>
        <Link
          to="/menu"
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary hover:underline inline-flex items-center gap-1',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-base align-middle')}
            aria-hidden="true"
          >
            arrow_back
          </span>
          {t('menuItemDetail.backToMenu', {}, { defaultValue: 'Back to menu' })}
        </Link>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight font-display')}>
          {form.name || t('menuItemDetail.untitled', {}, { defaultValue: 'Untitled item' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'menuItemDetail.subheading',
            { category: form.category || 'Item' },
            { defaultValue: '{{category}} · edit photo, modifiers, dietary, and pricing.' },
          )}
        </p>
      </header>

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'lg:col-span-2 bg-surface-container-lowest rounded-2xl shadow-sm',
            cm.stack(5),
          )}
        >
          <div
            className={cm.cn(
              'aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-tertiary/20',
              cm.flex({ align: 'center', justify: 'center' }),
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-7xl text-primary/40')}
              aria-hidden="true"
            >
              add_a_photo
            </span>
          </div>
          <Field
            id="name"
            label={t('menuItemDetail.name', {}, { defaultValue: 'Item name' })}
            value={form.name}
            onChange={(v) => update('name', v)}
          />
          <Field
            id="description"
            label={t('form.description', {}, { defaultValue: 'Description' })}
            value={form.description}
            onChange={(v) => update('description', v)}
            multiline
          />
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2')}>
            <Field
              id="price"
              label={t('menuItemDetail.price', {}, { defaultValue: 'Price (USD)' })}
              value={form.priceDollars}
              onChange={(v) => update('priceDollars', v)}
            />
            <Field
              id="category"
              label={t('form.category', {}, { defaultValue: 'Category' })}
              value={form.category}
              onChange={(v) => update('category', v)}
            />
          </div>
        </section>

        <aside className={cm.stack(6)}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface-container-lowest rounded-2xl shadow-sm',
              cm.stack(4),
            )}
          >
            <h3
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-8 w-8 rounded-lg bg-primary/10 shrink-0',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-lg text-primary')}>
                  health_and_safety
                </span>
              </span>
              {t('menuItemDetail.dietary', {}, { defaultValue: 'Dietary & Allergens' })}
            </h3>
            <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
              {DIETARY_OPTIONS.map((d) => {
                const active = form.dietary.includes(d)
                return (
                  <button
                    onClick={() => toggleDietary(d)}
                    key={d}
                    type="button"
                    data-testid={`dietary-${d}`}
                    aria-pressed={active}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      cm.roundedFull,
                      'uppercase tracking-widest transition-colors',
                      active
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                    )}
                  >
                    {t(`menuItemDetail.dietary.${d}`, {}, { defaultValue: d.replace('_', ' ') })}
                  </button>
                )
              })}
            </div>
          </div>

          <div
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface-container-lowest rounded-2xl shadow-sm',
              cm.stack(3),
            )}
          >
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('menuItemDetail.availability', {}, { defaultValue: 'Availability' })}
            </h3>
            <Switch
              id="available"
              label={t('menuItemDetail.available', {}, { defaultValue: 'Available tonight' })}
              checked={form.available}
              onChange={(e) => update('available', (e.target as HTMLInputElement).checked)}
              data-testid="menuitem-available"
            />
          </div>

          {error ? (
            <p data-testid="menuitem-error" className={cm.cn(cm.textSize('sm'), 'text-error')}>
              {error}
            </p>
          ) : null}
          {statusMessage ? (
            <p data-testid="menuitem-status" className={cm.cn(cm.textSize('sm'), 'text-primary')}>
              {statusMessage}
            </p>
          ) : null}

          <button
            onClick={handleSave}
            disabled={saving}
            type="button"
            data-testid="menuitem-save"
            className={cm.cn(
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {saving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
          </button>

          <ConfirmButton
            label={t('menuItemDetail.delete', {}, { defaultValue: 'Delete item' })}
            confirmLabel={t(
              'menuItemDetail.confirmDelete',
              {},
              { defaultValue: 'Delete this menu item?' },
            )}
            disarmSeconds={6}
            disabled={saving}
            data-testid="menuitem-delete"
            onConfirm={handleDelete}
          />
        </aside>
      </div>
    </div>
  )
}

interface FieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
}

function Field({ id, label, value, onChange, multiline }: FieldProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-1.5')}>
      <label
        htmlFor={id}
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            'bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-0',
          )}
        />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            'bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-0',
          )}
        />
      )}
    </div>
  )
}
