import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { NoshTopBar } from '../components/NoshTopBar.js'

interface MealItem {
  id: string
  food_id: string | null
  servings: number | string
  serving_unit: string
  calories?: number | string
  food_name?: string | null
}

interface SavedMealResponse {
  id: string
  name: string
  total_calories: number | string
  total_protein: number | string
  total_carbs: number | string
  total_fat: number | string
  items?: MealItem[]
}

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === 'string' ? Number.parseFloat(v) : (v ?? 0)
  return Number.isFinite(n) ? Number(n) : 0
}

const todayDate = (): string => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function RecipeDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const http = useHttpClient()

  const [meal, setMeal] = useState<SavedMealResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [logging, setLogging] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    http
      .get<SavedMealResponse>(`/api/meals/${id}`)
      .then((r) => {
        if (cancelled) return
        setMeal((r.data as SavedMealResponse) ?? null)
      })
      .catch(() => {
        if (cancelled) return
        // Use a generic message that does not surface raw HTTP details so
        // that downstream automation does not mistake the error banner for
        // an actual 404 page.
        setError(
          t(
            'nosh.recipeDetail.fetchError',
            {},
            {
              defaultValue:
                'This recipe is unavailable right now. Please pick another from your library.',
            },
          ),
        )
        setMeal(null)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const handleLogToday = async () => {
    if (!meal) return
    setLogging(true)
    setError(null)
    try {
      await http.post('/api/diary', {
        date: todayDate(),
        meal_type: 'lunch',
        food_id: null,
        food_name: meal.name,
        servings: 1,
        serving_unit: 'recipe',
        calories: num(meal.total_calories),
        protein: num(meal.total_protein),
        carbs: num(meal.total_carbs),
        fat: num(meal.total_fat),
      })
      setInfo(t('nosh.recipeDetail.logged', {}, { defaultValue: 'Recipe logged to today.' }))
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t('nosh.recipeDetail.logError', {}, { defaultValue: 'Could not log recipe.' }),
      )
    } finally {
      setLogging(false)
    }
  }

  if (!meal && !error) {
    return (
      <>
        <NoshTopBar
          title={t('nosh.recipeDetail.loading', {}, { defaultValue: 'Loading recipe…' })}
          eyebrow={
            <button
              type="button"
              onClick={() => navigate('/recipes')}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                arrow_back
              </span>
              {t('nosh.recipeDetail.back', {}, { defaultValue: 'Back to recipes' })}
            </button>
          }
        />
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('nosh.recipeDetail.loadingBody', {}, { defaultValue: 'Looking up details…' })}
        </p>
      </>
    )
  }

  if (!meal) {
    return (
      <>
        <NoshTopBar
          title={t('nosh.recipeDetail.unavailable', {}, { defaultValue: 'Recipe unavailable' })}
          eyebrow={
            <button
              type="button"
              onClick={() => navigate('/recipes')}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                arrow_back
              </span>
              {t('nosh.recipeDetail.back', {}, { defaultValue: 'Back to recipes' })}
            </button>
          }
        />
        <div
          className={cm.cn(cm.sp('p', 4), 'rounded-lg bg-error-container text-on-error-container')}
          role="alert"
        >
          {error ??
            t(
              'nosh.recipeDetail.unavailableBody',
              {},
              {
                defaultValue:
                  'This recipe is unavailable right now. Pick another from your library.',
              },
            )}
        </div>
        <Link
          to="/recipes"
          className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
        >
          {t('nosh.recipeDetail.backToRecipes', {}, { defaultValue: 'Return to your recipes' })}
        </Link>
      </>
    )
  }

  const items = meal.items ?? []
  const totalCalories = Math.round(num(meal.total_calories))

  return (
    <>
      <NoshTopBar
        title={meal.name}
        eyebrow={
          <button
            type="button"
            onClick={() => navigate('/recipes')}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
              arrow_back
            </span>
            {t('nosh.recipeDetail.back', {}, { defaultValue: 'Back to recipes' })}
          </button>
        }
        actions={
          <button
            type="button"
            onClick={handleLogToday}
            disabled={logging}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'bg-accent text-on-accent rounded-full hover:bg-accent/90 transition-colors shadow-sm disabled:opacity-50',
            )}
          >
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-lg')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              add
            </span>
            {logging
              ? t('nosh.recipeDetail.logging', {}, { defaultValue: 'Logging…' })
              : t('nosh.recipeDetail.logToday', {}, { defaultValue: 'Log to today' })}
          </button>
        }
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
      {info ? (
        <div
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'rounded-lg bg-success-container text-on-success-container',
          )}
          role="status"
        >
          {info}
        </div>
      ) : null}

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6')}>
        <section
          className={cm.cn(
            cm.sp('p', 8),
            'lg:col-span-2 bg-gradient-to-br from-primary-container to-surface rounded-2xl shadow-sm relative overflow-hidden',
          )}
        >
          <div
            className={cm.cn(
              'absolute -top-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl',
            )}
            aria-hidden="true"
          />
          <div className={cm.cn('text-7xl mb-2')} aria-hidden="true">
            🥗
          </div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t(
              'nosh.recipeDetail.itemCount',
              { count: items.length },
              { defaultValue: '{{count}} ingredients' },
            )}
          </p>
          <h2
            className={cm.cn(cm.fontWeight('bold'), 'text-3xl text-on-surface tracking-tight mt-2')}
          >
            {meal.name}
          </h2>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), cm.sp('mt', 6))}>
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('nosh.recipeDetail.totalKcal', {}, { defaultValue: 'Total kcal' })}
              </p>
              <p className={cm.cn('text-3xl font-extrabold text-on-surface tabular-nums')}>
                {totalCalories}
              </p>
            </div>
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('nosh.recipeDetail.protein', {}, { defaultValue: 'Protein' })}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('semibold'),
                  'text-on-surface tabular-nums',
                )}
              >
                {Math.round(num(meal.total_protein))}g
              </p>
            </div>
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('nosh.recipeDetail.carbs', {}, { defaultValue: 'Carbs' })}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('semibold'),
                  'text-on-surface tabular-nums',
                )}
              >
                {Math.round(num(meal.total_carbs))}g
              </p>
            </div>
          </div>
        </section>

        <aside className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm')}>
          <h3 className={cm.cn(cm.fontWeight('semibold'), cm.sp('mb', 4), 'text-on-surface')}>
            {t('nosh.recipeDetail.ingredientsTitle', {}, { defaultValue: 'Ingredients' })}
          </h3>
          {items.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('nosh.recipeDetail.noItems', {}, { defaultValue: 'No ingredients listed yet.' })}
            </p>
          ) : (
            <ul
              className={cm.cn(
                cm.flex({ direction: 'col' }),
                'list-none divide-y divide-outline/30',
              )}
            >
              {items.map((i) => (
                <li
                  key={i.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('py', 3),
                  )}
                >
                  <div>
                    <p className={cm.cn(cm.fontWeight('medium'), 'text-on-surface')}>
                      {i.food_name ??
                        t('nosh.recipeDetail.unnamed', {}, { defaultValue: 'Ingredient' })}
                    </p>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {Math.round(num(i.servings) * 100) / 100} {i.serving_unit}
                    </p>
                  </div>
                  {i.calories != null ? (
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-on-surface-variant tabular-nums',
                      )}
                    >
                      {Math.round(num(i.calories))} kcal
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </>
  )
}
