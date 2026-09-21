import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { RecipePicker } from '../components/RecipePicker.js'
import { SimmerTopBar } from '../components/SimmerTopBar.js'
import { formatQuantityWithUnit, num, weekStartOf } from '../lib/plan.js'

interface RecipeDetailRow {
  id: string
  user_id: string | null
  title: string
  description: string
  servings: number | string
  prep_minutes: number | string
  cook_minutes: number | string
  tags: string[]
  image_emoji: string
  ingredients: Array<{ id: string; item_name: string; quantity: number | string; unit: string }>
  steps: Array<{ id: string; position: number; text: string }>
}

export function RecipeDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [recipe, setRecipe] = useState<RecipeDetailRow | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scaler, setScaler] = useState<number>(1)
  const [pantryNames, setPantryNames] = useState<Set<string>>(new Set())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setNotFound(false)
    http
      .get<RecipeDetailRow>(`/api/recipes/${id}`)
      .then((res) => {
        if (cancelled) return
        const row = res.data as RecipeDetailRow
        setRecipe(row)
        setScaler(num(row.servings) || 1)
      })
      .catch(() => {
        if (cancelled) return
        setNotFound(true)
      })
    return () => {
      cancelled = true
    }
  }, [http, id])

  useEffect(() => {
    let cancelled = false
    http
      .get<Array<{ name: string }>>('/api/pantry?limit=500')
      .then((res) => {
        if (cancelled) return
        const rows = Array.isArray(res.data) ? (res.data as Array<{ name: string }>) : []
        setPantryNames(
          new Set(rows.map((r) => r.name.trim().toLowerCase()).filter((n) => n.length > 0)),
        )
      })
      .catch(() => {
        // Pantry badges are a nicety; an empty set renders none.
      })
    return () => {
      cancelled = true
    }
  }, [http])

  if (notFound) {
    return (
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
        <h2 className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
          {t('simmer.recipe.notFound', {}, { defaultValue: 'Recipe not found' })}
        </h2>
        <button
          type="button"
          data-mol-id="recipe-notfound-back"
          onClick={() => navigate('/recipes')}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-full hover:bg-primary-light transition-colors',
          )}
        >
          {t('simmer.recipe.backToBox', {}, { defaultValue: 'Back to the recipe box' })}
        </button>
      </div>
    )
  }

  if (!recipe) {
    return (
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {error ?? t('simmer.recipe.loading', {}, { defaultValue: 'Loading recipe…' })}
      </p>
    )
  }

  const baseServings = num(recipe.servings) || 1
  const owned = recipe.user_id !== null

  const handleDelete = async (): Promise<void> => {
    if (!id) return
    try {
      await http.delete(`/api/recipes/${id}`)
      void track({ name: 'recipe.deleted', properties: { recipe_id: id } })
      navigate('/recipes', { replace: true })
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t('simmer.recipe.deleteError', {}, { defaultValue: 'Could not delete recipe.' }),
      )
    }
  }

  const ingredientIsInPantry = (name: string): boolean => pantryNames.has(name.trim().toLowerCase())

  return (
    <>
      <SimmerTopBar
        title={recipe.title}
        eyebrow={
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
              schedule
            </span>
            {t(
              'simmer.recipe.meta',
              {
                prep: num(recipe.prep_minutes),
                cook: num(recipe.cook_minutes),
                total: num(recipe.prep_minutes) + num(recipe.cook_minutes),
              },
              { defaultValue: '{{prep}} min prep · {{cook}} min cook · {{total}} total' },
            )}
          </span>
        }
        actions={
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            {owned ? (
              <button
                type="button"
                data-mol-id="recipe-edit"
                onClick={() => navigate(`/recipes/${recipe.id}/edit`)}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-full border border-outline text-on-surface hover:border-primary hover:text-primary transition-colors',
                )}
              >
                <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                  edit
                </span>
                {t('common.edit', {}, { defaultValue: 'Edit' })}
              </button>
            ) : null}
            <button
              type="button"
              data-mol-id="recipe-add-to-week"
              onClick={() => setPickerOpen(true)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'bg-accent text-on-accent rounded-full hover:bg-accent/90 transition-colors shadow-sm',
              )}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                calendar_add_on
              </span>
              {t('simmer.recipe.addToWeek', {}, { defaultValue: 'Add to week' })}
            </button>
          </span>
        }
      />

      <RecipePicker
        open={pickerOpen}
        weekStart={weekStartOf()}
        day={0}
        mealSlot="dinner"
        onClose={() => setPickerOpen(false)}
        onAssigned={() => undefined}
      />

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

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6 items-start')}>
        {/* Ingredients + scaler */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface rounded-2xl shadow-sm border-l-4 border-l-primary lg:sticky lg:top-6',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
            <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
              {t('simmer.recipe.ingredients', {}, { defaultValue: 'Ingredients' })}
            </h2>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                'rounded-full border border-outline px-1 py-1',
              )}
            >
              <button
                type="button"
                data-mol-id="scaler-decrease"
                aria-label={t('simmer.recipe.scaler.less', {}, { defaultValue: 'Fewer servings' })}
                onClick={() => setScaler((s) => Math.max(1, s - 1))}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'w-8 h-8 rounded-full text-on-surface-variant hover:bg-primary-container/50 hover:text-primary transition-colors',
                )}
              >
                <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                  remove
                </span>
              </button>
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'text-on-surface px-1 min-w-[4.5rem] text-center',
                )}
                data-mol-id="scaler-servings"
              >
                {t(
                  'simmer.recipe.scaler.servings',
                  { count: scaler },
                  { defaultValue: '{{count}} servings' },
                )}
              </span>
              <button
                type="button"
                data-mol-id="scaler-increase"
                aria-label={t('simmer.recipe.scaler.more', {}, { defaultValue: 'More servings' })}
                onClick={() => setScaler((s) => Math.min(50, s + 1))}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'w-8 h-8 rounded-full text-on-surface-variant hover:bg-primary-container/50 hover:text-primary transition-colors',
                )}
              >
                <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                  add
                </span>
              </button>
            </div>
          </div>
          <ul
            className={cm.cn(cm.flex({ direction: 'col' }), 'list-none divide-y divide-outline/20')}
          >
            {(recipe.ingredients ?? []).map((ing) => {
              const scaled = (num(ing.quantity) * scaler) / baseServings
              const have = ingredientIsInPantry(ing.item_name)
              return (
                <li
                  key={ing.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                    cm.sp('py', 3),
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      have ? 'line-through text-on-surface-variant' : 'text-on-surface',
                    )}
                  >
                    {ing.item_name}
                    {have ? (
                      <span
                        className={cm.cn(
                          cm.sp('ml', 2),
                          cm.sp('px', 2),
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          'rounded-full bg-have-it-light text-have-it no-underline',
                        )}
                        title={t(
                          'simmer.recipe.inPantry',
                          {},
                          { defaultValue: 'You already have this' },
                        )}
                      >
                        {t('simmer.recipe.inPantryShort', {}, { defaultValue: 'in pantry' })}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-on-surface-variant tabular-nums',
                    )}
                  >
                    {formatQuantityWithUnit(scaled, ing.unit)}
                  </span>
                </li>
              )
            })}
          </ul>
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 3), 'text-on-surface-variant')}>
            {t(
              'simmer.recipe.scaler.hint',
              {},
              { defaultValue: 'Quantities rescale to the servings you pick.' },
            )}
          </p>
        </section>

        {/* Hero + description + steps */}
        <section className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), 'lg:col-span-2')}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              cm.flex({ direction: 'col', gap: 'md' }),
              'bg-surface rounded-2xl shadow-sm',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'md' }))}>
              <span className={cm.cn('text-6xl')} aria-hidden="true">
                {recipe.image_emoji}
              </span>
              <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
                {(recipe.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('medium'),
                      'rounded-full bg-primary-container text-on-primary-container',
                    )}
                  >
                    #{tag}
                  </span>
                ))}
              </span>
            </div>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
              {recipe.description}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'lg' }),
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              <span>
                {t(
                  'simmer.recipe.baseServings',
                  { count: baseServings },
                  { defaultValue: 'Recipe serves {{count}}' },
                )}
              </span>
              {!owned ? (
                <span className={cm.cn(cm.textSize('xs'), 'italic')}>
                  {t(
                    'simmer.recipe.catalogNote',
                    {},
                    { defaultValue: 'From the starter catalog — save a copy to edit it.' },
                  )}
                </span>
              ) : null}
            </div>
          </div>

          <section className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm')}>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('lg'),
                cm.sp('mb', 4),
                'text-on-surface',
              )}
            >
              {t('simmer.recipe.steps', {}, { defaultValue: 'Steps' })}
            </h2>
            {(recipe.steps ?? []).length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'simmer.recipe.noSteps',
                  {},
                  { defaultValue: 'No written steps yet — cook it your way.' },
                )}
              </p>
            ) : (
              <ol className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'list-decimal pl-6')}>
                {(recipe.steps ?? []).map((step) => (
                  <li
                    key={step.id}
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface leading-relaxed')}
                  >
                    {step.text}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {owned ? (
            <section
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface rounded-2xl shadow-sm border border-error/30 flex items-center justify-between gap-4 flex-wrap',
              )}
            >
              <div>
                <h3 className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                  {t('simmer.recipe.delete.title', {}, { defaultValue: 'Delete this recipe' })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'simmer.recipe.delete.body',
                    {},
                    {
                      defaultValue: 'Removes it from your box and from any week it is planned on.',
                    },
                  )}
                </p>
              </div>
              {confirmDelete ? (
                <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                  <button
                    type="button"
                    data-mol-id="recipe-delete-confirm"
                    onClick={() => void handleDelete()}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      'rounded-lg bg-error text-on-error hover:bg-error/90 transition-colors',
                    )}
                  >
                    {t('common.delete', {}, { defaultValue: 'Delete' })}
                  </button>
                  <button
                    type="button"
                    data-mol-id="recipe-delete-cancel"
                    onClick={() => setConfirmDelete(false)}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.fontWeight('medium'),
                      cm.textSize('sm'),
                      'text-on-surface-variant hover:text-on-surface transition-colors',
                    )}
                  >
                    {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  data-mol-id="recipe-delete"
                  onClick={() => setConfirmDelete(true)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'rounded-lg bg-error-container text-on-error-container hover:bg-error hover:text-on-error transition-colors',
                  )}
                >
                  {t('common.delete', {}, { defaultValue: 'Delete' })}
                </button>
              )}
            </section>
          ) : null}
        </section>
      </div>
    </>
  )
}
