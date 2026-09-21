import { useEffect, useMemo, useRef, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface PickerRecipe {
  id: string
  title: string
  servings: number | string
  prep_minutes: number | string
  cook_minutes: number | string
  image_emoji: string
  tags: string[]
}

interface RecipePickerProps {
  /** Open state — the parent renders the trigger. */
  open: boolean
  /** Monday-ISO of the week being planned. */
  weekStart: string
  /** Day index 0=Mon..6=Sun and slot the picked recipe joins. */
  day: number
  mealSlot: 'breakfast' | 'lunch' | 'dinner'
  onClose: () => void
  /** Called after the entry was created successfully. */
  onAssigned: () => void
}

/**
 * Modal picker for the week grid: searchable recipe list → POST /api/meal-plan.
 * One component feeds every empty (and occupied) cell.
 */
export function RecipePicker({
  open,
  weekStart,
  day,
  mealSlot,
  onClose,
  onAssigned,
}: RecipePickerProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [recipes, setRecipes] = useState<PickerRecipe[] | null>(null)
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Modal a11y: keyboard users get Escape-to-close and land on the search
  // input instead of wherever the page focus happened to be.
  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError(null)
    http
      .get<PickerRecipe[]>('/api/recipes?limit=200')
      .then((res) => {
        if (cancelled) return
        setRecipes(Array.isArray(res.data) ? (res.data as PickerRecipe[]) : [])
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('simmer.picker.fetchError', {}, { defaultValue: 'Could not load recipes.' }),
        )
        setRecipes([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t, open])

  const filtered = useMemo(() => {
    if (!recipes) return []
    const q = query.trim().toLowerCase()
    if (!q) return recipes
    return recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.tags ?? []).some((tag) => tag.toLowerCase().includes(q)),
    )
  }, [recipes, query])

  if (!open) return null

  const assign = async (recipeId: string): Promise<void> => {
    setBusyId(recipeId)
    setError(null)
    try {
      await http.post('/api/meal-plan', {
        week_start: weekStart,
        day,
        meal_slot: mealSlot,
        recipe_id: recipeId,
        servings: 2,
      })
      void track({
        name: 'meal-plan.assigned',
        properties: { recipe_id: recipeId, week_start: weekStart, day, meal_slot: mealSlot },
      })
      onAssigned()
      onClose()
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t('simmer.picker.assignError', {}, { defaultValue: 'Could not add to the plan.' }),
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div
      className={cm.cn('fixed inset-0 z-50 flex items-center justify-center p-4')}
      role="dialog"
      aria-modal="true"
      aria-label={t('simmer.picker.title', {}, { defaultValue: 'Add a recipe to the plan' })}
    >
      <button
        type="button"
        aria-label={t('common.close', {}, { defaultValue: 'Close' })}
        data-mol-id="picker-backdrop"
        onClick={onClose}
        className={cm.cn('absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default')}
      />
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'relative w-full max-w-lg max-h-[80vh] bg-surface rounded-2xl shadow-xl border border-outline/40 overflow-hidden',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            cm.sp('p', 4),
            'border-b border-outline/30',
          )}
        >
          <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
            {t('simmer.picker.title', {}, { defaultValue: 'Add a recipe to the plan' })}
          </h2>
          <button
            type="button"
            data-mol-id="picker-close"
            aria-label={t('common.close', {}, { defaultValue: 'Close' })}
            onClick={onClose}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
              close
            </span>
          </button>
        </div>
        <div className={cm.cn(cm.sp('p', 4))}>
          <input
            ref={searchRef}
            type="search"
            data-mol-id="picker-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'simmer.picker.searchPlaceholder',
              {},
              { defaultValue: 'Search recipes…' },
            )}
            className={cm.cn(
              'w-full h-11 px-4 rounded-xl bg-surface border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface outline-none',
            )}
          />
        </div>
        {error ? (
          <div
            className={cm.cn(
              cm.sp('px', 4),
              cm.textSize('sm'),
              'text-on-error-container bg-error-container',
            )}
            role="alert"
          >
            {error}
          </div>
        ) : null}
        <div className={cm.cn('overflow-y-auto px-4 pb-4 flex-1')}>
          {recipes === null ? (
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('py', 6),
                'text-center text-on-surface-variant',
              )}
            >
              {t('simmer.picker.loading', {}, { defaultValue: 'Loading recipes…' })}
            </p>
          ) : filtered.length === 0 ? (
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('py', 6),
                'text-center text-on-surface-variant',
              )}
            >
              {t('simmer.picker.empty', {}, { defaultValue: 'No recipes match that search.' })}
            </p>
          ) : (
            <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'list-none')}>
              {filtered.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    data-mol-id={`picker-recipe-${r.id}`}
                    disabled={busyId !== null}
                    onClick={() => void assign(r.id)}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      cm.sp('px', 3),
                      cm.sp('py', 3),
                      'w-full text-left rounded-xl hover:bg-primary-container/40 transition-colors disabled:opacity-50',
                    )}
                  >
                    <span aria-hidden="true" className={cm.cn('text-2xl')}>
                      {r.image_emoji}
                    </span>
                    <span className={cm.cn(cm.flex({ direction: 'col' }), 'flex-1 min-w-0')}>
                      <span
                        className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface truncate')}
                      >
                        {r.title}
                      </span>
                      <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                        {t(
                          'simmer.picker.recipeMeta',
                          {
                            total: Number(r.prep_minutes ?? 0) + Number(r.cook_minutes ?? 0),
                            servings: Number(r.servings ?? 0),
                          },
                          { defaultValue: '{{total}} min · serves {{servings}}' },
                        )}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={cm.cn('material-symbols-outlined text-primary')}
                    >
                      add_circle
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
