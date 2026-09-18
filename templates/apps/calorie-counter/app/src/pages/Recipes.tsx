import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { NoshTopBar } from '../components/NoshTopBar.js'

interface SavedMeal {
  id: string
  name: string
  total_calories: number | string
  total_protein: number | string
  total_carbs: number | string
  total_fat: number | string
}

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === 'string' ? Number.parseFloat(v) : (v ?? 0)
  return Number.isFinite(n) ? Number(n) : 0
}

const EMOJIS = ['🥗', '🥣', '🍜', '🫐', '🐟', '🍛', '🍲', '🥙', '🌮', '🍱']

export function Recipes() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState<SavedMeal[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setError(null)
    http
      .get<SavedMeal[]>('/api/meals')
      .then((res) => {
        if (cancelled) return
        const arr = Array.isArray(res.data) ? (res.data as SavedMeal[]) : []
        setRecipes(arr)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('nosh.recipes.fetchError', {}, { defaultValue: 'Could not load recipes.' }),
        )
        setRecipes([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t, refreshTick])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || creating) return
    setCreating(true)
    try {
      await http.post('/api/meals', {
        name: newName.trim(),
        items: [
          {
            food_id: null,
            servings: 1,
            serving_unit: 'serving',
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          },
        ],
      })
      setNewName('')
      setShowNewForm(false)
      setRefreshTick((n) => n + 1)
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : t('nosh.recipes.createError', {}, { defaultValue: 'Could not create recipe.' }),
      )
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <NoshTopBar
        title={t('nosh.recipes.heading', {}, { defaultValue: 'My recipes' })}
        eyebrow={t('nosh.recipes.eyebrow', {}, { defaultValue: 'Saved & favorites' })}
        actions={
          <button
            type="button"
            onClick={() => setShowNewForm((v) => !v)}
            aria-expanded={showNewForm}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'bg-accent text-on-accent rounded-full hover:bg-accent/90 transition-colors shadow-sm',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-lg')}>
              {showNewForm ? 'close' : 'add'}
            </span>
            {showNewForm
              ? t('common.cancel', {}, { defaultValue: 'Cancel' })
              : t('nosh.recipes.create', {}, { defaultValue: 'New recipe' })}
          </button>
        }
      />

      {showNewForm ? (
        <form
          onSubmit={handleCreate}
          className={cm.cn(
            cm.sp('p', 5),
            cm.flex({ direction: 'col', gap: 'sm' }),
            'bg-surface rounded-2xl shadow-sm border border-primary/30',
          )}
        >
          <label className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
            {t('nosh.recipes.nameLabel', {}, { defaultValue: 'Recipe name' })}
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            placeholder={t(
              'nosh.recipes.recipeNameExample',
              {},
              { defaultValue: 'e.g. Mediterranean Bowl' },
            )}
            className={cm.cn(
              'w-full h-11 px-4 rounded-xl bg-surface border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface placeholder:text-on-surface-variant outline-none',
            )}
          />
          <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'bg-accent text-on-accent rounded-full hover:bg-accent/90 transition-colors disabled:opacity-50',
              )}
            >
              {creating
                ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                : t('nosh.recipes.save', {}, { defaultValue: 'Create recipe' })}
            </button>
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
      ) : null}

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'rounded-lg bg-error-container text-on-error-container',
          )}
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {recipes === null ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('nosh.recipes.loading', {}, { defaultValue: 'Loading recipes…' })}
        </p>
      ) : recipes.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 8),
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            'bg-surface rounded-2xl shadow-sm text-center',
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-5xl text-primary')}
          >
            menu_book
          </span>
          <h3 className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
            {t('nosh.recipes.empty.title', {}, { defaultValue: 'No saved recipes yet' })}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-sm')}>
            {t(
              'nosh.recipes.empty.body',
              {},
              { defaultValue: 'Create your first recipe to log a full meal in a single tap.' },
            )}
          </p>
        </div>
      ) : (
        <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4')}>
          {recipes.map((r, i) => {
            const calories = Math.round(num(r.total_calories))
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => navigate(`/recipes/${r.id}`)}
                className={cm.cn(
                  cm.sp('p', 5),
                  'text-left bg-surface rounded-2xl shadow-sm border border-outline/20 hover:shadow-md hover:-translate-y-0.5 transition-all group',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                  <span className={cm.cn('text-4xl')} aria-hidden="true">
                    {EMOJIS[i % EMOJIS.length]}
                  </span>
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'rounded-full uppercase tracking-widest bg-primary-container text-on-primary-container',
                    )}
                  >
                    {t('common.saved', {}, { defaultValue: 'Saved' })}
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('bold'),
                    cm.sp('mt', 4),
                    'text-on-surface group-hover:text-primary transition-colors',
                  )}
                >
                  {r.name}
                </h3>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'lg' }),
                    cm.textSize('sm'),
                    cm.sp('mt', 2),
                    'text-on-surface-variant',
                  )}
                >
                  <span className={cm.flex({ align: 'center', gap: 'xs' })}>
                    <span
                      aria-hidden="true"
                      className={cm.cn('material-symbols-outlined text-base')}
                    >
                      local_fire_department
                    </span>
                    <span className={cm.cn('tabular-nums')}>
                      {t(
                        'nosh.recipes.calorieValue',
                        { count: calories },
                        { defaultValue: '{{count}} kcal' },
                      )}
                    </span>
                  </span>
                </div>
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setShowNewForm(true)}
            className={cm.cn(
              cm.sp('p', 5),
              cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'sm' }),
              'bg-surface rounded-2xl shadow-sm border-2 border-dashed border-outline/40 hover:border-primary/60 hover:bg-primary-container/30 transition-colors min-h-[160px] text-on-surface-variant hover:text-primary',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-3xl')}>
              add
            </span>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {t('nosh.recipes.addCard', {}, { defaultValue: 'Add another recipe' })}
            </span>
          </button>
        </div>
      )}
    </>
  )
}
