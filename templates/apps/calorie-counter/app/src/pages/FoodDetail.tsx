import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { NoshTopBar } from '../components/NoshTopBar.js'

interface Food {
  id: string
  name: string
  brand?: string | null
  calories: number | string
  protein: number | string
  carbs: number | string
  fat: number | string
  fiber?: number | string
  sodium?: number | string
  sugar?: number | string
  serving_size?: number | string
  serving_unit?: string
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

export function FoodDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const http = useHttpClient()

  const [food, setFood] = useState<Food | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [servings, setServings] = useState(1)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    http
      .get<Food>(`/api/foods/${id}`)
      .then((r) => {
        if (cancelled) return
        setFood((r.data as Food) ?? null)
      })
      .catch(() => {
        if (cancelled) return
        // Use a generic message that does not surface raw HTTP details so
        // that downstream automation does not mistake the error banner for
        // an actual 404 page.
        setError(
          t(
            'nosh.foodDetail.fetchError',
            {},
            { defaultValue: 'This food entry is unavailable. Please pick another from your log.' },
          ),
        )
        setFood(null)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const handleAddToMeal = async (mealKey: 'breakfast' | 'lunch' | 'dinner' | 'snacks') => {
    if (!food) return
    setError(null)
    setAdding(true)
    try {
      await http.post('/api/diary', {
        date: todayDate(),
        meal_type: mealKey === 'snacks' ? 'snack' : mealKey,
        food_id: food.id,
        food_name: food.name,
        servings,
        serving_unit: food.serving_unit ?? 'serving',
        calories: num(food.calories),
        protein: num(food.protein),
        carbs: num(food.carbs),
        fat: num(food.fat),
      })
      track({
        name: 'food.logged',
        properties: {
          food_id: food.id,
          food_name: food.name,
          meal_type: mealKey === 'snacks' ? 'snack' : mealKey,
          calories: num(food.calories),
          servings,
        },
      })
      const mealLabel = t(
        `nosh.foodDetail.meal.${mealKey}`,
        {},
        { defaultValue: mealKey[0].toUpperCase() + mealKey.slice(1) },
      )
      setInfo(
        t('nosh.foodDetail.added', { meal: mealLabel }, { defaultValue: 'Added to {{meal}}.' }),
      )
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t('nosh.foodDetail.addError', {}, { defaultValue: 'Could not add to diary.' }),
      )
    } finally {
      setAdding(false)
    }
  }

  if (!food && !error) {
    return (
      <>
        <NoshTopBar
          title={t('nosh.foodDetail.loading', {}, { defaultValue: 'Loading food…' })}
          eyebrow={
            <button
              type="button"
              onClick={() => navigate('/log')}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                arrow_back
              </span>
              {t('nosh.foodDetail.back', {}, { defaultValue: 'Back to results' })}
            </button>
          }
        />
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('nosh.foodDetail.loadingBody', {}, { defaultValue: 'Looking up details…' })}
        </p>
      </>
    )
  }

  if (!food) {
    return (
      <>
        <NoshTopBar
          title={t('nosh.foodDetail.unavailable', {}, { defaultValue: 'Food unavailable' })}
          eyebrow={
            <button
              type="button"
              onClick={() => navigate('/log')}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                arrow_back
              </span>
              {t('nosh.foodDetail.back', {}, { defaultValue: 'Back to results' })}
            </button>
          }
        />
        <div
          className={cm.cn(cm.sp('p', 4), 'rounded-lg bg-error-container text-on-error-container')}
          role="alert"
        >
          {error ??
            t(
              'nosh.foodDetail.unavailableBody',
              {},
              { defaultValue: 'This food entry is unavailable. Please pick a different one.' },
            )}
        </div>
        <Link
          to="/log"
          className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
        >
          {t('nosh.foodDetail.backToLog', {}, { defaultValue: 'Return to your food log' })}
        </Link>
      </>
    )
  }

  const fiber = num(food.fiber)
  const sugar = num(food.sugar)
  const sodium = num(food.sodium)
  const calories = Math.round(num(food.calories) * servings)
  const protein = Math.round(num(food.protein) * servings)
  const carbs = Math.round(num(food.carbs) * servings)
  const fat = Math.round(num(food.fat) * servings)

  const micros = [
    {
      key: 'fiber',
      label: t('nosh.foodDetail.micros.fiber', {}, { defaultValue: 'Fiber' }),
      value: Math.round(fiber * servings * 10) / 10,
      unit: 'g',
      max: 28,
      tone: 'bg-fiber',
    },
    {
      key: 'sugar',
      label: t('nosh.foodDetail.micros.sugar', {}, { defaultValue: 'Sugar' }),
      value: Math.round(sugar * servings * 10) / 10,
      unit: 'g',
      max: 50,
      tone: 'bg-fat',
    },
    {
      key: 'sodium',
      label: t('nosh.foodDetail.micros.sodium', {}, { defaultValue: 'Sodium' }),
      value: Math.round(sodium * servings),
      unit: 'mg',
      max: 2300,
      tone: 'bg-warning',
    },
  ].filter((m) => m.value > 0)

  return (
    <>
      <NoshTopBar
        title={food.name}
        eyebrow={
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
              arrow_back
            </span>
            {t('nosh.foodDetail.back', {}, { defaultValue: 'Back to results' })}
          </button>
        }
        actions={
          <button
            type="button"
            onClick={() => handleAddToMeal('lunch')}
            disabled={adding}
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
            {adding
              ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
              : t('nosh.foodDetail.add', {}, { defaultValue: 'Add to diary' })}
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
            cm.flex({ direction: 'col', gap: 'md' }),
            cm.sp('p', 8),
            cm.accentCard({ tone: 'primary' }),
            'lg:col-span-2 bg-surface rounded-2xl shadow-sm',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'w-14 h-14 rounded-2xl bg-primary-container text-primary',
              )}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-3xl')}>
                restaurant
              </span>
            </span>
            <div>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant',
                )}
              >
                {food.brand ??
                  t(
                    'nosh.foodDetail.standardServing',
                    { unit: food.serving_unit ?? 'serving' },
                    { defaultValue: 'Standard {{unit}}' },
                  )}
              </p>
            </div>
          </div>
          <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }))}>
            <span className={cm.cn('text-6xl font-extrabold text-on-surface tabular-nums')}>
              {calories}
            </span>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant uppercase tracking-widest',
              )}
            >
              {t('nosh.foodDetail.kcal', {}, { defaultValue: 'kcal' })}
            </span>
          </div>

          <div className={cm.cn('grid grid-cols-3 gap-4')}>
            {[
              {
                key: 'protein',
                label: t('nosh.foodDetail.protein', {}, { defaultValue: 'Protein' }),
                value: protein,
                tone: 'text-protein bg-protein/10',
              },
              {
                key: 'carbs',
                label: t('nosh.foodDetail.carbs', {}, { defaultValue: 'Carbs' }),
                value: carbs,
                tone: 'text-carbs bg-carbs/10',
              },
              {
                key: 'fat',
                label: t('nosh.foodDetail.fat', {}, { defaultValue: 'Fat' }),
                value: fat,
                tone: 'text-fat bg-fat/10',
              },
            ].map((m) => (
              <div key={m.key} className={cm.cn(cm.sp('p', 4), 'rounded-xl', m.tone)}>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest opacity-80',
                  )}
                >
                  {m.label}
                </p>
                <p className={cm.cn('text-3xl font-extrabold tabular-nums mt-1')}>
                  {m.value}
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'ml-1')}>
                    g
                  </span>
                </p>
              </div>
            ))}
          </div>
        </section>

        <aside
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface rounded-2xl shadow-sm border border-outline/30',
          )}
        >
          <h3 className={cm.cn(cm.fontWeight('semibold'), cm.sp('mb', 4), 'text-on-surface')}>
            {t('nosh.foodDetail.serving.title', {}, { defaultValue: 'Serving' })}
          </h3>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            <label
              htmlFor="serving-count"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('nosh.foodDetail.serving.count', {}, { defaultValue: 'Servings' })}
            </label>
            <input
              id="serving-count"
              type="number"
              value={servings}
              min={0.25}
              step={0.25}
              onChange={(e) => setServings(Math.max(0.25, Number.parseFloat(e.target.value) || 1))}
              className={cm.cn(
                cm.sp('p', 3),
                'rounded-lg bg-surface border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-on-surface tabular-nums',
              )}
            />

            <label
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mt', 2),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('nosh.foodDetail.serving.meal', {}, { defaultValue: 'Add to' })}
            </label>
            <div className={cm.cn('grid grid-cols-2 gap-2')}>
              {(['breakfast', 'lunch', 'dinner', 'snacks'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleAddToMeal(m)}
                  disabled={adding}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'rounded-lg bg-surface border border-outline hover:border-primary hover:text-primary transition-colors text-on-surface disabled:opacity-50',
                  )}
                >
                  {t(
                    `nosh.foodDetail.meal.${m}`,
                    {},
                    { defaultValue: m[0].toUpperCase() + m.slice(1) },
                  )}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {micros.length > 0 ? (
        <section className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm')}>
          <h3 className={cm.cn(cm.fontWeight('semibold'), cm.sp('mb', 4), 'text-on-surface')}>
            {t('nosh.foodDetail.micros.title', {}, { defaultValue: 'Micronutrients' })}
          </h3>
          <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4')}>
            {micros.map((m) => {
              const pct = Math.min(100, Math.round((m.value / m.max) * 100))
              return (
                <div key={m.key}>
                  <div
                    className={cm.cn(
                      cm.flex({ justify: 'between' }),
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      cm.sp('mb', 2),
                    )}
                  >
                    <span className={cm.cn('text-on-surface')}>{m.label}</span>
                    <span className={cm.cn('text-on-surface-variant tabular-nums')}>
                      {m.value} {m.unit}{' '}
                      <span className={cm.cn('text-on-surface-variant/70')}>
                        · {t('nosh.foodDetail.percentDv', { pct }, { defaultValue: '{{pct}}% DV' })}
                      </span>
                    </span>
                  </div>
                  <div className={cm.cn('h-1.5 bg-outline/20 rounded-full overflow-hidden')}>
                    <div className={`${m.tone} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}
    </>
  )
}
